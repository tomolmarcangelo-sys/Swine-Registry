import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Shield,
  Camera,
  Wifi,
  WifiOff,
  CloudCheck,
  Upload
} from 'lucide-react';
import { BARANGAYS_DATA, BARANGAY_COORDS_MAP, BREEDS, PURPOSES } from '../data/constants';
import { GeolocationHookReturn } from '../hooks/useGeolocation';
import { BiosecurityAssessment, BreedType, PigRecord, PurposeType, User } from '../types';
import { GisFormMap } from './GisFormMap';
import { uploadImageToSupabase } from '../services/supabaseClient';
import { useI18n } from '../i18n/I18nContext';
import { getSimulateOffline } from '../services/syncService';
import {
  SYSTEM_LOGIC,
  getPurposeDefinition,
  calculateBiosecurityScore,
  determineAsfRiskLevel,
  evaluatePcicEligibility,
  validatePigByPurpose
} from '../config/systemLogic';

interface AddEditRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: PigRecord) => void;
  currentUser: User;
  editingPig?: PigRecord | null;
  existingPigs: PigRecord[];
  initialCoords?: { lat: number; lng: number; barangay?: string } | null;
  geo?: GeolocationHookReturn;
  isOnline?: boolean;
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
  geo,
  isOnline: isOnlineProp
}) => {
  const { t } = useI18n();
  const isOnline = isOnlineProp !== undefined 
    ? isOnlineProp 
    : (typeof navigator !== 'undefined' ? (navigator.onLine && !getSimulateOffline()) : true);
  const isAdmin = currentUser.role === 'admin';
  const defaultBarangay = editingPig?.barangay || initialCoords?.barangay || (isAdmin ? 'Poblacion' : currentUser.barangay || 'Poblacion');

  const [ownerName, setOwnerName] = useState(editingPig?.ownerName || '');
  const [contact, setContact] = useState(editingPig?.contact || '');
  const [address, setAddress] = useState(editingPig?.address || '');
  const [photoUrl, setPhotoUrl] = useState(editingPig?.photoUrl || '');
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
  const [isDeceased, setIsDeceased] = useState(editingPig?.isDeceased ?? false);
  const [mortalityDate, setMortalityDate] = useState(editingPig?.mortalityDate || new Date().toISOString().slice(0, 10));
  const [mortalityReason, setMortalityReason] = useState(editingPig?.mortalityReason || 'Suspected ASF Outbreak');

  // Purpose-Driven Farm Practices & Lifecycle State
  const [headCount, setHeadCount] = useState<string>(editingPig?.headCount ? String(editingPig.headCount) : '1');
  const [housingType, setHousingType] = useState<string>(editingPig?.housingType || (editingPig?.biosecurity as any)?.housingType || 'Elevated Slatted Flooring');
  const [feedingType, setFeedingType] = useState<string>(editingPig?.feedingType || (editingPig?.biosecurity as any)?.feedingType || 'Commercial Pellets & Concentrates');
  const [wasteManagement, setWasteManagement] = useState<string>(editingPig?.wasteManagement || (editingPig?.biosecurity as any)?.wasteManagement || 'Septic Tank / Containment Pit');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Camera Access, Live Viewfinder & Capture States
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startCamera = async () => {
    setCameraError('');
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(err => console.error("Video play error", err));
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraError('Could not access device camera. Please verify camera permissions or open in a new tab.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  }, [cameraStream]);

  // Handle active video source mapping when stream connects
  useEffect(() => {
    if (isCameraActive && cameraStream && videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [isCameraActive, cameraStream]);

  // Clean stop when modal closes or unmounts
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const capturePhoto = () => {
    if (!videoRef.current) return;
    setIsCapturing(true);
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw the current video frame on the canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Output a highly compressed JPEG (0.75 quality) as base64 to ensure it saves instantly and functions offline
        const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
        setPhotoUrl(dataUrl);

        // If online, optionally fire an upload to Supabase to get a CDN url
        if (isOnline) {
          canvas.toBlob(async (blob) => {
            if (blob) {
              const file = new File([blob], `swine_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
              try {
                const url = await uploadImageToSupabase(file);
                if (url) {
                  setPhotoUrl(url);
                }
              } catch (uploadErr) {
                console.warn('Silent fallback to base64, Supabase upload issue:', uploadErr);
              }
            }
          }, 'image/jpeg', 0.75);
        }
      }
      stopCamera();
    } catch (err) {
      console.error('Error capturing from video canvas:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  // Validation & masking states
  const [contactError, setContactError] = useState('');
  const [earTagError, setEarTagError] = useState('');

  // Helper function to format contact numbers to 09XX-XXX-XXXX format
  const formatContactNumber = (val: string): string => {
    const digits = val.replace(/\D/g, '');
    let formatted = digits.slice(0, 11);
    if (formatted.length > 4 && formatted.length <= 7) {
      formatted = `${formatted.slice(0, 4)}-${formatted.slice(4)}`;
    } else if (formatted.length > 7) {
      formatted = `${formatted.slice(0, 4)}-${formatted.slice(4, 7)}-${formatted.slice(7)}`;
    }
    return formatted;
  };

  const handleContactChange = (val: string) => {
    const formatted = formatContactNumber(val);
    setContact(formatted);

    const cleanDigits = formatted.replace(/\D/g, '');
    if (formatted && cleanDigits.length !== 11) {
      setContactError('Phone number must be exactly 11 digits (e.g. 0917-123-4567)');
    } else if (formatted && !formatted.startsWith('09')) {
      setContactError('Phone number must start with 09 (Philippine mobile standard)');
    } else {
      setContactError('');
    }
  };

  const handleEarTagChange = (val: string) => {
    // Force uppercase and allow alphanumeric and dashes
    let formatted = val.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    setEarTag(formatted);

    const earTagRegex = /^[A-Z]{3,4}-\d{4}-\d{1,6}$/;
    if (!formatted) {
      setEarTagError('Ear Tag / Municipal Registry ID is required');
    } else if (formatted.split('-').length < 3) {
      setEarTagError('Format requires 3 parts: BRGY-YEAR-ID (e.g. POB-2026-101)');
    } else if (!earTagRegex.test(formatted)) {
      setEarTagError('Standard Hinunangan format required: BRGY-YEAR-ID (e.g. POB-2026-101)');
    } else {
      setEarTagError('');
    }
  };

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

  // Reset form to pristine state (or editing record state)
  const resetToCleanState = useCallback(() => {
    setContactError('');
    setEarTagError('');
    if (editingPig) {
      setOwnerName(editingPig.ownerName || '');
      setContact(formatContactNumber(editingPig.contact || ''));
      setAddress(editingPig.address || '');
      setPhotoUrl(editingPig.photoUrl || '');
      setBarangay(editingPig.barangay || defaultBarangay);
      setEarTag(editingPig.earTag);
      setBreed(editingPig.breed as BreedType || 'Native / Native-cross');
      setSex(editingPig.sex || 'Female');
      setAge(String(editingPig.age ?? '6'));
      setWeight(String(editingPig.weight ?? '45.0'));
      setPurpose(editingPig.purpose as PurposeType || 'Backyard Raising');
      setVaccinated(editingPig.vaccinated ?? true);
      setAsfCleared(editingPig.asfCleared ?? true);
      setDateRegistered(editingPig.dateRegistered || new Date().toISOString().slice(0, 10));
      setNotes(editingPig.notes || '');
      setLat(String(editingPig.lat ?? 10.3969));
      setLng(String(editingPig.lng ?? 125.1999));
      setGpsAccuracy(editingPig.gpsAccuracy ?? 5.0);
      setBiosecurity(editingPig.biosecurity || DEFAULT_BIOSECURITY);
      setIsDeceased(editingPig.isDeceased ?? false);
      setMortalityDate(editingPig.mortalityDate || new Date().toISOString().slice(0, 10));
      setMortalityReason(editingPig.mortalityReason || 'Suspected ASF Outbreak');
      setHeadCount(String(editingPig.headCount ?? '1'));
      setHousingType(editingPig.housingType || (editingPig.biosecurity as any)?.housingType || 'Elevated Slatted Flooring');
      setFeedingType(editingPig.feedingType || (editingPig.biosecurity as any)?.feedingType || 'Commercial Pellets & Concentrates');
      setWasteManagement(editingPig.wasteManagement || (editingPig.biosecurity as any)?.wasteManagement || 'Septic Tank / Containment Pit');
      setValidationErrors([]);
    } else {
      const defBrgy = initialCoords?.barangay || (isAdmin ? 'Poblacion' : currentUser.barangay || 'Poblacion');
      const brgyCode = defBrgy.slice(0, 3).toUpperCase();
      const count = (existingPigs || []).filter(p => p.barangay === defBrgy).length;
      setOwnerName('');
      setContact('');
      setAddress('');
      setPhotoUrl('');
      setBarangay(defBrgy);
      setEarTag(`HGN-${brgyCode}-${101 + count}`);
      setBreed('Native / Native-cross');
      setSex('Female');
      setAge('6');
      setWeight('45.0');
      setPurpose('Backyard Raising');
      setVaccinated(true);
      setAsfCleared(true);
      setDateRegistered(new Date().toISOString().slice(0, 10));
      setNotes('');
      const bCoord = BARANGAY_COORDS_MAP[defBrgy] || { lat: 10.3969, lng: 125.1999 };
      setLat(String(initialCoords?.lat || bCoord.lat));
      setLng(String(initialCoords?.lng || bCoord.lng));
      setGpsAccuracy(5.0);
      setBiosecurity(DEFAULT_BIOSECURITY);
      setIsDeceased(false);
      setMortalityDate(new Date().toISOString().slice(0, 10));
      setMortalityReason('Suspected ASF Outbreak');
      setHeadCount('1');
      setHousingType('Elevated Slatted Flooring');
      setFeedingType('Commercial Pellets & Concentrates');
      setWasteManagement('Septic Tank / Containment Pit');
      setValidationErrors([]);
    }
  }, [editingPig, defaultBarangay, initialCoords, isAdmin, currentUser.barangay, existingPigs]);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  // Lifecycle: When modal opens, initialize form state from editingPig or clean defaults
  useEffect(() => {
    if (isOpen) {
      resetToCleanState();
    }
  }, [isOpen, resetToCleanState]);

  // Escape key closes modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

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

  // Biosecurity Assessment Items Configuration with bilingual support
  const biosecurityItems: {
    key: keyof BiosecurityAssessment;
    label: string;
    description: string;
    tag: string;
    icon: React.ElementType;
  }[] = [
    {
      key: 'footbathMaintenance',
      label: t('biosecurity.footbath.label'),
      description: t('biosecurity.footbath.description'),
      tag: 'Sanitation Gate',
      icon: Sparkles
    },
    {
      key: 'fencingIntegrity',
      label: t('biosecurity.fencing.label'),
      description: t('biosecurity.fencing.description'),
      tag: 'Containment',
      icon: Shield
    },
    {
      key: 'swillFeedingBanned',
      label: t('biosecurity.swillBan.label'),
      description: t('biosecurity.swillBan.description'),
      tag: 'DA Policy',
      icon: Ban
    },
    {
      key: 'disinfectionRoutine',
      label: t('biosecurity.disinfection.label'),
      description: t('biosecurity.disinfection.description'),
      tag: 'Protocol',
      icon: Droplets
    },
    {
      key: 'visitorLogControl',
      label: t('biosecurity.visitorLog.label'),
      description: t('biosecurity.visitorLog.description'),
      tag: 'Biosecurity Gate',
      icon: Users
    },
    {
      key: 'quarantineIsolationPen',
      label: t('biosecurity.quarantinePen.label'),
      description: t('biosecurity.quarantinePen.description'),
      tag: 'Isolation',
      icon: CheckCircle2
    },
    {
      key: 'cleanWaterSource',
      label: t('biosecurity.cleanWater.label'),
      description: t('biosecurity.cleanWater.description'),
      tag: 'Potability',
      icon: Droplets
    }
  ];

  const biosecurityCount = Object.values(biosecurity).filter(Boolean).length;
  const totalBiosecurityCount = biosecurityItems.length;
  const biosecurityPct = Math.round((biosecurityCount / totalBiosecurityCount) * 100);

  let biosecurityLevel = t('biosecurity.level1Basic');
  let biosecurityLevelColor = 'text-amber-700 bg-amber-50 border-amber-300';
  if (biosecurityCount >= 6) {
    biosecurityLevel = t('biosecurity.level3High');
    biosecurityLevelColor = 'text-emerald-800 bg-emerald-50 border-emerald-300';
  } else if (biosecurityCount >= 4) {
    biosecurityLevel = t('biosecurity.level2Standard');
    biosecurityLevelColor = 'text-[#2F5C3F] bg-[#F5EFDD] border-[#DED2AE]';
  }

  // Purpose-Driven Real-time Intelligence & Computations
  const currentPurposeDef = getPurposeDefinition(purpose);
  const liveCandidateRecord: Partial<PigRecord> = {
    earTag,
    ownerName,
    barangay,
    breed,
    sex,
    age: Number(age) || 0,
    weight: Number(weight) || 0,
    purpose,
    vaccinated,
    asfCleared,
    lat: Number(lat) || 0,
    lng: Number(lng) || 0,
    biosecurity,
    headCount: Number(headCount) || 1,
    housingType,
    feedingType,
    wasteManagement,
  };
  const liveBioEval = calculateBiosecurityScore(biosecurity);
  const liveAsfRisk = determineAsfRiskLevel(liveCandidateRecord);
  const livePcic = evaluatePcicEligibility(liveCandidateRecord);
  const livePurposeCheck = validatePigByPurpose(liveCandidateRecord);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Final pre-submit integrity validations
    let hasValidationError = false;

    // Contact number validation (if present, must be 11 digits starting with 09)
    if (contact) {
      const cleanDigits = contact.replace(/\D/g, '');
      if (cleanDigits.length !== 11) {
        setContactError('Phone number must be exactly 11 digits (e.g. 0917-123-4567)');
        hasValidationError = true;
      } else if (!contact.startsWith('09')) {
        setContactError('Phone number must start with 09 (Philippine mobile standard)');
        hasValidationError = true;
      }
    }

    // Ear tag validation (required, must follow standard Hinunangan registration format)
    const trimmedEarTag = earTag.trim();
    const earTagRegex = /^[A-Z]{3,4}-\d{4}-\d{1,6}$/;
    if (!trimmedEarTag) {
      setEarTagError('Ear Tag / Municipal Registry ID is required');
      hasValidationError = true;
    } else if (!earTagRegex.test(trimmedEarTag)) {
      setEarTagError('Standard Hinunangan format required: BRGY-YEAR-ID (e.g. POB-2026-101)');
      hasValidationError = true;
    }

    const numLat = Number(lat) || 10.3969;
    const numLng = Number(lng) || 125.1999;
    const numHeadCount = Math.max(1, parseInt(headCount, 10) || 1);
    const bioScore = calculateBiosecurityScore(biosecurity);

    const record: PigRecord = {
      id: editingPig?.id || `REC-${Date.now()}`,
      earTag: trimmedEarTag,
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
      biosecurity: {
        ...biosecurity,
        score: bioScore.score,
        housingType,
        feedingType,
        wasteManagement,
        asfRiskLevel: liveAsfRisk.level,
        pcicEligible: livePcic.isEligible
      },
      photoUrl,
      isDeceased,
      mortalityDate: isDeceased ? mortalityDate : undefined,
      mortalityReason: isDeceased ? mortalityReason : undefined,
      headCount: numHeadCount,
      housingType,
      feedingType,
      wasteManagement,
      biosecurityScore: bioScore.score,
      biosecurityLevel: bioScore.score,
      asfRiskLevel: liveAsfRisk.level,
      pcicEligible: livePcic.isEligible,
    };

    // Evaluate Purpose-Driven Business Logic
    const purposeValidation = validatePigByPurpose(record);
    if (!purposeValidation.isValid) {
      setValidationErrors(purposeValidation.errors);
      hasValidationError = true;
    } else {
      setValidationErrors([]);
    }

    if (hasValidationError) {
      const modalTop = document.getElementById('modal-scroll-top');
      if (modalTop) {
        modalTop.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    onSave(record);
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#141A12]/60 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="bg-white border border-[#DED2AE] rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl my-6">
        
        {/* MODAL HEADER */}
        <div className="bg-[#203F2B] text-white px-6 py-4 rounded-t-2xl flex items-center justify-between sticky top-0 z-20 shadow-xs">
          <div>
            <span className="font-mono text-xs text-[#D9A441] uppercase tracking-widest font-semibold block">
              {t('modal.deptHeader')}
            </span>
            <h3 className="font-serif text-lg font-bold text-white">
              {editingPig ? t('modal.titleEdit', { earTag: editingPig.earTag }) : t('modal.titleNew')}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY FORM */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 text-[#1E2B1F]">
          <div id="modal-scroll-top" />

          {/* Business Logic & Purpose Validation Banner */}
          {validationErrors.length > 0 && (
            <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-950 flex items-start gap-3 shadow-xs">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 space-y-1">
                <div className="font-bold text-rose-900 text-sm">Regulatory Compliance & Purpose Validation Error</div>
                <ul className="list-disc pl-4 space-y-0.5 text-xs text-rose-800">
                  {validationErrors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
                <p className="text-[11px] text-rose-700 mt-1">Please adjust the fields below in accordance with DA-BAI Hinunangan livestock standards.</p>
              </div>
            </div>
          )}
          
          {/* Connection Status Banner */}
          {!isOnline ? (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 flex items-start gap-3 text-xs text-amber-950 shadow-2xs">
              <div className="p-1.5 bg-amber-200/70 rounded-lg text-amber-900 shrink-0 mt-0.5">
                <WifiOff className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="font-bold flex items-center justify-between">
                  <span className="text-amber-900 font-semibold">Offline Field Mode • Saved Locally</span>
                  <span className="bg-amber-200/80 text-amber-900 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold">
                    OFFLINE DRAFT
                  </span>
                </div>
                <p className="text-amber-800/90 text-[11px] mt-0.5 leading-relaxed">
                  Your record and edits will be stored safely in this device's local memory right now. As soon as an internet signal is detected, it will automatically upload and sync live with Supabase PostgreSQL Database.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl px-3.5 py-2.5 flex items-center justify-between text-xs text-emerald-950">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse shrink-0" />
                <span className="font-semibold text-emerald-900 text-[12px]">
                  Connected to Central DA Cloud
                </span>
                <span className="text-emerald-700/80 text-[11px] hidden sm:inline">
                  • Automatic Live Sync Active
                </span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                <CloudCheck className="w-3 h-3" />
                <span>LIVE</span>
              </span>
            </div>
          )}

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
                  onChange={(e) => handleContactChange(e.target.value)}
                  className={`w-full bg-[#FBF8EF] border rounded-xl px-3.5 py-2.5 text-sm text-[#1E2B1F] focus:bg-white outline-none font-mono transition-colors ${
                    contactError 
                      ? 'border-rose-300 focus:border-rose-500 text-rose-950' 
                      : 'border-[#DED2AE] focus:border-[#2F5C3F]'
                  }`}
                />
                {contactError && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-rose-500" />
                    {contactError}
                  </p>
                )}
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
                  onChange={(e) => handleEarTagChange(e.target.value)}
                  className={`w-full bg-[#FBF8EF] border rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold focus:bg-white outline-none transition-colors ${
                    earTagError 
                      ? 'border-rose-300 focus:border-rose-500 text-rose-950' 
                      : 'border-[#DED2AE] focus:border-[#2F5C3F] text-[#1E2B1F]'
                  }`}
                  placeholder="e.g. POB-2026-101"
                />
                {earTagError ? (
                  <p className="text-[11px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-rose-500" />
                    {earTagError}
                  </p>
                ) : (
                  <p className="text-[10px] text-[#55604F] mt-1">
                    Format: BRGY-YEAR-ID (e.g., POB-2026-101 or ILAY-2026-005)
                  </p>
                )}
              </div>
            </div>

            {/* Swine / Pen Profile Photo Upload & Direct Camera Capture */}
            <div className="mt-3 pt-3 border-t border-[#EAE1C4] space-y-3">
              <label className="block text-xs font-bold uppercase text-[#55604F]">
                Swine / Pen Photo Verification (Optional)
              </label>

              {cameraError && (
                <div className="p-3 bg-amber-50 border border-amber-300 text-amber-950 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>{cameraError}</span>
                </div>
              )}

              {isCameraActive ? (
                <div className="space-y-3">
                  {/* Live Viewfinder Box */}
                  <div className="relative w-full max-w-md mx-auto aspect-video bg-black rounded-2xl overflow-hidden border border-[#DED2AE] shadow-inner flex items-center justify-center">
                    <video 
                      ref={videoRef}
                      autoPlay 
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {/* Viewfinder crosshairs and focus indicators */}
                    <div className="absolute inset-0 border-[16px] border-black/30 pointer-events-none flex items-center justify-center">
                      <div className="w-8 h-8 border border-white/40 rounded-lg absolute" />
                    </div>
                    <div className="absolute top-2 left-3 bg-rose-600 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                      LIVE SURVEILLANCE FEED
                    </div>
                  </div>

                  {/* Camera Control Buttons */}
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      disabled={isCapturing}
                      className="px-4 py-2 bg-[#203F2B] hover:bg-[#2F5C3F] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
                    >
                      {isCapturing ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Capturing...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#D9A441]" />
                          <span>Capture Snapshot</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-4 py-2 bg-white hover:bg-[#FBF8EF] border border-[#DED2AE] text-[#55604F] text-xs font-bold rounded-xl transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-[#FAF6EC] border border-[#EAE1C4] p-3.5 rounded-2xl">
                  {/* Photo Thumbnail */}
                  <div className="relative w-16 h-16 rounded-2xl border border-[#DED2AE] bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-3xs mx-auto sm:mx-0">
                    {photoUrl ? (
                      <>
                        <img src={photoUrl} alt="Swine profile preview" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setPhotoUrl('')}
                          className="absolute inset-0 bg-black/60 hover:bg-black/70 text-white text-[10px] font-bold flex items-center justify-center transition-opacity opacity-0 hover:opacity-100"
                          title="Remove photo"
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <Camera className="w-7 h-7 text-[#AEC0AE]" />
                    )}
                  </div>

                  {/* Upload & Camera Trigger Buttons */}
                  <div className="flex-1 space-y-1.5 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      {/* 1. Device Camera Trigger */}
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-3 py-1.5 bg-[#203F2B] hover:bg-[#2F5C3F] text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-95 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-[#D9A441]" />
                        <span>Take Photo</span>
                      </button>

                      {/* 2. File Upload Selector */}
                      <label className="px-3 py-1.5 bg-white hover:bg-[#FAF6EC] text-[#2F5C3F] border border-[#DED2AE] text-xs font-bold rounded-xl cursor-pointer transition-colors inline-flex items-center gap-1.5 shadow-2xs">
                        <Upload className="w-3.5 h-3.5 text-[#2F5C3F]" />
                        <span>Upload File</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const url = await uploadImageToSupabase(file);
                                if (url) setPhotoUrl(url);
                              } catch (err) {
                                console.error('Failed to upload selected file', err);
                              }
                            }
                          }}
                        />
                      </label>

                      {photoUrl && (
                        <button
                          type="button"
                          onClick={() => setPhotoUrl('')}
                          className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-bold transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-[#55604F] leading-tight">
                      Support verification by adding a direct swine, pen, or ear-tag photo. Supports live camera capture and gallery uploads.
                    </p>
                  </div>
                </div>
              )}
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
                  className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3.5 py-2.5 text-sm text-[#1E2B1F] focus:border-[#2F5C3F] focus:bg-white outline-none font-medium"
                >
                  {PURPOSES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-[#55604F] mb-1">
                  Head Count (Herd Size) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  required
                  value={headCount}
                  onChange={(e) => setHeadCount(e.target.value)}
                  className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3.5 py-2.5 text-sm text-[#1E2B1F] focus:border-[#2F5C3F] focus:bg-white outline-none font-mono font-medium"
                />
              </div>
            </div>

            {/* Purpose-Driven Regulatory & PCIC Intelligence Panel */}
            <div className="mt-3.5 bg-linear-to-br from-[#FAF7EE] to-[#F3ECD6] border border-[#DED2AE] rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E3D8BA] pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold font-mono tracking-wider uppercase text-[#2F5C3F]">
                      DA Regulatory Specification
                    </span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#2F5C3F]/10 text-[#2F5C3F]">
                      {currentPurposeDef.label || currentPurposeDef.purposeKey}
                    </span>
                  </div>
                  <p className="text-xs text-[#55604F] mt-0.5">
                    {currentPurposeDef.description || 'Monitored under DA-BAI swine program'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[11px] font-mono text-[#788471] block">Max Scale Cap</span>
                  <span className="text-xs font-bold text-[#1E2B1F] font-mono">
                    {currentPurposeDef.maxRecommendedHeads && currentPurposeDef.maxRecommendedHeads < 999 
                      ? `≤ ${currentPurposeDef.maxRecommendedHeads} heads` 
                      : 'Commercial Scale'}
                  </span>
                </div>
              </div>

              {/* Real-time Risk & PCIC Eligibility Badges */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {/* Live ASF Risk Status */}
                <div className="bg-white/80 border border-[#E3D8BA] rounded-xl p-3 flex items-start gap-2.5">
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    liveAsfRisk.level === 'Green' ? 'bg-emerald-100 text-emerald-800' :
                    liveAsfRisk.level === 'Yellow' ? 'bg-amber-100 text-amber-800' :
                    liveAsfRisk.level === 'Pink' ? 'bg-rose-100 text-rose-800' :
                    'bg-red-100 text-red-900'
                  }`}>
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1E2B1F]">ASF Zone Evaluation</span>
                      <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                        liveAsfRisk.level === 'Green' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        liveAsfRisk.level === 'Yellow' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                        'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}>
                        {liveAsfRisk.level.toUpperCase()} ZONE
                      </span>
                    </div>
                    <p className="text-[11px] text-[#55604F] mt-1 leading-snug">
                      {liveAsfRisk.reason}
                    </p>
                  </div>
                </div>

                {/* Live PCIC Eligibility Status */}
                <div className="bg-white/80 border border-[#E3D8BA] rounded-xl p-3 flex items-start gap-2.5">
                  <div className={`p-1.5 rounded-lg shrink-0 ${
                    livePcic.isEligible ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {livePcic.isEligible ? <ShieldCheck className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1E2B1F]">PCIC Insurance Status</span>
                      <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                        livePcic.isEligible 
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                          : 'bg-amber-100 text-amber-900 border border-amber-300'
                      }`}>
                        {livePcic.isEligible ? 'COVERED' : 'INELIGIBLE'}
                      </span>
                    </div>
                    {livePcic.isEligible ? (
                      <p className="text-[11px] text-emerald-800 mt-1 font-medium leading-snug">
                        Eligible for PCIC Municipal Swine Insurance (100% Gov't Subsidy)
                      </p>
                    ) : (
                      <p className="text-[11px] text-amber-900 mt-1 leading-snug">
                        {livePcic.failedCriteria[0] || livePcic.reasons[0] || 'Must satisfy DA biosecurity and health thresholds'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Farm Practices & Containment Infrastructure */}
            <div className="mt-3.5 pt-3 border-t border-[#EAE1C4]">
              <span className="text-xs font-mono font-bold uppercase text-[#55604F] tracking-wider block mb-2">
                Husbandry Practices & Biosecurity Infrastructure
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#55604F] mb-1">
                    Housing Facility *
                  </label>
                  <select
                    value={housingType}
                    onChange={(e) => setHousingType(e.target.value)}
                    className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3 py-2 text-xs text-[#1E2B1F] focus:border-[#2F5C3F] focus:bg-white outline-none font-medium"
                  >
                    <option value="Elevated Slatted Flooring">Elevated Slatted Flooring</option>
                    <option value="Concrete Flooring with Pen Run">Concrete Flooring with Pen Run</option>
                    <option value="Deep Bedding / Natural Piggery">Deep Bedding / Natural Piggery</option>
                    <option value="Open Yard / Dirt Pen (DA Not Recommended)">Open Yard / Dirt Pen (DA Not Recommended)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#55604F] mb-1">
                    Feeding Practice *
                  </label>
                  <select
                    value={feedingType}
                    onChange={(e) => setFeedingType(e.target.value)}
                    className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3 py-2 text-xs text-[#1E2B1F] focus:border-[#2F5C3F] focus:bg-white outline-none font-medium"
                  >
                    <option value="Commercial Pellets & Concentrates">Commercial Pellets & Concentrates</option>
                    <option value="Cooked Crop By-Products & Rice Bran">Cooked Crop By-Products & Rice Bran</option>
                    <option value="Mixed Forage & Commercial Feed">Mixed Forage & Commercial Feed</option>
                    <option value="Swill / Food Scraps (DA Strictly Banned)">Swill / Food Scraps (DA Strictly Banned)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#55604F] mb-1">
                    Waste Management *
                  </label>
                  <select
                    value={wasteManagement}
                    onChange={(e) => setWasteManagement(e.target.value)}
                    className="w-full bg-[#FBF8EF] border border-[#DED2AE] rounded-xl px-3 py-2 text-xs text-[#1E2B1F] focus:border-[#2F5C3F] focus:bg-white outline-none font-medium"
                  >
                    <option value="Septic Tank / Containment Pit">Septic Tank / Containment Pit</option>
                    <option value="Biogas Digester System">Biogas Digester System</option>
                    <option value="Composting Pit">Composting Pit</option>
                    <option value="Direct Drainage / Lagoon">Direct Drainage / Lagoon</option>
                  </select>
                </div>
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

            {/* Swine Mortality & Biosecurity Outbreak Status Section */}
            <div className="mt-4 pt-3.5 border-t border-[#EAE1C4]">
              <div className={`p-3.5 rounded-xl border transition-all ${
                isDeceased 
                  ? 'bg-rose-50 border-rose-300 shadow-xs' 
                  : 'bg-[#FBF8EF] border-[#DED2AE]'
              }`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-1.5 rounded-lg shrink-0 ${
                      isDeceased ? 'bg-rose-100 text-rose-800' : 'bg-[#F5EFDD] text-[#55604F]'
                    }`}>
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <label htmlFor="isDeceasedToggle" className={`text-xs font-bold block cursor-pointer ${
                        isDeceased ? 'text-rose-950' : 'text-[#1E2B1F]'
                      }`}>
                        Mark Pig as Deceased (Mortality Event)
                      </label>
                      <p className={`text-[11px] ${isDeceased ? 'text-rose-800' : 'text-[#55604F]'}`}>
                        Tracks livestock deaths for biosecurity outbreak tracing &amp; DA ASF surveillance.
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      id="isDeceasedToggle"
                      type="checkbox"
                      checked={isDeceased}
                      onChange={(e) => setIsDeceased(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                  </label>
                </div>

                {/* Conditional Mortality Details Form */}
                {isDeceased && (
                  <div className="mt-3 pt-3 border-t border-rose-200/80 space-y-3 animate-fadeIn">
                    <div className="text-[11px] font-bold text-rose-900 flex items-center gap-1.5 uppercase font-mono">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                      <span>Mortality &amp; Outbreak Surveillance Record</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-rose-900 mb-1">
                          Mortality Date *
                        </label>
                        <input
                          type="date"
                          required={isDeceased}
                          value={mortalityDate}
                          onChange={(e) => setMortalityDate(e.target.value)}
                          className="w-full bg-white border border-rose-300 rounded-lg px-3 py-2 text-xs text-rose-950 font-mono focus:border-rose-600 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold uppercase text-rose-900 mb-1">
                          Mortality Cause / Reason *
                        </label>
                        <select
                          value={mortalityReason}
                          onChange={(e) => setMortalityReason(e.target.value)}
                          className="w-full bg-white border border-rose-300 rounded-lg px-3 py-2 text-xs text-rose-950 font-bold focus:border-rose-600 outline-none"
                        >
                          <option value="Suspected ASF Outbreak">Suspected ASF Outbreak (High Risk)</option>
                          <option value="High Fever / Systemic Illness">High Fever / Systemic Illness</option>
                          <option value="Respiratory Syndrome">Respiratory Syndrome / Pneumonia</option>
                          <option value="Piglet Mortality / Scours">Piglet Mortality / Scours</option>
                          <option value="Injury / Physical Trauma">Injury / Physical Trauma</option>
                          <option value="Other Disease / Natural Causes">Other Disease / Natural Causes</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-rose-100/70 border border-rose-300/80 p-2.5 rounded-lg text-[10px] text-rose-900 leading-tight">
                      <b>Biosecurity Advisory:</b> Recorded mortality events are flagged in municipal GIS spatial maps and biosecurity reports to assist DA focal Officers in early cluster detection and quarantine enforcement.
                    </div>
                  </div>
                )}
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
              onClick={handleClose}
              className="px-5 py-2.5 rounded-xl border border-[#DED2AE] text-[#55604F] hover:text-[#1E2B1F] text-sm font-semibold transition-colors cursor-pointer"
            >
              {t('modal.cancelBtn')}
            </button>

            <button
              type="submit"
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-colors cursor-pointer ${
                !isOnline 
                  ? 'bg-[#D9A441] hover:bg-[#c29134] text-[#1E2B1F]' 
                  : 'bg-[#2F5C3F] hover:bg-[#203F2B] text-white'
              }`}
            >
              <Save className="w-4 h-4" />
              <span>
                {!isOnline 
                  ? (editingPig ? 'Save Local Changes (Offline Draft)' : 'Save Record (Offline Draft)') 
                  : (editingPig ? t('modal.updateBtn') : t('modal.saveBtn'))
                }
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


