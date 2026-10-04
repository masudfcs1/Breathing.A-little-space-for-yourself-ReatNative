import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { ArrowRight, CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Flame, Leaf, Repeat2, Wind } from 'lucide-react-native';
import { dateFromLocalKey, getAnalytics, localDateKey } from '../analytics';
import { Button, Card, EmptyState, SectionTitle, Text } from '../components/ui';
import { useAppStore } from '../hooks/useAppStore';
import { fonts, useTheme } from '../theme';
import { BreathingSession } from '../types';
import { DataSourceControl } from './ProgressScreen';

const number = (value: number) => Number(value.toFixed(1)).toLocaleString('en-US');
const minutes = (seconds: number) => number(seconds / 60);
const monthKey = (date: Date) => localDateKey(date).slice(0, 7);
const fullDate = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

function SessionRow({ session, onStart, last = false }: { session: BreathingSession; onStart: (exerciseId?: string) => void; last?: boolean }) {
  const { colors, isDark } = useTheme();
  const { exercises } = useAppStore();
  const exercise = exercises.find(item => item.id === session.exerciseId);
  const time = new Date(session.completedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return <View style={{ paddingVertical: 17, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.line }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ width: 39, height: 39, borderRadius: 13, backgroundColor: isDark ? colors.surfaceAlt : exercise?.tint ?? colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}><Wind size={18} color={isDark ? colors.primary : exercise?.color ?? colors.primary} strokeWidth={1.6}/></View>
      <View style={{ flex: 1 }}><Text variant="label">{session.exerciseName}</Text><Text variant="small" muted style={{ fontSize: 10, marginTop: 2 }}>{session.category} · {time}</Text></View>
      <View style={{ width: 23, height: 23, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' }}><Check size={12} color={colors.primary}/></View>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 10, paddingLeft: 51 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}><Clock3 size={11} color={colors.muted}/><Text variant="small" muted style={{ fontSize: 10 }}>{minutes(session.durationSeconds)} min</Text></View>
      <Text variant="small" muted style={{ fontSize: 10 }}>· {session.rounds} rounds</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={exercise ? `Practice ${session.exerciseName} again` : `Choose a new practice; ${session.exerciseName} is no longer available`} onPress={() => onStart(exercise?.id)} style={({ pressed }) => ({ minHeight: 44, flexDirection: 'row', gap: 5, alignItems: 'center', marginLeft: 'auto', opacity: pressed ? .6 : 1 })}>
        <Text variant="small" style={{ color: colors.primary, fontSize: 10, fontFamily: fonts.medium }}>{exercise ? 'Practice again' : 'Choose a practice'}</Text><ArrowRight size={12} color={colors.primary}/>
      </Pressable>
    </View>
  </View>;
}

export function JourneyScreen({ onStart }: { onStart: (exerciseId?: string) => void }) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const compact = width < 600;
  const desktop = width >= 1080;
  const { sessions, demoMode, setDemoMode } = useAppStore();
  const today = new Date();
  const todayKey = localDateKey(today);
  const [displayMonth, setDisplayMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedKey, setSelectedKey] = useState(todayKey);
  const [visibleDays, setVisibleDays] = useState(7);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const analytics = useMemo(() => getAnalytics(sessions), [sessions, todayKey]);
  const dailyMap = useMemo(() => new Map(analytics.dailyActivities.map(day => [day.date, day])), [analytics.dailyActivities]);
  const sessionsByDay = useMemo(() => {
    const map = new Map<string, BreathingSession[]>();
    const ids = new Set<string>();
    for (const session of [...sessions].sort((a, b) => b.completedAt.localeCompare(a.completedAt))) {
      if (ids.has(session.id) || !Number.isFinite(Date.parse(session.completedAt)) || Date.parse(session.completedAt) > Date.now() || session.durationSeconds <= 0) continue;
      ids.add(session.id);
      const key = localDateKey(session.completedAt);
      map.set(key, [...(map.get(key) ?? []), session]);
    }
    return map;
  }, [sessions, todayKey]);
  const selectedSessions = sessionsByDay.get(selectedKey) ?? [];
  const selectedDate = dateFromLocalKey(selectedKey);
  const selectedActivity = dailyMap.get(selectedKey);
  const selectedToday = selectedKey === todayKey;
  const displayedMonthKey = monthKey(displayMonth);
  const currentMonth = displayedMonthKey === monthKey(today);
  const monthActivity = analytics.dailyActivities.filter(day => day.date.startsWith(displayedMonthKey));
  const monthMinutes = monthActivity.reduce((sum, day) => sum + day.minutes, 0);
  const firstWeekday = (displayMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + 1, 0).getDate();
  const weekCount = Math.ceil((firstWeekday + daysInMonth) / 7);
  const recentDays = [...analytics.dailyActivities].reverse();

  const goToToday = () => {
    setDisplayMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedKey(todayKey);
  };
  const changeMonth = (direction: -1 | 1) => {
    const next = new Date(displayMonth.getFullYear(), displayMonth.getMonth() + direction, 1);
    if (monthKey(next) > monthKey(today)) return;
    setDisplayMonth(next);
    // Keep the selected day visible after navigation, including shorter months.
    const day = Math.min(selectedDate.getDate(), new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate(), monthKey(next) === monthKey(today) ? today.getDate() : 31);
    setSelectedKey(localDateKey(new Date(next.getFullYear(), next.getMonth(), day)));
  };

  return <View style={{ gap: compact ? 22 : 28 }}>
    <View style={[styles.between, { alignItems: 'flex-start', flexDirection: compact ? 'column' : 'row', gap: 18 }]}>
      <View style={{ flex: 1 }}><Text variant="caption" muted style={{ marginBottom: 9 }}>A LITTLE CALM, DAY BY DAY</Text><Text variant={compact ? 'heading' : 'display'}>Your journey</Text><Text muted style={{ marginTop: 8 }}>A collection of moments you made for yourself.</Text></View>
      <View style={{ alignItems: compact ? 'flex-start' : 'flex-end', paddingTop: 4 }}><DataSourceControl demoMode={demoMode} onChange={enabled => { setDemoMode(enabled); setVisibleDays(7); setExpandedDay(null); }}/></View>
    </View>

    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: compact ? 10 : 16 }}>
      {[
        { label: 'Days of showing up', value: analytics.activeDays, unit: 'days', icon: CalendarDays, background: colors.primaryLight },
        { label: 'Your current rhythm', value: analytics.currentStreak, unit: 'day streak', icon: Flame, background: colors.cream },
        { label: 'Moments of calm', value: analytics.totalSessions, unit: 'sessions', icon: Leaf, background: colors.lavender },
      ].map(item => <Card key={item.label} style={{ flex: 1, minWidth: compact ? 140 : 190, padding: compact ? 18 : 23, flexDirection: 'row', alignItems: 'center', gap: 15 }}>
        {!compact && <View style={{ width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: item.background }}><item.icon size={19} color={colors.primary} strokeWidth={1.6}/></View>}
        <View style={{ flex: 1 }}><Text variant="small" muted style={{ fontSize: 10 }}>{item.label}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 6, marginTop: 6 }}><Text style={{ fontFamily: fonts.serif, fontSize: 28, lineHeight: 34 }}>{number(item.value)}</Text><Text variant="small" muted>{item.unit}</Text></View></View>
      </Card>)}
    </View>

    <View style={{ flexDirection: desktop ? 'row' : 'column', gap: 20, alignItems: 'stretch' }}>
      <Card style={{ flex: desktop ? 1.4 : undefined, minWidth: 0, padding: compact ? 18 : 28 }}>
        <View style={[styles.between, { marginBottom: 3 }]}><Text variant="title">A month of moments</Text><CalendarDays size={18} color={colors.sage}/></View>
        <Text variant="small" muted>Every little mark is a little time for you.</Text>
        <View style={[styles.between, { marginTop: 20, marginBottom: 15 }]}>
          <View style={{ flex: 1 }}><Text variant="label" style={{ fontSize: 16 }}>{displayMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Return to today in the calendar" onPress={goToToday} style={{ minHeight: 44, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center' }}><Text variant="small" style={{ color: colors.primary }}>Today</Text></Pressable>
          <View style={{ flexDirection: 'row', gap: 3 }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => changeMonth(-1)} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 13, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', opacity: pressed ? .6 : 1 })}><ChevronLeft size={17} color={colors.primary}/></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Next month" accessibilityState={{ disabled: currentMonth }} disabled={currentMonth} onPress={() => changeMonth(1)} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 13, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', opacity: currentMonth ? .35 : pressed ? .6 : 1 })}><ChevronRight size={17} color={colors.primary}/></Pressable>
          </View>
        </View>
        <View style={{ flexDirection: 'row', gap: compact ? 3 : 7, marginBottom: 9 }}>{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <Text key={day} variant="small" muted style={{ flex: 1, textAlign: 'center', fontSize: 10 }}>{compact ? day.slice(0, 1) : day}</Text>)}</View>
        {Array.from({ length: weekCount }, (_, week) => <View key={week} style={{ flexDirection: 'row', gap: compact ? 3 : 7, marginBottom: compact ? 3 : 7 }}>{Array.from({ length: 7 }, (_, weekday) => {
          const day = week * 7 + weekday - firstWeekday + 1;
          if (day < 1 || day > daysInMonth) return <View key={weekday} style={{ flex: 1, minHeight: compact ? 47 : 52 }}/>;
          const date = new Date(displayMonth.getFullYear(), displayMonth.getMonth(), day);
          const key = localDateKey(date);
          const activity = dailyMap.get(key);
          const selected = key === selectedKey;
          const isToday = key === todayKey;
          const future = key > todayKey;
          return <Pressable key={weekday} accessibilityRole="button" accessibilityLabel={`${fullDate(date)}${isToday ? ', today' : ''}, ${activity ? `${activity.sessions} sessions, ${activity.minutes} minutes` : future ? 'future date' : 'no sessions'}`} accessibilityState={{ selected, disabled: future }} disabled={future} onPress={() => setSelectedKey(key)} style={({ pressed }) => ({ flex: 1, minHeight: compact ? 47 : 52, borderRadius: compact ? 11 : 13, borderWidth: isToday && !selected ? 1 : 0, borderColor: colors.sage, backgroundColor: selected ? colors.primary : activity ? colors.primaryLight : 'transparent', alignItems: 'center', justifyContent: 'center', gap: 4, opacity: future ? .3 : pressed ? .7 : 1 })}>
            <Text variant="label" style={{ color: selected ? colors.white : activity || isToday ? colors.primary : colors.ink, fontSize: 12 }}>{day}</Text>
            <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: activity ? selected ? colors.white : colors.sage : 'transparent' }}/>
          </Pressable>;
        })}</View>)}
        <View style={[styles.between, { borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 17, marginTop: 15, flexWrap: 'wrap', rowGap: 12 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: colors.primaryLight }}/><Text variant="small" muted style={{ fontSize: 10 }}>A mindful moment</Text></View>
          <Text variant="small" style={{ color: colors.primary, fontSize: 10 }}>{monthActivity.length} active {monthActivity.length === 1 ? 'day' : 'days'} · {number(monthMinutes)} min this month</Text>
        </View>
      </Card>

      <Card style={{ flex: desktop ? 1 : undefined, minWidth: 0, padding: compact ? 22 : 27 }}>
        <View style={[styles.between, { alignItems: 'flex-start' }]}><View style={{ flex: 1 }}><Text variant="caption" muted style={{ marginBottom: 7 }}>{selectedToday ? 'YOUR DAY, SO FAR' : selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase()}</Text><Text variant="title">{selectedToday ? 'Today’s little pauses' : selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</Text><Text variant="small" muted style={{ marginTop: 5 }}>{selectedToday ? selectedDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : String(selectedDate.getFullYear())}</Text></View><View style={{ width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight }}><Leaf size={17} color={colors.primary}/></View></View>
        {selectedActivity ? <>
          <View style={{ flexDirection: 'row', gap: 14, backgroundColor: colors.surfaceAlt, borderRadius: 15, padding: 17, marginTop: 23, marginBottom: 6 }}>
            {[{ value: number(selectedActivity.minutes), label: 'minutes' }, { value: String(selectedActivity.sessions), label: 'sessions' }, { value: String(selectedActivity.rounds), label: 'rounds' }].map(item => <View key={item.label} style={{ flex: 1 }}><Text style={{ fontFamily: fonts.serif, fontSize: 25, lineHeight: 31 }}>{item.value}</Text><Text variant="small" muted style={{ fontSize: 10, marginTop: 3 }}>{item.label}</Text></View>)}
          </View>
          {selectedSessions.map((session, index) => <SessionRow key={session.id} session={session} onStart={onStart} last={index === selectedSessions.length - 1}/>)}
          <View style={{ marginTop: 'auto', paddingTop: 18 }}><Button label="Make another moment" variant="secondary" icon={ArrowRight} onPress={() => onStart()}/></View>
        </> : <View style={{ flex: 1, paddingVertical: 30, alignItems: 'center', justifyContent: 'center', gap: 13 }}>
          <View style={{ width: 66, height: 66, borderRadius: 33, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}><Wind size={28} color={colors.sage} strokeWidth={1.3}/></View>
          <Text variant="title" style={{ textAlign: 'center', fontSize: 21 }}>{selectedToday ? 'A fresh page for today.' : 'A little room between moments.'}</Text>
          <Text variant="small" muted style={{ textAlign: 'center', maxWidth: 260 }}>{selectedToday ? 'Your next quiet moment can start right here. A few comfortable breaths are enough.' : 'No sessions on this day. Rest days are part of a rhythm, too.'}</Text>
          <Button label={selectedToday ? 'Take your first breath' : 'Make a moment today'} icon={ArrowRight} onPress={() => onStart()} style={{ marginTop: 9 }}/>
        </View>}
      </Card>
    </View>

    <Card style={{ padding: compact ? 20 : 28 }}>
      <SectionTitle title="Your journey, one day at a time" subtitle="A few recent pages from your practice."/>
      {recentDays.length ? <>
        {recentDays.slice(0, visibleDays).map((day, index) => {
          const date = dateFromLocalKey(day.date);
          const daySessions = sessionsByDay.get(day.date) ?? [];
          const names = [...new Set(daySessions.map(session => session.exerciseName))];
          const expanded = expandedDay === day.date;
          const isToday = day.date === todayKey;
          return <View key={day.date} style={{ borderTopWidth: index > 0 ? 1 : 0, borderTopColor: colors.line }}>
            <Pressable accessibilityRole="button" accessibilityLabel={`${fullDate(date)}. ${day.sessions} sessions, ${day.minutes} minutes, ${day.rounds} rounds. ${expanded ? 'Collapse' : 'Show'} sessions.`} accessibilityState={{ expanded }} onPress={() => { setExpandedDay(expanded ? null : day.date); setSelectedKey(day.date); setDisplayMonth(new Date(date.getFullYear(), date.getMonth(), 1)); }} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: compact ? 12 : 18, paddingVertical: 19, opacity: pressed ? .6 : 1 })}>
              <View style={{ width: 49, height: 54, borderRadius: 13, backgroundColor: isToday ? colors.primaryLight : colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}><Text variant="small" style={{ color: isToday ? colors.primary : colors.muted, fontSize: 9, lineHeight: 14 }}>{date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}</Text><Text style={{ fontFamily: fonts.serif, fontSize: 23, lineHeight: 27, color: isToday ? colors.primary : colors.ink }}>{date.getDate()}</Text></View>
              <View style={{ flex: 1 }}><Text variant="label">{isToday ? 'Today' : date.toLocaleDateString('en-US', { weekday: 'long' })}<Text variant="small" muted> · {day.sessions} {day.sessions === 1 ? 'session' : 'sessions'}</Text></Text><Text variant="small" muted numberOfLines={compact ? 2 : 1} style={{ marginTop: 3, fontSize: 11 }}>{names.join(' · ')}</Text>{compact && <Text variant="small" muted style={{ marginTop: 3, fontSize: 10 }}>{number(day.minutes)} min · {day.rounds} rounds</Text>}</View>
              {!compact && <View style={{ alignItems: 'flex-end', marginRight: 10 }}><Text variant="label">{number(day.minutes)} min</Text><Text variant="small" muted style={{ fontSize: 10, marginTop: 3 }}>{day.rounds} breathing rounds</Text></View>}
              <ChevronRight size={16} color={colors.muted} style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}/>
            </Pressable>
            {expanded && <View style={{ paddingHorizontal: compact ? 12 : 22, marginBottom: 18, backgroundColor: colors.background, borderRadius: 17 }}>{daySessions.map((session, sessionIndex) => <SessionRow key={session.id} session={session} onStart={onStart} last={sessionIndex === daySessions.length - 1}/>)}</View>}
          </View>;
        })}
        {recentDays.length > visibleDays && <Button label={`Show more days (${recentDays.length - visibleDays})`} variant="ghost" onPress={() => setVisibleDays(value => value + 7)} style={{ alignSelf: 'center', marginTop: 10 }}/>}
      </> : <EmptyState icon={CalendarDays} title="Your story starts here" description="As you practice, each session becomes a small part of your journey. Your first moment is waiting." action="Find a practice" onAction={() => onStart()}/>}
    </Card>

    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 4 }}><Repeat2 size={14} color={colors.sage}/><Text variant="small" muted style={{ fontSize: 11, flexShrink: 1, textAlign: 'center' }}>Come back when you can. Your breath will be here.</Text></View>
  </View>;
}

const styles = StyleSheet.create({ between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 } });
