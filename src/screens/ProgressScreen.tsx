import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { ArrowRight, Check, CircleCheck, Clock3, Flame, Leaf, Sparkles, Target, TrendingUp, type LucideIcon } from 'lucide-react-native';
import { getAnalytics, getInsights, localDateKey } from '../analytics';
import { ActivityChart, ChartPoint, ProgressRing } from '../components/Charts';
import { Button, Card, Chip, EmptyState, SectionTitle, Text } from '../components/ui';
import { useAppStore } from '../hooks/useAppStore';
import { fonts, useTheme } from '../theme';
import { BreathingSession } from '../types';

const PERIODS = ['Day', 'Week', 'Month', '3 months', '6 months', 'Year', 'All time'] as const;
type Period = typeof PERIODS[number];
const formatNumber = (number: number) => Number(number.toFixed(1)).toLocaleString('en-US');
const dateLabel = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function periodActivity(sessions: BreathingSession[], period: Period, now: Date) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start);
  let monthly = false;
  let yearsPerBucket = 0;
  if (period === 'Week') {
    start.setDate(start.getDate() - (start.getDay() + 6) % 7);
    end.setTime(start.getTime()); end.setDate(end.getDate() + 6);
  } else if (period === 'Month') {
    start.setDate(1); end.setMonth(end.getMonth() + 1, 0);
  } else if (['3 months', '6 months', 'Year'].includes(period)) {
    const months = period === '3 months' ? 3 : period === '6 months' ? 6 : 12;
    start.setDate(1); start.setMonth(start.getMonth() - months + 1); monthly = true;
  } else if (period === 'All time') {
    const first = sessions.reduce((value, session) => Math.min(value, Date.parse(session.completedAt) || now.getTime()), now.getTime());
    start.setTime(first); start.setDate(1); start.setHours(0, 0, 0, 0); monthly = true;
    const monthSpan = (end.getFullYear() - start.getFullYear()) * 12 + end.getMonth() - start.getMonth() + 1;
    // Keep any size of imported history readable and bound chart rendering work.
    if (monthSpan > 24) yearsPerBucket = Math.max(1, Math.ceil((end.getFullYear() - start.getFullYear() + 1) / 24));
  }
  const selected = sessions.filter(session => {
    const time = Date.parse(session.completedAt);
    return time >= start.getTime() && time <= now.getTime();
  });
  const values = new Map<string, number>();
  for (const session of selected) {
    const date = new Date(session.completedAt);
    const key = period === 'Day' ? String(date.getHours()) : yearsPerBucket ? String(Math.floor((date.getFullYear() - start.getFullYear()) / yearsPerBucket)) : monthly ? localDateKey(date).slice(0, 7) : localDateKey(date);
    values.set(key, (values.get(key) ?? 0) + session.durationSeconds / 60);
  }
  const points: ChartPoint[] = [];
  if (period === 'Day') {
    for (let hour = 0; hour < 24; hour += 1) points.push({ label: hour === 0 ? '12a' : hour < 12 ? `${hour}a` : hour === 12 ? '12p' : `${hour - 12}p`, detail: `${hour}:00`, value: values.get(String(hour)) ?? 0, current: hour === now.getHours() });
  } else if (yearsPerBucket) {
    const count = Math.ceil((end.getFullYear() - start.getFullYear() + 1) / yearsPerBucket);
    for (let index = 0; index < count; index += 1) {
      const firstYear = start.getFullYear() + index * yearsPerBucket;
      const lastYear = Math.min(firstYear + yearsPerBucket - 1, now.getFullYear());
      const label = firstYear === lastYear ? String(firstYear) : `${firstYear}–${lastYear}`;
      points.push({ label, detail: label, value: values.get(String(index)) ?? 0, current: index === count - 1 });
    }
  } else {
    const cursor = new Date(start);
    while (cursor <= end) {
      const key = monthly ? localDateKey(cursor).slice(0, 7) : localDateKey(cursor);
      points.push({
        label: monthly ? cursor.toLocaleDateString('en-US', { month: 'short', ...(period === 'All time' ? { year: '2-digit' } : {}) }) : period === 'Week' ? cursor.toLocaleDateString('en-US', { weekday: 'short' }) : String(cursor.getDate()),
        detail: cursor.toLocaleDateString('en-US', monthly ? { month: 'long', year: 'numeric' } : { month: 'long', day: 'numeric' }),
        value: values.get(key) ?? 0,
        current: key === (monthly ? localDateKey(now).slice(0, 7) : localDateKey(now)),
      });
      if (monthly) cursor.setMonth(cursor.getMonth() + 1); else cursor.setDate(cursor.getDate() + 1);
    }
  }
  return { sessions: selected, points, label: period === 'Day' ? now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : `${dateLabel(start)} – ${dateLabel(period === 'Week' || period === 'Month' ? end : now)}, ${now.getFullYear()}`, monthly };
}

export function DataSourceControl({ demoMode, onChange }: { demoMode: boolean; onChange: (value: boolean) => void }) {
  const { colors, isDark } = useTheme();
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: demoMode ? colors.cream : colors.primaryLight }}>
      <View style={{ height: 5, width: 5, borderRadius: 3, backgroundColor: demoMode ? isDark ? '#AF945E' : colors.pink : colors.primary }}/>
      <Text variant="small" style={{ fontSize: 10, color: colors.ink, fontFamily: fonts.medium }}>{demoMode ? 'Example history' : 'Your activity'}</Text>
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel={demoMode ? 'Show my real activity instead of example history' : 'Show example history'} onPress={() => onChange(!demoMode)} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text variant="small" style={{ color: colors.primary, textDecorationLine: 'underline', textDecorationColor: colors.accent }}>{demoMode ? 'View my activity' : 'Explore example history'}</Text>
    </Pressable>
  </View>;
}

function Metric({ label, value, unit, note, icon: Icon, accent = 'lilac' }: { label: string; value: string; unit?: string; note: string; icon: LucideIcon; accent?: 'blue' | 'pink' | 'lilac' }) {
  const { colors, isDark } = useTheme();
  return <Card style={{ flex: 1, minWidth: 145, padding: 21, gap: 14 }}>
    <View style={styles.between}><Text variant="small" muted>{label}</Text><Icon size={16} color={isDark ? colors.sage : colors[accent]} strokeWidth={1.65}/></View>
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}><Text style={{ fontFamily: fonts.serif, fontSize: 34, lineHeight: 40 }}>{value}</Text>{unit && <Text variant="small" muted>{unit}</Text>}</View>
    <Text variant="small" muted style={{ fontSize: 10 }}>{note}</Text>
  </Card>;
}

function MonthHeatmap({ sessions, date }: { sessions: BreathingSession[]; date: Date }) {
  const { colors } = useTheme();
  const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const blank = (new Date(date.getFullYear(), date.getMonth(), 1).getDay() + 6) % 7;
  const totals = getAnalytics(sessions, date).dailyActivities;
  const map = new Map(totals.map(day => [day.date, day]));
  return <View style={{ marginTop: 22, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.line }}>
    <View style={styles.between}><Text variant="label">One day at a time</Text><Text variant="small" muted>{totals.length} active days this month</Text></View>
    <View style={{ flexDirection: 'row', marginTop: 17, gap: 5 }}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, index) => <Text key={index} variant="small" muted style={{ flex: 1, textAlign: 'center' }}>{label}</Text>)}</View>
    {Array.from({ length: Math.ceil((days + blank) / 7) }, (_, week) => <View key={week} style={{ flexDirection: 'row', gap: 5, marginTop: 5 }}>{Array.from({ length: 7 }, (_, weekday) => {
      const day = week * 7 + weekday - blank + 1;
      if (day < 1 || day > days) return <View key={weekday} style={{ flex: 1, height: 29 }}/>;
      const current = new Date(date.getFullYear(), date.getMonth(), day);
      const entry = map.get(localDateKey(current));
      const future = current > date;
      return <View key={weekday} accessible accessibilityLabel={`${dateLabel(current)}, ${entry ? `${entry.minutes} minutes, ${entry.sessions} sessions` : future ? 'future date' : 'no sessions'}`} style={{ flex: 1, height: 29, borderRadius: 7, backgroundColor: entry ? entry.minutes >= 10 ? colors.primary : colors.primaryLight : colors.surfaceAlt, opacity: future ? .4 : 1, alignItems: 'center', justifyContent: 'center' }}><Text variant="small" style={{ color: entry && entry.minutes >= 10 ? colors.white : colors.muted, fontSize: 10 }}>{day}{entry ? ' ·' : ''}</Text></View>;
    })}</View>)}
  </View>;
}

export function ProgressScreen({ onStart }: { onStart: () => void }) {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const desktop = width >= 1080;
  const compact = width < 600;
  const { sessions, demoMode, setDemoMode, preferences } = useAppStore();
  const [period, setPeriod] = useState<Period>('Week');
  const now = new Date();
  const todayKey = localDateKey(now);
  const analytics = useMemo(() => getAnalytics(sessions), [sessions, todayKey]);
  const view = useMemo(() => periodActivity(sessions, period, new Date()), [sessions, period, todayKey]);
  const selected = useMemo(() => getAnalytics(view.sessions), [view.sessions]);
  const insights = useMemo(() => getInsights(sessions), [sessions, todayKey]);
  const weeklyProgress = analytics.weekMinutes / Math.max(1, preferences.weeklyGoal);
  const categoryColors = isDark ? [colors.primary, colors.sage, '#A4B89B', '#BBB8CD', '#D6C9AC', '#C2D4D0'] : [colors.blue, colors.pink, colors.lilac, colors.sage, colors.accent, colors.subtle];
  const categories = selected.categoryBreakdown.slice(0, 5);
  const remaining = selected.categoryBreakdown.slice(5);
  const displayCategories = remaining.length ? [...categories, { category: 'Other styles', count: remaining.reduce((sum, value) => sum + value.count, 0), minutes: remaining.reduce((sum, value) => sum + value.minutes, 0), percent: remaining.reduce((sum, value) => sum + value.percent, 0) }] : categories;

  return <View style={{ gap: compact ? 22 : 28 }}>
    <View style={[styles.between, { alignItems: 'flex-start', flexDirection: compact ? 'column' : 'row', gap: 18 }]}>
      <View><Text variant="caption" muted style={{ marginBottom: 9 }}>EVERY LITTLE MOMENT ADDS UP</Text><Text variant={compact ? 'heading' : 'display'}>Your progress</Text><Text muted style={{ marginTop: 8 }}>Small breaths. Meaningful change.</Text></View>
      <View style={{ alignItems: compact ? 'flex-start' : 'flex-end', paddingTop: 4 }}><DataSourceControl demoMode={demoMode} onChange={setDemoMode}/></View>
    </View>

    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: compact ? 7 : 8 }}>
      {PERIODS.map(option => <Chip key={option} label={option} selected={period === option} onPress={() => setPeriod(option)} style={{ paddingHorizontal: compact ? 12 : 19 }}/>) }
    </View>

    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: compact ? 10 : 16 }}>
      <Metric label="Mindful minutes" value={formatNumber(selected.totalMinutes)} unit="min" note={period === 'All time' ? 'Throughout your journey' : `Across ${period.toLowerCase() === 'day' ? 'today' : `this ${period.toLowerCase() === 'week' ? 'week' : 'period'}`}`} icon={Clock3}/>
      <Metric label="Sessions completed" value={formatNumber(selected.totalSessions)} note={`${selected.totalRounds.toLocaleString()} breathing rounds`} icon={CircleCheck} accent="lilac"/>
      <Metric label="Current streak" value={formatNumber(analytics.currentStreak)} unit="days" note={`Your best: ${analytics.longestStreak} days in a row`} icon={Flame} accent="pink"/>
      <Metric label="Average session" value={formatNumber(selected.averageMinutes)} unit="min" note={`${selected.activeDays} ${selected.activeDays === 1 ? 'day' : 'days'} with a little time for you`} icon={Leaf}/>
    </View>

    <View style={{ flexDirection: desktop ? 'row' : 'column', gap: 20, alignItems: 'stretch' }}>
      <Card style={{ flex: desktop ? 1.9 : undefined, minWidth: 0, padding: compact ? 20 : 27 }}>
        <SectionTitle title="Time for yourself" subtitle={view.label}/>
        <View style={[styles.between, { marginBottom: 19 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7 }}><Text style={{ fontFamily: fonts.serif, fontSize: 36, lineHeight: 44 }}>{formatNumber(selected.totalMinutes)}</Text><Text muted variant="small">mindful minutes</Text></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary }}/><Text variant="small" muted>Minutes</Text></View>
        </View>
        <ActivityChart data={view.points} variant={view.monthly ? 'line' : 'bar'} description={`${period} breathing activity`} height={compact ? 186 : 202}/>
        {period === 'Month' && <MonthHeatmap sessions={view.sessions} date={now}/>}
        {!selected.totalSessions && <View style={{ padding: 17, marginTop: 12, borderRadius: 13, backgroundColor: colors.surfaceAlt }}><Text variant="small" muted>{analytics.totalSessions ? 'No sessions in this period. Every new day is a chance to begin again.' : 'Your first session will appear here. There is no rush — start when you are ready.'}</Text></View>}
      </Card>

      <Card style={{ flex: desktop ? 1 : undefined, minWidth: 0, backgroundColor: isDark ? colors.cream : colors.lilacLight, borderColor: isDark ? colors.line : colors.lilacLine, padding: compact ? 23 : 27, justifyContent: 'space-between' }}>
        <View><View style={styles.between}><Text variant="title">A little each week</Text><Target size={18} color={isDark ? colors.sage : colors.primary}/></View><Text variant="small" muted style={{ marginTop: 6 }}>Make space for a steady, gentle habit.</Text></View>
        <View style={{ alignItems: 'center', marginVertical: 24 }}>
          <ProgressRing progress={weeklyProgress} size={133} strokeWidth={9}><Text style={{ fontFamily: fonts.serif, fontSize: 30, lineHeight: 35 }}>{Math.round(weeklyProgress * 100)}%</Text><Text variant="small" muted style={{ fontSize: 10 }}>of weekly goal</Text></ProgressRing>
          <Text variant="label" style={{ marginTop: 16 }}>{formatNumber(analytics.weekMinutes)} <Text variant="small" muted>/ {preferences.weeklyGoal} minutes</Text></Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 15, borderTopWidth: 1, borderTopColor: isDark ? colors.line : colors.lilacLine }}>
          {weeklyProgress >= 1 ? <Check size={16} color={colors.primary}/> : <Leaf size={16} color={colors.primary}/>}
          <Text variant="small" style={{ flex: 1, color: colors.primary }}>{weeklyProgress >= 1 ? 'Your weekly goal is complete. A lovely rhythm.' : `${formatNumber(Math.max(0, preferences.weeklyGoal - analytics.weekMinutes))} more minutes to your weekly goal.`}</Text>
        </View>
      </Card>
    </View>

    <View style={{ flexDirection: desktop ? 'row' : 'column', gap: 20 }}>
      <Card style={{ flex: 1, minWidth: 0, padding: compact ? 22 : 27 }}>
        <SectionTitle title="Your breathing pattern" subtitle="The practices you keep coming back to."/>
        {displayCategories.length ? <>
          <View accessible accessibilityLabel={`Category share by completed sessions: ${displayCategories.map(item => `${item.category}, ${formatNumber(item.percent)} percent`).join('. ')}`} style={{ height: 11, flexDirection: 'row', gap: 3, borderRadius: 6, overflow: 'hidden', marginTop: 7, marginBottom: 24 }}>
            {displayCategories.map((category, index) => <View key={category.category} style={{ flex: category.count, backgroundColor: categoryColors[index], borderRadius: 3 }}/>) }
          </View>
          {displayCategories.map((category, index) => <View key={category.category} style={[styles.between, { paddingVertical: 9 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}><View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: categoryColors[index] }}/><Text variant="label" style={{ flex: 1 }}>{category.category}</Text></View>
            <Text variant="small" muted style={{ marginRight: 16 }}>{category.count} sessions</Text><Text variant="label" style={{ width: 45, textAlign: 'right' }}>{Math.round(category.percent)}%</Text>
          </View>)}
          <Text variant="small" muted style={{ fontSize: 10, marginTop: 15 }}>Based on completed sessions in the selected period.</Text>
        </> : <EmptyState icon={Leaf} title="Find your rhythm" description="As you explore, your favorite breathing styles will begin to show here." action="Find a practice" onAction={onStart}/>}
      </Card>

      <Card style={{ flex: 1, minWidth: 0, padding: compact ? 22 : 27 }}>
        <View style={[styles.between, { marginBottom: 7 }]}><Text variant="title">A few gentle insights</Text><Sparkles size={18} color={colors.sage}/></View>
        <Text variant="small" muted style={{ marginBottom: 23 }}>Little things your practice is telling you.</Text>
        {insights.slice(0, 3).map((insight, index) => {
          const Icon = [Leaf, Clock3, TrendingUp][index];
          return <View key={insight} style={{ flexDirection: 'row', gap: 14, paddingVertical: 15, borderBottomWidth: index < 2 ? 1 : 0, borderBottomColor: colors.line }}>
            <View style={{ backgroundColor: [colors.primaryLight, colors.lavender, colors.cream][index], width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}><Icon size={16} color={colors.primary}/></View>
            <View style={{ flex: 1, justifyContent: 'center' }}><Text variant="label">{insight}</Text>{index === 0 && analytics.mostCompletedExercise && <Text variant="small" muted style={{ marginTop: 4 }}>{analytics.mostCompletedExercise} is your most completed exercise.</Text>}</View>
          </View>;
        })}
        <Text variant="small" muted style={{ fontSize: 10, marginTop: 15 }}>Thoughtfully calculated from {demoMode ? 'example history' : 'your local history'}.</Text>
      </Card>
    </View>

    <Card style={{ padding: compact ? 22 : 27 }}>
      <SectionTitle title="The bigger picture" subtitle="Every session is a small investment in yourself."/>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 23, paddingTop: 3 }}>
        {[
          { label: 'All-time minutes', value: `${formatNumber(analytics.totalMinutes)} min` },
          { label: 'Total breathing rounds', value: analytics.totalRounds.toLocaleString() },
          { label: 'Longest session', value: `${formatNumber(analytics.longestMinutes)} min` },
          { label: 'Best streak', value: `${analytics.longestStreak} days` },
          { label: 'Average rounds', value: formatNumber(analytics.averageRounds) },
          { label: 'Most active day', value: analytics.totalSessions ? analytics.mostActiveDay : 'Your next day' },
          { label: 'This month', value: `${analytics.monthSessions} sessions` },
          { label: 'A style to explore', value: analytics.leastUsedCategory ?? 'Calm' },
        ].map(item => <View key={item.label} style={{ width: compact ? '50%' : '25%', paddingRight: 14 }}><Text variant="small" muted style={{ marginBottom: 5 }}>{item.label}</Text><Text variant="label" style={{ fontSize: 15 }}>{item.value}</Text></View>)}
      </View>
    </Card>

    <View style={{ flexDirection: compact ? 'column' : 'row', alignItems: compact ? 'stretch' : 'center', justifyContent: 'space-between', gap: 20, backgroundColor: colors.primaryLight, borderRadius: 23, padding: compact ? 25 : 30 }}>
      <View style={{ flex: 1 }}><Text variant="title">There’s room for a little calm today.</Text><Text variant="small" muted style={{ marginTop: 6 }}>Your next mindful moment is only a breath away.</Text></View>
      <Button label="Take a moment" icon={ArrowRight} onPress={onStart}/>
    </View>
  </View>;
}

const styles = StyleSheet.create({ between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 } });
