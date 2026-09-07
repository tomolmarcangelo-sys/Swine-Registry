import React, { useEffect, useState, useCallback, Dispatch, SetStateAction } from 'react';
import { supabase } from '../services/supabase';
import { rowToPig, rowToUser, isSupabaseConfigured } from '../services/supabaseClient';
import { syncWithSupabase } from '../services/syncService';
import { PigRecord, User } from '../types';

export type RealtimeStatus = 'connected' | 'connecting' | 'disconnected';

export interface UseRealtimeSyncProps {
  setPigs: Dispatch<SetStateAction<PigRecord[]>>;
  setUsers: Dispatch<SetStateAction<User[]>>;
}

export function useRealtimeSync({ setPigs, setUsers }: UseRealtimeSyncProps) {
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting');

  // Trigger manual or auto background resync
  const triggerResync = useCallback(async () => {
    try {
      const synced = await syncWithSupabase();
      if (synced) {
        if (Array.isArray(synced.pigs)) setPigs(synced.pigs);
        if (Array.isArray(synced.users)) setUsers(synced.users);
      }
    } catch (err) {
      console.warn('[useRealtimeSync] Auto-resync notice:', err);
    }
  }, [setPigs, setUsers]);

  // Subscribe to Supabase Realtime postgres_changes on pig_records, farms, and users tables
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) {
      setRealtimeStatus('disconnected');
      return;
    }

    setRealtimeStatus('connecting');

    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pig_records' },
        (payload) => {
          console.log('[Realtime DB Event - pig_records]:', payload);
          if (payload.eventType === 'INSERT' && payload.new) {
            const newPig = rowToPig(payload.new);
            setPigs(prev => {
              const exists = prev.some(p => p.id === newPig.id);
              if (exists) {
                return prev.map(p => p.id === newPig.id ? newPig : p);
              }
              return [newPig, ...prev];
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedPig = rowToPig(payload.new);
            setPigs(prev => prev.map(p => p.id === updatedPig.id ? updatedPig : p));
          } else if (payload.eventType === 'DELETE' && payload.old && (payload.old.id !== undefined && payload.old.id !== null)) {
            const deletedId = String(payload.old.id);
            setPigs(prev => prev.filter(p => p.id !== deletedId));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'farms' },
        (payload) => {
          console.log('[Realtime DB Event - farms]:', payload);
          triggerResync();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
          console.log('[Realtime DB Event - users]:', payload);
          if (payload.eventType === 'INSERT' && payload.new) {
            const newUser = rowToUser(payload.new);
            setUsers(prev => {
              const exists = prev.some(u => u.username === newUser.username);
              if (exists) {
                return prev.map(u => u.username === newUser.username ? newUser : u);
              }
              return [...prev, newUser];
            });
          } else if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedUser = rowToUser(payload.new);
            setUsers(prev => prev.map(u => u.username === updatedUser.username ? updatedUser : u));
          } else if (payload.eventType === 'DELETE' && payload.old && payload.old.username) {
            const deletedUsername = String(payload.old.username);
            setUsers(prev => prev.filter(u => u.username !== deletedUsername));
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
      supabase.removeChannel(channel);
    };
  }, [setPigs, setUsers, triggerResync]);

  // Reconnection Sync: Attach online and visibilitychange event listeners for auto-resync
  useEffect(() => {
    const handleReconnect = () => {
      console.log('[Auto-Resync] Network restored or tab focused. Triggering Supabase background refresh...');
      triggerResync();
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
