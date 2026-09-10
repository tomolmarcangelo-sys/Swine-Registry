export type Role = 'admin' | 'user';

export type PurposeType = 
  | 'Backyard Raising' 
  | 'Breeding Stock' 
  | 'Fattening/Commercial' 
  | 'Piggery';

export type BreedType = 
  | 'Native / Native-cross' 
  | 'Landrace' 
  | 'Large White' 
  | 'Duroc' 
  | 'Pietrain' 
  | 'Crossbred';

export interface BiosecurityAssessment {
  footbathMaintenance: boolean;      // Functional disinfectant footbath at entrance
  fencingIntegrity: boolean;         // Secure perimeter fencing preventing stray/wild animal entry
  swillFeedingBanned: boolean;       // 100% Zero-swill feeding compliance (DA ASF ban)
  disinfectionRoutine: boolean;      // Regular scheduled pen washing & chemical disinfection
  visitorLogControl: boolean;        // Visitor & vehicle access restriction with sanitation
  quarantineIsolationPen: boolean;   // Separate isolation / quarantine pen for new or sick animals
  cleanWaterSource: boolean;         // Enclosed clean/potable water supply
}

export interface User {
  id?: string;
  username: string;
  password?: string;
  role: Role;
  fullName: string;
  barangay: string | null;
  assigned_barangay?: string | null;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  isActive?: boolean;
  is_active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PigRecord {
  id: string;
  earTag: string;
  ownerName: string;
  contact: string;
  address: string;
  barangay: string;
  breed: BreedType | string;
  sex: 'Male' | 'Female';
  age: number; // in months
  weight: number; // in kg
  purpose: PurposeType | string;
  vaccinated: boolean;
  asfCleared: boolean;
  dateRegistered: string;
  lat: number;
  lng: number;
  gpsAccuracy?: number; // meters
  gpsAltitude?: number; // meters
  gpsTimestamp?: string;
  registeredBy: string;
  notes?: string;
  biosecurity?: BiosecurityAssessment;
  photoUrl?: string;
  isDeceased?: boolean;
  mortalityDate?: string;
  mortalityReason?: string;
  healthStatus?: 'Healthy' | 'Suspect' | 'Quarantined' | 'Deceased' | string;
  headCount?: number;
  biosecurityLevel?: number;
}

export interface SystemSettings {
  landingHeroTitle?: string;
  landingHeroSubtitle?: string;
  landingHeroPhotoUrl?: string;
  logoUrl?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  contactEmail?: string;
  documentationUrl?: string;
  aboutText?: string;
}

export interface BarangayInfo {
  name: string;
  lat: number;
  lng: number;
  isCoastal: boolean;
  purokCount: number;
  focalPerson?: string;
  terrainType?: string;
  notes?: string;
}

export type MapTileLayer = 'roadmap' | 'standard' | 'satellite' | 'hybrid' | 'terrain' | 'topo' | 'dark';

export interface GisLocationPin {
  lat: number;
  lng: number;
  barangay?: string;
  accuracy?: number;
  altitude?: number;
}

export type AppViewMode = 
  | 'landing' 
  | 'dashboard' 
  | 'gis'
  | 'records' 
  | 'add' 
  | 'accounts' 
  | 'print'
  | 'settings';

export interface AuditLogItem {
  id: string;
  timestamp: string;
  username: string;
  userFullName: string;
  role: Role;
  action: string;
  details: string;
  barangay?: string | null;
  entityType?: 'pig' | 'user' | 'system' | 'auth';
  ipAddress?: string;
}

export type SyncActionType = 'create' | 'update' | 'delete';
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'conflict' | 'error';
export type SyncEntityType = 'pig' | 'user';

export interface SyncQueueItem {
  id: string;
  action: SyncActionType;
  entityType: SyncEntityType;
  recordId: string;
  summary: string;
  data: PigRecord | Partial<PigRecord> | User;
  timestamp: string;
  status: SyncStatus;
  author: string;
  barangay: string;
  retryCount: number;
  lastAttempt?: string;
  errorMessage?: string;
}

export interface SyncStats {
  pendingCount: number;
  syncedCount: number;
  errorCount: number;
  lastSyncTime: string | null;
  isOnline: boolean;
  isSimulatedOffline: boolean;
  isSyncing: boolean;
}

