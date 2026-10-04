import { describe, expect, it } from 'vitest';
import { createDemoSessions } from '../data/seed';
import { BreathingSession } from '../types';
import { getAnalytics, getRecommendations, getStreak, getTrendData, localDateKey } from './index';

const session = (id: string, completed: Date, minutes = 5): BreathingSession => ({
  id, exerciseId: 'calm-reset', exerciseName: 'Calm Reset', category: 'Calm',
  startedAt: new Date(completed.getTime() - minutes * 60_000).toISOString(), completedAt: completed.toISOString(),
  durationSeconds: minutes * 60, rounds: 4, pattern: { inhale: 4, hold: 0, exhale: 6, rest: 0 }, source: 'real',
});

describe('calendar activity and streaks', () => {
  it('preserves yesterday’s streak before today’s practice and ignores duplicates/future activity', () => {
    const now = new Date(2026, 9, 5, 12);
    const yesterday = session('yesterday', new Date(2026, 9, 4, 9));
    const history = [session('first', new Date(2026, 9, 2, 9)), session('second', new Date(2026, 9, 3, 9)), yesterday, yesterday, session('future', new Date(2026, 9, 6, 9))];
    expect(getStreak(history, now)).toEqual({ currentStreak: 3, longestStreak: 3, activeDays: 3, lastPracticeDate: '2026-10-04' });
    expect(getStreak(history, new Date(2026, 9, 5, 12)).currentStreak).toBe(3);
    expect(getStreak(history.slice(0, 3), new Date(2026, 9, 6, 12)).currentStreak).toBe(0);
  });

  it('uses calendar days across a daylight-saving boundary', () => {
    const now = new Date(2026, 2, 10, 12);
    const history = [7, 8, 9, 10].map((day) => session(String(day), new Date(2026, 2, day, 9)));
    expect(getStreak(history, now).currentStreak).toBe(4);
    expect(localDateKey(new Date(2026, 2, 8, 0, 15))).toBe('2026-03-08');
  });

  it('resets weekly totals on Monday and preserves all-time totals', () => {
    const now = new Date(2026, 9, 5, 12);
    const history = [session('sun', new Date(2026, 9, 4, 9), 10), session('mon', new Date(2026, 9, 5, 9), 5)];
    const analytics = getAnalytics(history, now);
    expect(analytics.todayMinutes).toBe(5);
    expect(analytics.weekMinutes).toBe(5);
    expect(analytics.monthMinutes).toBe(15);
    expect(analytics.totalMinutes).toBe(15);
    expect(analytics.totalRounds).toBe(8);
    expect(analytics.averageMinutes).toBe(7.5);
    expect(analytics.weekDays[0]).toMatchObject({ date: '2026-10-05', label: 'Mon', minutes: 5 });
    expect(analytics.weekDays).toHaveLength(7);
    expect(analytics.categoryBreakdown[0].percent).toBe(100);
  });

  it('handles empty history without NaN statistics', () => {
    const analytics = getAnalytics([], new Date(2026, 9, 5));
    expect(analytics.totalSessions).toBe(0);
    expect(analytics.averageMinutes).toBe(0);
    expect(analytics.currentStreak).toBe(0);
    expect(analytics.categoryBreakdown).toEqual([]);
    expect(getRecommendations([]).length).toBeGreaterThan(0);
  });

  it('builds twelve month buckets correctly across a year boundary', () => {
    const now = new Date(2026, 0, 4, 12);
    const history = [session('previous', new Date(2025, 11, 20, 9), 10), session('current', new Date(2026, 0, 3, 9), 5)];
    const trend = getTrendData(history, 12, now);
    expect(trend).toHaveLength(12);
    expect(trend[0].date).toBe('2025-02-01');
    expect(trend[10].minutes).toBe(10);
    expect(trend[11].minutes).toBe(5);
  });
});

describe('example data', () => {
  it('is deterministic, separately tagged, and never dated in the future', () => {
    const now = new Date(2026, 9, 5, 0, 0, 20);
    const demo = createDemoSessions(now);
    expect(demo).toEqual(createDemoSessions(now));
    expect(demo.length).toBeGreaterThan(35);
    expect(demo.every((item) => item.source === 'demo')).toBe(true);
    expect(demo.every((item) => Date.parse(item.completedAt) <= now.getTime())).toBe(true);
    expect(new Set(demo.map((item) => item.id)).size).toBe(demo.length);
    expect(localDateKey(demo[0].completedAt)).toBe(localDateKey(now));
  });
});
