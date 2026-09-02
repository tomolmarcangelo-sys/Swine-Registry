import { BarangayInfo, BreedType, PigRecord, PurposeType, User } from '../types';

export const HINUNANGAN_CENTER = {
  lat: 10.3969,
  lng: 125.1999,
  zoom: 13,
  municipalHall: { lat: 10.3969, lng: 125.1999, name: 'Hinunangan Municipal Hall & DA Office (Poblacion)' }
};

export const HINUNANGAN_BOUNDS = {
  minLat: 10.2800,
  maxLat: 10.4900,
  minLng: 125.0800,
  maxLng: 125.2600
};

// Strict Leaflet LatLng Bounds for Hinunangan exclusive panning
export const HINUNANGAN_LEAFLET_MAX_BOUNDS: [[number, number], [number, number]] = [
  [10.2800, 125.0800], // South-West corner
  [10.4900, 125.2600]  // North-East corner
];

// Municipal boundary polygon contour of Hinunangan, Southern Leyte
export const HINUNANGAN_MUNICIPAL_BOUNDARY: [number, number][] = [
  [10.2950, 125.1880], // South boundary coast at Nava
  [10.2980, 125.1650],
  [10.3150, 125.1550],
  [10.3320, 125.1450],
  [10.3370, 125.1320], // Manlico ridge
  [10.3540, 125.1200], // Libas hinterland
  [10.3770, 125.1050], // Lumbog western slope
  [10.4080, 125.0920], // Calinao valley
  [10.4320, 125.0900], // Upper Bantawon peak (westernmost boundary)
  [10.4500, 125.1100],
  [10.4650, 125.1450], // Northwest ridge (boundary with Silago)
  [10.4680, 125.1700],
  [10.4620, 125.1880], // Ingan northern coastline
  [10.4700, 125.2150], // Hinunangan Bay north maritime limit
  [10.4750, 125.2400], // North of San Pedro Island (Pong Dako)
  [10.4500, 125.2550], // East of San Pedro / San Pablo Island (Pong Gamay)
  [10.4200, 125.2500], // Outer Hinunangan Bay
  [10.3800, 125.2350], // East of Tahusan & Biasong
  [10.3500, 125.2250], // Bugho maritime waters
  [10.3050, 125.2100], // Southeast maritime line off Nava
  [10.2950, 125.1880]  // Close polygon at Nava
];

export const BARANGAYS_DATA: BarangayInfo[] = [
  { name: 'Ambacon', lat: 10.4044, lng: 125.1829, isCoastal: false, purokCount: 5, focalPerson: 'Danilo Gomez' },
  { name: 'Badiangon', lat: 10.3838, lng: 125.2034, isCoastal: false, purokCount: 4, focalPerson: 'Estrella Morales' },
  { name: 'Bangcas A', lat: 10.4021, lng: 125.1952, isCoastal: true, purokCount: 5, focalPerson: 'Eduardo Bation' },
  { name: 'Bangcas B', lat: 10.4076, lng: 125.1924, isCoastal: true, purokCount: 4, focalPerson: 'Arlene Ramirez' },
  { name: 'Biasong', lat: 10.3786, lng: 125.2176, isCoastal: true, purokCount: 5, focalPerson: 'Bernardo Salvacion' },
  { name: 'Bugho', lat: 10.3632, lng: 125.2173, isCoastal: false, purokCount: 4, focalPerson: 'Perlita Domingo' },
  { name: 'Calag-itan', lat: 10.4362, lng: 125.1789, isCoastal: true, purokCount: 6, focalPerson: 'Gregorio Magno' },
  { name: 'Calayugan', lat: 10.3902, lng: 125.1905, isCoastal: false, purokCount: 3, focalPerson: 'Vicenta Cruz' },
  { name: 'Calinao', lat: 10.4088, lng: 125.1317, isCoastal: false, purokCount: 3, focalPerson: 'Rodolfo Luna' },
  { name: 'Canipaan', lat: 10.4157, lng: 125.1877, isCoastal: true, purokCount: 5, focalPerson: 'Manuel Roxas' },
  { name: 'Catublian', lat: 10.3830, lng: 125.1801, isCoastal: false, purokCount: 4, focalPerson: 'Melchora Aquino' },
  { name: 'Ilaya', lat: 10.3323, lng: 125.1803, isCoastal: false, purokCount: 4, focalPerson: 'Teresa Magbanua' },
  { name: 'Ingan', lat: 10.4553, lng: 125.1848, isCoastal: true, purokCount: 4, focalPerson: 'Emilio Jacinto' },
  { name: 'Labrador', lat: 10.3948, lng: 125.1967, isCoastal: false, purokCount: 4, focalPerson: 'Vicente Manalo' },
  { name: 'Libas', lat: 10.3543, lng: 125.1496, isCoastal: false, purokCount: 4, focalPerson: 'Anita Baluran' },
  { name: 'Lumbog', lat: 10.3777, lng: 125.1399, isCoastal: false, purokCount: 3, focalPerson: 'Reynaldo Dultra' },
  { name: 'Manalog', lat: 10.3730, lng: 125.1938, isCoastal: false, purokCount: 3, focalPerson: 'Mariano Ponce' },
  { name: 'Manlico', lat: 10.3372, lng: 125.1395, isCoastal: false, purokCount: 4, focalPerson: 'Pedro Serrano' },
  { name: 'Matin-ao', lat: 10.4076, lng: 125.1729, isCoastal: false, purokCount: 4, focalPerson: 'Josefa Alcantara' },
  { name: 'Nava', lat: 10.3031, lng: 125.1872, isCoastal: true, purokCount: 6, focalPerson: 'Ariel Tocmo' },
  { name: 'Nueva Esperanza', lat: 10.3787, lng: 125.1614, isCoastal: false, purokCount: 3, focalPerson: 'Francisco Dagohoy' },
  { name: 'Otama', lat: 10.3684, lng: 125.2137, isCoastal: false, purokCount: 3, focalPerson: 'Carlos Teves' },
  { name: 'Palongpong', lat: 10.3940, lng: 125.1715, isCoastal: false, purokCount: 4, focalPerson: 'Elena Guerrero' },
  { name: 'Panalaron', lat: 10.3894, lng: 125.1995, isCoastal: true, purokCount: 5, focalPerson: 'Diego Silang' },
  { name: 'Patong', lat: 10.3737, lng: 125.1839, isCoastal: false, purokCount: 4, focalPerson: 'Teodoro Plata' },
  { name: 'Poblacion', lat: 10.3969, lng: 125.1999, isCoastal: true, purokCount: 7, focalPerson: 'Maria Elena Santos' },
  { name: 'Pondol', lat: 10.4238, lng: 125.1817, isCoastal: true, purokCount: 5, focalPerson: 'Antonio Luna' },
  { name: 'Salog', lat: 10.3944, lng: 125.2018, isCoastal: true, purokCount: 5, focalPerson: 'Mariano Alvarez' },
  { name: 'Salvacion', lat: 10.3715, lng: 125.2113, isCoastal: false, purokCount: 4, focalPerson: 'Lucio San Pedro' },
  { name: 'San Pablo Island', lat: 10.4295, lng: 125.2235, isCoastal: true, purokCount: 4, focalPerson: 'Graciano Lopez' },
  { name: 'San Pedro Island', lat: 10.4620, lng: 125.2230, isCoastal: true, purokCount: 4, focalPerson: 'Juan Sumulong' },
  { name: 'Santo Niño I', lat: 10.3785, lng: 125.2061, isCoastal: false, purokCount: 4, focalPerson: 'Lourdes Catublian' },
  { name: 'Santo Niño II', lat: 10.3686, lng: 125.1617, isCoastal: false, purokCount: 4, focalPerson: 'Felipe Tan' },
  { name: 'Tahusan', lat: 10.3830, lng: 125.2128, isCoastal: true, purokCount: 4, focalPerson: 'Simeon Ola' },
  { name: 'Talisay', lat: 10.4112, lng: 125.1902, isCoastal: true, purokCount: 5, focalPerson: 'Marcelo Del Pilar' },
  { name: 'Tawog', lat: 10.4099, lng: 125.1804, isCoastal: false, purokCount: 4, focalPerson: 'Gabriela Silang' },
  { name: 'Toptop', lat: 10.3867, lng: 125.1923, isCoastal: false, purokCount: 3, focalPerson: 'Josefa Llanes' },
  { name: 'Tuburan', lat: 10.3678, lng: 125.1777, isCoastal: false, purokCount: 4, focalPerson: 'Melchor Del Mundo' },
  { name: 'Union', lat: 10.3875, lng: 125.1860, isCoastal: false, purokCount: 4, focalPerson: 'Ramon Magsaysay' },
  { name: 'Upper Bantawon', lat: 10.4312, lng: 125.1037, isCoastal: false, purokCount: 3, focalPerson: 'Apolinario Mabini' }
];

export const BARANGAY_NAMES = BARANGAYS_DATA.map(b => b.name);

export const BARANGAY_COORDS_MAP: Record<string, { lat: number; lng: number }> = {};
BARANGAYS_DATA.forEach(b => {
  BARANGAY_COORDS_MAP[b.name] = { lat: b.lat, lng: b.lng };
});

export const BREEDS: BreedType[] = [
  'Native / Native-cross',
  'Landrace',
  'Large White',
  'Duroc',
  'Pietrain',
  'Crossbred'
];

export const PURPOSES: PurposeType[] = [
  'Backyard Raising',
  'Breeding Stock',
  'Fattening/Commercial',
  'Piggery'
];

export const PURPOSE_COLORS: Record<string, string> = {
  'Backyard Raising': '#2F5C3F', // Forest Green
  'Breeding Stock': '#7C3AED',  // Violet
  'Fattening/Commercial': '#D97706', // Amber Gold
  'Piggery': '#2563EB'          // Deep Blue
};

export const PURPOSE_BG_CLASSES: Record<string, string> = {
  'Backyard Raising': 'bg-emerald-100 text-emerald-900 border-emerald-300',
  'Breeding Stock': 'bg-purple-100 text-purple-900 border-purple-300',
  'Fattening/Commercial': 'bg-amber-100 text-amber-900 border-amber-300',
  'Piggery': 'bg-blue-100 text-blue-900 border-blue-300'
};

export const DEFAULT_USERS: User[] = [
  { 
    username: 'admin', 
    password: 'admin123', 
    role: 'admin', 
    fullName: 'Municipal Agriculturist Office', 
    barangay: null,
    email: 'agri.hinunangan@southernleyte.gov.ph',
    phone: '0917-822-4911'
  },
  { 
    username: 'poblacion.brgy', 
    password: 'brgy2026', 
    role: 'user', 
    fullName: 'Maria Elena Santos', 
    barangay: 'Poblacion',
    email: 'poblacion.agri@hinunangan.gov.ph',
    phone: '0928-112-3401'
  },
  { 
    username: 'nava.brgy', 
    password: 'brgy2026', 
    role: 'user', 
    fullName: 'Ariel Tocmo', 
    barangay: 'Nava',
    email: 'nava.agri@hinunangan.gov.ph',
    phone: '0939-554-1290'
  },
  { 
    username: 'ambacon.brgy', 
    password: 'brgy2026', 
    role: 'user', 
    fullName: 'Danilo Gomez', 
    barangay: 'Ambacon',
    email: 'ambacon.agri@hinunangan.gov.ph',
    phone: '0919-445-8871'
  },
  { 
    username: 'biasong.brgy', 
    password: 'brgy2026', 
    role: 'user', 
    fullName: 'Bernardo Salvacion', 
    barangay: 'Biasong',
    email: 'biasong.agri@hinunangan.gov.ph',
    phone: '0956-781-9022'
  },
  { 
    username: 'tahusan.brgy', 
    password: 'brgy2026', 
    role: 'user', 
    fullName: 'Simeon Ola', 
    barangay: 'Tahusan',
    email: 'tahusan.agri@hinunangan.gov.ph',
    phone: '0949-332-1188'
  },
  { 
    username: 'sanpedro.brgy', 
    password: 'brgy2026', 
    role: 'user', 
    fullName: 'Juan Sumulong', 
    barangay: 'San Pedro Island',
    email: 'sanpedro.agri@hinunangan.gov.ph',
    phone: '0918-776-5544'
  }
];

export const INITIAL_SEED_PIGS: PigRecord[] = [
  {
    id: 'REC-1001',
    earTag: 'HGN-POB-101',
    ownerName: 'Ruben Cabase',
    contact: '0917-554-3210',
    address: 'Purok 2, Riverside, Barangay Poblacion',
    barangay: 'Poblacion',
    breed: 'Native / Native-cross',
    sex: 'Female',
    age: 8,
    weight: 48.5,
    purpose: 'Backyard Raising',
    vaccinated: true,
    asfCleared: true,
    dateRegistered: '2026-08-14',
    lat: 10.3975,
    lng: 125.1988,
    gpsAccuracy: 3.2,
    gpsAltitude: 14.5,
    gpsTimestamp: '2026-08-14T09:30:00Z',
    registeredBy: 'poblacion.brgy',
    notes: 'Healthy sow with recent litter of 7 piglets. Dewormed.',
    biosecurity: {
      footbathMaintenance: true,
      fencingIntegrity: true,
      swillFeedingBanned: true,
      disinfectionRoutine: true,
      visitorLogControl: false,
      quarantineIsolationPen: false,
      cleanWaterSource: true
    }
  },
  {
    id: 'REC-1002',
    earTag: 'HGN-POB-102',
    ownerName: 'Marites Onda',
    contact: '0928-661-8932',
    address: 'Purok 4, San Roque St., Barangay Poblacion',
    barangay: 'Poblacion',
    breed: 'Landrace',
    sex: 'Female',
    age: 12,
    weight: 88.0,
    purpose: 'Breeding Stock',
    vaccinated: true,
    asfCleared: true,
    dateRegistered: '2026-08-18',
    lat: 10.3962,
    lng: 125.2012,
    gpsAccuracy: 4.1,
    gpsAltitude: 12.0,
    gpsTimestamp: '2026-08-18T10:15:00Z',
    registeredBy: 'poblacion.brgy',
    notes: 'Certified breeder registered under municipal livestock program.',
    biosecurity: {
      footbathMaintenance: true,
      fencingIntegrity: true,
      swillFeedingBanned: true,
      disinfectionRoutine: true,
      visitorLogControl: true,
      quarantineIsolationPen: true,
      cleanWaterSource: true
    }
  },
  {
    id: 'REC-1003',
    earTag: 'HGN-NAV-101',
    ownerName: 'Ariel Tocmo',
    contact: '0939-554-1290',
    address: 'Purok 1, Sitio Baybay, Barangay Nava',
    barangay: 'Nava',
    breed: 'Large White',
    sex: 'Male',
    age: 6,
    weight: 54.0,
    purpose: 'Fattening/Commercial',
    vaccinated: true,
    asfCleared: true,
    dateRegistered: '2026-08-20',
    lat: 10.3040,
    lng: 125.1865,
    gpsAccuracy: 2.8,
    gpsAltitude: 8.5,
    gpsTimestamp: '2026-08-20T14:20:00Z',
    registeredBy: 'nava.brgy',
    notes: 'Fed with municipal supplemental feeds.',
    biosecurity: {
      footbathMaintenance: true,
      fencingIntegrity: true,
      swillFeedingBanned: true,
      disinfectionRoutine: true,
      visitorLogControl: false,
      quarantineIsolationPen: false,
      cleanWaterSource: true
    }
  },
  {
    id: 'REC-1004',
    earTag: 'HGN-NAV-102',
    ownerName: 'Josefina Lumapas',
    contact: '0945-882-1904',
    address: 'Purok 3, Near Chapel, Barangay Nava',
    barangay: 'Nava',
    breed: 'Duroc',
    sex: 'Male',
    age: 14,
    weight: 110.5,
    purpose: 'Breeding Stock',
    vaccinated: true,
    asfCleared: true,
    dateRegistered: '2026-08-21',
    lat: 10.3022,
    lng: 125.1880,
    gpsAccuracy: 3.5,
    gpsAltitude: 10.2,
    gpsTimestamp: '2026-08-21T11:00:00Z',
    registeredBy: 'nava.brgy',
    notes: 'Prime breeding boar service provider for southern cluster.',
    biosecurity: {
      footbathMaintenance: true,
      fencingIntegrity: true,
      swillFeedingBanned: true,
      disinfectionRoutine: true,
      visitorLogControl: true,
      quarantineIsolationPen: true,
      cleanWaterSource: true
    }
  },
  {
    id: 'REC-1005',
    earTag: 'HGN-AMB-101',
    ownerName: 'Danilo Gomez',
    contact: '0919-445-8871',
    address: 'Purok 2, Upland Trail, Barangay Ambacon',
    barangay: 'Ambacon',
    breed: 'Native / Native-cross',
    sex: 'Female',
    age: 5,
    weight: 28.0,
    purpose: 'Backyard Raising',
    vaccinated: true,
    asfCleared: true,
    dateRegistered: '2026-08-22',
    lat: 10.4048,
    lng: 125.1822,
    gpsAccuracy: 5.0,
    gpsAltitude: 45.0,
    gpsTimestamp: '2026-08-22T08:45:00Z',
    registeredBy: 'ambacon.brgy',
    notes: 'Organic foraging backyard enclosure with concrete drainage.',
    biosecurity: {
      footbathMaintenance: true,
      fencingIntegrity: true,
      swillFeedingBanned: true,
      disinfectionRoutine: false,
      visitorLogControl: false,
      quarantineIsolationPen: false,
      cleanWaterSource: true
    }
  },
  {
    id: 'REC-1006',
    earTag: 'HGN-AMB-102',
    ownerName: 'Cristina Pelin',
    contact: '0921-998-3312',
    address: 'Purok 5, Boundary Road, Barangay Ambacon',
    barangay: 'Ambacon',
    breed: 'Crossbred',
    sex: 'Female',
    age: 7,
    weight: 42.0,
    purpose: 'Backyard Raising',
    vaccinated: true,
    asfCleared: true,
    dateRegistered: '2026-08-23',
    lat: 10.4039,
    lng: 125.1835,
    gpsAccuracy: 3.9,
    gpsAltitude: 52.1,
    gpsTimestamp: '2026-08-23T15:10:00Z',
    registeredBy: 'ambacon.brgy',
    notes: 'ASF biosecurity footbath installed at gate.',
    biosecurity: {
      footbathMaintenance: true,
      fencingIntegrity: true,
      swillFeedingBanned: true,
      disinfectionRoutine: true,
      visitorLogControl: false,
      quarantineIsolationPen: false,
      cleanWaterSource: true
    }
  },
  {
    id: 'REC-1007',
    earTag: 'HGN-BIA-101',
    ownerName: 'Bernardo Salvacion',
    contact: '0956-781-9022',
    address: 'Purok 3, Coastal Road, Barangay Biasong',
    barangay: 'Biasong',
    breed: 'Pietrain',
    sex: 'Male',
    age: 9,
    weight: 76.0,
    purpose: 'Fattening/Commercial',
    vaccinated: true,
    asfCleared: true,
    dateRegistered: '2026-08-25',
    lat: 10.3788,
    lng: 125.2172,
    gpsAccuracy: 2.5,
    gpsAltitude: 6.0,
    gpsTimestamp: '2026-08-25T13:40:00Z',
    registeredBy: 'biasong.brgy',
    notes: 'Commercial semi-intensive unit.',
    biosecurity: {
      footbathMaintenance: true,
      fencingIntegrity: true,
      swillFeedingBanned: true,
      disinfectionRoutine: true,
      visitorLogControl: true,
      quarantineIsolationPen: false,
      cleanWaterSource: true
    }
  },
  {
    id: 'REC-1008',
    earTag: 'HGN-CAN-101',
    ownerName: 'Lourdes Catublian',
    contact: '0977-123-4567',
    address: 'Purok 1, Fish Port Area, Barangay Canipaan',
    barangay: 'Canipaan',
    breed: 'Native / Native-cross',
    sex: 'Female',
    age: 4,
    weight: 22.5,
    purpose: 'Backyard Raising',
    vaccinated: false,
    asfCleared: true,
    dateRegistered: '2026-08-27',
    lat: 10.4152,
    lng: 125.1881,
    gpsAccuracy: 4.8,
    gpsAltitude: 5.2,
    gpsTimestamp: '2026-08-27T10:05:00Z',
    registeredBy: 'admin',
    notes: 'Scheduled for municipal vaccination round on next Tuesday.',
    biosecurity: {
      footbathMaintenance: false,
      fencingIntegrity: true,
      swillFeedingBanned: true,
      disinfectionRoutine: false,
      visitorLogControl: false,
      quarantineIsolationPen: false,
      cleanWaterSource: true
    }
  },
  {
    id: 'REC-1009',
    earTag: 'HGN-LAB-101',
    ownerName: 'Vicente Manalo',
    contact: '0918-987-6543',
    address: 'Purok 4, Mt. Nacolod Access, Barangay Labrador',
    barangay: 'Labrador',
    breed: 'Landrace',
    sex: 'Female',
    age: 11,
    weight: 95.0,
    purpose: 'Piggery',
    vaccinated: true,
    asfCleared: true,
    dateRegistered: '2026-08-28',
    lat: 10.3945,
    lng: 125.1962,
    gpsAccuracy: 3.1,
    gpsAltitude: 12.4,
    gpsTimestamp: '2026-08-28T16:30:00Z',
    registeredBy: 'admin',
    notes: 'Small commercial farm facility with 12 pens.',
    biosecurity: {
      footbathMaintenance: true,
      fencingIntegrity: true,
      swillFeedingBanned: true,
      disinfectionRoutine: true,
      visitorLogControl: true,
      quarantineIsolationPen: true,
      cleanWaterSource: true
    }
  },
  {
    id: 'REC-1010',
    earTag: 'HGN-BUG-101',
    ownerName: 'Perlita Domingo',
    contact: '0999-333-2211',
    address: 'Purok 2, Valley Section, Barangay Bugho',
    barangay: 'Bugho',
    breed: 'Large White',
    sex: 'Female',
    age: 5,
    weight: 34.0,
    purpose: 'Backyard Raising',
    vaccinated: true,
    asfCleared: true,
    dateRegistered: '2026-08-29',
    lat: 10.3635,
    lng: 125.2168,
    gpsAccuracy: 4.0,
    gpsAltitude: 18.0,
    gpsTimestamp: '2026-08-29T11:15:00Z',
    registeredBy: 'admin',
    notes: 'Good body score, clean water source verified.',
    biosecurity: {
      footbathMaintenance: true,
      fencingIntegrity: true,
      swillFeedingBanned: true,
      disinfectionRoutine: true,
      visitorLogControl: false,
      quarantineIsolationPen: false,
      cleanWaterSource: true
    }
  },
  {
    id: 'REC-1011',
    earTag: 'HGN-BAN-101',
    ownerName: 'Eduardo Bation',
    contact: '0927-441-2299',
    address: 'Purok 3, Coconut Grove, Barangay Bangcas A',
    barangay: 'Bangcas A',
    breed: 'Crossbred',
    sex: 'Male',
    age: 8,
    weight: 62.0,
    purpose: 'Fattening/Commercial',
    vaccinated: true,
    asfCleared: true,
    dateRegistered: '2026-08-30',
    lat: 10.4025,
    lng: 125.1948,
    gpsAccuracy: 3.0,
    gpsAltitude: 11.2,
    gpsTimestamp: '2026-08-30T09:10:00Z',
    registeredBy: 'admin',
    notes: 'Routine health check completed.',
    biosecurity: {
      footbathMaintenance: true,
      fencingIntegrity: true,
      swillFeedingBanned: true,
      disinfectionRoutine: true,
      visitorLogControl: false,
      quarantineIsolationPen: false,
      cleanWaterSource: true
    }
  },
  {
    id: 'REC-1012',
    earTag: 'HGN-CAL-101',
    ownerName: 'Gregorio Magno',
    contact: '0966-552-8811',
    address: 'Purok 5, Highway Junction, Barangay Calag-itan',
    barangay: 'Calag-itan',
    breed: 'Pietrain',
    sex: 'Female',
    age: 10,
    weight: 79.5,
    purpose: 'Breeding Stock',
    vaccinated: true,
    asfCleared: true,
    dateRegistered: '2026-08-31',
    lat: 10.4360,
    lng: 125.1792,
    gpsAccuracy: 2.9,
    gpsAltitude: 14.8,
    gpsTimestamp: '2026-08-31T14:05:00Z',
    registeredBy: 'admin',
    notes: 'High yield genetic line, monitored under municipal livestock registry.',
    biosecurity: {
      footbathMaintenance: true,
      fencingIntegrity: true,
      swillFeedingBanned: true,
      disinfectionRoutine: true,
      visitorLogControl: true,
      quarantineIsolationPen: true,
      cleanWaterSource: true
    }
  },
  {
    id: 'REC-1013',
    earTag: 'HGN-SPE-101',
    ownerName: 'Juan Sumulong',
    contact: '0918-776-5544',
    address: 'Purok 2, Island Sanctuary, Barangay San Pedro Island',
    barangay: 'San Pedro Island',
    breed: 'Native / Native-cross',
    sex: 'Female',
    age: 6,
    weight: 38.0,
    purpose: 'Backyard Raising',
    vaccinated: true,
    asfCleared: true,
    dateRegistered: '2026-08-31',
    lat: 10.4618,
    lng: 125.2225,
    gpsAccuracy: 3.4,
    gpsAltitude: 5.0,
    gpsTimestamp: '2026-08-31T15:20:00Z',
    registeredBy: 'sanpedro.brgy',
    notes: 'Island swine population isolated from main Leyte mainland.',
    biosecurity: {
      footbathMaintenance: true,
      fencingIntegrity: true,
      swillFeedingBanned: true,
      disinfectionRoutine: false,
      visitorLogControl: false,
      quarantineIsolationPen: false,
      cleanWaterSource: true
    }
  },
  {
    id: 'REC-1014',
    earTag: 'HGN-TAH-101',
    ownerName: 'Simeon Ola',
    contact: '0949-332-1188',
    address: 'Purok 1, Beachfront Rd, Barangay Tahusan',
    barangay: 'Tahusan',
    breed: 'Crossbred',
    sex: 'Male',
    age: 7,
    weight: 56.5,
    purpose: 'Fattening/Commercial',
    vaccinated: true,
    asfCleared: true,
    dateRegistered: '2026-08-31',
    lat: 10.3835,
    lng: 125.2120,
    gpsAccuracy: 2.7,
    gpsAltitude: 4.5,
    gpsTimestamp: '2026-08-31T16:00:00Z',
    registeredBy: 'tahusan.brgy',
    notes: 'Inspected with biosecurity certification.',
    biosecurity: {
      footbathMaintenance: true,
      fencingIntegrity: true,
      swillFeedingBanned: true,
      disinfectionRoutine: true,
      visitorLogControl: false,
      quarantineIsolationPen: false,
      cleanWaterSource: true
    }
  },
  {
    id: 'REC-1015',
    earTag: 'HGN-LIB-101',
    ownerName: 'Danilo Alcantara',
    contact: '0917-882-9901',
    address: 'Purok 1, Upper Valley, Barangay Libas',
    barangay: 'Libas',
    breed: 'Native / Native-cross',
    sex: 'Male',
    age: 5,
    weight: 29.0,
    purpose: 'Backyard Raising',
    vaccinated: false,
    asfCleared: true,
    dateRegistered: '2026-08-30',
    lat: 10.3548,
    lng: 125.1492,
    gpsAccuracy: 4.5,
    gpsAltitude: 68.0,
    gpsTimestamp: '2026-08-30T11:20:00Z',
    registeredBy: 'admin',
    notes: 'Sanitation Notice: Missing entrance footbath, swill feeding warning issued.',
    biosecurity: {
      footbathMaintenance: false,
      fencingIntegrity: false,
      swillFeedingBanned: false,
      disinfectionRoutine: false,
      visitorLogControl: false,
      quarantineIsolationPen: false,
      cleanWaterSource: true
    }
  },
  {
    id: 'REC-1016',
    earTag: 'HGN-LUM-101',
    ownerName: 'Reynaldo Dultra',
    contact: '0928-334-5567',
    address: 'Purok 2, Mountain Ridge, Barangay Lumbog',
    barangay: 'Lumbog',
    breed: 'Native / Native-cross',
    sex: 'Female',
    age: 7,
    weight: 36.5,
    purpose: 'Backyard Raising',
    vaccinated: false,
    asfCleared: true,
    dateRegistered: '2026-08-30',
    lat: 10.3772,
    lng: 125.1405,
    gpsAccuracy: 5.2,
    gpsAltitude: 82.0,
    gpsTimestamp: '2026-08-30T13:45:00Z',
    registeredBy: 'admin',
    notes: 'Critical sanitation hotspot. Swill feeding reported, no perimeter fence.',
    biosecurity: {
      footbathMaintenance: false,
      fencingIntegrity: false,
      swillFeedingBanned: false,
      disinfectionRoutine: false,
      visitorLogControl: false,
      quarantineIsolationPen: false,
      cleanWaterSource: true
    }
  },
  {
    id: 'REC-1017',
    earTag: 'HGN-CAT-101',
    ownerName: 'Melchora Aquino',
    contact: '0939-221-4433',
    address: 'Purok 3, Barangay Catublian',
    barangay: 'Catublian',
    breed: 'Crossbred',
    sex: 'Female',
    age: 6,
    weight: 41.0,
    purpose: 'Backyard Raising',
    vaccinated: false,
    asfCleared: true,
    dateRegistered: '2026-08-31',
    lat: 10.3835,
    lng: 125.1795,
    gpsAccuracy: 3.8,
    gpsAltitude: 24.0,
    gpsTimestamp: '2026-08-31T09:15:00Z',
    registeredBy: 'admin',
    notes: 'Disinfection kit requested. Footbath pending setup.',
    biosecurity: {
      footbathMaintenance: false,
      fencingIntegrity: true,
      swillFeedingBanned: true,
      disinfectionRoutine: false,
      visitorLogControl: false,
      quarantineIsolationPen: false,
      cleanWaterSource: true
    }
  },
  {
    id: 'REC-1018',
    earTag: 'HGN-TAL-101',
    ownerName: 'Marcelo Del Pilar',
    contact: '0956-112-9988',
    address: 'Purok 4, Coastal Green, Barangay Talisay',
    barangay: 'Talisay',
    breed: 'Large White',
    sex: 'Male',
    age: 10,
    weight: 85.0,
    purpose: 'Breeding Stock',
    vaccinated: true,
    asfCleared: true,
    dateRegistered: '2026-08-31',
    lat: 10.4115,
    lng: 125.1898,
    gpsAccuracy: 2.4,
    gpsAltitude: 8.0,
    gpsTimestamp: '2026-08-31T14:50:00Z',
    registeredBy: 'admin',
    notes: 'Exemplary biosecurity compliance with full disinfectant regimen.',
    biosecurity: {
      footbathMaintenance: true,
      fencingIntegrity: true,
      swillFeedingBanned: true,
      disinfectionRoutine: true,
      visitorLogControl: true,
      quarantineIsolationPen: true,
      cleanWaterSource: true
    }
  },
  {
    id: 'REC-1019',
    earTag: 'HGN-CAL-102',
    ownerName: 'Rodolfo Luna',
    contact: '0919-667-8890',
    address: 'Purok 1, Interior Valley, Barangay Calinao',
    barangay: 'Calinao',
    breed: 'Native / Native-cross',
    sex: 'Female',
    age: 4,
    weight: 24.0,
    purpose: 'Backyard Raising',
    vaccinated: false,
    asfCleared: true,
    dateRegistered: '2026-09-01',
    lat: 10.4082,
    lng: 125.1322,
    gpsAccuracy: 4.6,
    gpsAltitude: 95.0,
    gpsTimestamp: '2026-09-01T08:30:00Z',
    registeredBy: 'admin',
    notes: 'Critically low biosecurity score (2/7). Sanitation intervention recommended.',
    biosecurity: {
      footbathMaintenance: false,
      fencingIntegrity: false,
      swillFeedingBanned: true,
      disinfectionRoutine: false,
      visitorLogControl: false,
      quarantineIsolationPen: false,
      cleanWaterSource: true
    }
  }
];

// Coordinate conversion helpers
export function formatDD(lat: number, lng: number): string {
  return `${lat.toFixed(5)}°N, ${lng.toFixed(5)}°E`;
}

export function formatDMS(deg: number, isLat: boolean): string {
  const absolute = Math.abs(deg);
  const degrees = Math.floor(absolute);
  const minutesNotTruncated = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesNotTruncated);
  const seconds = ((minutesNotTruncated - minutes) * 60).toFixed(1);
  const direction = isLat ? (deg >= 0 ? 'N' : 'S') : (deg >= 0 ? 'E' : 'W');
  return `${degrees}°${minutes}'${seconds}"${direction}`;
}

export function formatCoordinatesFull(lat: number, lng: number, format: 'DD' | 'DMS' | 'DDM' = 'DD'): string {
  if (format === 'DMS') {
    return `${formatDMS(lat, true)} ${formatDMS(lng, false)}`;
  }
  if (format === 'DDM') {
    const latAbs = Math.abs(lat);
    const latDeg = Math.floor(latAbs);
    const latMin = ((latAbs - latDeg) * 60).toFixed(3);
    const latDir = lat >= 0 ? 'N' : 'S';

    const lngAbs = Math.abs(lng);
    const lngDeg = Math.floor(lngAbs);
    const lngMin = ((lngAbs - lngDeg) * 60).toFixed(3);
    const lngDir = lng >= 0 ? 'E' : 'W';

    return `${latDeg}° ${latMin}' ${latDir}, ${lngDeg}° ${lngMin}' ${lngDir}`;
  }
  return `${lat.toFixed(5)}°, ${lng.toFixed(5)}°`;
}

// Calculate distance between two coordinates in meters (Haversine Formula)
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

// Find closest barangay to given coordinates
export function getClosestBarangay(lat: number, lng: number): { barangay: BarangayInfo; distanceMeters: number } {
  let closest = BARANGAYS_DATA[0];
  let minDistance = calculateDistanceMeters(lat, lng, closest.lat, closest.lng);

  for (let i = 1; i < BARANGAYS_DATA.length; i++) {
    const b = BARANGAYS_DATA[i];
    const d = calculateDistanceMeters(lat, lng, b.lat, b.lng);
    if (d < minDistance) {
      minDistance = d;
      closest = b;
    }
  }

  return { barangay: closest, distanceMeters: minDistance };
}
