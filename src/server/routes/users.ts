import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma, supabaseServerAdmin } from '../db/prisma';
import { rowToUser, userToRow } from '../../services/supabaseClient';

export const usersRouter = Router();

const UserSchema = z.object({
  id: z.string().optional(),
  username: z.string().min(1, 'Username is required'),
  password: z.string().optional().default(''),
  role: z.enum(['admin', 'user']).default('user'),
  fullName: z.string().min(1, 'Full name is required'),
  barangay: z.string().nullable().optional(),
  assigned_barangay: z.string().nullable().optional(),
  isActive: z.boolean().optional().default(true),
  is_active: z.boolean().optional().default(true),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
});

const BatchUserSchema = z.array(UserSchema);

/**
 * GET /api/users
 * List all users
 */
usersRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    try {
      const users = await prisma.user.findMany({
        orderBy: { fullName: 'asc' },
      });

      return res.json({
        status: 'success',
        source: 'prisma',
        count: users.length,
        data: users.map(u => ({
          id: u.id,
          username: u.username,
          role: u.role,
          fullName: u.fullName,
          barangay: u.barangay || u.assignedBarangay,
          assigned_barangay: u.assignedBarangay || u.barangay,
          isActive: u.isActive,
          is_active: u.isActive,
          email: u.email || undefined,
          phone: u.phone || undefined,
          avatarUrl: u.avatarUrl || undefined,
        })),
      });
    } catch (prismaErr) {
      console.warn('[Prisma Users API Warning] Falling back to Supabase client:', prismaErr);

      const { data, error } = await supabaseServerAdmin
        .from('users')
        .select('*')
        .order('full_name', { ascending: true });

      if (error) throw error;

      const mapped = (data || []).map(rowToUser);
      return res.json({
        status: 'success',
        source: 'supabase',
        count: mapped.length,
        data: mapped,
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/users
 * Create or update user
 */
usersRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = UserSchema.parse(req.body);
    const uname = validated.username.toLowerCase();
    const barangayVal = validated.barangay || validated.assigned_barangay || null;
    const activeVal = validated.isActive !== undefined ? validated.isActive : (validated.is_active !== undefined ? validated.is_active : true);

    try {
      const user = await prisma.user.upsert({
        where: { username: uname },
        update: {
          fullName: validated.fullName,
          role: validated.role,
          barangay: barangayVal,
          assignedBarangay: barangayVal,
          isActive: activeVal,
          email: validated.email || null,
          phone: validated.phone || null,
          avatarUrl: validated.avatarUrl || null,
          passwordHash: validated.password ? validated.password : undefined,
        },
        create: {
          username: uname,
          fullName: validated.fullName,
          role: validated.role,
          barangay: barangayVal,
          assignedBarangay: barangayVal,
          isActive: activeVal,
          email: validated.email || null,
          phone: validated.phone || null,
          avatarUrl: validated.avatarUrl || null,
          passwordHash: validated.password || undefined,
        },
      });

      return res.status(201).json({
        status: 'success',
        source: 'prisma',
        data: user,
      });
    } catch (prismaErr) {
      console.warn('[Prisma User Save Warning] Falling back to Supabase client:', prismaErr);

      const row = userToRow(validated as any);
      const { error } = await supabaseServerAdmin.from('users').upsert(row, { onConflict: 'username' });
      if (error) throw error;

      return res.status(201).json({
        status: 'success',
        source: 'supabase',
        data: validated,
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/users/batch
 * Batch upsert users
 */
usersRouter.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedArray = BatchUserSchema.parse(req.body);

    try {
      const results = await Promise.all(
        validatedArray.map(u => {
          const uname = u.username.toLowerCase();
          const bg = u.barangay || u.assigned_barangay || null;
          return prisma.user.upsert({
            where: { username: uname },
            update: {
              fullName: u.fullName,
              role: u.role,
              barangay: bg,
              assignedBarangay: bg,
              isActive: u.isActive !== undefined ? u.isActive : u.is_active,
              email: u.email || null,
              phone: u.phone || null,
            },
            create: {
              username: uname,
              fullName: u.fullName,
              role: u.role,
              barangay: bg,
              assignedBarangay: bg,
              isActive: u.isActive !== undefined ? u.isActive : u.is_active,
              email: u.email || null,
              phone: u.phone || null,
            },
          });
        })
      );

      return res.json({
        status: 'success',
        source: 'prisma',
        count: results.length,
      });
    } catch (prismaErr) {
      const rows = validatedArray.map(u => userToRow(u as any));
      const { error } = await supabaseServerAdmin.from('users').upsert(rows, { onConflict: 'username' });
      if (error) throw error;

      return res.json({
        status: 'success',
        source: 'supabase',
        count: rows.length,
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/users/:username
 * Delete single user by username
 */
usersRouter.delete('/:username', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const username = req.params.username.toLowerCase();

    try {
      await prisma.user.delete({ where: { username } });
      return res.json({ status: 'success', message: 'User deleted successfully' });
    } catch (prismaErr) {
      const { error } = await supabaseServerAdmin.from('users').delete().eq('username', username);
      if (error) throw error;
      return res.json({ status: 'success', message: 'User deleted successfully' });
    }
  } catch (err) {
    next(err);
  }
});
