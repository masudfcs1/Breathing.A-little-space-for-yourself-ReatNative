import React from 'react';
import { Pressable, View } from 'react-native';
import { Heart, ArrowUpRight, Clock3 } from 'lucide-react-native';
import { BreathingExercise } from '../types';
import { fonts, useTheme } from '../theme';
import { Text, IconButton } from './ui';
import { ExerciseArtwork, kindForCategory } from './Artwork';
import { useAppStore } from '../hooks/useAppStore';

export function ExerciseCard({ exercise, onPress, compact = false }: { exercise: BreathingExercise; onPress: () => void; compact?: boolean }) {
  const { colors, isDark } = useTheme();
  const { favorites, toggleFavorite, sessions } = useAppStore();
  const liked = favorites.includes(exercise.id);
  const completed = sessions.filter(s => s.exerciseId === exercise.id).length;
  const soft = /Sleep|Relaxation|Meditation|Realization/.test(exercise.category);
  const warm = /Calm|Recovery|Stress|Anxiety|Emotional|Energy|Morning/.test(exercise.category);
  const artworkColor = isDark ? exercise.color : soft ? colors.lilac : warm ? colors.pink : colors.blue;
  const artworkBackground = isDark ? colors.surfaceAlt : soft ? colors.lilacLight : warm ? colors.pinkLight : colors.blueLight;

  return <View style={{ flex: 1, minWidth: 0, borderWidth: 1, borderColor: colors.line, borderRadius: 21, overflow: 'hidden', backgroundColor: colors.surface }}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={'Configure ' + exercise.name}
      onPress={onPress}
      style={({ hovered }: any) => [{ backgroundColor: artworkBackground, opacity: hovered ? (isDark ? .8 : .92) : 1 }]}
    >
      <ExerciseArtwork kind={kindForCategory(exercise.category)} color={artworkColor} height={compact ? 118 : 140} />
      <View style={{ position: 'absolute', top: 14, left: 16, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 7, backgroundColor: isDark ? colors.surface : 'rgba(255,255,255,.8)' }}>
        <Text style={{ fontSize: 9, letterSpacing: 1.1, fontFamily: fonts.semibold, color: colors.ink }}>{exercise.category.toUpperCase()}</Text>
      </View>
    </Pressable>
    <IconButton
      icon={Heart}
      label={(liked ? 'Unfavorite ' : 'Favorite ') + exercise.name}
      onPress={() => toggleFavorite(exercise.id)}
      color={liked ? (isDark ? colors.primary : colors.pink) : colors.muted}
      style={{ position: 'absolute', right: 10, top: 8, backgroundColor: liked ? (isDark ? colors.primaryLight : colors.pinkLight) : isDark ? colors.surface : 'rgba(255,255,255,.8)', width: 34, height: 34 }}
    />
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={'Start ' + exercise.name} style={({ pressed }) => [{ padding: 19, opacity: pressed ? .7 : 1 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 17, fontFamily: fonts.medium }}>{exercise.name}</Text>
        <ArrowUpRight size={16} color={colors.muted} />
      </View>
      <Text variant="small" muted numberOfLines={compact ? 1 : 2} style={{ marginTop: 7, minHeight: compact ? 18 : 36 }}>{exercise.description}</Text>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: 17 }}>
        <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
          <Clock3 size={12} color={colors.muted} />
          <Text style={{ fontSize: 10, color: colors.muted }}>{exercise.duration} min</Text>
        </View>
        <View style={{ height: 3, width: 3, backgroundColor: colors.subtle, borderRadius: 2 }} />
        <Text style={{ fontSize: 10, color: colors.muted }}>{exercise.difficulty}</Text>
        {!compact && completed > 0 && <Text style={{ fontSize: 10, color: colors.muted, marginLeft: 'auto' }}>{completed} practices</Text>}
      </View>
    </Pressable>
  </View>;
}
