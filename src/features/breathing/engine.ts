import { BreathingPattern } from '../../types';

export type BreathingPhase = 'prepare' | 'inhale' | 'hold' | 'exhale' | 'rest' | 'complete';
export type SessionTarget = { mode: 'duration'; seconds: number } | { mode: 'rounds'; rounds: number };
export interface EngineConfig { pattern: BreathingPattern; target: SessionTarget; prepareSeconds: number }
export interface BreathingSnapshot {
  phase: BreathingPhase;
  phaseDuration: number;
  phaseProgress: number;
  phaseRemaining: number;
  elapsedSeconds: number;
  remainingSeconds: number;
  totalSeconds: number;
  progress: number;
  currentRound: number;
  completedRounds: number;
  totalRounds: number;
}

const phases = ['inhale', 'hold', 'exhale', 'rest'] as const;

/** Only holds may be zero. Bounds protect against malformed imported settings. */
export function normalizePattern(pattern: BreathingPattern): BreathingPattern {
  const duration = (value: number, min: number) => Number.isFinite(value) ? Math.max(min, Math.min(60, Math.round(value))) : min;
  return { inhale: duration(pattern.inhale, 1), hold: duration(pattern.hold, 0), exhale: duration(pattern.exhale, 1), rest: duration(pattern.rest, 0) };
}

export function cycleSeconds(pattern: BreathingPattern): number {
  const normalized = normalizePattern(pattern);
  return phases.reduce((sum, phase) => sum + normalized[phase], 0);
}

export function getTargetSeconds(config: EngineConfig): number {
  const raw = config.target.mode === 'rounds' ? config.target.rounds : config.target.seconds;
  const value = Number.isFinite(raw) ? Math.max(1, Math.round(raw)) : 1;
  if (config.target.mode === 'duration') return Math.min(3600, value);
  const cycle = cycleSeconds(config.pattern);
  // Session storage accepts at most four hours. Keep the limit on a complete
  // round boundary, including configurations created outside this screen.
  return Math.min(300, value, Math.floor(14_400 / cycle)) * cycle;
}

/** A timestamp-derived snapshot: late ticks never add extra time or change the rhythm. */
export function getBreathingSnapshot(config: EngineConfig, activeElapsedMs: number): BreathingSnapshot {
  const pattern = normalizePattern(config.pattern);
  const cycle = cycleSeconds(pattern);
  const totalSeconds = getTargetSeconds(config);
  const preparation = Number.isFinite(config.prepareSeconds) ? Math.max(0, Math.min(60, config.prepareSeconds)) : 0;
  const rawElapsed = Number.isFinite(activeElapsedMs) ? Math.max(0, activeElapsedMs / 1000) : 0;
  const elapsedSeconds = Math.max(0, Math.min(totalSeconds, rawElapsed - preparation));
  const totalRounds = Math.ceil(totalSeconds / cycle);
  const completedRounds = Math.floor(elapsedSeconds / cycle);
  const common = { elapsedSeconds, totalSeconds, totalRounds, completedRounds, currentRound: Math.min(totalRounds, completedRounds + 1), remainingSeconds: Math.max(0, Math.ceil(totalSeconds - elapsedSeconds)), progress: elapsedSeconds / totalSeconds };
  if (rawElapsed < preparation) return { ...common, phase: 'prepare', phaseDuration: preparation, phaseRemaining: Math.ceil(preparation - rawElapsed), phaseProgress: rawElapsed / preparation };
  if (elapsedSeconds >= totalSeconds) return { ...common, phase: 'complete', phaseDuration: 0, phaseProgress: 1, phaseRemaining: 0 };
  let position = elapsedSeconds % cycle;
  for (const phase of phases) {
    const length = pattern[phase];
    if (length > 0 && position < length) return { ...common, phase, phaseDuration: length, phaseProgress: position / length, phaseRemaining: Math.ceil(length - position) };
    position -= length;
  }
  return { ...common, phase: 'inhale', phaseDuration: pattern.inhale, phaseProgress: 0, phaseRemaining: pattern.inhale };
}

/** Pause accounting is independent of render frequency. Supply a monotonic time source. */
export class SessionClock {
  private accumulated = 0;
  private runningSince: number | null;
  constructor(now: number) { this.runningSince = now; }
  get paused(): boolean { return this.runningSince === null; }
  elapsed(now: number): number { return this.accumulated + (this.runningSince === null ? 0 : Math.max(0, now - this.runningSince)); }
  pause(now: number): void { if (this.runningSince !== null) { this.accumulated = this.elapsed(now); this.runningSince = null; } }
  resume(now: number): void { if (this.runningSince === null) this.runningSince = now; }
  restart(now: number): void { this.accumulated = 0; this.runningSince = now; }
}

export const monotonicNow = (): number => typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();
export function formatSessionTime(seconds: number): string { const whole = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0; return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`; }
