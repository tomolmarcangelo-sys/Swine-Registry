import systemLogicData from './systemLogic.json';
import { PigRecord, BiosecurityAssessment } from '../types';

export interface PurposeDefinition {
  label: string;
  purposeKey: string;
  requiredFields: string[];
  biosecurityWeight: number;
  pcicEligible: boolean;
  minBiosecurityForPcic?: number;
  maxRecommendedHeads?: number;
  description?: string;
}

export interface SystemLogicConfig {
  purposes: Record<string, PurposeDefinition>;
  housingOptions: string[];
  feedingOptions: string[];
  wasteManagementOptions: string[];
  biosecurity: {
    totalChecklistItems: number;
    passingScore: number;
    criticalDeficitThreshold: number;
    zeroSwillStrictEnforcement: boolean;
    protocols: Array<{
      key: keyof BiosecurityAssessment;
      name: string;
      critical: boolean;
      weight: number;
    }>;
  };
  asfRiskClassification: Record<
    string,
    {
      level: string;
      badgeColor: string;
      description: string;
    }
  >;
  pcicInsurance: {
    program: string;
    minBiosecurityBackyard: number;
    minBiosecurityCommercial: number;
    requireVaccination: boolean;
    requireZeroSwill: boolean;
    requireMunicipalEarTag: boolean;
    requirePreciseGps: boolean;
    maxGpsAccuracyMeters: number;
  };
  spatialSurveillance: {
    municipality: string;
    province: string;
    defaultCenter: { lat: number; lng: number };
    densityClusterRadiusMeters: number;
    surveillanceBufferRadiusMeters: number;
    maxAllowedGpsAccuracy: number;
  };
}

export const SYSTEM_LOGIC: SystemLogicConfig = systemLogicData as unknown as SystemLogicConfig;

/**
 * Normalizes a purpose string to its configured key in systemLogic
 */
export function normalizePurposeKey(purpose: string = ''): string {
  const clean = purpose.toUpperCase().replace(/[\s\/-]+/g, '_');
  if (clean.includes('BACKYARD')) return 'BACKYARD_RAISING';
  if (clean.includes('BREEDING') && !clean.includes('COMMERCIAL')) return 'BREEDING_STOCK';
  if (clean.includes('FATTENING') || clean.includes('COMMERCIAL_FATTENING')) return 'COMMERCIAL_FATTENING';
  if (clean.includes('PIGGERY')) return 'PIGGERY';
  if (clean.includes('COMMERCIAL_BREEDING')) return 'COMMERCIAL_BREEDING';
  return 'BACKYARD_RAISING';
}

/**
 * Retrieve the purpose definition configuration
 */
export function getPurposeDefinition(purpose: string = ''): PurposeDefinition {
  const key = normalizePurposeKey(purpose);
  return SYSTEM_LOGIC.purposes[key] || SYSTEM_LOGIC.purposes.BACKYARD_RAISING;
}

/**
 * Map database/JSON field names to PigRecord property values
 */
export function getFieldValue(record: Partial<PigRecord>, fieldName: string): any {
  switch (fieldName) {
    case 'owner_name':
    case 'ownerName':
      return record.ownerName;
    case 'barangay':
      return record.barangay;
    case 'head_count':
    case 'headCount':
      return record.headCount !== undefined ? record.headCount : 1;
    case 'health_status':
    case 'healthStatus':
      return record.healthStatus || (record.isDeceased ? 'Deceased' : (record.asfCleared ? 'Healthy' : 'Suspect'));
    case 'breed':
      return record.breed;
    case 'vaccination_status':
    case 'vaccinated':
      return record.vaccinated;
    case 'lat':
    case 'latitude':
      return record.lat;
    case 'lng':
    case 'longitude':
      return record.lng;
    case 'weight':
      return record.weight;
    case 'housing_type':
    case 'housingType':
      return (record as any).housingType || (record.biosecurity as any)?.housingType || record.notes;
    case 'feeding_type':
    case 'feedingType':
      return (record as any).feedingType || (record.biosecurity as any)?.feedingType;
    case 'waste_management':
    case 'wasteManagement':
      return (record as any).wasteManagement || (record.biosecurity as any)?.wasteManagement;
    default:
      return (record as any)[fieldName];
  }
}

/**
 * Evaluates biosecurity score (out of 7) and checklist deficit
 */
export function calculateBiosecurityScore(biosecurity?: BiosecurityAssessment): {
  score: number;
  maxScore: number;
  percentage: number;
  isCompliant: boolean;
  isSwillViolation: boolean;
  missingPractices: string[];
} {
  if (!biosecurity) {
    return {
      score: 4,
      maxScore: 7,
      percentage: 57,
      isCompliant: false,
      isSwillViolation: false,
      missingPractices: ['Biosecurity checklist not yet submitted']
    };
  }

  const missingPractices: string[] = [];
  let score = 0;

  SYSTEM_LOGIC.biosecurity.protocols.forEach((proto) => {
    const isMet = Boolean(biosecurity[proto.key]);
    if (isMet) {
      score++;
    } else {
      missingPractices.push(proto.name);
    }
  });

  const isSwillViolation = !biosecurity.swillFeedingBanned;
  const isCompliant = score >= SYSTEM_LOGIC.biosecurity.passingScore && !isSwillViolation;

  return {
    score,
    maxScore: 7,
    percentage: Math.round((score / 7) * 100),
    isCompliant,
    isSwillViolation,
    missingPractices
  };
}

/**
 * Determines ASF Risk Level based on farm biosecurity protocols and location data
 */
export function determineAsfRiskLevel(pig: Partial<PigRecord>): {
  level: string;
  code: 'GREEN' | 'YELLOW' | 'PINK' | 'RED';
  badgeColor: string;
  reason: string;
} {
  if (pig.isDeceased) {
    return {
      level: SYSTEM_LOGIC.asfRiskClassification.RED.level,
      code: 'RED',
      badgeColor: 'red',
      reason: `Recorded Mortality: ${pig.mortalityReason || 'Suspected Outbreak'}`
    };
  }

  if (pig.healthStatus === 'Quarantined' || pig.healthStatus === 'Suspect' || pig.asfCleared === false) {
    return {
      level: SYSTEM_LOGIC.asfRiskClassification.RED.level,
      code: 'RED',
      badgeColor: 'red',
      reason: 'Active disease alert or un-cleared ASF clinical signs'
    };
  }

  const bioEval = calculateBiosecurityScore(pig.biosecurity);

  if (bioEval.isSwillViolation) {
    return {
      level: SYSTEM_LOGIC.asfRiskClassification.RED.level,
      code: 'RED',
      badgeColor: 'red',
      reason: 'Critical Non-Compliance: Swill / kitchen waste feeding detected (Strict DA Ban)'
    };
  }

  if (bioEval.score <= SYSTEM_LOGIC.biosecurity.criticalDeficitThreshold) {
    return {
      level: SYSTEM_LOGIC.asfRiskClassification.PINK.level,
      code: 'PINK',
      badgeColor: 'rose',
      reason: `Deficient Biosecurity (${bioEval.score}/7) - Multiple sanitation barriers missing`
    };
  }

  if (!pig.vaccinated || bioEval.score <= 4) {
    return {
      level: SYSTEM_LOGIC.asfRiskClassification.YELLOW.level,
      code: 'YELLOW',
      badgeColor: 'amber',
      reason: 'Standard Surveillance: Unvaccinated herd or moderate barrier score'
    };
  }

  return {
    level: SYSTEM_LOGIC.asfRiskClassification.GREEN.level,
    code: 'GREEN',
    badgeColor: 'emerald',
    reason: 'Compliant biosecurity protocols with verified health status'
  };
}

/**
 * Validates whether a record satisfies PCIC Insurance Eligibility rules
 */
export function evaluatePcicEligibility(pig: Partial<PigRecord>): {
  isEligible: boolean;
  reasons: string[];
  failedCriteria: string[];
} {
  const reasons: string[] = [];
  const failedCriteria: string[] = [];
  const purposeDef = getPurposeDefinition(pig.purpose);

  // 1. Must not be deceased or quarantined
  if (pig.isDeceased) {
    failedCriteria.push('Deceased animal not eligible for active coverage');
  } else if (pig.healthStatus === 'Quarantined' || pig.asfCleared === false) {
    failedCriteria.push('Currently under ASF quarantine / suspect status');
  } else {
    reasons.push('Verified active and healthy herd status');
  }

  // 2. Ear Tag verification
  if (!pig.earTag || pig.earTag.trim().length < 4) {
    failedCriteria.push('Official Municipal Ear Tag required for PCIC claim tracking');
  } else {
    reasons.push(`Official tag: ${pig.earTag}`);
  }

  // 3. Vaccination
  if (SYSTEM_LOGIC.pcicInsurance.requireVaccination && !pig.vaccinated) {
    failedCriteria.push('Mandatory anti-hog cholera vaccination record required');
  } else {
    reasons.push('Certified vaccination record verified');
  }

  // 4. Biosecurity score & zero swill
  const bioEval = calculateBiosecurityScore(pig.biosecurity);
  const minRequiredScore = purposeDef.minBiosecurityForPcic || SYSTEM_LOGIC.pcicInsurance.minBiosecurityBackyard;

  if (bioEval.isSwillViolation) {
    failedCriteria.push('Zero-swill feeding compliance is strictly mandatory for PCIC coverage');
  } else if (bioEval.score < minRequiredScore) {
    failedCriteria.push(`Biosecurity score (${bioEval.score}/7) below PCIC minimum requirement of ${minRequiredScore}/7 for ${purposeDef.label}`);
  } else {
    reasons.push(`Biosecurity score (${bioEval.score}/7) satisfies ${purposeDef.label} standard`);
  }

  // 5. GPS Geotagging
  if (SYSTEM_LOGIC.pcicInsurance.requirePreciseGps) {
    if (!pig.lat || !pig.lng || (pig.lat === 0 && pig.lng === 0)) {
      failedCriteria.push('Geotagged GPS coordinates required for farm parcel verification');
    } else {
      reasons.push(`GPS verified: ${pig.lat.toFixed(4)}°N, ${pig.lng.toFixed(4)}°E`);
    }
  }

  const isEligible = failedCriteria.length === 0 && purposeDef.pcicEligible;

  return {
    isEligible,
    reasons,
    failedCriteria
  };
}

/**
 * Validates a swine record against the purpose schema requirements
 */
export function validatePigByPurpose(record: Partial<PigRecord>): {
  isValid: boolean;
  errors: string[];
  missingFields: string[];
} {
  const purposeDef = getPurposeDefinition(record.purpose);
  const errors: string[] = [];
  const missingFields: string[] = [];

  for (const field of purposeDef.requiredFields) {
    const val = getFieldValue(record, field);
    if (val === undefined || val === null || (typeof val === 'string' && val.trim() === '')) {
      missingFields.push(field);
      errors.push(`Field '${field}' is required for ${purposeDef.label} purpose.`);
    }
  }

  // Additional sanity validation
  if (record.lat !== undefined && record.lng !== undefined) {
    if (isNaN(Number(record.lat)) || isNaN(Number(record.lng))) {
      errors.push('Latitude and Longitude must be valid numerical coordinates.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    missingFields
  };
}

/**
 * Extracts precise GPS coordinates with fallback and validation
 */
export function extractPreciseGpsCoordinates(record: Partial<PigRecord>): {
  lat: number;
  lng: number;
  isPrecise: boolean;
  accuracy?: number;
} {
  const defaultCenter = SYSTEM_LOGIC.spatialSurveillance.defaultCenter;
  const lat = Number(record.lat ?? defaultCenter.lat);
  const lng = Number(record.lng ?? defaultCenter.lng);
  const accuracy = record.gpsAccuracy;
  const isPrecise = !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0 && (accuracy === undefined || accuracy <= SYSTEM_LOGIC.spatialSurveillance.maxAllowedGpsAccuracy);

  return {
    lat,
    lng,
    isPrecise,
    accuracy
  };
}
