import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  writeBatch,
  onSnapshot,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { PigRecord, User } from '../types';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

// Initialize Firebase App
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with custom databaseId if configured
export const db = getFirestore(
  app, 
  firebaseConfigJson.firestoreDatabaseId || undefined
);

// Enable client offline persistence if supported in browser environment
try {
  if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Firebase persistence failed precondition (multiple tabs open)');
      } else if (err.code === 'unimplemented') {
        console.warn('Firebase persistence unimplemented in current browser');
      }
    });
  }
} catch (e) {
  console.warn('Error enabling Firestore persistence:', e);
}

// ----------------- FIRESTORE DATA REPOSITORIES -----------------

export const PIGS_COLLECTION = 'pigs';
export const USERS_COLLECTION = 'users';
export const SYNC_LOGS_COLLECTION = 'syncLogs';

/**
 * Fetch all pigs from Firestore Cloud Database
 */
export async function fetchPigsFromCloud(): Promise<PigRecord[]> {
  try {
    const pigsRef = collection(db, PIGS_COLLECTION);
    const snap = await getDocs(pigsRef);
    if (snap.empty) return [];
    
    const list: PigRecord[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const pig: PigRecord = {
        id: docSnap.id,
        earTag: data.earTag || '',
        ownerName: data.ownerName || '',
        contact: data.contact || '',
        address: data.address || '',
        barangay: data.barangay || 'Poblacion 1',
        breed: data.breed || 'Landrace',
        sex: data.sex || 'Female',
        age: Number(data.age) || 6,
        weight: Number(data.weight) || 75,
        purpose: data.purpose || 'Backyard Raising',
        vaccinated: Boolean(data.vaccinated),
        asfCleared: data.asfCleared !== undefined ? Boolean(data.asfCleared) : true,
        dateRegistered: data.dateRegistered || new Date().toISOString(),
        lat: Number(data.lat) || 10.3700,
        lng: Number(data.lng) || 125.2000,
        gpsAccuracy: data.gpsAccuracy,
        gpsAltitude: data.gpsAltitude,
        gpsTimestamp: data.gpsTimestamp,
        registeredBy: data.registeredBy || 'focal_person',
        notes: data.notes || '',
        biosecurity: data.biosecurity
      };
      list.push(pig);
    });
    return list;
  } catch (err) {
    console.error('Error fetching pigs from Firestore Cloud:', err);
    throw err;
  }
}

/**
 * Save or update single pig record in Firestore
 */
export async function savePigToCloud(pig: PigRecord): Promise<void> {
  try {
    const docRef = doc(db, PIGS_COLLECTION, pig.id);
    await setDoc(docRef, { ...pig, lastCloudSync: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error('Error saving pig to Firestore:', err);
    throw err;
  }
}

/**
 * Batch write pigs to Firestore
 */
export async function batchSavePigsToCloud(pigs: PigRecord[]): Promise<number> {
  if (pigs.length === 0) return 0;
  try {
    const batch = writeBatch(db);
    pigs.forEach((pig) => {
      const docRef = doc(db, PIGS_COLLECTION, pig.id);
      batch.set(docRef, { ...pig, lastCloudSync: new Date().toISOString() }, { merge: true });
    });
    await batch.commit();
    return pigs.length;
  } catch (err) {
    console.error('Error in batchSavePigsToCloud:', err);
    throw err;
  }
}

/**
 * Delete a pig from Firestore
 */
export async function deletePigFromCloud(pigId: string): Promise<void> {
  try {
    const docRef = doc(db, PIGS_COLLECTION, pigId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting pig from Firestore:', err);
    throw err;
  }
}

/**
 * Fetch all users from Firestore
 */
export async function fetchUsersFromCloud(): Promise<User[]> {
  try {
    const usersRef = collection(db, USERS_COLLECTION);
    const snap = await getDocs(usersRef);
    if (snap.empty) return [];
    
    const list: User[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      const user: User = {
        username: data.username || docSnap.id,
        password: data.password || '',
        role: data.role || 'user',
        fullName: data.fullName || data.name || docSnap.id,
        barangay: data.barangay || null,
        email: data.email,
        phone: data.phone
      };
      list.push(user);
    });
    return list;
  } catch (err) {
    console.error('Error fetching users from Firestore:', err);
    throw err;
  }
}

/**
 * Save user to Firestore
 */
export async function saveUserToCloud(user: User): Promise<void> {
  try {
    const docId = user.username.toLowerCase();
    const docRef = doc(db, USERS_COLLECTION, docId);
    await setDoc(docRef, { ...user, lastCloudSync: new Date().toISOString() }, { merge: true });
  } catch (err) {
    console.error('Error saving user to Firestore:', err);
    throw err;
  }
}

/**
 * Batch write users to Firestore
 */
export async function batchSaveUsersToCloud(users: User[]): Promise<number> {
  if (users.length === 0) return 0;
  try {
    const batch = writeBatch(db);
    users.forEach((user) => {
      const docRef = doc(db, USERS_COLLECTION, user.username.toLowerCase());
      batch.set(docRef, { ...user, lastCloudSync: new Date().toISOString() }, { merge: true });
    });
    await batch.commit();
    return users.length;
  } catch (err) {
    console.error('Error in batchSaveUsersToCloud:', err);
    throw err;
  }
}

/**
 * Realtime listener for live GIS & Swine heatmap synchronization
 */
export function subscribeToCloudPigs(onUpdate: (pigs: PigRecord[]) => void) {
  const pigsRef = collection(db, PIGS_COLLECTION);
  return onSnapshot(pigsRef, (snapshot) => {
    const list: PigRecord[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const pig: PigRecord = {
        id: docSnap.id,
        earTag: data.earTag || '',
        ownerName: data.ownerName || '',
        contact: data.contact || '',
        address: data.address || '',
        barangay: data.barangay || 'Poblacion 1',
        breed: data.breed || 'Landrace',
        sex: data.sex || 'Female',
        age: Number(data.age) || 6,
        weight: Number(data.weight) || 75,
        purpose: data.purpose || 'Backyard Raising',
        vaccinated: Boolean(data.vaccinated),
        asfCleared: data.asfCleared !== undefined ? Boolean(data.asfCleared) : true,
        dateRegistered: data.dateRegistered || new Date().toISOString(),
        lat: Number(data.lat) || 10.3700,
        lng: Number(data.lng) || 125.2000,
        gpsAccuracy: data.gpsAccuracy,
        gpsAltitude: data.gpsAltitude,
        gpsTimestamp: data.gpsTimestamp,
        registeredBy: data.registeredBy || 'focal_person',
        notes: data.notes || '',
        biosecurity: data.biosecurity
      };
      list.push(pig);
    });
    onUpdate(list);
  }, (error) => {
    console.warn('Firestore live subscription notice:', error);
  });
}
