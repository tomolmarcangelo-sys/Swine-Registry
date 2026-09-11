import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { rowToPig, pigToRow, rowToUser, userToRow } from '../../services/supabaseClient';

// Supabase Direct Client Configuration
const DEFAULT_SUPABASE_URL = 'https://lpkquznudtqrpuzmwhdt.supabase.co';
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

export const supabaseServerAdmin: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

export interface PrismaPigRecordDelegate {
  findMany: (args?: any) => Promise<any[]>;
  findUnique: (args: { where: { id: string } }) => Promise<any | null>;
  findFirst: (args?: any) => Promise<any | null>;
  upsert: (args: any) => Promise<any>;
  delete: (args: any) => Promise<any>;
  count: (args?: any) => Promise<number>;
}

export interface PrismaUserDelegate {
  findMany: (args?: any) => Promise<any[]>;
  findUnique: (args: { where: { username: string } }) => Promise<any | null>;
  findFirst: (args?: any) => Promise<any | null>;
  upsert: (args: any) => Promise<any>;
  delete: (args: any) => Promise<any>;
  count: (args?: any) => Promise<number>;
}

export interface PrismaAuditLogDelegate {
  findMany: (args?: any) => Promise<any[]>;
  create: (args: any) => Promise<any>;
}

export class PrismaClientEngine {
  pigRecord: PrismaPigRecordDelegate;
  user: PrismaUserDelegate;
  auditLog: PrismaAuditLogDelegate;

  constructor() {
    this.pigRecord = {
      findMany: async (args?: any) => {
        let query = supabaseServerAdmin.from('pig_records').select('*').order('created_at', { ascending: false });
        if (args?.where?.barangay) {
          query = query.eq('barangay', args.where.barangay);
        }
        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map(rowToPig);
      },
      findUnique: async (args: { where: { id: string } }) => {
        const { data, error } = await supabaseServerAdmin
          .from('pig_records')
          .select('*')
          .eq('id', args.where.id)
          .maybeSingle();
        if (error) throw error;
        return data ? rowToPig(data) : null;
      },
      findFirst: async (args?: any) => {
        let query = supabaseServerAdmin.from('pig_records').select('*').limit(1);
        if (args?.where?.id) {
          query = query.eq('id', args.where.id);
        }
        const { data, error } = await query.maybeSingle();
        if (error) throw error;
        return data ? rowToPig(data) : null;
      },
      upsert: async (args: any) => {
        const payload = args.create || args.update;
        const row = pigToRow(payload);
        const { data, error } = await supabaseServerAdmin
          .from('pig_records')
          .upsert(row, { onConflict: 'id' })
          .select()
          .maybeSingle();
        if (error) throw error;
        return data ? rowToPig(data) : payload;
      },
      delete: async (args: any) => {
        const id = args.where.id;
        const { error } = await supabaseServerAdmin.from('pig_records').delete().eq('id', id);
        if (error) throw error;
        return { id };
      },
      count: async () => {
        const { count, error } = await supabaseServerAdmin
          .from('pig_records')
          .select('*', { count: 'exact', head: true });
        if (error) throw error;
        return count ?? 0;
      },
    };

    this.user = {
      findMany: async (args?: any) => {
        const { data, error } = await supabaseServerAdmin
          .from('users')
          .select('*')
          .order('full_name', { ascending: true });
        if (error) throw error;
        return (data || []).map(rowToUser);
      },
      findUnique: async (args: { where: { username: string } }) => {
        const { data, error } = await supabaseServerAdmin
          .from('users')
          .select('*')
          .eq('username', args.where.username)
          .maybeSingle();
        if (error) throw error;
        return data ? rowToUser(data) : null;
      },
      findFirst: async (args?: any) => {
        let query = supabaseServerAdmin.from('users').select('*').limit(1);
        if (args?.where?.username) {
          query = query.eq('username', args.where.username);
        }
        const { data, error } = await query.maybeSingle();
        if (error) throw error;
        return data ? rowToUser(data) : null;
      },
      upsert: async (args: any) => {
        const payload = args.create || args.update;
        const row = userToRow(payload);
        const { data, error } = await supabaseServerAdmin
          .from('users')
          .upsert(row, { onConflict: 'username' })
          .select()
          .maybeSingle();
        if (error) throw error;
        return data ? rowToUser(data) : payload;
      },
      delete: async (args: any) => {
        const username = args.where.username;
        const { error } = await supabaseServerAdmin.from('users').delete().eq('username', username);
        if (error) throw error;
        return { username };
      },
      count: async () => {
        const { count, error } = await supabaseServerAdmin
          .from('users')
          .select('*', { count: 'exact', head: true });
        if (error) throw error;
        return count ?? 0;
      },
    };

    this.auditLog = {
      findMany: async (args?: any) => {
        const { data, error } = await supabaseServerAdmin
          .from('audit_logs')
          .select('*')
          .order('timestamp', { ascending: false });
        if (error) throw error;
        return data || [];
      },
      create: async (args: any) => {
        const { data, error } = await supabaseServerAdmin
          .from('audit_logs')
          .insert(args.data)
          .select()
          .single();
        if (error) throw error;
        return data;
      },
    };
  }
}

// Global singleton pattern for PrismaClientEngine
const globalForPrisma = global as unknown as { prisma: PrismaClientEngine };

export const prisma = globalForPrisma.prisma || new PrismaClientEngine();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
