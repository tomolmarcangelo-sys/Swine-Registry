import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma, supabaseServerAdmin } from '../db/prisma';
import { rowToPig, pigToRow } from '../../services/supabaseClient';

export const swineRouter = Router();

// Zod schema for PigRecord payload validation
const PigSchema = z.object({
  id: z.string().min(1),
  earTag: z.string().min(1, 'Ear tag is required'),
  ownerName: z.string().min(1, 'Owner name is required'),
  contact: z.string().optional().default(''),
  address: z.string().optional().default(''),
  barangay: z.string().min(1, 'Barangay is required'),
  breed: z.string().optional().default('Native / Native-cross'),
  sex: z.string().optional().default('Female'),
  age: z.number().optional().default(6),
  weight: z.number().optional().default(75),
  purpose: z.string().optional().default('Backyard Raising'),
  vaccinated: z.boolean().optional().default(false),
  asfCleared: z.boolean().optional().default(true),
  dateRegistered: z.string().optional().default(() => new Date().toISOString()),
  lat: z.number().optional().default(10.3700),
  lng: z.number().optional().default(125.2000),
  gpsAccuracy: z.number().optional(),
  gpsAltitude: z.number().optional(),
  gpsTimestamp: z.string().optional(),
  registeredBy: z.string().optional().default('focal_person'),
  notes: z.string().optional().default(''),
  biosecurity: z.any().optional(),
  photoUrl: z.string().optional().default(''),
  healthStatus: z.string().optional().default('Healthy'),
  isDeceased: z.boolean().optional().default(false),
  mortalityDate: z.string().optional(),
  mortalityReason: z.string().optional(),
  headCount: z.number().optional().default(1),
  biosecurityLevel: z.number().optional().default(1),
});

const BatchPigSchema = z.array(PigSchema);

/**
 * GET /api/swine
 * Fetch all swine records with filtering & search
 */
swineRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { barangay, search } = req.query;

    // Try Prisma ORM query first
    try {
      const whereClause: any = {};
      if (barangay && typeof barangay === 'string') {
        whereClause.barangay = barangay;
      }
      if (search && typeof search === 'string') {
        whereClause.OR = [
          { earTag: { contains: search, mode: 'insensitive' } },
          { ownerName: { contains: search, mode: 'insensitive' } },
          { barangay: { contains: search, mode: 'insensitive' } },
        ];
      }

      const prismaRecords = await prisma.pigRecord.findMany({
        where: whereClause,
        orderBy: { dateRegistered: 'desc' },
      });

      return res.json({
        status: 'success',
        source: 'prisma',
        count: prismaRecords.length,
        data: prismaRecords,
      });
    } catch (prismaErr) {
      console.warn('[Prisma API Warning] Falling back to Supabase client:', prismaErr);

      // Supabase Direct Fallback
      let query = supabaseServerAdmin.from('pig_records').select('*').order('created_at', { ascending: false });
      if (barangay && typeof barangay === 'string') {
        query = query.eq('barangay', barangay);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map(rowToPig);
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
 * POST /api/swine
 * Create or upsert a single swine record with Zod payload validation
 */
swineRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = PigSchema.parse(req.body);

    try {
      // Prisma Upsert
      const record = await prisma.pigRecord.upsert({
        where: { id: validated.id },
        update: {
          earTag: validated.earTag,
          ownerName: validated.ownerName,
          contact: validated.contact,
          address: validated.address,
          barangay: validated.barangay,
          breed: validated.breed,
          sex: validated.sex,
          age: validated.age,
          weight: validated.weight,
          purpose: validated.purpose,
          vaccinated: validated.vaccinated,
          asfCleared: validated.asfCleared,
          lat: validated.lat,
          lng: validated.lng,
          gpsAccuracy: validated.gpsAccuracy,
          gpsAltitude: validated.gpsAltitude,
          gpsTimestamp: validated.gpsTimestamp,
          registeredBy: validated.registeredBy,
          notes: validated.notes,
          biosecurity: validated.biosecurity ? validated.biosecurity : undefined,
          photoUrl: validated.photoUrl,
          healthStatus: validated.healthStatus,
          isDeceased: validated.isDeceased,
          mortalityDate: validated.mortalityDate,
          mortalityReason: validated.mortalityReason,
          headCount: validated.headCount,
          biosecurityLevel: validated.biosecurityLevel,
        },
        create: {
          id: validated.id,
          earTag: validated.earTag,
          ownerName: validated.ownerName,
          contact: validated.contact,
          address: validated.address,
          barangay: validated.barangay,
          breed: validated.breed,
          sex: validated.sex,
          age: validated.age,
          weight: validated.weight,
          purpose: validated.purpose,
          vaccinated: validated.vaccinated,
          asfCleared: validated.asfCleared,
          lat: validated.lat,
          lng: validated.lng,
          gpsAccuracy: validated.gpsAccuracy,
          gpsAltitude: validated.gpsAltitude,
          gpsTimestamp: validated.gpsTimestamp,
          registeredBy: validated.registeredBy,
          notes: validated.notes,
          biosecurity: validated.biosecurity ? validated.biosecurity : undefined,
          photoUrl: validated.photoUrl,
          healthStatus: validated.healthStatus,
          isDeceased: validated.isDeceased,
          mortalityDate: validated.mortalityDate,
          mortalityReason: validated.mortalityReason,
          headCount: validated.headCount,
          biosecurityLevel: validated.biosecurityLevel,
        },
      });

      return res.status(201).json({
        status: 'success',
        source: 'prisma',
        data: record,
      });
    } catch (prismaErr) {
      console.warn('[Prisma API Save Warning] Falling back to Supabase client:', prismaErr);

      const row = pigToRow(validated as any);
      const { error } = await supabaseServerAdmin.from('pig_records').upsert(row, { onConflict: 'id' });
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
 * POST /api/swine/batch
 * Batch upsert swine records
 */
swineRouter.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedArray = BatchPigSchema.parse(req.body);

    try {
      const results = await Promise.all(
        validatedArray.map(item =>
          prisma.pigRecord.upsert({
            where: { id: item.id },
            update: {
              earTag: item.earTag,
              ownerName: item.ownerName,
              contact: item.contact,
              address: item.address,
              barangay: item.barangay,
              breed: item.breed,
              sex: item.sex,
              age: item.age,
              weight: item.weight,
              purpose: item.purpose,
              vaccinated: item.vaccinated,
              asfCleared: item.asfCleared,
              lat: item.lat,
              lng: item.lng,
              registeredBy: item.registeredBy,
              notes: item.notes,
              biosecurity: item.biosecurity ? item.biosecurity : undefined,
              photoUrl: item.photoUrl,
              healthStatus: item.healthStatus,
              isDeceased: item.isDeceased,
              headCount: item.headCount,
              biosecurityLevel: item.biosecurityLevel,
            },
            create: {
              id: item.id,
              earTag: item.earTag,
              ownerName: item.ownerName,
              contact: item.contact,
              address: item.address,
              barangay: item.barangay,
              breed: item.breed,
              sex: item.sex,
              age: item.age,
              weight: item.weight,
              purpose: item.purpose,
              vaccinated: item.vaccinated,
              asfCleared: item.asfCleared,
              lat: item.lat,
              lng: item.lng,
              registeredBy: item.registeredBy,
              notes: item.notes,
              biosecurity: item.biosecurity ? item.biosecurity : undefined,
              photoUrl: item.photoUrl,
              healthStatus: item.healthStatus,
              isDeceased: item.isDeceased,
              headCount: item.headCount,
              biosecurityLevel: item.biosecurityLevel,
            },
          })
        )
      );

      return res.json({
        status: 'success',
        source: 'prisma',
        count: results.length,
      });
    } catch (prismaErr) {
      console.warn('[Prisma Batch Warning] Falling back to Supabase client:', prismaErr);

      const rows = validatedArray.map(item => pigToRow(item as any));
      const { error } = await supabaseServerAdmin.from('pig_records').upsert(rows, { onConflict: 'id' });
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
 * DELETE /api/swine/:id
 * Delete single swine record
 */
swineRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    try {
      await prisma.pigRecord.delete({ where: { id } });
      return res.json({ status: 'success', message: 'Record deleted successfully' });
    } catch (prismaErr) {
      const { error } = await supabaseServerAdmin.from('pig_records').delete().eq('id', id);
      if (error) throw error;
      return res.json({ status: 'success', message: 'Record deleted successfully' });
    }
  } catch (err) {
    next(err);
  }
});
