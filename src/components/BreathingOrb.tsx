import React, { memo, useEffect, useId, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, RadialGradient, Stop } from 'react-native-svg';
import { Text } from './ui';
import { fonts, useTheme } from '../theme';

export interface BreathingOrbProps {
  size?: number;
  phase?: 'prepare' | 'inhale' | 'hold' | 'exhale' | 'rest' | 'complete';
  progress?: number;
  phaseDuration?: number;
  round?: number;
  seconds?: number;
  paused?: boolean;
  reducedMotion?: boolean;
  idle?: boolean;
  label?: string;
}

/** The timer owns phase progress; this component only interpolates its visual position. */
export const BreathingOrb = memo(function BreathingOrb({ size = 300, phase = 'prepare', progress = 0, phaseDuration = 0, round = 1, seconds, paused = false, reducedMotion = false, idle = true, label }: BreathingOrbProps) {
  const { isDark, reducedMotion: preferredReducedMotion } = useTheme();
  const noMotion = reducedMotion || preferredReducedMotion;
  const scale = useRef(new Animated.Value(idle ? 0.94 : 0.74)).current;
  const id = useId().replace(/:/g, '');
  const boundedProgress = Math.max(0, Math.min(1, progress));
  const targetScale = phase === 'inhale' ? 0.74 + 0.26 * boundedProgress : phase === 'exhale' ? 1 - 0.26 * boundedProgress : phase === 'hold' || phase === 'complete' ? 1 : 0.74;
  const position = useRef({ scale: targetScale, progress: boundedProgress });
  position.current = { scale: targetScale, progress: boundedProgress };

  useEffect(() => {
    if (!idle || noMotion || paused) return;
    const breathing = Animated.loop(Animated.sequence([
      Animated.timing(scale, { toValue: 1.02, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(scale, { toValue: 0.94, duration: 4200, easing: Easing.inOut(Easing.sin), useNativeDriver: Platform.OS !== 'web' }),
    ]));
    breathing.start();
    return () => breathing.stop();
  }, [idle, noMotion, paused, scale]);

  useEffect(() => {
    if (idle) { if (noMotion) scale.setValue(1); return; }
    if (paused) { scale.stopAnimation(); return; }
    if (noMotion) { scale.setValue(0.96); return; }
    // One native-driver animation per phase stays fluid between timer renders.
    // Resuming takes its position from the clock, so paused time never advances
    // the visual. Round identity also resynchronizes after a delayed JS tick.
    scale.setValue(position.current.scale);
    const movingPhase = phase === 'inhale' || phase === 'exhale';
    const animation = Animated.timing(scale, { toValue: phase === 'inhale' ? 1 : phase === 'exhale' ? .74 : position.current.scale, duration: movingPhase ? Math.max(0, (1 - position.current.progress) * phaseDuration * 1000) : 0, easing: Easing.linear, useNativeDriver: Platform.OS !== 'web' });
    animation.start();
    return () => animation.stop();
  }, [idle, noMotion, paused, phase, phaseDuration, round, scale]);

  const centerLabel = label ?? (idle ? 'Breathe' : paused ? 'Paused' : phase === 'prepare' ? 'Settle in' : phase === 'inhale' ? 'Breathe in' : phase === 'exhale' ? 'Breathe out' : phase === 'hold' ? 'Hold gently' : phase === 'rest' ? 'Rest' : 'Beautiful.');
  return <View accessible={false} style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <Svg pointerEvents="none" width={size} height={size} viewBox="0 0 360 360" style={StyleSheet.absoluteFill}>
      <Defs><RadialGradient id={`${id}-halo`} cx="50%" cy="50%" rx="50%" ry="50%"><Stop offset="0" stopColor="#B3C89A" stopOpacity={isDark ? '.22' : '.32'} /><Stop offset=".6" stopColor="#B3C89A" stopOpacity=".13" /><Stop offset="1" stopColor="#B3C89A" stopOpacity="0" /></RadialGradient></Defs>
      <Circle cx="180" cy="180" r="180" fill={`url(#${id}-halo)`} />
      <Circle cx="180" cy="180" r="164" fill="none" stroke={isDark ? '#9BB17E' : '#A9BE94'} strokeOpacity=".22" strokeWidth=".7" />
      <Circle cx="180" cy="180" r="151" fill="none" stroke={isDark ? '#9BB17E' : '#A9BE94'} strokeOpacity=".13" strokeWidth=".8" />
      <Circle cx="70" cy="54" r="3" fill="#ACBF92" opacity=".7" /><Circle cx="318" cy="228" r="2.6" fill="#ACBF92" opacity=".65" /><Circle cx="84" cy="313" r="2" fill="#ACBF92" opacity=".4" />
    </Svg>
    <Animated.View pointerEvents="none" style={{ width: size, height: size, transform: [{ scale }] }}>
      <Svg width={size} height={size} viewBox="0 0 360 360">
        <Defs>
          <RadialGradient id={`${id}-body`} cx="33%" cy="21%" rx="80%" ry="80%"><Stop offset="0" stopColor="#E2E9CE" stopOpacity=".97" /><Stop offset=".3" stopColor="#C5D6AB" stopOpacity=".96" /><Stop offset=".69" stopColor="#9EBB82" stopOpacity=".87" /><Stop offset="1" stopColor="#809E70" stopOpacity=".95" /></RadialGradient>
          <RadialGradient id={`${id}-light`} cx="35%" cy="20%" rx="72%" ry="72%"><Stop offset="0" stopColor="#FFFFFF" stopOpacity=".55" /><Stop offset=".46" stopColor="#F3F4DC" stopOpacity=".13" /><Stop offset="1" stopColor="#F3F4DC" stopOpacity="0" /></RadialGradient>
          <RadialGradient id={`${id}-core`} cx="50%" cy="60%" rx="55%" ry="55%"><Stop offset="0" stopColor="#D4E2BA" stopOpacity=".2" /><Stop offset=".9" stopColor="#789864" stopOpacity="0" /><Stop offset="1" stopColor="#5D7E4D" stopOpacity=".15" /></RadialGradient>
        </Defs>
        <G>
          <Ellipse cx="180" cy="185" rx="136" ry="130" fill="#A3BC8D" opacity=".12" />
          <Circle cx="180" cy="178" r="132" fill={`url(#${id}-body)`} stroke="#E3E9D5" strokeWidth=".8" strokeOpacity=".9" />
          <Circle cx="180" cy="178" r="131" fill={`url(#${id}-light)`} />
          <Circle cx="180" cy="178" r="131" fill={`url(#${id}-core)`} />
          <Ellipse cx="174" cy="172" rx="123" ry="125" fill="none" stroke="#F8F9EE" strokeOpacity=".44" strokeWidth=".7" rotation="-14" origin="174,172" />
          <Ellipse cx="184" cy="185" rx="122" ry="128" fill="none" stroke="#668958" strokeOpacity=".15" strokeWidth=".7" rotation="18" origin="184,185" />
          <Circle cx="180" cy="178" r="141" fill="none" stroke="#ADC295" strokeOpacity=".42" strokeWidth=".65" />
        </G>
      </Svg>
    </Animated.View>
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', padding: size * .18 }]}>
      <Text style={{ fontFamily: idle ? fonts.serif : fonts.serifMedium, fontSize: size * (idle ? .112 : .092), lineHeight: size * .14, color: '#304C34', textAlign: 'center' }}>{centerLabel}</Text>
      {seconds !== undefined && !idle && <Text style={{ marginTop: 7, fontFamily: fonts.regular, fontSize: size * .052, color: '#4D6745', lineHeight: size * .072 }}>{seconds}<Text style={{ fontSize: size * .035, color: '#4D6745' }}> sec</Text></Text>}
      {idle && <Text style={{ marginTop: 5, fontSize: size * .034, color: '#5D7550', letterSpacing: 2.8, lineHeight: size * .06 }}>IN. OUT. LET GO.</Text>}
    </View>
  </View>;
});

export default BreathingOrb;
