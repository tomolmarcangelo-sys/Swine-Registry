import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Save, 
  MapPin, 
  ShieldCheck, 
  ShieldAlert,
  AlertCircle, 
  Sparkles, 
  Navigation,
  Droplets,
  Ban,
  Users,
  CheckCircle2,
  Sliders,
  Shield
} from 'lucide-react';
import { BARANGAYS_DATA, BARANGAY_COORDS_MAP, BREEDS, PURPOSES } from '../data/constants';
import { GeolocationHookReturn } from '../hooks/useGeolocation';
import { BiosecurityAssessment, BreedType, PigRecord, PurposeType, User } from '../types';
import { GisFormMap } from './GisFormMap';

interface AddEditRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: PigRecord) => void;
  currentUser: User;
  editingPig?: PigRecord | null;
  existingPigs: PigRecord[];
  initialCoords?: { lat: number; lng: number; barangay?: string } | null;
  geo?: GeolocationHookReturn;
}

const DEFAULT_BIOSECURITY: BiosecurityAssessment = {
  footbathMaintenance: true,
  fencingIntegrity: true,
  swillFeedingBanned: true,
  disinfectionRoutine: true,
  visitorLogControl: false,
  quarantineIsolationPen: false,
  cleanWaterSource: true,
};

export const AddEditRecordModal: React.FC<AddEditRecordModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentUser,
  editingPig,
  existingPigs = [],
  initialCoords,
  geo
}) => {
  const isAdmin = currentUser.role === 'admin';
  const defaultBarangay = editingPig?.barangay || initialCoords?.barangay || (isAdmin ? 'Poblacion' : currentUser.barangay || 'Poblacion');

  const [ownerName, setOwnerName] = useState(editingPig?.ownerName || '');
  const [contact, setContact] = useState(editingPig?.contact || '');
  const [address, setAddress] = useState(editingPig?.address || '');
  const [barangay, setBarangay] = useState(defaultBarangay);
  const [earTag, setEarTag] = useState(() => {
    if (editingPig?.earTag) return editingPig.earTag;
    const brgyCode = defaultBarangay.slice(0, 3).toUpperCase();
    const count = (existingPigs || []).filter(p => p.barangay === defaultBarangay).length;
    return `HGN-${brgyCode}-${101 + count}`;
  });
  const [breed, setBreed] = useState<BreedType>(editingPig?.breed as BreedType || 'Native / Native-cross');
  const [sex, setSex] = useState<'Male' | 'Female'>(editingPig?.sex || 'Female');
  const [age, setAge] = useState(editingPig ? String(editingPig.age) : '6');
  const [weight, setWeight] = useState(editingPig ? String(editingPig.weight) : '45.0');
  const [purpose, setPurpose] = useState<PurposeType>(editingPig?.purpose as PurposeType || 'Backyard Raising');
  const [vaccinated, setVaccinated] = useState(editingPig ? editingPig.vaccinated : true);
  const [asfCleared, setAsfCleared] = useState(editingPig ? editingPig.asfCleared : true);
  const [dateRegistered, setDateRegistered] = useState(editingPig?.dateRegistered || new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState(editingPig?.notes || '');

  // Biosecurity & Sanitation Assessment State
  const [biosecurity, setBiosecurity] = useState<BiosecurityAssessment>(() => {
    if (editingPig?.biosecurity) {
      return {
        footbathMaintenance: editingPig.biosecurity.footbathMaintenance ?? true,
        fencingIntegrity: editingPig.biosecurity.fencingIntegrity ?? true,
        swillFeedingBanned: editingPig.biosecurity.swillFeedingBanned ?? true,
        disinfectionRoutine: editingPig.biosecurity.disinfectionRoutine ?? true,
        visitorLogControl: editingPig.biosecurity.visitorLogControl ?? false,
        quarantineIsolationPen: editingPig.biosecurity.quarantineIsolationPen ?? false,
        cleanWaterSource: editingPig.biosecurity.cleanWaterSource ?? true,
      };
    }
    return DEFAULT_BIOSECURITY;
  });

  // Farm coordinates
  const [lat, setLat] = useState(() => {
    if (editingPig) return String(editingPig.lat);
    if (initialCoords?.lat) return String(initialCoords.lat);
    const bCoord = BARANGAY_COORDS_MAP[defaultBarangay] || { lat: 10.3969, lng: 125.1999 };
    return String(bCoord.lat);
  });
  const [lng, setLng] = useState(() => {
    if (editingPig) return String(editingPig.lng);
    if (initialCoords?.lng) return String(initialCoords.lng);
    const bCoord = BARANGAY_COORDS_MAP[defaultBarangay] || { lat: 10.3969, lng: 125.1999 };
    return String(bCoord.lng);
  });
  const [gpsAccuracy, setGpsAccuracy] = useState<number>(editingPig?.gpsAccuracy || 5.0);

  // Sync state when editingPig or initialCoords changes
  useEffect(() => {
    if (initialCoords) {
      if (initialCoords.lat) setLat(String(initialCoords.lat));
      if (initialCoords.lng) setLng(String(initialCoords.lng));
      if (initialCoords.barangay && isAdmin) {
        setBarangay(initialCoords.barangay);
        const brgyCode = initialCoords.barangay.slice(0, 3).toUpperCase();
        const count = (existingPigs || []).filter(p => p.barangay === initialCoords.barangay).length;
        setEarTag(`HGN-${brgyCode}-${101 + count}`);
      }
    }
  }, [initialCoords, isAdmin, existingPigs]);

  useEffect(() => {
    if (editingPig?.biosecurity) {
      setBiosecurity({
        footbathMaintenance: editingPig.biosecurity.footbathMaintenance ?? true,
        fencingIntegrity: editingPig.biosecurity.fencingIntegrity ?? true,
        swillFeedingBanned: editingPig.biosecurity.swillFeedingBanned ?? true,
        disinfectionRoutine: editingPig.biosecurity.disinfectionRoutine ?? true,
        visitorLogControl: editingPig.biosecurity.visitorLogControl ?? false,
        quarantineIsolationPen: editingPig.biosecurity.quarantineIsolationPen ?? false,
        cleanWaterSource: editingPig.biosecurity.cleanWaterSource ?? true,
      });
    }
  }, [editingPig]);

  if (!isOpen) return null;

  const handleBarangayChange = (newBrgy: string) => {
    setBarangay(newBrgy);
    const brgyCode = newBrgy.slice(0, 3).toUpperCase();
    const count = (existingPigs || []).filter(p => p.barangay === newBrgy).length;
    setEarTag(`HGN-${brgyCode}-${101 + count}`);

    const bCoord = BARANGAY_COORDS_MAP[newBrgy];
    if (bCoord) {
      setLat(String(bCoord.lat));
      setLng(String(bCoord.lng));
    }
  };

  const handleMapCoordinateChange = (coords: { lat: number; lng: number; accuracy?: number; altitude?: number }) => {
    setLat(String(coords.lat));
    setLng(String(coords.lng));
    if (coords.accuracy) setGpsAccuracy(coords.accuracy);
  };

  const handleToggleBiosecurity = (key: keyof BiosecurityAssessment) => {
    setBiosecurity(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSetAllBiosecurity = (val: boolean) => {
    setBiosecurity({
      footbathMaintenance: val,
      fencingIntegrity: val,
      swillFeedingBanned: val,
      disinfectionRoutine: val,
      visitorLogControl: val,
      quarantineIsolationPen: val,
      cleanWaterSource: val,
    });
  };

  // Biosecurity Assessment Items Configuration
  const biosecurityItems: {
    key: keyof BiosecurityAssessment;
    label: string;
    description: string;
    tag: string;
    icon: React.ElementType;
  }[] = [
    {
      key: 'footbathMaintenance',
      label: 'Footbath Maintenance',
      description: 'Functional entrance footbath with active chemical disinfectant (e.g. Virkon S / bleach) replenished regularly.',
      tag: 'Sanitation Gate',
      icon: Sparkles
    },
    {
      key: 'fencingIntegrity',
      label: 'Perimeter Fencing Integrity',
      description: 'Sturdy, intact perimeter barrier preventing unauthorized entry by stray swine, domestic dogs, and wild boars.',
      tag: 'Containment',
      icon: Shield
    },
    {
      key: 'swillFeedingBanned',
      label: 'Zero-Swill Feeding (DA ASF Ban)',
      description: 'Strict prohibition of feeding untreated kitchen food scraps, restaurant slop (kanin-baboy), or unboiled food waste.',
      tag: 'DA Policy',
      icon: Ban
    },
    {
      key: 'disinfectionRoutine',
      label: 'Scheduled Pen Disinfection',
      description: 'Documented regular schedule of pen power washing, drying, and surface disinfectant spraying (at least weekly).',
      tag: 'Protocol',
      icon: Droplets
    },
    {
      key: 'visitorLogControl',
      label: 'Visitor & Vehicle Access Control',
      description: 'Restricted farm entry, mandatory visitor logbook, boot change / plastic shoe covers, and tire disinfection spray.',
      tag: 'Biosecurity Gate',
      icon: Users
    },
    {
      key: 'quarantineIsolationPen',
      label: 'Quarantine / Isolation Facility',
      description: 'Dedicated isolation pen with separate feed/water troughs for newly introduced stock (14-21 day hold) or sick swine.',
      tag: 'Isolation',
      icon: CheckCircle2
    },
    {
      key: 'cleanWaterSource',
      label: 'Protected Clean Water Source',
      description: 'Enclosed potable drinking water line or protected deep-well supply isolated from open canal runoff contamination.',
      tag: 'Potability',
      icon: Droplets
    }
  ];

  const biosecurityCount = Object.values(biosecurity).filter(Boolean).length;
  const totalBiosecurityCount = biosecurityItems.length;
  const biosecurityPct = Math.round((biosecurityCount / totalBiosecurityCount) * 100);

  let biosecurityLevel = 'Level 1: Basic (Moderate Risk)';
  let biosecurityLevelColor = 'text-amber-700 bg-amber-50 border-amber-300';
  if (biosecurityCount >= 6) {
    biosecurityLevel = 'Level 3: High Biosecurity (Certified Compliant)';
    biosecurityLevelColor = 'text-emerald-800 bg-emerald-50 border-emerald-300';
  } else if (biosecurityCount >= 4) {
    biosecurityLevel = 'Level 2: Standard Biosecure (Acceptable)';
    biosecurityLevelColor = 'text-[#2F5C3F] bg-[#F5EFDD] border-[#DED2AE]';
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numLat = Number(lat) || 10.3969;
    const numLng = Number(lng) || 125.1999;

    const record: PigRecord = {
      id: editingPig?.id || `REC-${Date.now()}`,
      earTag: earTag.trim(),
      ownerName: ownerName.trim(),
      contact: contact.trim(),
      address: address.trim(),
      barangay: isAdmin ? barangay : (currentUser.barangay || barangay),
      breed,
      sex,
      age: Number(age) || 0,
      weight: Number(weight) || 0,
      purpose,
      vaccinated,
      asfCleared,
      dateRegistered,
      lat: numLat,
      lng: numLng,
      gpsAccuracy,
      registeredBy: currentUser.username,
      notes: notes.trim(),
      biosecurity
    };

    onSave(record);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141A12]/60 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white border border-[#DED2AE] rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl my-6">
        
        {/* MODAL HEADER */}
        <div className="bg-[#203F2B] text-white px-6 py-4 rounded-t-2xl flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div>
            <span className="font-mono text-xs text-[#D9A441] uppercase tracking-widest font-semibold block">
              Department of Agriculture · Hinunangan
            </span>
            <h3 className="font-serif text-lg font-bold text-white">
              {editingPig ? `Edit Registration — ${editingPig.earTag}` : 'New Swine Registration'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY FORM */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-[#1E2B1F]">
          
          {/* Section 1: Geographic GIS Location Picker */}
          <div>
            <div className="font-bold text-xs uppercase tracking-wider text-[#55604F] mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#2F5C3F]" />
                Geographic GIS Swine Location &amp; Pen Coordinates
              </span>
              <span className="text-[10px] font-mono text-[#D9A441] font-bold">Interactive Map</span>
            </div>

            {/* Embedded GIS Interactive Picker */}
            <GisFormMap
              lat={Number(lat) || 10.3969}
              lng={Number(lng) || 125.1999}
              accuracy={gpsAccuracy}
              barangay={barangay}
              onChangeCoordinates={handleMapCoordinateChange}
              geo={geo}
              onSyncBarangay={(brgy) => {
                if (isAdmin) handleBarangayChange(brgy);
              }}
            />

            <div className="grid grid-cols-2 gap-3 mt-2">
              <div>
                <label className="block text-[10px] font-bold uppercase text-[#55604F] mb-0.5">
                  Latitude (°N)
                </label>
                <input
                  type="text"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-lg px-2.5 py-1.5 text-xs text-[#1E2B1F] focus:border-[#2F5C3F] focus:bg-white outline-none font-mono"
                  placeholder="10.3969"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#55604F] mb-0.5">
                  Longitude (°E)
                </label>
                <input
                  type="text"
                  value={lng}
                  onChange={(e) => setLng(e.target.value)}
                  className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-lg px-2.5 py-1.5 text-xs text-[#1E2B1F] focus:border-[#2F5C3F] focus:bg-white outline-none font-mono"
                  placeholder="125.1999"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Owner & Location */}
          <div className="pt-4 border-t border-[#EAE1C4]">
            <div className="font-bold text-xs uppercase tracking-wider text-[#55604F] mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2F5C3F]" />
              Owner & Contact Information
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#55604F] mb-1">
                  Owner Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Juan Dela Cruz"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3.5 py-2.5 text-sm text-[#1E2B1F] focus:border-[#2F5C3F] focus:bg-white outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#55604F] mb-1">
                  Contact Number
                </label>
                <input
                  type="text"
                  placeholder="09XX-XXX-XXXX"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3.5 py-2.5 text-sm text-[#1E2B1F] focus:border-[#2F5C3F] focus:bg-white outline-none font-mono"
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-bold uppercase text-[#55604F] mb-1">
                Complete Physical Address (Purok / Sitio) *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Purok 3, Riverside Farm"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3.5 py-2.5 text-sm text-[#1E2B1F] focus:border-[#2F5C3F] focus:bg-white outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[#55604F] mb-1">
                  Barangay *
                </label>
                <select
                  value={barangay}
                  disabled={!isAdmin}
                  onChange={(e) => handleBarangayChange(e.target.value)}
                  className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3.5 py-2.5 text-sm text-[#1E2B1F] focus:border-[#2F5C3F] focus:bg-white outline-none disabled:opacity-70"
                >
                  {isAdmin ? (
                    BARANGAYS_DATA.map(b => (
                      <option key={b.name} value={b.name}>Brgy. {b.name}</option>
                    ))
                  ) : (
                    <option value={currentUser.barangay || ''}>Brgy. {currentUser.barangay}</option>
                  )}
                </select>
                {!isAdmin && (
                  <p className="text-[11px] text-[#55604F] mt-1">Locked to your designated focal barangay.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#55604F] mb-1">
                  Ear Tag / Municipal Registry ID *
                </label>
                <input
                  type="text"
                  required
                  value={earTag}
                  onChange={(e) => setEarTag(e.target.value)}
                  className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3.5 py-2.5 text-sm text-[#1E2B1F] focus:border-[#2F5C3F] focus:bg-white outline-none font-mono font-bold"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Swine Specifications & General Health */}
          <div className="pt-4 border-t border-[#EAE1C4]">
            <div className="font-bold text-xs uppercase tracking-wider text-[#55604F] mb-3 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#D9A441]" />
              Swine Specifications & Health
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase text-[#55604F] mb-1">
                  Breed *
                </label>
                <select
                  value={breed}
                  onChange={(e) => setBreed(e.target.value as BreedType)}
                  className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3.5 py-2.5 text-sm text-[#1E2B1F] focus:border-[#2F5C3F] focus:bg-white outline-none"
                >
                  {BREEDS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#55604F] mb-1">
                  Sex *
                </label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value as 'Male' | 'Female')}
                  className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3.5 py-2.5 text-sm text-[#1E2B1F] focus:border-[#2F5C3F] focus:bg-white outline-none"
                >
                  <option value="Female">Female (Sow / Gilt)</option>
                  <option value="Male">Male (Boar / Barrow)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[#55604F] mb-1">
                  Age (months) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  required
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3.5 py-2.5 text-sm text-[#1E2B1F] focus:border-[#2F5C3F] focus:bg-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#55604F] mb-1">
                  Weight (kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="500"
                  required
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3.5 py-2.5 text-sm text-[#1E2B1F] focus:border-[#2F5C3F] focus:bg-white outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#55604F] mb-1">
                  Purpose *
                </label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value as PurposeType)}
                  className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3.5 py-2.5 text-sm text-[#1E2B1F] focus:border-[#2F5C3F] focus:bg-white outline-none"
                >
                  {PURPOSES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-xs font-bold uppercase text-[#55604F] mb-1">
                  Date Registered *
                </label>
                <input
                  type="date"
                  required
                  value={dateRegistered}
                  onChange={(e) => setDateRegistered(e.target.value)}
                  className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3.5 py-2.5 text-sm text-[#1E2B1F] focus:border-[#2F5C3F] focus:bg-white outline-none font-mono"
                />
              </div>

              <div className="flex flex-col justify-center space-y-2 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={vaccinated}
                    onChange={(e) => setVaccinated(e.target.checked)}
                    className="rounded text-[#2F5C3F] w-4 h-4 accent-[#2F5C3F]"
                  />
                  <span className="text-xs font-semibold text-[#1E2B1F]">Vaccinated / Dewormed Status</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={asfCleared}
                    onChange={(e) => setAsfCleared(e.target.checked)}
                    className="rounded text-[#2F5C3F] w-4 h-4 accent-[#2F5C3F]"
                  />
                  <span className="text-xs font-semibold text-[#1E2B1F]">ASF Biosecurity Clearance Passed</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 4: NEW BIOSECURITY ASSESSMENT & SANITATION AUDIT */}
          <div id="biosecurity-assessment-section" className="pt-4 border-t border-[#EAE1C4]">
            
            {/* Header & Live Score */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <div className="font-bold text-xs uppercase tracking-wider text-[#2F5C3F] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#2F5C3F]" />
                  <span>Biosecurity Assessment &amp; Sanitation Practices</span>
                </div>
                <p className="text-[11px] text-[#55604F] mt-0.5">
                  Evaluate pen-level containment integrity, footbath maintenance, and African Swine Fever (ASF) biosecurity protocols.
                </p>
              </div>

              {/* Quick preset actions */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSetAllBiosecurity(true)}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-[#F5EFDD] hover:bg-[#EAE1C4] text-[#203F2B] border border-[#DED2AE] rounded-lg transition-colors cursor-pointer"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => handleSetAllBiosecurity(false)}
                  className="px-2.5 py-1 text-[11px] font-semibold bg-white hover:bg-neutral-100 text-[#55604F] border border-[#DED2AE] rounded-lg transition-colors cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* Assessment Score Banner */}
            <div className={`p-3 rounded-xl border mb-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${biosecurityLevelColor}`}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/80 border border-current flex items-center justify-center font-bold text-xs shrink-0">
                  {biosecurityCount}/{totalBiosecurityCount}
                </div>
                <div>
                  <div className="font-bold text-xs">{biosecurityLevel}</div>
                  <div className="text-[10px] opacity-85">
                    {biosecurityCount >= 6 
                      ? 'Complies with DA Babay ASF Program & Municipal Ordinance guidelines.' 
                      : biosecurityCount >= 4 
                      ? 'Moderate containment. Recommend enforcing entrance footbath & zero-swill policy.' 
                      : 'High risk exposure. Urgent biosecurity fortification advised.'}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 sm:justify-end">
                <div className="w-24 bg-white/80 rounded-full h-2 overflow-hidden border border-current">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      biosecurityCount >= 6 ? 'bg-emerald-600' : biosecurityCount >= 4 ? 'bg-[#2F5C3F]' : 'bg-amber-600'
                    }`}
                    style={{ width: `${biosecurityPct}%` }}
                  />
                </div>
                <span className="font-mono text-xs font-bold">{biosecurityPct}%</span>
              </div>
            </div>

            {/* Toggle Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {biosecurityItems.map(item => {
                const isChecked = Boolean(biosecurity[item.key]);
                const IconComponent = item.icon;

                return (
                  <div
                    key={item.key}
                    id={`toggle-card-${item.key}`}
                    onClick={() => handleToggleBiosecurity(item.key)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer select-none relative flex items-start gap-3 ${
                      isChecked
                        ? 'bg-[#FBF8EF] border-[#2F5C3F]/50 shadow-2xs'
                        : 'bg-white border-[#EAE1C4] hover:border-[#DED2AE]'
                    }`}
                  >
                    {/* Toggle Switch */}
                    <div className="pt-0.5 shrink-0">
                      <div 
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors duration-200 flex items-center ${
                          isChecked ? 'bg-[#2F5C3F] justify-end' : 'bg-neutral-300 justify-start'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                      </div>
                    </div>

                    {/* Text Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className={`text-xs font-bold ${isChecked ? 'text-[#1E2B1F]' : 'text-[#55604F]'}`}>
                          {item.label}
                        </span>
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-[#F5EFDD] text-[#55604F] border border-[#DED2AE]">
                          {item.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#55604F] leading-tight">
                        {item.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 5: Field Observations & Notes */}
          <div className="pt-4 border-t border-[#EAE1C4]">
            <label className="block text-xs font-bold uppercase text-[#55604F] mb-1">
              Field Notes / Clinical &amp; Inspection Observations
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Footbath maintained with Virkon solution; concrete pen floor with perimeter hog wire fence; sow due for farrowing next month."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3.5 py-2.5 text-sm text-[#1E2B1F] focus:border-[#2F5C3F] focus:bg-white outline-none resize-none"
            />
          </div>

          {/* FORM ACTIONS */}
          <div className="pt-4 border-t border-[#EAE1C4] flex items-center justify-end gap-3 sticky bottom-0 bg-white py-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-[#DED2AE] text-[#55604F] hover:text-[#1E2B1F] text-sm font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 bg-[#2F5C3F] hover:bg-[#203F2B] text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{editingPig ? 'Save Updates' : 'Register Swine Record'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


