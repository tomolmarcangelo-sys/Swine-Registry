import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma, supabaseServerAdmin } from '../db/prisma';
import { rowToPig, pigToRow } from '../../services/supabaseClient';
import { PigRecord } from '../../types';
import { 
  validatePigByPurpose, 
  calculateBiosecurityScore, 
  determineAsfRiskLevel, 
  evaluatePcicEligibility, 
  extractPreciseGpsCoordinates 
} from '../../config/systemLogic';

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
  housingType: z.string().optional(),
  feedingType: z.string().optional(),
  wasteManagement: z.string().optional(),
  asfRiskLevel: z.string().optional(),
  biosecurityScore: z.number().optional(),
  pcicEligible: z.boolean().optional(),
});

const BatchPigSchema = z.array(PigSchema);

async function recordAuditLog(log: {
  username: string;
  userFullName?: string;
  role?: string;
  action: string;
  details: string;
  entityType: string;
  barangay?: string | null;
  ipAddress?: string;
}) {
  const auditId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  try {
    await prisma.auditLog.create({
      data: {
        id: auditId,
        username: log.username,
        userFullName: log.userFullName || log.username,
        role: log.role || 'user',
        action: log.action,
        details: log.details,
        entityType: log.entityType,
        barangay: log.barangay || null,
        ipAddress: log.ipAddress || '127.0.0.1',
      },
    });
  } catch (prismaErr) {
    try {
      await supabaseServerAdmin.from('audit_logs').insert([{
        id: auditId,
        username: log.username,
        user_full_name: log.userFullName || log.username,
        role: log.role || 'user',
        action: log.action,
        details: log.details,
        entity_type: log.entityType,
        barangay: log.barangay || null,
        ip_address: log.ipAddress || '127.0.0.1',
      }]);
    } catch {
      // Non-blocking log catch
    }
  }
}

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
 * Create or upsert a single swine record with Zod payload validation & purpose-driven rules
 */
swineRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = PigSchema.parse(req.body);

    // Purpose-specific schema and business logic validation
    const candidatePig = validated as unknown as Partial<PigRecord>;
    const purposeValidation = validatePigByPurpose(candidatePig);
    if (!purposeValidation.isValid) {
      return res.status(400).json({
        status: 'error',
        message: `Purpose validation failed for '${validated.purpose}': ${purposeValidation.errors.join(' ')}`,
        errors: purposeValidation.errors,
        missingFields: purposeValidation.missingFields,
      });
    }

    // Calculate system logic outputs: biosecurity, ASF risk, PCIC eligibility, precise GPS
    const bioScore = calculateBiosecurityScore(validated.biosecurity);
    const asfRisk = determineAsfRiskLevel(candidatePig);
    const pcicEval = evaluatePcicEligibility(candidatePig);
    const coords = extractPreciseGpsCoordinates(candidatePig);

    const biosecurityPayload = {
      ...(typeof validated.biosecurity === 'object' && validated.biosecurity !== null ? validated.biosecurity : {}),
      score: bioScore.score,
      maxScore: bioScore.maxScore,
      isCompliant: bioScore.isCompliant,
      isSwillViolation: bioScore.isSwillViolation,
      asfRiskLevel: asfRisk.level,
      asfRiskCode: asfRisk.code,
      pcicEligible: pcicEval.isEligible,
      housingType: validated.housingType || (validated.biosecurity as any)?.housingType,
      feedingType: validated.feedingType || (validated.biosecurity as any)?.feedingType,
      wasteManagement: validated.wasteManagement || (validated.biosecurity as any)?.wasteManagement,
    };

    const enrichedRecord = {
      ...validated,
      lat: coords.lat,
      lng: coords.lng,
      biosecurity: biosecurityPayload,
      biosecurityLevel: bioScore.score,
      biosecurityScore: bioScore.score,
      asfRiskLevel: asfRisk.level,
      pcicEligible: pcicEval.isEligible,
    };

    try {
      // Prisma Upsert
      const record = await prisma.pigRecord.upsert({
        where: { id: validated.id },
        update: {
          earTag: enrichedRecord.earTag,
          ownerName: enrichedRecord.ownerName,
          contact: enrichedRecord.contact,
          address: enrichedRecord.address,
          barangay: enrichedRecord.barangay,
          breed: enrichedRecord.breed,
          sex: enrichedRecord.sex,
          age: enrichedRecord.age,
          weight: enrichedRecord.weight,
          purpose: enrichedRecord.purpose,
          vaccinated: enrichedRecord.vaccinated,
          asfCleared: enrichedRecord.asfCleared,
          lat: enrichedRecord.lat,
          lng: enrichedRecord.lng,
          gpsAccuracy: enrichedRecord.gpsAccuracy,
          gpsAltitude: enrichedRecord.gpsAltitude,
          gpsTimestamp: enrichedRecord.gpsTimestamp,
          registeredBy: enrichedRecord.registeredBy,
          notes: enrichedRecord.notes,
          biosecurity: biosecurityPayload as any,
          photoUrl: enrichedRecord.photoUrl,
          healthStatus: enrichedRecord.healthStatus,
          isDeceased: enrichedRecord.isDeceased,
          mortalityDate: enrichedRecord.mortalityDate,
          mortalityReason: enrichedRecord.mortalityReason,
          headCount: enrichedRecord.headCount,
          biosecurityLevel: bioScore.score,
        },
        create: {
          id: enrichedRecord.id,
          earTag: enrichedRecord.earTag,
          ownerName: enrichedRecord.ownerName,
          contact: enrichedRecord.contact,
          address: enrichedRecord.address,
          barangay: enrichedRecord.barangay,
          breed: enrichedRecord.breed,
          sex: enrichedRecord.sex,
          age: enrichedRecord.age,
          weight: enrichedRecord.weight,
          purpose: enrichedRecord.purpose,
          vaccinated: enrichedRecord.vaccinated,
          asfCleared: enrichedRecord.asfCleared,
          lat: enrichedRecord.lat,
          lng: enrichedRecord.lng,
          gpsAccuracy: enrichedRecord.gpsAccuracy,
          gpsAltitude: enrichedRecord.gpsAltitude,
          gpsTimestamp: enrichedRecord.gpsTimestamp,
          registeredBy: enrichedRecord.registeredBy,
          notes: enrichedRecord.notes,
          biosecurity: biosecurityPayload as any,
          photoUrl: enrichedRecord.photoUrl,
          healthStatus: enrichedRecord.healthStatus,
          isDeceased: enrichedRecord.isDeceased,
          mortalityDate: enrichedRecord.mortalityDate,
          mortalityReason: enrichedRecord.mortalityReason,
          headCount: enrichedRecord.headCount,
          biosecurityLevel: bioScore.score,
        },
      });

      // Non-blocking Audit Logging
      await recordAuditLog({
        username: enrichedRecord.registeredBy || 'focal_person',
        action: 'REGISTER_OR_UPDATE_SWINE',
        details: `Saved swine record ${enrichedRecord.earTag} (${enrichedRecord.ownerName}, Brgy: ${enrichedRecord.barangay}, Purpose: ${enrichedRecord.purpose}, PCIC: ${pcicEval.isEligible ? 'Eligible' : 'Not Eligible'}, Bio: ${bioScore.score}/7)`,
        entityType: 'pig',
        barangay: enrichedRecord.barangay,
        ipAddress: req.ip || '127.0.0.1',
      });

      return res.status(201).json({
        status: 'success',
        source: 'prisma',
        data: record,
      });
    } catch (prismaErr) {
      console.warn('[Prisma API Save Warning] Falling back to Supabase client:', prismaErr);

      const row = pigToRow(enrichedRecord as any);
      const { error } = await supabaseServerAdmin.from('pig_records').upsert(row, { onConflict: 'id' });
      if (error) throw error;

      await recordAuditLog({
        username: enrichedRecord.registeredBy || 'focal_person',
        action: 'REGISTER_OR_UPDATE_SWINE',
        details: `Saved swine record ${enrichedRecord.earTag} (${enrichedRecord.ownerName}, Brgy: ${enrichedRecord.barangay}, Purpose: ${enrichedRecord.purpose}, Bio: ${bioScore.score}/7)`,
        entityType: 'pig',
        barangay: enrichedRecord.barangay,
        ipAddress: req.ip || '127.0.0.1',
      });

      return res.status(201).json({
        status: 'success',
        source: 'supabase',
        data: enrichedRecord,
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

    const enrichedArray = validatedArray.map(item => {
      const candidateItem = item as unknown as Partial<PigRecord>;
      const bioScore = calculateBiosecurityScore(item.biosecurity);
      const asfRisk = determineAsfRiskLevel(candidateItem);
      const pcicEval = evaluatePcicEligibility(candidateItem);
      const coords = extractPreciseGpsCoordinates(candidateItem);

      const biosecurityPayload = {
        ...(typeof item.biosecurity === 'object' && item.biosecurity !== null ? item.biosecurity : {}),
        score: bioScore.score,
        maxScore: bioScore.maxScore,
        isCompliant: bioScore.isCompliant,
        isSwillViolation: bioScore.isSwillViolation,
        asfRiskLevel: asfRisk.level,
        asfRiskCode: asfRisk.code,
        pcicEligible: pcicEval.isEligible,
        housingType: item.housingType || (item.biosecurity as any)?.housingType,
        feedingType: item.feedingType || (item.biosecurity as any)?.feedingType,
        wasteManagement: item.wasteManagement || (item.biosecurity as any)?.wasteManagement,
      };

      return {
        ...item,
        lat: coords.lat,
        lng: coords.lng,
        biosecurity: biosecurityPayload,
        biosecurityLevel: bioScore.score,
      };
    });

    try {
      const results = await Promise.all(
        enrichedArray.map(item =>
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

      await recordAuditLog({
        username: 'focal_batch_sync',
        action: 'BATCH_SYNC_SWINE',
        details: `Batch synced ${results.length} swine records to primary database`,
        entityType: 'pig',
        ipAddress: req.ip || '127.0.0.1',
      });

      return res.json({
        status: 'success',
        source: 'prisma',
        count: results.length,
      });
    } catch (prismaErr) {
      console.warn('[Prisma Batch Warning] Falling back to Supabase client:', prismaErr);

      const rows = enrichedArray.map(item => pigToRow(item as any));
      const { error } = await supabaseServerAdmin.from('pig_records').upsert(rows, { onConflict: 'id' });
      if (error) throw error;

      await recordAuditLog({
        username: 'focal_batch_sync',
        action: 'BATCH_SYNC_SWINE',
        details: `Batch synced ${rows.length} swine records to Supabase storage`,
        entityType: 'pig',
        ipAddress: req.ip || '127.0.0.1',
      });

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
      const existing = await prisma.pigRecord.findUnique({ where: { id } });
      await prisma.pigRecord.delete({ where: { id } });

      await recordAuditLog({
        username: existing?.registeredBy || 'focal_person',
        action: 'DELETE_SWINE',
        details: `Deleted swine record ${existing?.earTag || id} (${existing?.ownerName || 'Unknown Owner'}, Brgy: ${existing?.barangay || 'Central'})`,
        entityType: 'pig',
        barangay: existing?.barangay,
        ipAddress: req.ip || '127.0.0.1',
      });

      return res.json({ status: 'success', message: 'Record deleted successfully' });
    } catch (prismaErr) {
      const { error } = await supabaseServerAdmin.from('pig_records').delete().eq('id', id);
      if (error) throw error;

      await recordAuditLog({
        username: 'focal_person',
        action: 'DELETE_SWINE',
        details: `Deleted swine record ${id} via direct client`,
        entityType: 'pig',
        ipAddress: req.ip || '127.0.0.1',
      });

      return res.json({ status: 'success', message: 'Record deleted successfully' });
    }
  } catch (err) {
    next(err);
  }
});
