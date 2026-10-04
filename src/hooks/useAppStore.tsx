import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { EXERCISES } from '../data/exercises';
import { createDemoSessions } from '../data/seed';
import { AppData, BreathingExercise, BreathingSession, UserPreferences } from '../types';
import { createInitialData, createExportData, loadAppData, parseImportedData, persistAppData, validateCustomExercise, validatePreferences, validateSession } from '../storage';

export interface AppStore {
  ready: boolean;
  error: string | null;
  exercises: BreathingExercise[];
  sessions: BreathingSession[];
  realSessions: BreathingSession[];
  demoMode: boolean;
  preferences: UserPreferences;
  favorites: string[];
  customExercises: BreathingExercise[];
  toggleFavorite: (id: string) => void;
  /** Move a favorite one position earlier (-1) or later (1). */
  reorderFavorite: (id: string, direction: -1 | 1) => void;
  addSession: (session: BreathingSession) => Promise<void>;
  saveCustomExercise: (exercise: BreathingExercise) => BreathingExercise;
  deleteCustomExercise: (id: string) => void;
  updatePreferences: (changes: Partial<UserPreferences>) => void;
  setDemoMode: (enabled: boolean) => void;
  clearHistory: () => Promise<void>;
  exportData: () => string;
  /** Validates the entire backup before replacing local data. */
  importData: (json: string) => Promise<void>;
}

const AppContext = createContext<AppStore | undefined>(undefined);

export function AppProvider({ children }: PropsWithChildren): React.JSX.Element {
  const [data, setData] = useState<AppData>(createInitialData);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoDate, setDemoDate] = useState(() => new Date());
  const dataRef = useRef(data);
  const readyRef = useRef(false);
  const mounted = useRef(true);

  useEffect(() => {
    let cancelled = false;
    mounted.current = true;
    loadAppData().then((saved) => {
      if (cancelled) return;
      dataRef.current = saved;
      setData(saved);
    }).catch((cause: unknown) => {
      if (!cancelled) setError(`Your saved data could not be opened. ${cause instanceof Error ? cause.message : 'Please try reopening the app.'}`);
    }).finally(() => {
      if (!cancelled) { readyRef.current = true; setReady(true); }
    });
    return () => { cancelled = true; mounted.current = false; };
  }, []);

  useEffect(() => {
    const refresh = () => setDemoDate(new Date());
    const subscription = AppState.addEventListener('change', (state) => { if (state === 'active') refresh(); });
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const timer = setTimeout(refresh, midnight.getTime() - now.getTime() + 1000);
    return () => { subscription.remove(); clearTimeout(timer); };
  }, [demoDate]);

  const commit = useCallback((next: AppData): Promise<void> => {
    if (!readyRef.current) return Promise.reject(new Error('Your saved practice is still loading.'));
    const previous = dataRef.current;
    dataRef.current = next;
    setData(next);
    return persistAppData(next).then(() => {
      if (mounted.current) setError(null);
    }).catch((cause: unknown) => {
      // Keep a failed clear/import from erasing the visible data. Do not roll
      // back over a newer queued edit, which will persist its full snapshot.
      if (dataRef.current === next) {
        dataRef.current = previous;
        if (mounted.current) setData(previous);
      }
      const message = `Your latest changes could not be saved on this device. ${cause instanceof Error ? cause.message : 'Check available device storage and try again.'}`;
      if (mounted.current) setError(message);
      throw new Error(message);
    });
  }, []);

  // Non-blocking preferences and favorites still surface storage failures through error.
  const update = useCallback((next: AppData) => { void commit(next).catch(() => undefined); }, [commit]);

  const toggleFavorite = useCallback((id: string) => {
    const current = dataRef.current;
    if (![...EXERCISES, ...current.customExercises].some((exercise) => exercise.id === id)) return;
    const favorites = current.favorites.includes(id) ? current.favorites.filter((favorite) => favorite !== id) : [...current.favorites, id];
    update({ ...current, favorites });
  }, [update]);

  const reorderFavorite = useCallback((id: string, direction: -1 | 1) => {
    const current = dataRef.current;
    const from = current.favorites.indexOf(id);
    const to = from + direction;
    if (from < 0 || to < 0 || to >= current.favorites.length) return;
    const favorites = [...current.favorites];
    [favorites[from], favorites[to]] = [favorites[to], favorites[from]];
    update({ ...current, favorites });
  }, [update]);

  const addSession = useCallback(async (session: BreathingSession): Promise<void> => {
    const saved = validateSession({ ...session, source: 'real' });
    const current = dataRef.current;
    // A double completion callback must never inflate a user's history.
    if (current.realSessions.some((item) => item.id === saved.id)) {
      // A previous disk write may have failed after the optimistic UI update.
      // Retrying completion must retry durability without adding another record.
      await commit({ ...current, demoMode: false });
      return;
    }
    if (current.realSessions.length >= 50_000) throw new Error('Your local history is full. Export a backup before clearing older activity.');
    const realSessions = [saved, ...current.realSessions].sort((a, b) => b.completedAt.localeCompare(a.completedAt));
    await commit({ ...current, realSessions, demoMode: false });
  }, [commit]);

  const saveCustomExercise = useCallback((exercise: BreathingExercise): BreathingExercise => {
    const saved = validateCustomExercise({ ...exercise, custom: true });
    const current = dataRef.current;
    const exists = current.customExercises.some((item) => item.id === saved.id);
    if (!exists && current.customExercises.length >= 200) throw new Error('You can save up to 200 custom exercises. Remove an older one to make room.');
    const customExercises = exists ? current.customExercises.map((item) => item.id === saved.id ? saved : item) : [...current.customExercises, saved];
    update({ ...current, customExercises });
    return saved;
  }, [update]);

  const deleteCustomExercise = useCallback((id: string) => {
    const current = dataRef.current;
    update({ ...current, customExercises: current.customExercises.filter((exercise) => exercise.id !== id), favorites: current.favorites.filter((favorite) => favorite !== id) });
  }, [update]);

  const updatePreferences = useCallback((changes: Partial<UserPreferences>) => {
    const current = dataRef.current;
    const preferences = validatePreferences({ ...current.preferences, ...changes });
    update({ ...current, preferences });
  }, [update]);

  const setDemoMode = useCallback((enabled: boolean) => {
    update({ ...dataRef.current, demoMode: enabled });
  }, [update]);

  const clearHistory = useCallback(async () => {
    await commit({ ...dataRef.current, realSessions: [], demoMode: false });
  }, [commit]);

  const exportData = useCallback((): string => JSON.stringify(createExportData(dataRef.current), null, 2), []);

  const importData = useCallback(async (json: string) => {
    // Parsing all records before commit keeps invalid imports from partially applying.
    const next = parseImportedData(json);
    await commit(next);
  }, [commit]);

  const demoSessions = useMemo(() => createDemoSessions(demoDate), [demoDate]);
  const exercises = useMemo(() => [...EXERCISES, ...data.customExercises], [data.customExercises]);
  const value = useMemo<AppStore>(() => ({
    ready, error, exercises, sessions: data.demoMode ? demoSessions : data.realSessions,
    realSessions: data.realSessions, demoMode: data.demoMode, preferences: data.preferences,
    favorites: data.favorites, customExercises: data.customExercises, toggleFavorite, reorderFavorite,
    addSession, saveCustomExercise, deleteCustomExercise, updatePreferences, setDemoMode,
    clearHistory, exportData, importData,
  }), [ready, error, exercises, data, demoSessions, toggleFavorite, reorderFavorite, addSession, saveCustomExercise, deleteCustomExercise, updatePreferences, setDemoMode, clearHistory, exportData, importData]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppStore(): AppStore {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppStore must be used inside AppProvider.');
  return context;
}
