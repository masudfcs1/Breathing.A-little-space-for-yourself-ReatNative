export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type Appearance = 'system' | 'light' | 'dark';
export type PreferredTime = 'Morning' | 'Afternoon' | 'Evening' | 'Night';

export interface BreathingPattern {
  inhale: number;
  hold: number;
  exhale: number;
  rest: number;
}

export interface BreathingExercise {
  id: string;
  name: string;
  category: string;
  description: string;
  /** Recommended session length, in minutes. */
  duration: number;
  difficulty: Difficulty;
  pattern: BreathingPattern;
  rounds: number;
  icon: string;
  color: string;
  tint: string;
  /** Editorial ordering, not a claim about other users' activity. */
  popularity: number;
  custom?: boolean;
}

export interface BreathingSession {
  id: string;
  exerciseId: string;
  exerciseName: string;
  category: string;
  startedAt: string;
  completedAt: string;
  durationSeconds: number;
  rounds: number;
  pattern: BreathingPattern;
  source: 'demo' | 'real';
}

export interface UserPreferences {
  name: string;
  dailyGoal: number;
  weeklyGoal: number;
  defaultDuration: number;
  defaultRounds: number;
  defaultCategory: string;
  countdown: boolean;
  autoStart: boolean;
  ambientSound: boolean;
  voiceGuidance: boolean;
  soundEffects: boolean;
  haptics: boolean;
  appearance: Appearance;
  largeText: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  preferredTime: PreferredTime;
  onboardingComplete: boolean;
}

export interface DailyActivity {
  date: string;
  label: string;
  minutes: number;
  sessions: number;
  rounds: number;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  activeDays: number;
  lastPracticeDate: string | null;
}

export interface CategoryBreakdown {
  category: string;
  count: number;
  minutes: number;
  percent: number;
}

export interface UsageAnalytics extends StreakData {
  todayMinutes: number;
  todaySessions: number;
  todayRounds: number;
  weekMinutes: number;
  weekSessions: number;
  monthMinutes: number;
  monthSessions: number;
  totalMinutes: number;
  totalSessions: number;
  totalRounds: number;
  averageMinutes: number;
  averageRounds: number;
  longestMinutes: number;
  categoryBreakdown: CategoryBreakdown[];
  weekDays: DailyActivity[];
  mostActiveTime: string;
  mostActiveDay: string;
  mostCompletedExercise: string | null;
  leastUsedCategory: string | null;
  dailyActivities: DailyActivity[];
}

export type Analytics = UsageAnalytics;
export type ProgressData = UsageAnalytics;

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  reason: string;
  exerciseId: string;
  exercise: BreathingExercise;
}

export interface AppData {
  version: 1;
  realSessions: BreathingSession[];
  favorites: string[];
  customExercises: BreathingExercise[];
  preferences: UserPreferences;
  demoMode: boolean;
}

export interface ExportData extends Omit<AppData, 'demoMode'> {
  app: 'Breathing';
  exportedAt: string;
}
