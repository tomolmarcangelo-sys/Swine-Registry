import React, { useEffect, useState, useCallback, useRef, Dispatch, SetStateAction } from 'react';
import { supabase } from '../services/supabase';
import { rowToPig, rowToUser, isSupabaseConfigured } from '../services/supabaseClient';
import { syncWithSupabase } from '../services/syncService';
import { PigRecord, User } from '../types';

export type RealtimeStatus = 'connected' | 'connecting' | 'disconnected';

export interface UseRealtimeSyncProps {
  setPigs: Dispatch<SetStateAction<PigRecord[]>>;
  setUsers: Dispatch<SetStateAction<User[]>>;
}

const MIN_SYNC_COOLDOWN_MS = 15000; // 15 seconds cooldown for automatic/event triggers

export function useRealtimeSync({ setPigs, setUsers }: UseRealtimeSyncProps) {
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting');
  const isSyncingRef = useRef<boolean>(false);
  const lastSyncTimestampRef = useRef<number>(0);

  // Trigger manual or auto background resync with concurrency lock & debounced event throttling
  const triggerResync = useCallback(async (isEventTriggered = false) => {
    const now = Date.now();

    // 1. Cooldown check for automatic background/event triggers
    if (isEventTriggered && now - lastSyncTimestampRef.current < MIN_SYNC_COOLDOWN_MS) {
      console.log(`[Auto-Resync] Throttled (${Math.round((MIN_SYNC_COOLDOWN_MS - (now - lastSyncTimestampRef.current)) / 1000)}s remaining in cooldown)`);
      return;
    }

    // 2. Concurrency lock: drop redundant simultaneous executions
    if (isSyncingRef.current) {
      console.log('[Auto-Resync] Sync operation already in progress. Skipping duplicate call.');
      return;
    }

    isSyncingRef.current = true;
    lastSyncTimestampRef.current = now;

    try {
      const synced = await syncWithSupabase();
      if (synced) {
        if (Array.isArray(synced.pigs)) setPigs(synced.pigs);
        if (Array.isArray(synced.users)) setUsers(synced.users);
      }
    } catch (err) {
      console.warn('[useRealtimeSync] Auto-resync notice:', err);
    } finally {
      isSyncingRef.current = false;
    }
  }, [setPigs, setUsers]);

  // Subscribe to Supabase Realtime postgres_changes on pig_records and users tables
  useEffect(() => {
    // Perform initial fetch on mount
    triggerResync(false);

    if (!isSupabaseConfigured() || !supabase) {
      setRealtimeStatus('disconnected');
      return;
    }

    setRealtimeStatus('connecting');

    const channelTopic = 'schema-db-changes';

    try {
      // Check for existing active channels with the same topic to prevent WebSocket duplicate subscription loops
      const existingChannels = supabase.getChannels();
      const duplicateChannel = existingChannels.find(
        c => c.topic === `realtime:${channelTopic}` || c.topic === channelTopic
      );
      if (duplicateChannel) {
        try {
          supabase.removeChannel(duplicateChannel);
        } catch {
          // Safe ignore
        }
      }

      const channel = supabase
        .channel(channelTopic)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'pig_records' },
          (payload) => {
            console.log('[Realtime DB Event - pig_records]:', payload);
            try {
              if (payload.eventType === 'INSERT' && payload.new && payload.new.id) {
                const newPig = rowToPig(payload.new);
                if (!newPig || !newPig.id) return;
                setPigs(prev => {
                  const arr = Array.isArray(prev) ? prev : [];
                  const exists = arr.some(p => p && p.id === newPig.id);
                  if (exists) {
                    return arr.map(p => p && p.id === newPig.id ? newPig : p);
                  }
                  return [newPig, ...arr];
                });
              } else if (payload.eventType === 'UPDATE' && payload.new && payload.new.id) {
                const updatedPig = rowToPig(payload.new);
                if (!updatedPig || !updatedPig.id) return;
                setPigs(prev => {
                  const arr = Array.isArray(prev) ? prev : [];
                  return arr.map(p => p && p.id === updatedPig.id ? updatedPig : p);
                });
              } else if (payload.eventType === 'DELETE' && payload.old && (payload.old.id !== undefined && payload.old.id !== null)) {
                const deletedId = String(payload.old.id);
                setPigs(prev => {
                  const arr = Array.isArray(prev) ? prev : [];
                  return arr.filter(p => p && p.id !== deletedId);
                });
              }
            } catch (err) {
              console.error('Error handling realtime pig record update:', err);
            }
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'users' },
          (payload) => {
            console.log('[Realtime DB Event - users]:', payload);
            try {
              if (payload.eventType === 'INSERT' && payload.new && payload.new.username) {
                const newUser = rowToUser(payload.new);
                if (!newUser || !newUser.username) return;
                setUsers(prev => {
                  const arr = Array.isArray(prev) ? prev : [];
                  const exists = arr.some(u => u && u.username === newUser.username);
                  if (exists) {
                    return arr.map(u => u && u.username === newUser.username ? newUser : u);
                  }
                  return [...arr, newUser];
                });
              } else if (payload.eventType === 'UPDATE' && payload.new && payload.new.username) {
                const updatedUser = rowToUser(payload.new);
                if (!updatedUser || !updatedUser.username) return;
                setUsers(prev => {
                  const arr = Array.isArray(prev) ? prev : [];
                  return arr.map(u => u && u.username === updatedUser.username ? updatedUser : u);
                });
              } else if (payload.eventType === 'DELETE' && payload.old && payload.old.username) {
                const deletedUsername = String(payload.old.username);
                setUsers(prev => {
                  const arr = Array.isArray(prev) ? prev : [];
                  return arr.filter(u => u && u.username !== deletedUsername);
                });
              }
            } catch (err) {
              console.error('Error handling realtime user update:', err);
            }
          }
        )
        .subscribe((status) => {
          console.log('[Realtime Channel Status]:', status);
          if (status === 'SUBSCRIBED') {
            setRealtimeStatus('connected');
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            setRealtimeStatus('disconnected');
          } else {
            setRealtimeStatus('connecting');
          }
        });

      return () => {
        try {
          supabase.removeChannel(channel);
        } catch (err) {
          console.warn('[Realtime Cleanup Notice]', err);
        }
      };
    } catch (err) {
      console.warn('[Realtime Subscription Exception]', err);
      setRealtimeStatus('disconnected');
    }
  }, [setPigs, setUsers, triggerResync]);

  // Reconnection Sync: Attach online and visibilitychange event listeners with throttling
  useEffect(() => {
    const handleReconnect = () => {
      console.log('[Auto-Resync] Network restored or tab focused. Triggering throttled Supabase background refresh...');
      triggerResync(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleReconnect();
      }
    };

    window.addEventListener('online', handleReconnect);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleReconnect);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [triggerResync]);

  return {
    realtimeStatus,
    triggerResync
  };
}
