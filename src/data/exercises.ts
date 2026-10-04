import { BreathingExercise, BreathingPattern } from '../types';

export const CATEGORIES = [
  'Calm', 'Energy', 'Clear Mind', 'Realization', 'Male Power',
  'Box Breathing', 'Lung Health', 'Freedom', 'Recovery', 'Stress Relief',
  'Focus', 'Sleep', 'Morning Boost', 'Deep Relaxation', 'Performance',
  'Anxiety Reset', 'Post-Workout', 'Meditation', 'Balance', 'Emotional Reset',
] as const;

export const DURATION_OPTIONS = [1, 2, 5, 10, 15, 20, 30];

const pattern = (inhale: number, hold: number, exhale: number, rest = 0): BreathingPattern => ({ inhale, hold, exhale, rest });

export const EXERCISES: BreathingExercise[] = [
  { id: 'calm-reset', name: 'Calm Reset', category: 'Calm', description: 'Find a little stillness. An easy inhale, a gentle pause, and a longer breath out.', duration: 5, difficulty: 'Beginner', pattern: pattern(4, 4, 6), rounds: 8, icon: 'leaf-outline', color: '#427D6A', tint: '#E4EEE7', popularity: 100 },
  { id: 'energy-boost', name: 'Energy Boost', category: 'Energy', description: 'A bright, steady rhythm for a fresh start. Keep every breath natural and comfortable.', duration: 3, difficulty: 'Beginner', pattern: pattern(3, 2, 3), rounds: 10, icon: 'flash-outline', color: '#B58436', tint: '#F5ECD8', popularity: 92 },
  { id: 'clear-mind', name: 'Clear Mind', category: 'Clear Mind', description: 'Put the next task aside for a moment. Follow one simple breath at a time.', duration: 5, difficulty: 'Beginner', pattern: pattern(4, 0, 6), rounds: 10, icon: 'cloud-outline', color: '#6688A4', tint: '#E6EEF4', popularity: 94 },
  { id: 'quiet-reflection', name: 'Quiet Reflection', category: 'Realization', description: 'Create a little space to notice how you feel, without needing to change anything.', duration: 10, difficulty: 'Intermediate', pattern: pattern(5, 2, 6), rounds: 12, icon: 'sunny-outline', color: '#B18954', tint: '#F1E9DD', popularity: 64 },
  { id: 'grounded-presence', name: 'Grounded Presence', category: 'Male Power', description: 'A grounded moment for self-awareness and a steady presence. A simple everyday wellness practice.', duration: 5, difficulty: 'Beginner', pattern: pattern(4, 0, 5), rounds: 10, icon: 'body-outline', color: '#77837E', tint: '#E9EEEB', popularity: 58 },
  { id: 'box-breathing', name: 'Box Breathing', category: 'Box Breathing', description: 'Four equal phases. Trace a familiar rhythm and give your attention somewhere to rest.', duration: 5, difficulty: 'Intermediate', pattern: pattern(4, 4, 4, 4), rounds: 8, icon: 'square-outline', color: '#8C80AE', tint: '#EEEAF5', popularity: 98 },
  { id: 'easy-breathing', name: 'Easy Breathing', category: 'Lung Health', description: 'Explore an unhurried, comfortable breath. This is a wellness exercise, not respiratory treatment.', duration: 5, difficulty: 'Beginner', pattern: pattern(3, 0, 4), rounds: 10, icon: 'heart-outline', color: '#648C91', tint: '#E4EFF0', popularity: 72 },
  { id: 'open-space', name: 'Open Space', category: 'Freedom', description: 'Soften your shoulders and let the breath move at an easy, spacious pace.', duration: 5, difficulty: 'Beginner', pattern: pattern(4, 0, 5), rounds: 10, icon: 'partly-sunny-outline', color: '#78A0A4', tint: '#E8F1F0', popularity: 68 },
  { id: 'gentle-recovery', name: 'Gentle Recovery', category: 'Recovery', description: 'Settle into a softer rhythm after a busy day. There is no need to force a deep breath.', duration: 5, difficulty: 'Beginner', pattern: pattern(4, 2, 6), rounds: 8, icon: 'refresh-outline', color: '#839573', tint: '#EAF0E3', popularity: 84 },
  { id: 'let-it-go', name: 'Let It Go', category: 'Stress Relief', description: 'Make room for a slower moment with a gentle inhale and an unhurried exhale.', duration: 8, difficulty: 'Beginner', pattern: pattern(4, 0, 6), rounds: 12, icon: 'water-outline', color: '#688F89', tint: '#E5F0EB', popularity: 96 },
  { id: 'steady-focus', name: 'Steady Focus', category: 'Focus', description: 'Return your attention to a balanced four-part rhythm before your next task.', duration: 5, difficulty: 'Intermediate', pattern: pattern(4, 4, 4, 4), rounds: 8, icon: 'scan-outline', color: '#718CA2', tint: '#E6EEF4', popularity: 91 },
  { id: 'drift-off', name: 'Drift Off', category: 'Sleep', description: 'End the day gently. Let each slow exhale be a quiet invitation to wind down.', duration: 10, difficulty: 'Beginner', pattern: pattern(4, 0, 6), rounds: 15, icon: 'moon-outline', color: '#8582A8', tint: '#EDEBF5', popularity: 90 },
  { id: 'morning-light', name: 'Morning Light', category: 'Morning Boost', description: 'Begin with a moment that belongs to you. A light, balanced rhythm for your morning.', duration: 3, difficulty: 'Beginner', pattern: pattern(3, 0, 3), rounds: 12, icon: 'sunny-outline', color: '#BC9258', tint: '#F6ECDA', popularity: 89 },
  { id: 'deep-relaxation', name: 'Deep Relaxation', category: 'Deep Relaxation', description: 'Give yourself permission to slow down. Shorten the exhale whenever that feels more comfortable.', duration: 10, difficulty: 'Intermediate', pattern: pattern(4, 2, 8), rounds: 12, icon: 'sparkles-outline', color: '#927E9D', tint: '#F0E9F2', popularity: 88 },
  { id: 'present-moment', name: 'Present Moment', category: 'Performance', description: 'Pause before a presentation, practice, or important moment and find your own steady pace.', duration: 3, difficulty: 'Intermediate', pattern: pattern(4, 2, 4, 2), rounds: 8, icon: 'flag-outline', color: '#7B8FA0', tint: '#E9EFF3', popularity: 76 },
  { id: 'a-soft-landing', name: 'A Soft Landing', category: 'Anxiety Reset', description: 'Notice the support beneath you and follow a comfortable breath. You can pause whenever you need.', duration: 3, difficulty: 'Beginner', pattern: pattern(3, 0, 4), rounds: 8, icon: 'flower-outline', color: '#AA8A95', tint: '#F5E9ED', popularity: 85 },
  { id: 'cool-down', name: 'Cool Down', category: 'Post-Workout', description: 'Once your breathing has settled, enjoy a comfortable, unforced transition into rest.', duration: 5, difficulty: 'Beginner', pattern: pattern(3, 0, 5), rounds: 10, icon: 'fitness-outline', color: '#9D9372', tint: '#F1EEE2', popularity: 78 },
  { id: 'simply-be', name: 'Simply Be', category: 'Meditation', description: 'Nothing to solve and nowhere to arrive. Gently return to the feeling of the breath.', duration: 10, difficulty: 'Beginner', pattern: pattern(4, 0, 4), rounds: 15, icon: 'infinite-outline', color: '#A28B76', tint: '#F1EAE3', popularity: 83 },
  { id: 'find-balance', name: 'Find Balance', category: 'Balance', description: 'Equal breaths in and out. A simple rhythm to help you reconnect with the present.', duration: 5, difficulty: 'Beginner', pattern: pattern(5, 0, 5), rounds: 10, icon: 'git-compare-outline', color: '#87988C', tint: '#E9EFE9', popularity: 81 },
  { id: 'begin-again', name: 'Begin Again', category: 'Emotional Reset', description: 'Meet yourself where you are. Take one kind, unhurried breath, then another.', duration: 5, difficulty: 'Beginner', pattern: pattern(4, 0, 6), rounds: 10, icon: 'heart-circle-outline', color: '#B58E84', tint: '#F4E8E4', popularity: 80 },
];

export function getExercise(id: string): BreathingExercise | undefined {
  return EXERCISES.find((exercise) => exercise.id === id);
}

export const exercises = EXERCISES;
export const categories = CATEGORIES;
