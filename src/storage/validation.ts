import { CATEGORIES, EXERCISES } from '../data/exercises';
import { AppData, BreathingExercise, BreathingPattern, BreathingSession, ExportData, UserPreferences } from '../types';

const MAX_SESSIONS = 50_000;
const MAX_CUSTOM_EXERCISES = 200;
const MAX_IMPORT_BYTES = 15 * 1024 * 1024;

function record(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label} must be an object.`);
  return value as Record<string, unknown>;
}

function text(value: unknown, label: string, max = 120, min = 1): string {
  if (typeof value !== 'string' || value.trim().length < min || value.length > max) throw new Error(`${label} must contain ${min}–${max} characters.`);
  return value.trim();
}

function numeric(value: unknown, label: string, min: number, max: number, integer = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) throw new Error(`${label} must be ${integer ? 'a whole number ' : ''}between ${min} and ${max}.`);
  return value;
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${label} must be true or false.`);
  return value;
}

function choice<T extends string>(value: unknown, options: readonly T[], label: string): T {
  if (typeof value !== 'string' || !options.includes(value as T)) throw new Error(`${label} is not a supported option.`);
  return value as T;
}

function timestamp(value: unknown, label: string): string {
  const result = text(value, label, 40);
  const date = new Date(result);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== result) throw new Error(`${label} must be a valid ISO timestamp.`);
  return result;
}

function identifier(value: unknown, label: string): string {
  const id = text(value, label, 160);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(id)) throw new Error(`${label} contains unsupported characters.`);
  return id;
}

export function validatePattern(value: unknown): BreathingPattern {
  const item = record(value, 'Breathing pattern');
  return {
    inhale: numeric(item.inhale, 'Inhale', 1, 60, true),
    hold: numeric(item.hold, 'Hold', 0, 60, true),
    exhale: numeric(item.exhale, 'Exhale', 1, 60, true),
    rest: numeric(item.rest, 'Rest', 0, 60, true),
  };
}

export function validatePreferences(value: unknown): UserPreferences {
  const item = record(value, 'Preferences');
  return {
    name: text(item.name, 'Name', 60),
    dailyGoal: numeric(item.dailyGoal, 'Daily goal', 1, 240, true),
    weeklyGoal: numeric(item.weeklyGoal, 'Weekly goal', 1, 1680, true),
    defaultDuration: numeric(item.defaultDuration, 'Default duration', 1, 60, true),
    defaultRounds: numeric(item.defaultRounds, 'Default rounds', 1, 300, true),
    defaultCategory: choice(item.defaultCategory, CATEGORIES, 'Default category'),
    countdown: boolean(item.countdown, 'Countdown'), autoStart: boolean(item.autoStart, 'Auto start'),
    ambientSound: boolean(item.ambientSound, 'Ambient sound'), voiceGuidance: boolean(item.voiceGuidance, 'Voice guidance'),
    soundEffects: boolean(item.soundEffects, 'Sound effects'), haptics: boolean(item.haptics, 'Haptics'),
    appearance: choice(item.appearance, ['system', 'light', 'dark'], 'Appearance'),
    largeText: boolean(item.largeText, 'Large text'), highContrast: boolean(item.highContrast, 'High contrast'),
    reducedMotion: boolean(item.reducedMotion, 'Reduced motion'),
    preferredTime: choice(item.preferredTime, ['Morning', 'Afternoon', 'Evening', 'Night'], 'Preferred time'),
    onboardingComplete: boolean(item.onboardingComplete, 'Onboarding complete'),
  };
}

export function validateSession(value: unknown): BreathingSession {
  const item = record(value, 'Session');
  const startedAt = timestamp(item.startedAt, 'Session start');
  const completedAt = timestamp(item.completedAt, 'Session completion');
  const durationSeconds = numeric(item.durationSeconds, 'Session duration', 1, 14_400);
  if (Date.parse(completedAt) < Date.parse(startedAt)) throw new Error('A session cannot finish before it starts.');
  if (durationSeconds > (Date.parse(completedAt) - Date.parse(startedAt)) / 1000 + 2) throw new Error('Session duration exceeds its elapsed time.');
  return {
    id: identifier(item.id, 'Session ID'), exerciseId: identifier(item.exerciseId, 'Exercise ID'),
    exerciseName: text(item.exerciseName, 'Exercise name', 80), category: choice(item.category, CATEGORIES, 'Session category'),
    startedAt, completedAt, durationSeconds, rounds: numeric(item.rounds, 'Session rounds', 0, 10_000, true),
    pattern: validatePattern(item.pattern), source: choice(item.source, ['real'], 'Session source'),
  };
}

export function validateCustomExercise(value: unknown): BreathingExercise {
  const item = record(value, 'Custom exercise');
  const id = identifier(item.id, 'Exercise ID');
  if (EXERCISES.some((exercise) => exercise.id === id)) throw new Error('A custom exercise cannot replace a built-in exercise.');
  const color = text(item.color, 'Exercise color', 9);
  const tint = text(item.tint, 'Exercise background', 9);
  if (!/^#[\da-fA-F]{6}([\da-fA-F]{2})?$/.test(color) || !/^#[\da-fA-F]{6}([\da-fA-F]{2})?$/.test(tint)) throw new Error('Exercise colors must use six- or eight-digit hexadecimal values.');
  return {
    id, name: text(item.name, 'Exercise name', 80), category: choice(item.category, CATEGORIES, 'Exercise category'),
    description: text(item.description, 'Exercise description', 500, 0), duration: numeric(item.duration, 'Exercise duration', 1, 60),
    difficulty: choice(item.difficulty, ['Beginner', 'Intermediate', 'Advanced'], 'Exercise difficulty'),
    pattern: validatePattern(item.pattern), rounds: numeric(item.rounds, 'Exercise rounds', 1, 300, true),
    icon: text(item.icon, 'Exercise icon', 60), color, tint,
    popularity: numeric(item.popularity, 'Exercise order', 0, 100), custom: true,
  };
}

function array(value: unknown, label: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max) throw new Error(`${label} must be an array with no more than ${max} items.`);
  return value;
}

function unique<T>(items: T[], id: (item: T) => string, label: string): T[] {
  const identifiers = new Set(items.map(id));
  if (identifiers.size !== items.length) throw new Error(`${label} contains duplicate IDs.`);
  return items;
}

export function validateAppData(value: unknown): AppData {
  const item = record(value, 'Saved data');
  if (item.version !== 1) throw new Error('This backup uses an unsupported data version.');
  const realSessions = unique(array(item.realSessions, 'Session history', MAX_SESSIONS).map(validateSession), (session) => session.id, 'Session history').sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const customExercises = unique(array(item.customExercises, 'Custom exercises', MAX_CUSTOM_EXERCISES).map(validateCustomExercise), (exercise) => exercise.id, 'Custom exercises');
  const allowedIds = new Set([...EXERCISES, ...customExercises].map((exercise) => exercise.id));
  const favorites = unique(array(item.favorites, 'Favorites', EXERCISES.length + MAX_CUSTOM_EXERCISES).map((id) => identifier(id, 'Favorite exercise ID')), (id) => id, 'Favorites');
  if (favorites.some((id) => !allowedIds.has(id))) throw new Error('A favorite references an exercise that is missing from this backup.');
  return { version: 1, realSessions, customExercises, favorites, preferences: validatePreferences(item.preferences), demoMode: boolean(item.demoMode, 'Demo mode') };
}

export function parseStoredData(json: string): AppData {
  return validateAppData(parseJSON(json));
}

function parseJSON(json: string): unknown {
  if (typeof json !== 'string' || json.length > MAX_IMPORT_BYTES) throw new Error('The backup is too large. Please choose a Breathing JSON backup under 15 MB.');
  try { return JSON.parse(json); } catch { throw new Error('This file is not valid JSON. Please choose a Breathing backup.'); }
}

export function parseImportedData(json: string): AppData {
  const imported = record(parseJSON(json), 'Backup');
  if (imported.app !== 'Breathing') throw new Error('This is not a Breathing backup.');
  timestamp(imported.exportedAt, 'Export time');
  return validateAppData({ ...imported, demoMode: false });
}

export function createExportData(data: AppData): ExportData {
  // Demo data is generated separately and is deliberately absent from all backups.
  const { demoMode: _demoMode, ...exported } = data;
  return { ...exported, app: 'Breathing', exportedAt: new Date().toISOString() };
}
