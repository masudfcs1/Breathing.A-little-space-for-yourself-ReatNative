import React, { useState } from 'react';
import { Platform, Pressable, Share, View, useWindowDimensions } from 'react-native';
import { Accessibility, ArrowRight, Check, ChevronRight, Download, Heart, Leaf, Monitor, Moon, Palette, Pencil, ShieldCheck, SlidersHorizontal, Sun, Target, Trash2, Upload, UserRound, type LucideIcon } from 'lucide-react-native';
import { Button, Card, Chip, Divider, Input, Modal, Text, Toggle } from '../components/ui';
import { CATEGORIES, DURATION_OPTIONS } from '../data/exercises';
import { useAppStore } from '../hooks/useAppStore';
import { parseImportedData } from '../storage';
import { fonts, light, useTheme } from '../theme';
import { AppData, Appearance, PreferredTime, UserPreferences } from '../types';

type NumberPreference = 'dailyGoal' | 'weeklyGoal' | 'defaultDuration' | 'defaultRounds';
type Editor = NumberPreference | 'name' | 'category' | null;
const numberFields: Record<NumberPreference, { title: string; description: string; unit: string; max: number; choices: number[] }> = {
  dailyGoal: { title: 'Your daily rhythm', description: 'A little time, just for you. Choose a goal that feels comfortable.', unit: 'minutes per day', max: 240, choices: [5, 10, 15, 20, 30] },
  weeklyGoal: { title: 'Make room in your week', description: 'Your practice can look different from day to day. Every minute counts.', unit: 'minutes per week', max: 1680, choices: [30, 60, 90, 120, 150, 210] },
  defaultDuration: { title: 'Your usual session', description: 'Start each session with this duration. You can always change it before you begin.', unit: 'minutes per session', max: 60, choices: DURATION_OPTIONS },
  defaultRounds: { title: 'Find your rhythm', description: 'Use this number when you choose rounds in session setup.', unit: 'rounds per session', max: 300, choices: [4, 5, 8, 10, 12, 20] },
};
const times: PreferredTime[] = ['Morning', 'Afternoon', 'Evening', 'Night'];

export function SettingsScreen({ onPersonalize, onToast }: { onPersonalize: () => void; onToast: (message: string) => void }) {
  const { colors, isDark } = useTheme();
  const store = useAppStore();
  const { preferences: p, updatePreferences } = store;
  const { width } = useWindowDimensions();
  const twoColumns = width >= 1080;
  const [editor, setEditor] = useState<Editor>(null);
  const [draft, setDraft] = useState('');
  const [editError, setEditError] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<AppData | null>(null);
  const [importError, setImportError] = useState('');
  const [clearOpen, setClearOpen] = useState(false);
  const [clearError, setClearError] = useState('');
  const [busy, setBusy] = useState<'export' | 'import' | 'clear' | null>(null);

  const openEditor = (field: Editor) => {
    setEditor(field);
    setDraft(field === 'name' ? p.name : field === 'category' ? p.defaultCategory : field ? String(p[field]) : '');
    setEditError('');
  };
  const saveEditor = () => {
    if (!editor) return;
    let changes: Partial<UserPreferences>;
    if (editor === 'name') {
      if (!draft.trim() || draft.trim().length > 60) { setEditError('Enter a name between 1 and 60 characters.'); return; }
      changes = { name: draft.trim() };
    } else if (editor === 'category') {
      changes = { defaultCategory: draft };
    } else {
      const value = Number(draft);
      if (!/^\d+$/.test(draft) || value < 1 || value > numberFields[editor].max) {
        setEditError(`Choose a whole number between 1 and ${numberFields[editor].max}.`); return;
      }
      changes = { [editor]: value };
    }
    try { updatePreferences(changes); setEditor(null); } catch (error) { setEditError(errorMessage(error)); }
  };
  const closeImport = () => {
    if (busy === 'import') return;
    setImportOpen(false); setImportPreview(null); setImportText(''); setImportError('');
  };
  const validateImport = (json = importText) => {
    try { const next = parseImportedData(json); setImportText(json); setImportPreview(next); setImportError(''); }
    catch (error) { setImportPreview(null); setImportError(errorMessage(error)); }
  };
  const pickBackup = () => {
    if (Platform.OS !== 'web') return;
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 15 * 1024 * 1024) { setImportError('Choose a Breathing JSON backup under 15 MB.'); return; }
      try { validateImport(await file.text()); } catch (error) { setImportError(errorMessage(error)); }
    };
    input.click();
  };
  const exportBackup = async () => {
    setBusy('export');
    try {
      const json = store.exportData();
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
        const link = document.createElement('a'); link.href = url;
        link.download = `breathing-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        onToast('Your backup download has started.');
      } else {
        await Share.share({ title: 'Breathing backup', message: json });
      }
    } catch (error) { onToast(errorMessage(error)); }
    finally { setBusy(null); }
  };
  const restoreBackup = async () => {
    if (!importPreview || busy) return;
    setBusy('import');
    try { await store.importData(importText); setImportOpen(false); setImportPreview(null); setImportText(''); onToast('Your practice has been restored from the backup.'); }
    catch (error) { setImportError(errorMessage(error)); }
    finally { setBusy(null); }
  };
  const clearHistory = async () => {
    if (busy) return;
    setClearError('');
    setBusy('clear');
    try { await store.clearHistory(); setClearOpen(false); onToast('Your session history has been cleared.'); }
    catch (error) { setClearError(errorMessage(error)); }
    finally { setBusy(null); }
  };
  const numberEditor = editor && editor !== 'name' && editor !== 'category' ? numberFields[editor] : null;

  return <View style={{ gap: 25 }}>
    <View>
      <Text variant="caption" style={{ color: isDark ? colors.sage : colors.primary, marginBottom: 9 }}>MADE FOR YOU</Text>
      <Text variant="display" style={{ fontSize: width < 760 ? 34 : 42, lineHeight: width < 760 ? 43 : 53 }}>Your space, your way.</Text>
      <Text muted style={{ marginTop: 8 }}>Small adjustments for a practice that feels like you.</Text>
    </View>

    <Card style={{ flexDirection: width < 570 ? 'column' : 'row', alignItems: width < 570 ? 'flex-start' : 'center', gap: 19, padding: 25 }}>
      <View style={{ height: 66, width: 66, borderRadius: 33, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight }}><Text style={{ fontFamily: fonts.serif, fontSize: 31, lineHeight: 40, color: colors.primary }}>{p.name.charAt(0).toUpperCase()}</Text><View style={{ position: 'absolute', right: -1, bottom: 0, backgroundColor: colors.surface, borderRadius: 12, padding: 4 }}><Leaf size={13} color={colors.sage} /></View></View>
      <View style={{ flex: width < 570 ? undefined : 1 }}><Text variant="title">{p.name}’s little corner</Text><Text variant="small" muted style={{ marginTop: 5 }}>A practice at your own pace. Always.</Text><Pressable accessibilityRole="button" accessibilityLabel="Edit your name" onPress={() => openEditor('name')} style={{ flexDirection: 'row', gap: 6, alignItems: 'center', minHeight: 40 }}><Pencil size={12} color={colors.primary} /><Text variant="small" style={{ color: colors.primary }}>Edit name</Text></Pressable></View>
      <Button label="Personalize my practice" variant="secondary" onPress={onPersonalize} icon={ArrowRight} small />
    </Card>

    <View style={{ flexDirection: twoColumns ? 'row' : 'column', gap: 22, alignItems: 'stretch' }}>
      <View style={{ flex: 1, gap: 22, minWidth: 0 }}>
        <Card>
          <CardHeading icon={Target} title="Your intentions" description="A gentle goal. A little more space." />
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 22 }}>
            <GoalTile label="DAILY GOAL" amount={p.dailyGoal} unit="minutes a day" onPress={() => openEditor('dailyGoal')} />
            <GoalTile label="WEEKLY GOAL" amount={p.weeklyGoal} unit="minutes a week" onPress={() => openEditor('weeklyGoal')} />
          </View>
          <Text variant="label" style={{ marginTop: 23, marginBottom: 10 }}>Your favorite time to pause</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{times.map(time => <Chip key={time} label={time} selected={p.preferredTime === time} onPress={() => updatePreferences({ preferredTime: time })} style={{ paddingHorizontal: 12 }} />)}</View>
          <Text variant="small" muted style={{ marginTop: 12 }}>A gentle starting point for your everyday rhythm.</Text>
        </Card>

        <Card>
          <CardHeading icon={SlidersHorizontal} title="Your breathing rhythm" description="Settle into a familiar starting point." />
          <View style={{ marginTop: 13 }}>
            <SettingRow label="Default duration" value={`${p.defaultDuration} min`} onPress={() => openEditor('defaultDuration')} />
            <SettingRow label="Default rounds" value={`${p.defaultRounds} rounds`} onPress={() => openEditor('defaultRounds')} />
            <SettingRow label="Default category" value={p.defaultCategory} onPress={() => openEditor('category')} />
          </View>
          <Divider />
          <Toggle label="A moment to prepare" description="A three-second countdown before your first breath." value={p.countdown} onChange={countdown => updatePreferences({ countdown })} />
          <Toggle label="Start when I choose an exercise" description="Begin with your saved defaults and skip session setup." value={p.autoStart} onChange={autoStart => updatePreferences({ autoStart })} />
          {Platform.OS !== 'web' && <><Divider /><Toggle label="Gentle haptics" description="Feel a subtle cue when each breathing phase begins." value={p.haptics} onChange={haptics => updatePreferences({ haptics })} /></>}
        </Card>

        <Card style={{ backgroundColor: isDark ? colors.cream : colors.lilacLight, borderColor: isDark ? colors.line : colors.lilacLine }}>
          <View style={{ flexDirection: 'row', gap: 11, alignItems: 'center', marginBottom: 10 }}><Heart size={17} color={isDark ? colors.sage : colors.primary} /><Text variant="label">A little kindness goes a long way.</Text></View>
          <Text variant="small" muted style={{ lineHeight: 21 }}>Your goals are here to make room for you. Adjust them whenever life asks you to slow down.</Text>
        </Card>
      </View>

      <View style={{ flex: 1, gap: 22, minWidth: 0 }}>
        <Card>
          <CardHeading icon={Palette} title="Set the mood" description="A softer screen, any time of day." />
          <View style={{ flexDirection: 'row', gap: 11, marginTop: 22 }}>{(['system', 'light', 'dark'] as Appearance[]).map(mode => <AppearanceTile key={mode} mode={mode} selected={p.appearance === mode} onPress={() => updatePreferences({ appearance: mode })} />)}</View>
        </Card>

        <Card>
          <CardHeading icon={Accessibility} title="Comfort comes first" description="Make every moment easier to follow." />
          <View style={{ marginTop: 13 }}>
            <Toggle label="Larger text" description="A little more room for every word." value={p.largeText} onChange={largeText => updatePreferences({ largeText })} />
            <Toggle label="Higher contrast" description="Clearer text and more defined borders." value={p.highContrast} onChange={highContrast => updatePreferences({ highContrast })} />
            <Toggle label="Reduced motion" description="Still visuals with the same guided breathing rhythm." value={p.reducedMotion} onChange={reducedMotion => updatePreferences({ reducedMotion })} />
          </View>
        </Card>

        <Card>
          <CardHeading icon={ShieldCheck} title="Your practice stays yours" description="Saved on this device. No account needed." />
          <View style={{ marginTop: 13 }}><Toggle label="Explore sample activity" description={store.demoMode ? 'You are viewing a sample journey. Your real sessions stay separate.' : 'View example history and insights. Your real practice is always kept.'} value={store.demoMode} onChange={store.setDemoMode} /></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9 }}><View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.sage }} /><Text variant="small" muted>{store.realSessions.length} real {store.realSessions.length === 1 ? 'session' : 'sessions'} saved on this device</Text></View>
          <Divider />
          <ActionRow icon={Download} label={busy === 'export' ? 'Preparing backup…' : 'Export my data'} description="Save your history, exercises, and preferences." disabled={!!busy} onPress={() => void exportBackup()} />
          <ActionRow icon={Upload} label="Import a backup" description="Restore a previously exported Breathing file." disabled={!!busy} onPress={() => setImportOpen(true)} />
          <ActionRow icon={Trash2} label="Clear session history" description="Keep your favorites, exercises, and preferences." danger disabled={!!busy || store.realSessions.length === 0} onPress={() => { setClearError(''); setClearOpen(true); }} />
        </Card>
      </View>
    </View>

    <View style={{ alignItems: 'center', gap: 7, paddingVertical: 7 }}><Leaf size={18} color={colors.sage} /><Text variant="small" muted>Breathing · A little space for yourself.</Text><Text variant="small" muted style={{ fontSize: 10 }}>Version 1.0 · Made for mindful moments</Text></View>

    <Modal visible={editor !== null} onClose={() => setEditor(null)} title={editor === 'name' ? 'What should we call you?' : editor === 'category' ? 'Your starting point' : numberEditor?.title} subtitle={editor === 'name' ? 'A familiar welcome, every time you return.' : editor === 'category' ? 'Choose the category you want to come back to.' : numberEditor?.description}>
      {editor === 'category' ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 4 }}>{CATEGORIES.map(category => <Chip key={category} label={category} selected={draft === category} onPress={() => setDraft(category)} />)}</View> : <>
        {numberEditor && <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 20 }}>{numberEditor.choices.map(value => <Chip key={value} label={String(value)} selected={draft === String(value)} onPress={() => { setDraft(String(value)); setEditError(''); }} />)}</View>}
        <Input label={editor === 'name' ? 'Your name' : `Or choose your own (${numberEditor?.unit})`} value={draft} onChangeText={value => { setDraft(value); setEditError(''); }} maxLength={editor === 'name' ? 60 : 4} keyboardType={editor === 'name' ? 'default' : 'number-pad'} autoCapitalize={editor === 'name' ? 'words' : 'none'} onSubmitEditing={saveEditor} />
        {numberEditor && <Text variant="small" muted style={{ marginTop: 7 }}>Choose 1–{numberEditor.max} {numberEditor.unit}.</Text>}
      </>}
      {!!editError && <Text accessibilityLiveRegion="polite" variant="small" style={{ color: colors.danger, marginTop: 10 }}>{editError}</Text>}
      <Button label="Save changes" onPress={saveEditor} icon={Check} style={{ marginTop: 25 }} />
    </Modal>

    <Modal visible={importOpen} onClose={closeImport} title={importPreview ? 'Ready to restore?' : 'Welcome back to your practice.'} subtitle={importPreview ? 'Review your backup before replacing the data on this device.' : 'Choose a Breathing JSON backup or paste its contents below.'}>
      {importPreview ? <>
        <Card style={{ padding: 20, gap: 14 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><UserRound size={20} color={colors.sage} /><Text variant="label">{importPreview.preferences.name}’s backup</Text></View><Divider /><BackupStat label="Completed sessions" value={importPreview.realSessions.length} /><BackupStat label="Favorite exercises" value={importPreview.favorites.length} /><BackupStat label="Custom exercises" value={importPreview.customExercises.length} /></Card>
        <View style={{ backgroundColor: colors.peach, borderRadius: 16, padding: 17, marginTop: 18 }}><Text variant="small" style={{ lineHeight: 21 }}>This will replace your current {store.realSessions.length} {store.realSessions.length === 1 ? 'session' : 'sessions'}, favorites, custom exercises, and preferences. Export a backup first if you want to keep them.</Text></View>
        <Button label={busy === 'import' ? 'Restoring your practice…' : 'Replace my data & restore'} onPress={() => void restoreBackup()} disabled={!!busy} style={{ marginTop: 21 }} />
        <Button label="Choose a different backup" variant="ghost" onPress={() => { setImportPreview(null); setImportError(''); }} disabled={!!busy} style={{ marginTop: 4 }} />
      </> : <>
        {Platform.OS === 'web' && <Button label="Choose backup file" icon={Upload} variant="secondary" onPress={pickBackup} style={{ marginBottom: 18 }} />}
        <Input label="Backup contents" value={importText} onChangeText={value => { setImportText(value); setImportError(''); }} placeholder={'Paste your Breathing JSON backup here…'} multiline numberOfLines={8} autoCapitalize="none" autoCorrect={false} style={{ minHeight: 180, paddingTop: 14, paddingBottom: 14, textAlignVertical: 'top', fontSize: 12, lineHeight: 19 }} />
        <Text variant="small" muted style={{ marginTop: 9 }}>Your backup is checked on this device before anything changes. Maximum file size: 15 MB.</Text>
        <Button label="Review backup" onPress={() => validateImport()} disabled={!importText.trim()} icon={ArrowRight} style={{ marginTop: 20 }} />
      </>}
      {!!importError && <Text accessibilityLiveRegion="polite" variant="small" style={{ color: colors.danger, marginTop: 14 }}>{importError}</Text>}
    </Modal>

    <Modal visible={clearOpen} onClose={() => { if (!busy) setClearOpen(false); }} title="Begin with a clean page?" subtitle="Your session history will be permanently removed from this device.">
      <Text muted>You’re about to clear {store.realSessions.length} completed {store.realSessions.length === 1 ? 'session' : 'sessions'} and the progress calculated from them. Your favorites, custom exercises, and preferences will stay.</Text>
      <Text variant="small" muted style={{ marginTop: 14 }}>An exported backup is the only way to restore cleared history.</Text>
      {!!clearError && <Text accessibilityLiveRegion="polite" variant="small" style={{ color: colors.danger, marginTop: 14 }}>{clearError}</Text>}
      <Button label={busy === 'clear' ? 'Clearing history…' : 'Clear my session history'} onPress={() => void clearHistory()} disabled={!!busy} style={{ marginTop: 25, backgroundColor: colors.danger }} />
      <Button label="Keep my history" variant="ghost" onPress={() => setClearOpen(false)} disabled={!!busy} style={{ marginTop: 6 }} />
    </Modal>
  </View>;
}

function CardHeading({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  const { colors } = useTheme();
  return <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}><View style={{ width: 35, height: 35, borderRadius: 12, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginTop: 1 }}><Icon size={17} color={colors.sage} strokeWidth={1.6} /></View><View style={{ flex: 1 }}><Text variant="title" style={{ fontSize: 21, lineHeight: 28 }}>{title}</Text><Text variant="small" muted style={{ marginTop: 4 }}>{description}</Text></View></View>;
}

function GoalTile({ label, amount, unit, onPress }: { label: string; amount: number; unit: string; onPress: () => void }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={`Edit ${label.toLowerCase()}, ${amount} ${unit}`} onPress={onPress} style={({ pressed }) => ({ flex: 1, padding: 16, borderRadius: 18, backgroundColor: colors.surfaceAlt, opacity: pressed ? .7 : 1 })}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 4 }}><Text variant="caption" muted style={{ fontSize: 8, letterSpacing: 1.2 }}>{label}</Text><Pencil size={11} color={colors.muted} /></View><Text style={{ fontFamily: fonts.serif, fontSize: 33, lineHeight: 43, marginTop: 8 }}>{amount}</Text><Text variant="small" muted>{unit}</Text></Pressable>;
}

function SettingRow({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${value}. Edit`} onPress={onPress} style={({ pressed }) => ({ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? .6 : 1 })}><Text variant="label" style={{ flex: 1 }}>{label}</Text><Text variant="small" muted style={{ maxWidth: '43%', textAlign: 'right' }}>{value}</Text><ChevronRight size={14} color={colors.muted} /></Pressable>;
}

function ActionRow({ icon: Icon, label, description, onPress, danger = false, disabled = false }: { icon: LucideIcon; label: string; description: string; onPress: () => void; danger?: boolean; disabled?: boolean }) {
  const { colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} accessibilityLabel={label} disabled={disabled} onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', minHeight: 65, gap: 12, paddingVertical: 12, opacity: disabled ? .45 : pressed ? .65 : 1 })}><Icon size={17} color={danger ? colors.danger : colors.muted} strokeWidth={1.7} /><View style={{ flex: 1 }}><Text variant="label" style={{ color: danger ? colors.danger : colors.ink }}>{label}</Text><Text variant="small" muted style={{ marginTop: 3 }}>{description}</Text></View><ChevronRight size={14} color={colors.subtle} /></Pressable>;
}

function AppearanceTile({ mode, selected, onPress }: { mode: Appearance; selected: boolean; onPress: () => void }) {
  const { colors } = useTheme();
  const Icon = mode === 'system' ? Monitor : mode === 'light' ? Sun : Moon;
  const background = mode === 'dark' ? '#26392E' : light.surface;
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={`${mode} appearance`} onPress={onPress} style={({ pressed }) => ({ flex: 1, padding: 7, borderRadius: 15, borderWidth: 1.5, borderColor: selected ? colors.primary : colors.line, backgroundColor: selected ? colors.primaryLight : colors.surface, opacity: pressed ? .7 : 1 })}>
    <View style={{ backgroundColor: background, borderRadius: 8, height: 68, overflow: 'hidden', padding: 10 }}>
      {mode === 'system' && <View style={{ position: 'absolute', top: 0, bottom: 0, right: 0, width: '50%', backgroundColor: '#26392E' }} />}
      <View style={{ width: '65%', height: 4, borderRadius: 3, backgroundColor: mode === 'dark' ? '#A9BC9C' : light.primary, marginBottom: 9 }} />
      <View style={{ flex: 1, flexDirection: 'row', gap: 5 }}><View style={{ width: '60%', borderRadius: 4, backgroundColor: mode === 'dark' ? '#496045' : light.lilacLight }} /><View style={{ flex: 1, borderRadius: 4, backgroundColor: mode === 'light' ? light.pinkLight : '#354A39' }} /></View>
    </View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 4, paddingVertical: 10 }}><Icon size={12} color={selected ? colors.primary : colors.muted} /><Text variant="small" style={{ color: selected ? colors.primary : colors.muted, fontSize: 11 }}>{mode.charAt(0).toUpperCase() + mode.slice(1)}</Text></View>
  </Pressable>;
}

function BackupStat({ label, value }: { label: string; value: number }) {
  return <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text variant="small" muted>{label}</Text><Text variant="label">{value}</Text></View>;
}

function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong. Please try again.'; }
