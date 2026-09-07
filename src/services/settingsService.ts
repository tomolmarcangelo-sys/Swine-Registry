import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { SystemSettings } from '../types';

const SETTINGS_COLLECTION = 'system';
const SETTINGS_DOC_ID = 'landingPage';

export async function fetchSystemSettings(): Promise<SystemSettings> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as SystemSettings;
    }
    return {};
  } catch (err) {
    console.error('Error fetching system settings:', err);
    return {};
  }
}

export async function saveSystemSettings(settings: SystemSettings): Promise<void> {
  try {
    const docRef = doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
    await setDoc(docRef, settings, { merge: true });
  } catch (err) {
    console.error('Error saving system settings:', err);
    throw err;
  }
}
