import React, { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { ArrowLeft, ArrowRight, Check, Focus, Heart, Leaf, Moon, Sparkles, Sun, Sunrise, Sunset, Wind, Zap, type LucideIcon } from 'lucide-react-native';
import { BreathingOrb } from '../../components/BreathingOrb';
import { Button, Chip, Input, Modal, Text, Toggle } from '../../components/ui';
import { useAppStore } from '../../hooks/useAppStore';
import { fonts, useTheme } from '../../theme';
import { PreferredTime } from '../../types';

const goals: { label: string; category: string; icon: LucideIcon; description: string }[] = [
  { label: 'Find a little calm', category: 'Calm', icon: Leaf, description: 'Make room for a softer moment.' },
  { label: 'Focus my mind', category: 'Focus', icon: Focus, description: 'Come back to one thing at a time.' },
  { label: 'Feel more energized', category: 'Energy', icon: Zap, description: 'Begin again with a little brightness.' },
  { label: 'Let go of stress', category: 'Stress Relief', icon: Wind, description: 'Give yourself permission to pause.' },
  { label: 'Explore my breathing', category: 'Lung Health', icon: Heart, description: 'Get to know your natural rhythm.' },
  { label: 'Wind down for sleep', category: 'Sleep', icon: Moon, description: 'Create a quiet end to your day.' },
  { label: 'Build a small ritual', category: 'Balance', icon: Sparkles, description: 'A little time for yourself, every day.' },
];
const times: { value: PreferredTime; caption: string; icon: LucideIcon }[] = [
  { value: 'Morning', caption: 'A fresh start to my day', icon: Sunrise },
  { value: 'Afternoon', caption: 'A pause in the middle', icon: Sun },
  { value: 'Evening', caption: 'A gentler transition home', icon: Sunset },
  { value: 'Night', caption: 'A quiet moment before bed', icon: Moon },
];

export function Onboarding({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { colors, reducedMotion } = useTheme();
  const { preferences, updatePreferences, demoMode, setDemoMode } = useAppStore();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(preferences.name);
  const [category, setCategory] = useState(preferences.defaultCategory);
  const [goal, setGoal] = useState(String(preferences.dailyGoal));
  const [time, setTime] = useState<PreferredTime>(preferences.preferredTime);
  const [startOwn, setStartOwn] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setStep(0); setName(preferences.name); setCategory(goals.some(item => item.category === preferences.defaultCategory) ? preferences.defaultCategory : 'Calm');
    setGoal(String(preferences.dailyGoal)); setTime(preferences.preferredTime); setStartOwn(true); setError('');
    // Capture saved preferences when this dialog opens, without resetting edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const next = () => {
    if (step === 0 && !name.trim()) { setError('Add a name so we can make this space yours.'); return; }
    if (step === 2 && (!/^\d+$/.test(goal) || Number(goal) < 1 || Number(goal) > 240)) { setError('Choose a whole number from 1 to 240 minutes.'); return; }
    setError('');
    if (step < 3) { setStep(step + 1); return; }
    try {
      updatePreferences({ name: name.trim(), defaultCategory: category, dailyGoal: Number(goal), preferredTime: time, onboardingComplete: true });
      if (demoMode && startOwn) setDemoMode(false);
      onClose();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Your preferences could not be saved. Please try again.'); }
  };
  const titles = ['A little space for you.', 'What brings you here?', 'Start small. Feel good.', 'Find your moment.'];
  const subtitles = ['Breathe better. Feel better. Begin with a moment that belongs to you.', 'There’s no wrong place to start. Choose what feels right today.', 'A gentle intention is all you need. You can change it any time.', 'When would you like to make a little room for yourself?'];

  return <Modal key={step} visible={visible} onClose={onClose} title={titles[step]} subtitle={subtitles[step]}>
    <View accessibilityLabel={`Personalization step ${step + 1} of 4`} style={{ flexDirection: 'row', gap: 6, marginTop: 1, marginBottom: 25 }}>{[0, 1, 2, 3].map(index => <View key={index} style={{ flex: 1, height: 3, borderRadius: 2, backgroundColor: index <= step ? colors.sage : colors.line }} />)}</View>

    {step === 0 && <>
      <View style={{ alignItems: 'center', height: 192, justifyContent: 'center', marginTop: -13, marginBottom: 10 }}><BreathingOrb size={218} idle reducedMotion={reducedMotion} /></View>
      <Input label="What should we call you?" value={name} onChangeText={value => { setName(value); setError(''); }} placeholder="Your first name" maxLength={60} autoCapitalize="words" returnKeyType="next" onSubmitEditing={next} />
      <Text variant="small" muted style={{ marginTop: 12, textAlign: 'center' }}>No account to create. Just you and your breath.</Text>
    </>}

    {step === 1 && <View style={{ gap: 9 }}>{goals.map(item => <Choice key={item.category} title={item.label} subtitle={item.description} icon={item.icon} selected={category === item.category} onPress={() => setCategory(item.category)} />)}</View>}

    {step === 2 && <>
      <View style={{ alignItems: 'center', borderRadius: 22, backgroundColor: colors.primaryLight, padding: 24, marginBottom: 23 }}><Leaf size={23} color={colors.primary} strokeWidth={1.4} /><Text style={{ fontFamily: fonts.serif, fontSize: 55, lineHeight: 66, marginTop: 7 }}>{goal || '0'}</Text><Text variant="small" style={{ color: colors.primary }}>mindful minutes a day</Text></View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 19 }}>{[5, 10, 15, 20, 30].map(minutes => <Chip key={minutes} label={`${minutes} min`} selected={goal === String(minutes)} onPress={() => { setGoal(String(minutes)); setError(''); }} />)}</View>
      <Input label="Or set your own daily goal" value={goal} onChangeText={value => { setGoal(value); setError(''); }} keyboardType="number-pad" maxLength={3} onSubmitEditing={next} />
      <Text variant="small" muted style={{ marginTop: 11 }}>One small moment counts. Choose between 1 and 240 minutes.</Text>
    </>}

    {step === 3 && <>
      <View style={{ gap: 10 }}>{times.map(item => <Choice key={item.value} title={item.value} subtitle={item.caption} icon={item.icon} selected={time === item.value} onPress={() => setTime(item.value)} />)}</View>
      <Text variant="small" muted style={{ marginTop: 15 }}>There’s no schedule to keep. This is simply your preferred time.</Text>
      {demoMode && <View style={{ marginTop: 19, paddingHorizontal: 17, paddingVertical: 4, borderRadius: 17, backgroundColor: colors.surfaceAlt }}><Toggle label="Start my own journey" description="Switch from the sample activity to your real practice. Your existing sessions stay safe." value={startOwn} onChange={setStartOwn} /></View>}
    </>}

    {!!error && <Text accessibilityLiveRegion="polite" variant="small" style={{ color: colors.danger, marginTop: 15 }}>{error}</Text>}
    <Button label={step === 3 ? 'My journey starts here' : step === 0 ? 'Let’s make this yours' : 'Continue'} icon={step === 3 ? Check : ArrowRight} onPress={next} style={{ marginTop: 26 }} />
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 7 }}>
      {step > 0 ? <Button label="Back" variant="ghost" icon={ArrowLeft} onPress={() => { setStep(step - 1); setError(''); }} style={{ paddingHorizontal: 0 }} /> : <Button label="Maybe later" variant="ghost" onPress={onClose} style={{ paddingHorizontal: 0 }} />}
      <Text variant="small" muted>{step + 1} of 4</Text>
    </View>
  </Modal>;
}

function Choice({ title, subtitle, icon: Icon, selected, onPress }: { title: string; subtitle: string; icon: LucideIcon; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={`${title}. ${subtitle}`} onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 13, padding: 15, minHeight: 72, borderWidth: 1, borderColor: selected ? colors.sage : colors.line, borderRadius: 17, backgroundColor: selected ? colors.primaryLight : colors.surface, opacity: pressed ? .7 : 1 })}>
    <View style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}><Icon size={21} color={selected ? colors.primary : colors.sage} strokeWidth={1.5} /></View>
    <View style={{ flex: 1 }}><Text variant="label">{title}</Text><Text variant="small" muted style={{ marginTop: 3 }}>{subtitle}</Text></View>
    <View style={{ width: 19, height: 19, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.primary : 'transparent', borderWidth: selected ? 0 : 1, borderColor: colors.line }}>{selected && <Check size={12} color={colors.white} />}</View>
  </Pressable>;
}
