import { describe, expect, it } from 'vitest';
import { DEFAULT_FAVORITES, DEFAULT_PREFERENCES, createDemoSessions } from '../data/seed';
import { AppData } from '../types';
import { createExportData, parseImportedData, validatePattern, validateSession } from './validation';

const fixture = (): AppData => ({ version: 1, realSessions: [], customExercises: [], favorites: [...DEFAULT_FAVORITES], preferences: { ...DEFAULT_PREFERENCES }, demoMode: true });

describe('backup validation', () => {
  it('exports only personal data and imports into real mode', () => {
    const exported = createExportData(fixture());
    expect(exported).not.toHaveProperty('demoMode');
    expect(exported.realSessions).toEqual([]);
    expect(parseImportedData(JSON.stringify(exported))).toMatchObject({ demoMode: false, realSessions: [], favorites: DEFAULT_FAVORITES });
  });

  it('rejects demo history in a real backup', () => {
    const exported = createExportData(fixture());
    exported.realSessions = createDemoSessions().slice(0, 1);
    expect(() => parseImportedData(JSON.stringify(exported))).toThrow('Session source');
  });

  it('rejects invalid JSON, missing fields, unsupported versions, and invalid favorite references', () => {
    expect(() => parseImportedData('{')).toThrow('valid JSON');
    expect(() => parseImportedData(JSON.stringify({ app: 'Breathing' }))).toThrow();
    const exported = createExportData(fixture());
    expect(() => parseImportedData(JSON.stringify({ ...exported, version: 2 }))).toThrow('unsupported data version');
    expect(() => parseImportedData(JSON.stringify({ ...exported, favorites: ['missing-exercise'] }))).toThrow('missing from this backup');
    expect(() => parseImportedData(JSON.stringify({ ...exported, favorites: ['calm-reset', 'calm-reset'] }))).toThrow('duplicate IDs');
  });

  it('rejects zero breathing phases, negative holds, and non-finite timings', () => {
    expect(() => validatePattern({ inhale: 0, hold: 0, exhale: 4, rest: 0 })).toThrow();
    expect(() => validatePattern({ inhale: 4, hold: -1, exhale: 4, rest: 0 })).toThrow();
    expect(() => validatePattern({ inhale: NaN, hold: 0, exhale: 4, rest: 0 })).toThrow();
    expect(validatePattern({ inhale: 4, hold: 0, exhale: 4, rest: 0 })).toEqual({ inhale: 4, hold: 0, exhale: 4, rest: 0 });
  });

  it('rejects inconsistent elapsed times and duplicate real session IDs', () => {
    const sample = { ...createDemoSessions()[0], source: 'real' };
    expect(() => validateSession({ ...sample, startedAt: sample.completedAt })).toThrow('elapsed time');
    const exported = createExportData(fixture());
    expect(() => parseImportedData(JSON.stringify({ ...exported, realSessions: [sample, sample] }))).toThrow('duplicate IDs');
  });
});
