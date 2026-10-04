import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, AppState, Modal as NativeModal, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ArrowRight, Check, CheckCircle2, Clock3, Flame, Leaf, Maximize2, Minimize2, Pause, Play, RotateCcw, Vibrate, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAnalytics } from '../../analytics';
import { BreathingOrb } from '../../components/BreathingOrb';
import { Button, Card, Chip, Divider, IconButton, Stepper, Text } from '../../components/ui';
import { DURATION_OPTIONS } from '../../data/exercises';
import { useAppStore } from '../../hooks/useAppStore';
import { fonts, useTheme } from '../../theme';
import { BreathingExercise, BreathingPattern, BreathingSession } from '../../types';
import { BreathingSnapshot, EngineConfig, SessionClock, cycleSeconds, formatSessionTime, getBreathingSnapshot, getTargetSeconds, monotonicNow, normalizePattern } from './engine';

interface BreathingFlowProps { exercise: BreathingExercise | null; onClose: () => void; onViewProgress: () => void }
type Screen = 'configure' | 'session' | 'complete';
type Confirmation = 'exit' | 'restart' | 'finish' | 'leave-unsaved' | null;
const phaseNames = { inhale: 'Inhale', hold: 'Hold', exhale: 'Exhale', rest: 'Rest' };
const phaseHints = { prepare: 'Find a comfortable seat. Let your shoulders soften.', inhale: 'A gentle breath in. Let the circle guide you.', hold: 'A soft pause. Keep your body at ease.', exhale: 'Slowly let the breath go. Nothing to rush.', rest: 'Rest here for a moment, before the next breath.', complete: 'Take this sense of space into the rest of your day.' };

export function BreathingFlow(props: BreathingFlowProps) {
  return props.exercise ? <FlowContent key={props.exercise.id} {...props} exercise={props.exercise} /> : null;
}

function FlowContent({ exercise, onClose, onViewProgress }: BreathingFlowProps & { exercise: BreathingExercise }) {
  const { colors, reducedMotion } = useTheme();
  const { preferences, demoMode, realSessions, addSession } = useAppStore();
  const [screen, setScreen] = useState<Screen>('configure');
  const [mode, setMode] = useState<'duration' | 'rounds'>('duration');
  const [minutes, setMinutes] = useState(Math.max(1, Math.min(60, preferences.defaultDuration)));
  const [customDuration, setCustomDuration] = useState(!DURATION_OPTIONS.includes(preferences.defaultDuration));
  const [rounds, setRounds] = useState(exercise.custom ? exercise.rounds : preferences.defaultRounds);
  const [pattern, setPattern] = useState<BreathingPattern>(() => normalizePattern(exercise.pattern));
  const [snapshot, setSnapshot] = useState<BreathingSnapshot | null>(null);
  const [paused, setPaused] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [minimal, setMinimal] = useState(false);
  const [haptics, setHaptics] = useState(preferences.haptics);
  const [confirmation, setConfirmation] = useState<Confirmation>(null);
  const [savedSession, setSavedSession] = useState<BreathingSession | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error'>('saving');
  const [saveError, setSaveError] = useState('');
  const [leftDemo, setLeftDemo] = useState(false);
  const clock = useRef<SessionClock | null>(null);
  const engine = useRef<EngineConfig | null>(null);
  const sessionStart = useRef('');
  const sessionId = useRef('');
  const settled = useRef(false);
  const resumeAfterDialog = useRef(false);
  const autoStarted = useRef(false);
  const saveInFlight = useRef(false);
  const previousPhase = useRef('');
  const mounted = useRef(true);
  const cycle = cycleSeconds(pattern);
  const maxRounds = Math.min(300, Math.floor(14_400 / cycle));
  const config: EngineConfig = { pattern, target: mode === 'duration' ? { mode, seconds: minutes * 60 } : { mode, rounds: Math.min(rounds, maxRounds) }, prepareSeconds: preferences.countdown ? 3 : 0 };
  const totalSeconds = getTargetSeconds(config);
  const analytics = useMemo(() => getAnalytics(realSessions), [realSessions]);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; clock.current?.pause(monotonicNow()); };
  }, []);

  const start = useCallback((nextConfig: EngineConfig) => {
    engine.current = nextConfig;
    clock.current = new SessionClock(monotonicNow());
    sessionStart.current = new Date().toISOString();
    sessionId.current = `session-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    settled.current = false;
    resumeAfterDialog.current = false;
    previousPhase.current = '';
    setSnapshot(getBreathingSnapshot(nextConfig, 0));
    setPaused(false);
    setPauseReason('');
    setConfirmation(null);
    setSavedSession(null);
    setSaveStatus('saving');
    setSaveError('');
    setScreen('session');
  }, []);

  // Auto-start is an explicit preference; opening an exercise uses the saved defaults.
  useEffect(() => {
    if (!preferences.autoStart || autoStarted.current) return;
    autoStarted.current = true;
    start(config);
    // Initial selection only. Preference changes must not restart an active session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback(async (session: BreathingSession) => {
    if (saveInFlight.current) return;
    saveInFlight.current = true;
    setSaveStatus('saving');
    try { await addSession(session); if (mounted.current) { setSaveStatus('saved'); setSaveError(''); } }
    catch (error) { if (mounted.current) { setSaveStatus('error'); setSaveError(error instanceof Error ? error.message : 'Your practice could not be saved. Please try again.'); } }
    finally { saveInFlight.current = false; }
  }, [addSession]);

  const complete = useCallback((current: BreathingSnapshot) => {
    if (settled.current || !engine.current) return;
    const durationSeconds = Math.floor(current.elapsedSeconds);
    if (durationSeconds < 1) return;
    settled.current = true;
    clock.current?.pause(monotonicNow());
    const session: BreathingSession = {
      id: sessionId.current, exerciseId: exercise.id, exerciseName: exercise.name, category: exercise.category,
      startedAt: sessionStart.current, completedAt: new Date().toISOString(), durationSeconds,
      rounds: current.completedRounds, pattern: normalizePattern(engine.current.pattern), source: 'real',
    };
    setLeftDemo(demoMode);
    setSavedSession(session);
    setConfirmation(null);
    setScreen('complete');
    if (haptics && Platform.OS !== 'web') void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    void persist(session);
  }, [exercise, demoMode, haptics, persist]);

  useEffect(() => {
    if (screen !== 'session') return;
    const tick = () => {
      if (!clock.current || !engine.current) return;
      const next = getBreathingSnapshot(engine.current, clock.current.elapsed(monotonicNow()));
      setSnapshot(next);
      if (next.phase === 'complete') { complete(next); return; }
      const key = `${next.currentRound}-${next.phase}`;
      if (!clock.current.paused && key !== previousPhase.current) {
        previousPhase.current = key;
        if (haptics && Platform.OS !== 'web' && next.phase !== 'prepare') void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      }
    };
    tick();
    const interval = setInterval(tick, 100);
    return () => clearInterval(interval);
  }, [screen, haptics, complete]);

  const pause = useCallback((reason = '') => {
    if (!clock.current || !engine.current || settled.current) return;
    clock.current.pause(monotonicNow());
    const current = getBreathingSnapshot(engine.current, clock.current.elapsed(monotonicNow()));
    setSnapshot(current);
    setPaused(true);
    setPauseReason(reason);
    return current;
  }, []);

  const resume = useCallback(() => {
    if (settled.current) return;
    clock.current?.resume(monotonicNow());
    setPaused(false);
    setPauseReason('');
  }, []);

  // A guided practice requires attention: background time never becomes practice credit.
  useEffect(() => {
    if (screen !== 'session') return;
    const subscription = AppState.addEventListener('change', state => {
      if (state !== 'active') { resumeAfterDialog.current = false; pause('Paused while you were away. Resume when you are ready.'); }
    });
    const onVisibility = () => {
      if (typeof document !== 'undefined' && document.hidden) { resumeAfterDialog.current = false; pause('Paused while you were away. Resume when you are ready.'); }
    };
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisibility);
    return () => { subscription.remove(); if (Platform.OS === 'web' && typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisibility); };
  }, [screen, pause]);

  const ask = (kind: Confirmation) => {
    if (settled.current) return;
    resumeAfterDialog.current = !clock.current?.paused;
    const current = pause();
    if (current?.phase === 'complete') { complete(current); return; }
    setConfirmation(kind);
  };
  const dismissConfirmation = () => { setConfirmation(null); if (resumeAfterDialog.current) resume(); };
  const restart = () => { if (engine.current) start(engine.current); };
  const close = () => {
    if (confirmation) { dismissConfirmation(); return; }
    if (screen === 'session') ask('exit');
    else if (screen !== 'complete' || saveStatus === 'saved') onClose();
    else if (saveStatus === 'error') setConfirmation('leave-unsaved');
  };

  // One native presentation keeps transitions and dialogs reliable on iOS.
  return <NativeModal visible transparent animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={close}>
    {screen === 'configure' && <FlowDialog onClose={onClose} title="Make room for you." subtitle={`${exercise.name} · ${exercise.category}`} wide>
      <Text muted style={{ marginBottom: 24, maxWidth: 490 }}>{exercise.description}</Text>
      <View style={[styles.segmented, { backgroundColor: colors.surfaceAlt }]}>
        {(['duration', 'rounds'] as const).map(value => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: mode === value }} onPress={() => setMode(value)} style={[styles.segment, mode === value && { backgroundColor: colors.surface }]}><Text variant="label" style={{ color: mode === value ? colors.primary : colors.muted }}>{value === 'duration' ? 'By time' : 'By rounds'}</Text></Pressable>)}
      </View>
      {mode === 'duration' ? <View style={{ gap: 14, marginTop: 23 }}>
        <Text variant="label">How much time do you have?</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {DURATION_OPTIONS.map(value => <Chip key={value} label={`${value} min`} selected={minutes === value && !customDuration} onPress={() => { setMinutes(value); setCustomDuration(false); }} style={{ minWidth: 64 }} />)}
          <Chip label="Custom" selected={customDuration} onPress={() => setCustomDuration(true)} />
        </View>
        {customDuration && <Stepper label="Session minutes" value={minutes} onChange={setMinutes} min={1} max={60} />}
      </View> : <View style={{ marginTop: 23, gap: 9 }}><Stepper label="Number of rounds" value={Math.min(rounds, maxRounds)} onChange={setRounds} min={1} max={maxRounds} /><Text variant="small" muted>One round follows your complete breathing pattern.</Text></View>}
      <View style={{ marginTop: 28, marginBottom: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}><Text variant="label">Your breathing rhythm</Text><Text variant="small" muted>{cycle} seconds / round</Text></View>
      <PatternPreview pattern={pattern} />
      <View style={{ gap: 12, marginTop: 22 }}>
        {(Object.keys(phaseNames) as Array<keyof BreathingPattern>).map(phase => <Stepper key={phase} label={phaseNames[phase]} value={pattern[phase]} min={phase === 'inhale' || phase === 'exhale' ? 1 : 0} max={60} suffix="s" onChange={value => setPattern(current => ({ ...current, [phase]: value }))} />)}
      </View>
      <Text variant="small" muted style={{ marginTop: 13 }}>Rest follows your exhale. Set a hold or rest to 0 to skip it. Keep every breath comfortable.</Text>
      <Divider />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, marginBottom: 19 }}><Clock3 size={15} color={colors.muted} /><Text variant="small" muted style={{ flex: 1 }}>{formatSessionTime(totalSeconds)} practice{preferences.countdown ? ' · 3-second settling countdown' : ''}{mode === 'duration' ? ' · stops at your chosen time' : ` · ${Math.min(rounds, maxRounds)} full rounds`}</Text></View>
      <Button testID="start-session" label="Begin breathing" icon={ArrowRight} onPress={() => start(config)} />
    </FlowDialog>}

    {screen !== 'configure' && <>
      <SafeAreaView accessibilityElementsHidden={confirmation !== null} importantForAccessibility={confirmation ? 'no-hide-descendants' : 'auto'} style={{ flex: 1, backgroundColor: colors.background }}>
        {screen === 'session' && snapshot && <SessionScreen exercise={exercise} snapshot={snapshot} paused={paused} pauseReason={pauseReason} minimal={minimal} haptics={haptics} onToggleMinimal={() => setMinimal(value => !value)} onToggleHaptics={() => setHaptics(value => !value)} onExit={() => ask('exit')} onPause={() => paused ? resume() : pause()} onRestart={() => ask('restart')} onFinish={() => ask('finish')} />}
        {screen === 'complete' && savedSession && <CompletionScreen exercise={exercise} session={savedSession} totalToday={analytics.todayMinutes} streak={analytics.currentStreak} leftDemo={leftDemo} saveStatus={saveStatus} saveError={saveError} onRetry={() => void persist(savedSession)} onLeaveUnsaved={() => setConfirmation('leave-unsaved')} onDone={onClose} onAgain={() => { setScreen('configure'); }} onProgress={() => { onClose(); onViewProgress(); }} />}
      </SafeAreaView>
      {confirmation && <FlowDialog overlay onClose={dismissConfirmation} title={confirmation === 'leave-unsaved' ? 'Leave without saving?' : confirmation === 'exit' ? 'Leave this moment?' : confirmation === 'restart' ? 'A fresh beginning?' : 'Ready to finish?'} subtitle={confirmation === 'leave-unsaved' ? 'Your practice has not been saved on this device. Leave now, or go back to try saving again.' : confirmation === 'exit' ? 'Your current practice will be discarded.' : confirmation === 'restart' ? 'Your current practice will restart from the beginning.' : snapshot && snapshot.elapsedSeconds >= 1 ? `Save ${formatSessionTime(snapshot.elapsedSeconds)} of practice and ${snapshot.completedRounds} completed ${snapshot.completedRounds === 1 ? 'round' : 'rounds'} to your journey.` : 'Take a breath first. At least one second of practice is needed to save a session.'}>
        <View style={{ gap: 10, marginTop: 10 }}>
          {confirmation === 'finish' && <Button label="Finish & save" disabled={!snapshot || snapshot.elapsedSeconds < 1} onPress={() => { if (snapshot) complete(snapshot); }} icon={Check} />}
          {confirmation === 'exit' && <Button label="Discard & leave" onPress={onClose} />}
          {confirmation === 'leave-unsaved' && <Button label="Leave without saving" onPress={onClose} />}
          {confirmation === 'restart' && <Button label="Restart session" onPress={restart} icon={RotateCcw} />}
          <Button label={confirmation === 'leave-unsaved' ? 'Back to your practice' : paused && !resumeAfterDialog.current ? 'Back to session' : 'Keep breathing'} onPress={dismissConfirmation} variant="secondary" />
        </View>
      </FlowDialog>}
    </>}
  </NativeModal>;
}

function FlowDialog({ onClose, title, subtitle, children, wide = false, overlay = false }: { onClose: () => void; title: string; subtitle: string; children: React.ReactNode; wide?: boolean; overlay?: boolean }) {
  const { colors } = useTheme();
  return <View style={[{ flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: 16 }, overlay && StyleSheet.absoluteFill]}>
    <Pressable onPress={onClose} accessibilityLabel="Close dialog" accessibilityRole="button" style={StyleSheet.absoluteFill} />
    <View accessibilityViewIsModal style={{ width: '100%', maxWidth: wide ? 680 : 510, maxHeight: '92%', backgroundColor: colors.background, borderWidth: 1, borderColor: colors.line, borderRadius: 28, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', paddingHorizontal: 24, paddingTop: 20, paddingBottom: 16, gap: 10, alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}><Text accessibilityRole="header" variant="heading">{title}</Text><Text muted variant="small" style={{ marginTop: 5 }}>{subtitle}</Text></View>
        <IconButton icon={X} label="Close dialog" onPress={onClose} />
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 26 }}>{children}</ScrollView>
    </View>
  </View>;
}

function PatternPreview({ pattern }: { pattern: BreathingPattern }) {
  const { colors, isDark } = useTheme();
  const palette = isDark ? [colors.sage, '#B7C7A3', '#647E70', '#D0D9C5'] : [colors.blue, colors.pink, colors.lilac, colors.sage];
  return <View style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 18, padding: 18 }}>
    <View accessibilityLabel={`Breathing pattern: ${pattern.inhale} seconds inhale, ${pattern.hold} seconds hold, ${pattern.exhale} seconds exhale, ${pattern.rest} seconds rest`} style={{ flexDirection: 'row', gap: 5, height: 36, alignItems: 'flex-end' }}>
      {(Object.keys(phaseNames) as Array<keyof BreathingPattern>).filter(phase => pattern[phase] > 0).map(phase => <View key={phase} style={{ flex: pattern[phase], backgroundColor: palette[Object.keys(phaseNames).indexOf(phase)], height: phase === 'hold' ? 36 : phase === 'rest' ? 12 : 26, borderRadius: 6 }} />)}
    </View>
    <View style={{ flexDirection: 'row', marginTop: 13, gap: 5 }}>{(Object.keys(phaseNames) as Array<keyof BreathingPattern>).map(phase => <View key={phase} style={{ flex: 1 }}><Text variant="small" muted>{phaseNames[phase]}</Text><Text variant="label">{pattern[phase] === 0 ? 'Skip' : `${pattern[phase]}s`}</Text></View>)}</View>
  </View>;
}

function SessionScreen({ exercise, snapshot, paused, pauseReason, minimal, haptics, onToggleMinimal, onToggleHaptics, onExit, onPause, onRestart, onFinish }: {
  exercise: BreathingExercise; snapshot: BreathingSnapshot; paused: boolean; pauseReason: string; minimal: boolean; haptics: boolean;
  onToggleMinimal: () => void; onToggleHaptics: () => void; onExit: () => void; onPause: () => void; onRestart: () => void; onFinish: () => void;
}) {
  const { colors, reducedMotion } = useTheme();
  const { width, height } = useWindowDimensions();
  const orbSize = Math.min(width - 44, Math.max(250, height * .43), 420);
  const phaseAnnouncement = paused ? 'Session paused.' : snapshot.phase === 'prepare' ? 'Settle in.' : snapshot.phase === 'inhale' ? 'Breathe in.' : snapshot.phase === 'exhale' ? 'Breathe out.' : snapshot.phase === 'hold' ? 'Hold gently.' : snapshot.phase === 'rest' ? 'Rest.' : 'Practice complete.';
  useEffect(() => {
    // Announce phase changes, never every timer tick. VoiceOver and TalkBack
    // can still inspect the timer for the exact remaining seconds.
    if (Platform.OS !== 'web') AccessibilityInfo.announceForAccessibility(phaseAnnouncement);
  }, [phaseAnnouncement]);
  return <View style={{ flex: 1 }}>
    <View style={[styles.sessionHeader, { maxWidth: 1080 }]}>
      <IconButton icon={X} label="Exit breathing session" onPress={onExit} style={{ backgroundColor: colors.surface }} />
      {!minimal && <View style={{ flex: 1, alignItems: 'center' }}><Text variant="label">{exercise.name}</Text><Text variant="small" muted>{exercise.category}</Text></View>}
      {minimal && <View style={{ flex: 1 }} />}
      <IconButton icon={minimal ? Maximize2 : Minimize2} label={minimal ? 'Show session controls' : 'Enter minimal mode'} onPress={onToggleMinimal} style={{ backgroundColor: colors.surface }} />
    </View>
    <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22, paddingBottom: 25 }}>
      {!minimal && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 4 }}><Text variant="caption" muted>ROUND {snapshot.currentRound} / {snapshot.totalRounds}</Text><View style={{ width: 3, height: 3, borderRadius: 2, backgroundColor: colors.subtle }} /><Text variant="caption" muted>{formatSessionTime(snapshot.remainingSeconds)} REMAINING</Text></View>}
      <View accessible accessibilityRole="timer" accessibilityLabel={`${phaseAnnouncement} ${snapshot.phaseRemaining} seconds. Round ${snapshot.currentRound} of ${snapshot.totalRounds}.`}>
        <BreathingOrb size={orbSize} phase={snapshot.phase} phaseDuration={snapshot.phaseDuration} round={snapshot.currentRound} progress={snapshot.phaseProgress} seconds={snapshot.phaseRemaining} paused={paused} reducedMotion={reducedMotion} idle={false} />
      </View>
      {!minimal && <Text accessibilityLiveRegion="polite" muted style={{ textAlign: 'center', maxWidth: 340, minHeight: 50, marginTop: 4 }}>{paused ? pauseReason || 'Your rhythm is waiting. Take all the time you need.' : phaseHints[snapshot.phase]}</Text>}
      {minimal && <><Text accessibilityLiveRegion="polite" style={{ position: 'absolute', width: 1, height: 1, opacity: 0 }}>{phaseAnnouncement}</Text><Text style={{ fontFamily: fonts.medium, fontSize: 20, color: colors.muted, marginTop: 8 }}>{formatSessionTime(snapshot.remainingSeconds)}</Text></>}
      {!minimal && <>
        <View style={{ width: '100%', maxWidth: 310, height: 4, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden', marginTop: 20, marginBottom: 30 }} accessibilityRole="progressbar" accessibilityLabel="Session progress" accessibilityValue={{ min: 0, max: 100, now: Math.round(snapshot.progress * 100) }}><View style={{ height: '100%', width: `${snapshot.progress * 100}%`, backgroundColor: colors.sage, borderRadius: 3 }} /></View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
          <View style={{ alignItems: 'center', gap: 6 }}><IconButton icon={RotateCcw} label="Restart session" onPress={onRestart} /><Text variant="small" muted>Restart</Text></View>
          <View style={{ alignItems: 'center', gap: 6 }}><Pressable testID="pause-session" accessibilityRole="button" accessibilityLabel={paused ? 'Resume session' : 'Pause session'} onPress={onPause} style={({ pressed }) => ({ width: 70, height: 70, borderRadius: 35, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', opacity: pressed ? .75 : 1 })}>{paused ? <Play size={23} fill={colors.white} color={colors.white} /> : <Pause size={23} fill={colors.white} color={colors.white} />}</Pressable><Text variant="small" style={{ color: colors.primary }}>{paused ? 'Resume' : 'Pause'}</Text></View>
          <View style={{ alignItems: 'center', gap: 6 }}><IconButton icon={Check} label="Finish session" onPress={onFinish} /><Text variant="small" muted>Finish</Text></View>
        </View>
        {Platform.OS !== 'web' && <Pressable accessibilityRole="switch" accessibilityState={{ checked: haptics }} accessibilityLabel="Phase haptics" onPress={onToggleHaptics} style={{ flexDirection: 'row', gap: 7, minHeight: 44, alignItems: 'center', marginTop: 19 }}><Vibrate size={15} color={haptics ? colors.primary : colors.muted} /><Text variant="small" muted>Haptics {haptics ? 'on' : 'off'}</Text></Pressable>}
      </>}
      {minimal && <IconButton icon={paused ? Play : Pause} label={paused ? 'Resume session' : 'Pause session'} onPress={onPause} style={{ marginTop: 18 }} />}
    </ScrollView>
    {!minimal && <Text variant="caption" muted style={{ textAlign: 'center', paddingBottom: 22, paddingTop: 5, letterSpacing: 2 }}>ONE BREATH AT A TIME</Text>}
  </View>;
}

function CompletionScreen({ exercise, session, totalToday, streak, leftDemo, saveStatus, saveError, onRetry, onLeaveUnsaved, onDone, onAgain, onProgress }: {
  exercise: BreathingExercise; session: BreathingSession; totalToday: number; streak: number; leftDemo: boolean; saveStatus: 'saving' | 'saved' | 'error'; saveError: string;
  onRetry: () => void; onLeaveUnsaved: () => void; onDone: () => void; onAgain: () => void; onProgress: () => void;
}) {
  const { colors, isDark } = useTheme();
  return <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
    <View style={{ width: '100%', maxWidth: 470, alignItems: 'center' }}>
      <View style={{ width: 82, height: 82, borderRadius: 41, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center', marginBottom: 25 }}><Leaf size={34} color={colors.primary} strokeWidth={1.2} /><View style={{ position: 'absolute', bottom: -2, right: -2, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }}><CheckCircle2 size={20} color={colors.primary} /></View></View>
      <Text variant="caption" style={{ color: isDark ? colors.sage : colors.primary }}>YOUR MOMENT, WELL SPENT</Text>
      <Text variant="display" style={{ textAlign: 'center', marginTop: 12 }}>Beautiful work.</Text>
      <Text muted style={{ textAlign: 'center', marginTop: 10, maxWidth: 320 }}>You made a little space for yourself.{ '\n' }Take that feeling with you.</Text>
      <Card style={{ width: '100%', marginTop: 30, padding: 24 }}>
        <Text variant="label" style={{ textAlign: 'center' }}>{exercise.name}</Text>
        <Text variant="small" muted style={{ textAlign: 'center', marginTop: 3 }}>{exercise.category}</Text>
        <View style={{ flexDirection: 'row', marginTop: 22, marginBottom: 16 }}>
          <View style={{ flex: 1, alignItems: 'center' }}><Text variant="heading">{formatSessionTime(session.durationSeconds)}</Text><Text variant="small" muted>Time for you</Text></View>
          <View style={{ width: 1, backgroundColor: colors.line }} />
          <View style={{ flex: 1, alignItems: 'center' }}><Text variant="heading">{session.rounds}</Text><Text variant="small" muted>Full {session.rounds === 1 ? 'round' : 'rounds'}</Text></View>
        </View>
        <Divider />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingTop: 7 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><Clock3 size={14} color={colors.sage} /><Text variant="small" muted>{totalToday} min today</Text></View><View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><Flame size={14} color={colors.sage} /><Text variant="small" muted>{streak}-day streak</Text></View></View>
      </Card>
      <View accessibilityLiveRegion="polite" style={{ width: '100%', marginVertical: 19 }}>
        {saveStatus === 'error' ? <><Text variant="small" style={{ textAlign: 'center', color: colors.danger }}>{saveError}</Text><Button label="Try saving again" onPress={onRetry} variant="secondary" style={{ marginTop: 12 }} /><Button label="Leave without saving" onPress={onLeaveUnsaved} variant="ghost" /></> : <Text variant="small" muted style={{ textAlign: 'center' }}>{saveStatus === 'saving' ? 'Saving your practice on this device…' : leftDemo ? 'Saved to your real journey. Sample history is now off.' : 'Saved to your journey, on this device.'}</Text>}
      </View>
      <Button label="Done" onPress={onDone} disabled={saveStatus !== 'saved'} style={{ width: '100%' }} icon={Check} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 8, gap: 4 }}><Button label="Breathe again" variant="ghost" onPress={onAgain} disabled={saveStatus !== 'saved'} /><Button label="View progress" variant="ghost" onPress={onProgress} disabled={saveStatus !== 'saved'} icon={ArrowRight} /></View>
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  segmented: { borderRadius: 13, padding: 4, flexDirection: 'row', gap: 4 },
  segment: { flex: 1, minHeight: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sessionHeader: { width: '100%', alignSelf: 'center', flexDirection: 'row', gap: 16, alignItems: 'center', paddingHorizontal: 22, paddingTop: 18, paddingBottom: 17 },
});

export default BreathingFlow;
