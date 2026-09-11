import { BarangayInfo, BreedType, PigRecord, PurposeType, User } from '../types';

export const HINUNANGAN_CENTER = {
  lat: 10.3969,
  lng: 125.1999,
  zoom: 13,
  municipalHall: { lat: 10.3969, lng: 125.1999, name: 'Hinunangan Municipal Hall & DA Office (Poblacion)' }
};

export const HINUNANGAN_BOUNDS = {
  minLat: 10.2850,
  maxLat: 10.4850,
  minLng: 125.0700,
  maxLng: 125.2750
};

// Strict Leaflet LatLng Bounds for Hinunangan exclusive panning & viewing
export const HINUNANGAN_LEAFLET_MAX_BOUNDS: [[number, number], [number, number]] = [
  [10.2500, 125.0400], // South-West corner (Southern Leyte boundary with Saint Bernard / Hinundayan)
  [10.5100, 125.2900]  // North-East corner (Silago approach & Outer Hinunangan Bay)
];

// High-Precision Municipal Boundary Polygon Contour of Hinunangan, Southern Leyte
// Covers all 40 Barangays, mountain ridges with Saint Bernard/Sogod/Silago, and coastal boundaries
export const HINUNANGAN_MUNICIPAL_BOUNDARY: [number, number][] = [
  // Southern boundary bordering Municipality of Hinundayan
  [10.2920, 125.1920], // Southern Coastal Border (Nava river mouth)
  [10.2935, 125.1820], // Nava hinterlands
  [10.2980, 125.1650], // South ridge bordering Hinundayan
  [10.3120, 125.1580], // Southwest approach to Ilaya watershed
  [10.3250, 125.1480], // Southern foothills
  [10.3340, 125.1310], // Manlico southern ridge
  
  // Western boundary along Central Southern Leyte mountain range (dividing Hinunangan from Saint Bernard & Sogod)
  [10.3420, 125.1220], // Manlico / Libas western mountain ridge
  [10.3580, 125.1120], // Libas upland forest boundary
  [10.3720, 125.1010], // Lumbog western slope
  [10.3950, 125.0880], // Mount Nacolod foothills
  [10.4120, 125.0780], // Calinao valley western ridge
  [10.4280, 125.0750], // Upper Bantawon western boundary (deepest inland peak)
  [10.4420, 125.0860], // Upper Bantawon northwest ridge
  
  // Northern boundary bordering Municipality of Silago
  [10.4560, 125.1050], // Northwest ridge pass
  [10.4680, 125.1280], // Silago border interior divide
  [10.4720, 125.1520], // Northern mountain slope
  [10.4710, 125.1710], // Ingan upland border
  [10.4660, 125.1870], // Ingan northern coastline boundary (Silago border)

  // Eastern coastline & Hinunangan Bay maritime territorial waters (encompassing coastal barangays & twin islands)
  [10.4720, 125.2050], // Ingan / Calag-itan maritime fringe
  [10.4760, 125.2420], // Northern maritime zone encompassing San Pedro Island (Pong Dako)
  [10.4680, 125.2580], // East of San Pedro Island
  [10.4450, 125.2600], // East of San Pablo Island (Pong Gamay)
  [10.4150, 125.2550], // Outer Hinunangan Bay
  [10.3820, 125.2420], // Biasong / Tahusan coastal waters
  [10.3550, 125.2320], // Bugho marine zone
  [10.3200, 125.2180], // Southeast maritime waters off Nava
  [10.2950, 125.2050], // Southeast approach to Nava coast
  [10.2920, 125.1920]  // Closing loop at Nava river mouth
];

// San Pedro Island (Pong Dako) Territorial Polygon
export const SAN_PEDRO_ISLAND_BOUNDARY: [number, number][] = [
  [10.4680, 125.2230],
  [10.4650, 125.2310],
  [10.4570, 125.2300],
  [10.4560, 125.2190],
  [10.4630, 125.2160],
  [10.4680, 125.2230]
];

// San Pablo Island (Pong Gamay) Territorial Polygon
export const SAN_PABLO_ISLAND_BOUNDARY: [number, number][] = [
  [10.4350, 125.2240],
  [10.4320, 125.2310],
  [10.4240, 125.2290],
  [10.4250, 125.2180],
  [10.4320, 125.2170],
  [10.4350, 125.2240]
];

// Point in Polygon Algorithm (Ray-Casting)
export function isPointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > lng) !== (yj > lng)) && (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Strictly validates whether a coordinate is within the official Hinunangan Municipal Boundary
export function isWithinHinunanganBoundary(lat: number, lng: number): {
  isInside: boolean;
  barangay?: string;
  message?: string;
} {
  const inMain = isPointInPolygon(lat, lng, HINUNANGAN_MUNICIPAL_BOUNDARY);
  const inSanPedro = isPointInPolygon(lat, lng, SAN_PEDRO_ISLAND_BOUNDARY);
  const inSanPablo = isPointInPolygon(lat, lng, SAN_PABLO_ISLAND_BOUNDARY);

  const isInside = inMain || inSanPedro || inSanPablo;

  if (!isInside) {
    return {
      isInside: false,
      message: 'Swine registrations are restricted to Hinunangan municipality boundaries.'
    };
  }

  const closest = getClosestBarangay(lat, lng);
  return {
    isInside: true,
    barangay: closest.barangay.name
  };
}

// Official GeoJSON Representation of Hinunangan Municipal Zone
export const HINUNANGAN_GEOJSON_BOUNDARY: any = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        name: 'Municipality of Hinunangan',
        province: 'Southern Leyte',
        region: 'Eastern Visayas (Region VIII)',
        psgc: '086406000',
        barangayCount: 40,
        type: 'Main Municipality Zone'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          HINUNANGAN_MUNICIPAL_BOUNDARY.map(([lat, lng]) => [lng, lat]) // GeoJSON format is [longitude, latitude]
        ]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'San Pedro Island (Pong Dako)',
        barangay: 'San Pedro Island',
        municipality: 'Hinunangan',
        type: 'Territorial Island Zone'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          SAN_PEDRO_ISLAND_BOUNDARY.map(([lat, lng]) => [lng, lat])
        ]
      }
    },
    {
      type: 'Feature',
      properties: {
        name: 'San Pablo Island (Pong Gamay)',
        barangay: 'San Pablo Island',
        municipality: 'Hinunangan',
        type: 'Territorial Island Zone'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          SAN_PABLO_ISLAND_BOUNDARY.map(([lat, lng]) => [lng, lat])
        ]
      }
    }
  ]
};

export const BARANGAYS_DATA: BarangayInfo[] = [
  { name: 'Ambacon', lat: 10.4044, lng: 125.1829, isCoastal: false, purokCount: 5, focalPerson: 'Danilo Gomez', terrainType: 'Inland Valley' },
  { name: 'Badiangon', lat: 10.3838, lng: 125.2034, isCoastal: false, purokCount: 4, focalPerson: 'Estrella Morales', terrainType: 'Rolling Hills' },
  { name: 'Bangcas A', lat: 10.4021, lng: 125.1952, isCoastal: true, purokCount: 5, focalPerson: 'Eduardo Bation', terrainType: 'Coastal Plain' },
  { name: 'Bangcas B', lat: 10.4076, lng: 125.1924, isCoastal: true, purokCount: 4, focalPerson: 'Arlene Ramirez', terrainType: 'Coastal Plain' },
  { name: 'Biasong', lat: 10.3786, lng: 125.2176, isCoastal: true, purokCount: 5, focalPerson: 'Bernardo Salvacion', terrainType: 'Coastal Plain' },
  { name: 'Bugho', lat: 10.3632, lng: 125.2173, isCoastal: false, purokCount: 4, focalPerson: 'Perlita Domingo', terrainType: 'Rolling Hills' },
  { name: 'Calag-itan', lat: 10.4362, lng: 125.1789, isCoastal: true, purokCount: 6, focalPerson: 'Gregorio Magno', terrainType: 'Coastal Bay' },
  { name: 'Calayugan', lat: 10.3902, lng: 125.1905, isCoastal: false, purokCount: 3, focalPerson: 'Vicenta Cruz', terrainType: 'River Plain' },
  { name: 'Calinao', lat: 10.4088, lng: 125.1317, isCoastal: false, purokCount: 3, focalPerson: 'Rodolfo Luna', terrainType: 'Mountain Slope' },
  { name: 'Canipaan', lat: 10.4157, lng: 125.1877, isCoastal: true, purokCount: 5, focalPerson: 'Manuel Roxas', terrainType: 'Coastal Delta' },
  { name: 'Catublian', lat: 10.3830, lng: 125.1801, isCoastal: false, purokCount: 4, focalPerson: 'Melchora Aquino', terrainType: 'Agricultural Plain' },
  { name: 'Ilaya', lat: 10.3323, lng: 125.1803, isCoastal: false, purokCount: 4, focalPerson: 'Teresa Magbanua', terrainType: 'Upland Valley' },
  { name: 'Ingan', lat: 10.4553, lng: 125.1848, isCoastal: true, purokCount: 4, focalPerson: 'Emilio Jacinto', terrainType: 'Coastal Headland' },
  { name: 'Labrador', lat: 10.3948, lng: 125.1967, isCoastal: false, purokCount: 4, focalPerson: 'Vicente Manalo', terrainType: 'Alluvial Plain' },
  { name: 'Libas', lat: 10.3543, lng: 125.1496, isCoastal: false, purokCount: 4, focalPerson: 'Anita Baluran', terrainType: 'Mountain Foothill' },
  { name: 'Lumbog', lat: 10.3777, lng: 125.1399, isCoastal: false, purokCount: 3, focalPerson: 'Reynaldo Dultra', terrainType: 'Upland Basin' },
  { name: 'Manalog', lat: 10.3730, lng: 125.1938, isCoastal: false, purokCount: 3, focalPerson: 'Mariano Ponce', terrainType: 'River Basin' },
  { name: 'Manlico', lat: 10.3372, lng: 125.1395, isCoastal: false, purokCount: 4, focalPerson: 'Pedro Serrano', terrainType: 'Highland Slope' },
  { name: 'Matin-ao', lat: 10.4076, lng: 125.1729, isCoastal: false, purokCount: 4, focalPerson: 'Josefa Alcantara', terrainType: 'Freshwater Valley' },
  { name: 'Nava', lat: 10.3031, lng: 125.1872, isCoastal: true, purokCount: 6, focalPerson: 'Ariel Tocmo', terrainType: 'Southern Coastal' },
  { name: 'Nueva Esperanza', lat: 10.3787, lng: 125.1614, isCoastal: false, purokCount: 3, focalPerson: 'Francisco Dagohoy', terrainType: 'Agricultural Uplands' },
  { name: 'Otama', lat: 10.3684, lng: 125.2137, isCoastal: false, purokCount: 3, focalPerson: 'Carlos Teves', terrainType: 'Coastal Foothills' },
  { name: 'Palongpong', lat: 10.3940, lng: 125.1715, isCoastal: false, purokCount: 4, focalPerson: 'Elena Guerrero', terrainType: 'Central Basin' },
  { name: 'Panalaron', lat: 10.3894, lng: 125.1995, isCoastal: true, purokCount: 5, focalPerson: 'Diego Silang', terrainType: 'Coastal Port' },
  { name: 'Patong', lat: 10.3737, lng: 125.1839, isCoastal: false, purokCount: 4, focalPerson: 'Teodoro Plata', terrainType: 'Midland Plateau' },
  { name: 'Poblacion', lat: 10.3969, lng: 125.1999, isCoastal: true, purokCount: 7, focalPerson: 'Maria Elena Santos', terrainType: 'Urban Coastal Center' },
  { name: 'Pondol', lat: 10.4238, lng: 125.1817, isCoastal: true, purokCount: 5, focalPerson: 'Antonio Luna', terrainType: 'Northern Bay' },
  { name: 'Salog', lat: 10.3944, lng: 125.2018, isCoastal: true, purokCount: 5, focalPerson: 'Mariano Alvarez', terrainType: 'Estuarine Delta' },
  { name: 'Salvacion', lat: 10.3715, lng: 125.2113, isCoastal: false, purokCount: 4, focalPerson: 'Lucio San Pedro', terrainType: 'Lowland Plain' },
  { name: 'San Pablo Island', lat: 10.4295, lng: 125.2235, isCoastal: true, purokCount: 4, focalPerson: 'Graciano Lopez', terrainType: 'Islet & Coral Barrier' },
  { name: 'San Pedro Island', lat: 10.4620, lng: 125.2230, isCoastal: true, purokCount: 4, focalPerson: 'Juan Sumulong', terrainType: 'Islet Marine Preserve' },
  { name: 'Santo Niño I', lat: 10.3785, lng: 125.2061, isCoastal: false, purokCount: 4, focalPerson: 'Lourdes Catublian', terrainType: 'Suburban Plain' },
  { name: 'Santo Niño II', lat: 10.3686, lng: 125.1617, isCoastal: false, purokCount: 4, focalPerson: 'Felipe Tan', terrainType: 'Midland Uplands' },
  { name: 'Tahusan', lat: 10.3830, lng: 125.2128, isCoastal: true, purokCount: 4, focalPerson: 'Simeon Ola', terrainType: 'Coastal Beachhead' },
  { name: 'Talisay', lat: 10.4112, lng: 125.1902, isCoastal: true, purokCount: 5, focalPerson: 'Marcelo Del Pilar', terrainType: 'River Estuary' },
  { name: 'Tawog', lat: 10.4099, lng: 125.1804, isCoastal: false, purokCount: 4, focalPerson: 'Gabriela Silang', terrainType: 'Inland Terrace' },
  { name: 'Toptop', lat: 10.3867, lng: 125.1923, isCoastal: false, purokCount: 3, focalPerson: 'Josefa Llanes', terrainType: 'Hillside Agricultural' },
  { name: 'Tuburan', lat: 10.3678, lng: 125.1777, isCoastal: false, purokCount: 4, focalPerson: 'Melchor Del Mundo', terrainType: 'Springhead Basin' },
  { name: 'Union', lat: 10.3875, lng: 125.1860, isCoastal: false, purokCount: 4, focalPerson: 'Ramon Magsaysay', terrainType: 'Midland Agricultural' },
  { name: 'Upper Bantawon', lat: 10.4312, lng: 125.1037, isCoastal: false, purokCount: 3, focalPerson: 'Apolinario Mabini', terrainType: 'High Mountain Ridge' }
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
  'Piggery',
  'Commercial Breeding'
];

export const PURPOSE_COLORS: Record<string, string> = {
  'Backyard Raising': '#2F5C3F', // Forest Green
  'Breeding Stock': '#7C3AED',  // Violet
  'Fattening/Commercial': '#D97706', // Amber Gold
  'Piggery': '#2563EB',         // Deep Blue
  'Commercial Breeding': '#0D9488' // Teal
};

export const PURPOSE_BG_CLASSES: Record<string, string> = {
  'Backyard Raising': 'bg-emerald-100 text-emerald-900 border-emerald-300',
  'Breeding Stock': 'bg-purple-100 text-purple-900 border-purple-300',
  'Fattening/Commercial': 'bg-amber-100 text-amber-900 border-amber-300',
  'Piggery': 'bg-blue-100 text-blue-900 border-blue-300',
  'Commercial Breeding': 'bg-teal-100 text-teal-900 border-teal-300'
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


export function getClosestBarangay(lat: number, lng: number) {
  let closest = BARANGAYS_DATA[0];
  let minDistance = Infinity;

  BARANGAYS_DATA.forEach(brgy => {
    const coords = BARANGAY_COORDS_MAP[brgy.name];
    if (coords) {
      // rough distance calculation is fine for this utility
      const dx = coords.lng - lng;
      const dy = coords.lat - lat;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDistance) {
        minDistance = dist;
        closest = brgy;
      }
    }
  });

  return { barangay: closest, distance: minDistance };
}

export function formatCoordinatesFull(lat: number, lng: number, format?: string): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  if (format === 'DMS') {
    const toDMS = (deg: number) => {
      const d = Math.floor(Math.abs(deg));
      const minFloat = (Math.abs(deg) - d) * 60;
      const m = Math.floor(minFloat);
      const s = ((minFloat - m) * 60).toFixed(1);
      return `${d}°${m}'${s}"`;
    };
    return `${toDMS(lat)}${latDir}, ${toDMS(lng)}${lngDir}`;
  }
  return `${Math.abs(lat).toFixed(5)}° ${latDir}, ${Math.abs(lng).toFixed(5)}° ${lngDir}`;
}
