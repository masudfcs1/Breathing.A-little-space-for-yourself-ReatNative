import { describe, expect, it } from 'vitest';
import { EngineConfig, SessionClock, formatSessionTime, getBreathingSnapshot, getTargetSeconds, normalizePattern } from './engine';

const config: EngineConfig = { pattern: { inhale: 4, hold: 4, exhale: 6, rest: 0 }, target: { mode: 'rounds', rounds: 2 }, prepareSeconds: 3 };

describe('timestamp breathing engine', () => {
  it('excludes preparation from practice time and transitions on exact boundaries', () => {
    expect(getBreathingSnapshot(config, 2_999)).toMatchObject({ phase: 'prepare', elapsedSeconds: 0, phaseRemaining: 1 });
    expect(getBreathingSnapshot(config, 3_000)).toMatchObject({ phase: 'inhale', phaseRemaining: 4, completedRounds: 0 });
    expect(getBreathingSnapshot(config, 7_000)).toMatchObject({ phase: 'hold', phaseProgress: 0 });
    expect(getBreathingSnapshot(config, 11_000)).toMatchObject({ phase: 'exhale', phaseRemaining: 6 });
    expect(getBreathingSnapshot(config, 17_000)).toMatchObject({ phase: 'inhale', currentRound: 2, completedRounds: 1 });
  });
  it('skips both zero holds without an invalid or empty phase', () => {
    const noHolds = { ...config, pattern: { inhale: 4, hold: 0, exhale: 6, rest: 0 }, prepareSeconds: 0 };
    expect(getBreathingSnapshot(noHolds, 4_000)).toMatchObject({ phase: 'exhale', phaseRemaining: 6 });
    expect(getBreathingSnapshot(noHolds, 10_000)).toMatchObject({ phase: 'inhale', completedRounds: 1 });
    expect(getBreathingSnapshot(noHolds, 20_000)).toMatchObject({ phase: 'complete', completedRounds: 2 });
  });
  it('calculates the correct phase after delayed ticks without accumulating drift', () => {
    const long = { ...config, target: { mode: 'duration' as const, seconds: 1_800 } };
    expect(getBreathingSnapshot(long, 1_004_500)).toMatchObject({ phase: 'hold', elapsedSeconds: 1001.5, completedRounds: 71, phaseRemaining: 1 });
  });
  it('timed sessions finish at their own limit without adding an incomplete round', () => {
    const timed = { ...config, target: { mode: 'duration' as const, seconds: 20 } };
    expect(getBreathingSnapshot(timed, 23_000)).toMatchObject({ phase: 'complete', elapsedSeconds: 20, remainingSeconds: 0, completedRounds: 1, progress: 1 });
    expect(getBreathingSnapshot(timed, 99_000).elapsedSeconds).toBe(20);
  });
  it('round mode derives duration from the complete pattern, including rest', () => {
    expect(getTargetSeconds({ ...config, pattern: { inhale: 4, hold: 4, exhale: 4, rest: 4 } })).toBe(32);
    expect(getBreathingSnapshot({ ...config, pattern: { inhale: 4, hold: 4, exhale: 4, rest: 4 } }, 15_000).phase).toBe('rest');
  });
  it('keeps time frozen through repeated pause calls and ignores paused time on resume', () => {
    const clock = new SessionClock(10_000);
    clock.pause(12_500);
    clock.pause(20_000);
    expect(clock.elapsed(50_000)).toBe(2_500);
    clock.resume(50_000);
    clock.resume(51_000);
    expect(clock.elapsed(53_000)).toBe(5_500);
    clock.restart(54_000);
    expect(clock.elapsed(55_000)).toBe(1_000);
  });
  it('normalizes corrupt values and keeps inhalation/exhalation nonzero', () => {
    expect(normalizePattern({ inhale: 0, hold: NaN, exhale: -4, rest: Infinity })).toEqual({ inhale: 1, hold: 0, exhale: 1, rest: 0 });
    expect(getBreathingSnapshot(config, NaN).elapsedSeconds).toBe(0);
  });
  it('caps round sessions to complete cycles within the storage limit', () => {
    const maximum: EngineConfig = { pattern: { inhale: 60, hold: 59, exhale: 60, rest: 60 }, target: { mode: 'rounds', rounds: 300 }, prepareSeconds: 0 };
    expect(getTargetSeconds(maximum)).toBe(14_340);
    expect(getBreathingSnapshot(maximum, 14_340_000)).toMatchObject({ phase: 'complete', totalRounds: 60, completedRounds: 60 });
    expect(getTargetSeconds({ ...maximum, target: { mode: 'duration', seconds: Infinity } })).toBe(1);
    expect(getTargetSeconds({ ...maximum, target: { mode: 'duration', seconds: 10_000 } })).toBe(3_600);
  });
  it('does not advance a session while backgrounded, including during preparation', () => {
    const clock = new SessionClock(0);
    clock.pause(1_500);
    expect(getBreathingSnapshot(config, clock.elapsed(60_000))).toMatchObject({ phase: 'prepare', phaseRemaining: 2, elapsedSeconds: 0 });
    clock.resume(60_000);
    expect(getBreathingSnapshot(config, clock.elapsed(61_500))).toMatchObject({ phase: 'inhale', elapsedSeconds: 0 });
    clock.pause(65_000);
    expect(getBreathingSnapshot(config, clock.elapsed(100_000))).toMatchObject({ phase: 'inhale', elapsedSeconds: 3.5 });
  });
  it('formats a stable time display for short, long, and malformed inputs', () => {
    expect(formatSessionTime(61.9)).toBe('1:01');
    expect(formatSessionTime(14_400)).toBe('240:00');
    expect(formatSessionTime(-2)).toBe('0:00');
    expect(formatSessionTime(NaN)).toBe('0:00');
  });
});
