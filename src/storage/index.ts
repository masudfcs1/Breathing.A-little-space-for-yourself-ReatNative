import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_FAVORITES, DEFAULT_PREFERENCES } from '../data/seed';
import { AppData } from '../types';
import { parseStoredData } from './validation';

export const STORAGE_KEY = '@breathing/app-data/v1';
export const RECOVERY_STORAGE_KEY = '@breathing/recovery/v1';

export function createInitialData(): AppData {
  return { version: 1, realSessions: [], favorites: [...DEFAULT_FAVORITES], customExercises: [], preferences: { ...DEFAULT_PREFERENCES }, demoMode: true };
}

export async function loadAppData(): Promise<AppData> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored === null) return createInitialData();
  try {
    return parseStoredData(stored);
  } catch (cause) {
    // Preserve the original payload before a later user action saves a fresh
    // state, so malformed or newer-version data is not silently destroyed.
    try { await AsyncStorage.setItem(RECOVERY_STORAGE_KEY, stored); } catch { /* The original key remains untouched. */ }
    throw cause;
  }
}

let pendingWrite: Promise<void> = Promise.resolve();

/** Serializing writes prevents a slow earlier update from replacing newer data. */
export function persistAppData(data: AppData): Promise<void> {
  const serialized = JSON.stringify(data);
  const write = pendingWrite.catch(() => undefined).then(() => AsyncStorage.setItem(STORAGE_KEY, serialized));
  pendingWrite = write;
  return write;
}

export * from './validation';
