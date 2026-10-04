import { CATEGORIES, EXERCISES } from '../data/exercises';
import { BreathingExercise, BreathingSession, DailyActivity, Recommendation, StreakData, UsageAnalytics } from '../types';

const DAY = 86_400_000;
const round = (value: number): number => Math.round((value + Number.EPSILON) * 10) / 10;

/** Calendar keys use the device timezone; ISO slicing would group late sessions incorrectly. */
export function localDateKey(value: Date | string | number = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function dateFromLocalKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/** Calendar arithmetic remains correct across daylight-saving transitions. */
function dayNumber(key: string): number {
  const [year, month, day] = key.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / DAY;
}

function validSessions(sessions: BreathingSession[], now: Date): BreathingSession[] {
  const ids = new Set<string>();
  return sessions.filter((session) => {
    const time = Date.parse(session.completedAt);
    if (ids.has(session.id) || !Number.isFinite(time) || time > now.getTime() || !Number.isFinite(session.durationSeconds) || session.durationSeconds <= 0) return false;
    ids.add(session.id);
    return true;
  });
}

export function getStreak(sessions: BreathingSession[], now = new Date()): StreakData {
  const days = [...new Set(validSessions(sessions, now).map((session) => localDateKey(session.completedAt)))].sort();
  if (days.length === 0) return { currentStreak: 0, longestStreak: 0, activeDays: 0, lastPracticeDate: null };
  let longestStreak = 1;
  let sequence = 1;
  for (let i = 1; i < days.length; i += 1) {
    sequence = dayNumber(days[i]) - dayNumber(days[i - 1]) === 1 ? sequence + 1 : 1;
    longestStreak = Math.max(longestStreak, sequence);
  }
  const sinceLast = dayNumber(localDateKey(now)) - dayNumber(days[days.length - 1]);
  return {
    currentStreak: sinceLast <= 1 ? sequence : 0,
    longestStreak, activeDays: days.length, lastPracticeDate: days[days.length - 1],
  };
}

export function getDailyActivities(sessions: BreathingSession[], now = new Date()): DailyActivity[] {
  const byDay = new Map<string, { seconds: number; sessions: number; rounds: number }>();
  for (const session of validSessions(sessions, now)) {
    const key = localDateKey(session.completedAt);
    const entry = byDay.get(key) ?? { seconds: 0, sessions: 0, rounds: 0 };
    entry.seconds += session.durationSeconds;
    entry.sessions += 1;
    entry.rounds += session.rounds;
    byDay.set(key, entry);
  }
  return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, entry]) => ({
    date, label: dateFromLocalKey(date).toLocaleDateString('en-US', { weekday: 'short' }),
    minutes: round(entry.seconds / 60), sessions: entry.sessions, rounds: entry.rounds,
  }));
}

function timeOfDay(date: Date): string {
  const hour = date.getHours();
  return hour >= 5 && hour < 12 ? 'Morning' : hour >= 12 && hour < 17 ? 'Afternoon' : hour >= 17 && hour < 21 ? 'Evening' : 'Night';
}

function mostCommon(counts: Map<string, number>, fallback = 'Not enough activity yet'): string {
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? fallback;
}

export function getAnalytics(sessions: BreathingSession[], now = new Date()): UsageAnalytics {
  const actual = validSessions(sessions, now);
  const today = localDateKey(now);
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekStartKey = localDateKey(weekStart);
  const monthKey = today.slice(0, 7);
  const dailyActivities = getDailyActivities(actual, now);
  const dailyMap = new Map(dailyActivities.map((day) => [day.date, day]));
  const todayActivity = dailyMap.get(today);
  const categoryMap = new Map<string, { count: number; seconds: number }>();
  const times = new Map<string, number>();
  const weekdays = new Map<string, number>();
  const exerciseCounts = new Map<string, number>();
  let seconds = 0;
  let weekSeconds = 0;
  let weekSessions = 0;
  let monthSeconds = 0;
  let monthSessions = 0;
  let totalRounds = 0;
  let longestSeconds = 0;
  for (const session of actual) {
    const key = localDateKey(session.completedAt);
    seconds += session.durationSeconds;
    totalRounds += session.rounds;
    longestSeconds = Math.max(longestSeconds, session.durationSeconds);
    if (key >= weekStartKey && key <= today) { weekSeconds += session.durationSeconds; weekSessions += 1; }
    if (key.startsWith(monthKey)) { monthSeconds += session.durationSeconds; monthSessions += 1; }
    const category = categoryMap.get(session.category) ?? { count: 0, seconds: 0 };
    category.count += 1;
    category.seconds += session.durationSeconds;
    categoryMap.set(session.category, category);
    const date = new Date(session.startedAt);
    const time = timeOfDay(date);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
    times.set(time, (times.get(time) ?? 0) + 1);
    weekdays.set(weekday, (weekdays.get(weekday) ?? 0) + 1);
    exerciseCounts.set(session.exerciseName, (exerciseCounts.get(session.exerciseName) ?? 0) + 1);
  }
  const weekDays: DailyActivity[] = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + offset);
    const key = localDateKey(date);
    return dailyMap.get(key) ?? { date: key, label: date.toLocaleDateString('en-US', { weekday: 'short' }), minutes: 0, sessions: 0, rounds: 0 };
  });
  return {
    todayMinutes: todayActivity?.minutes ?? 0, todaySessions: todayActivity?.sessions ?? 0, todayRounds: todayActivity?.rounds ?? 0,
    weekMinutes: round(weekSeconds / 60), weekSessions, monthMinutes: round(monthSeconds / 60), monthSessions,
    totalMinutes: round(seconds / 60), totalSessions: actual.length, totalRounds,
    averageMinutes: actual.length ? round(seconds / actual.length / 60) : 0,
    averageRounds: actual.length ? round(totalRounds / actual.length) : 0,
    longestMinutes: round(longestSeconds / 60), ...getStreak(actual, now),
    categoryBreakdown: [...categoryMap.entries()].map(([category, stats]) => ({ category, count: stats.count, minutes: round(stats.seconds / 60), percent: round(stats.count / actual.length * 100) })).sort((a, b) => b.count - a.count || a.category.localeCompare(b.category)),
    weekDays, dailyActivities,
    mostActiveTime: mostCommon(times), mostActiveDay: mostCommon(weekdays),
    mostCompletedExercise: exerciseCounts.size ? mostCommon(exerciseCounts) : null,
    leastUsedCategory: actual.length ? [...CATEGORIES].sort((a, b) => (categoryMap.get(a)?.count ?? 0) - (categoryMap.get(b)?.count ?? 0) || a.localeCompare(b))[0] : null,
  };
}

/** Local recommendations are transparent, deterministic suggestions; no remote AI. */
export function getRecommendations(
  sessions: BreathingSession[],
  favorites: string[] = [],
  exercises: BreathingExercise[] = EXERCISES,
  now = new Date(),
): Recommendation[] {
  const result: Recommendation[] = [];
  const analytics = getAnalytics(sessions, now);
  const add = (id: string, exerciseId: string | undefined, title: string, description: string, reason: string) => {
    const exercise = exercises.find((item) => item.id === exerciseId);
    if (exercise && !result.some((item) => item.exerciseId === exercise.id)) result.push({ id, title, description, reason, exerciseId: exercise.id, exercise });
  };
  const time = timeOfDay(now);
  const timeSuggestion = time === 'Morning' ? 'morning-light' : time === 'Afternoon' ? 'clear-mind' : time === 'Evening' ? 'let-it-go' : 'deep-relaxation';
  add('time-of-day', timeSuggestion, time === 'Morning' ? 'A fresh start' : time === 'Afternoon' ? 'A little room to think' : time === 'Evening' ? 'Leave the day behind' : 'Settle into stillness', `A ${time.toLowerCase()} pause, just for you. Follow an easy rhythm for a few quiet minutes.`, 'For this time of day');
  if (analytics.lastPracticeDate) {
    const gap = dayNumber(localDateKey(now)) - dayNumber(analytics.lastPracticeDate);
    if (gap >= 3) add('return', 'calm-reset', 'Welcome back to your breath', `It has been ${gap} days. Start again with a gentle five-minute pause.`, 'Based on recent activity');
  }
  const topCategory = analytics.categoryBreakdown[0]?.category;
  if (topCategory) {
    const favoriteCategoryExercise = exercises.find((item) => item.category === topCategory);
    add('habit', favoriteCategoryExercise?.id, 'Something that feels familiar', `${topCategory} is your most practiced style. Make a little space for it today.`, 'Based on your habits');
  }
  const saved = favorites.find((id) => !result.some((item) => item.exerciseId === id));
  add('favorite', saved, 'Return to a favorite', 'A familiar practice is always a good place to begin.', 'From your favorites');
  if (analytics.totalSessions >= 3 && analytics.averageMinutes < 6) {
    add('longer-pause', 'simply-be', 'Stay a little longer', 'Your sessions tend to be short. If you have the space, explore a gentle ten-minute practice.', 'Based on your session length');
  }
  add('simple-start', 'calm-reset', 'A moment to come back to you', 'A simple, gentle practice with a little more room on the exhale.', 'A gentle place to begin');
  add('balance', 'find-balance', 'Find your natural rhythm', 'Let an even breath in and out be your anchor for a few minutes.', 'Explore a different rhythm');
  return result.slice(0, 4);
}

export function getInsights(sessions: BreathingSession[], now = new Date()): string[] {
  const analytics = getAnalytics(sessions, now);
  if (analytics.totalSessions === 0) return ['Your breathing journey starts with a single session.', 'A few comfortable minutes is a good place to begin.'];
  const insights = [
    `${analytics.categoryBreakdown[0].category} is your most practiced breathing style.`,
    `Your average session is ${analytics.averageMinutes} minutes.`,
    `You usually practice in the ${analytics.mostActiveTime.toLowerCase()}.`,
    `You completed ${analytics.weekSessions} ${analytics.weekSessions === 1 ? 'session' : 'sessions'} this week.`,
  ];
  if (analytics.currentStreak >= 3) insights.push(`${analytics.currentStreak} days of showing up for yourself. Small moments add up.`);
  return insights;
}

/** Chart buckets for long-range views; the final bucket contains only elapsed days. */
export function getTrendData(sessions: BreathingSession[], months: 1 | 3 | 6 | 12, now = new Date()): DailyActivity[] {
  const actual = validSessions(sessions, now);
  return Array.from({ length: months }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - months + index + 1, 1);
    const prefix = localDateKey(date).slice(0, 7);
    const selected = actual.filter((session) => localDateKey(session.completedAt).startsWith(prefix));
    return { date: localDateKey(date), label: date.toLocaleDateString('en-US', { month: 'short' }), minutes: round(selected.reduce((sum, session) => sum + session.durationSeconds, 0) / 60), sessions: selected.length, rounds: selected.reduce((sum, session) => sum + session.rounds, 0) };
  });
}
