import { Router, Request, Response } from 'express';
import { prisma, supabaseServerAdmin } from '../db/prisma';

export const healthRouter = Router();

healthRouter.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'DA Hinunangan Swine Registry API Engine',
  });
});

healthRouter.get('/db-check', async (req: Request, res: Response) => {
  try {
    // Try Prisma connection first
    let prismaConnected = false;
    let pigCountPrisma = 0;

    try {
      pigCountPrisma = await prisma.pigRecord.count();
      prismaConnected = true;
    } catch (err: any) {
      console.warn('[Prisma DB Health Notice]:', err?.message || err);
    }

    // Try Supabase Admin connection
    let supabaseConnected = false;
    let pigCountSupabase = 0;

    try {
      const { count, error } = await supabaseServerAdmin
        .from('pig_records')
        .select('*', { count: 'exact', head: true });
      if (!error) {
        supabaseConnected = true;
        pigCountSupabase = count ?? 0;
      }
    } catch (err: any) {
      console.warn('[Supabase DB Health Notice]:', err?.message || err);
    }

    return res.json({
      status: prismaConnected || supabaseConnected ? 'online' : 'degraded',
      prisma: {
        connected: prismaConnected,
        count: pigCountPrisma,
      },
      supabase: {
        connected: supabaseConnected,
        count: pigCountSupabase,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({
      status: 'error',
      message: err?.message || 'Database health check failed',
    });
  }
});
