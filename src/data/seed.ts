import { BreathingSession, UserPreferences } from '../types';
import { EXERCISES } from './exercises';

export const DEFAULT_PREFERENCES: UserPreferences = {
  name: 'Masud', dailyGoal: 15, weeklyGoal: 60, defaultDuration: 5, defaultRounds: 8,
  defaultCategory: 'Calm', countdown: true, autoStart: false, ambientSound: false,
  voiceGuidance: false, soundEffects: false, haptics: true, appearance: 'system',
  largeText: false, highContrast: false, reducedMotion: false, preferredTime: 'Morning',
  onboardingComplete: false,
};

export const DEFAULT_FAVORITES = ['calm-reset', 'box-breathing', 'drift-off'];

/** Repeatable example activity, kept outside the user's persisted history. */
export function createDemoSessions(now = new Date()): BreathingSession[] {
  const result: BreathingSession[] = [];
  const preferred = ['calm-reset', 'box-breathing', 'let-it-go', 'clear-mind', 'morning-light', 'drift-off', 'gentle-recovery'];
  for (let offset = 44; offset >= 0; offset -= 1) {
    // A small handful of rest days, followed by a consistent recent practice.
    if (offset > 6 && [8, 13, 18, 19, 27, 34, 40].includes(offset)) continue;
    const sessionCount = offset % 4 === 0 ? 2 : 1;
    for (let index = 0; index < sessionCount; index += 1) {
      const exercise = EXERCISES.find((item) => item.id === preferred[(offset * 3 + index) % preferred.length])!;
      const durationMinutes = [5, 8, 10, 5, 12, 6, 10][(offset + index) % 7];
      const completed = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset, index === 0 ? 7 : 19, 20 + (offset % 4) * 5);
      // Example sessions must never appear in the future, even before sunrise.
      if (completed.getTime() > now.getTime()) {
        if (offset === 0 && index === 0) completed.setTime(now.getTime());
        else continue;
      }
      const durationSeconds = durationMinutes * 60;
      const cycle = Object.values(exercise.pattern).reduce((sum, phase) => sum + phase, 0);
      result.push({
        id: `demo-${completed.getFullYear()}-${completed.getMonth()}-${completed.getDate()}-${index}`,
        exerciseId: exercise.id, exerciseName: exercise.name, category: exercise.category,
        startedAt: new Date(completed.getTime() - durationSeconds * 1000).toISOString(),
        completedAt: completed.toISOString(), durationSeconds, rounds: Math.floor(durationSeconds / cycle),
        pattern: { ...exercise.pattern }, source: 'demo',
      });
    }
  }
  return result.sort((a, b) => b.completedAt.localeCompare(a.completedAt));
}

export const generateDemoSessions = createDemoSessions;
