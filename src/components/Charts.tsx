import React, { useEffect, useId, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { fonts, useTheme } from '../theme';
import { Text } from './ui';

export interface ChartPoint {
  label: string;
  value: number;
  detail?: string;
  current?: boolean;
}

function useChartEntrance(key: string) {
  const { reducedMotion } = useTheme();
  const opacity = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  useEffect(() => {
    opacity.setValue(reducedMotion ? 1 : 0);
    const animation = Animated.timing(opacity, { toValue: 1, duration: reducedMotion ? 0 : 420, useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [key, opacity, reducedMotion]);
  return opacity;
}

/** The chart itself is decorative; its complete data is available as a screen-reader summary. */
export function ActivityChart({ data, height = 200, variant = 'bar', description = 'Breathing minutes' }: {
  data: ChartPoint[];
  height?: number;
  variant?: 'bar' | 'line';
  description?: string;
}) {
  const { colors, highContrast } = useTheme();
  const [width, setWidth] = useState(600);
  const gradientId = `chart${useId().replace(/:/g, '')}`;
  const chartKey = data.map(point => `${point.label}:${point.value}`).join('|');
  const opacity = useChartEntrance(chartKey);
  const maximum = Math.max(5, ...data.map(point => point.value));
  const step = maximum <= 20 ? 5 : maximum <= 60 ? 15 : maximum <= 120 ? 30 : Math.ceil(maximum / 4 / 10) * 10;
  const ceiling = Math.ceil(maximum / step) * step;
  const ticks = Array.from({ length: 5 }, (_, index) => ceiling * index / 4);
  const left = Math.max(32, ...ticks.map(tick => String(Number(tick.toFixed(2))).length * 6 + 9));
  const right = 13;
  const top = 16;
  const bottom = 31;
  const plotHeight = height - top - bottom;
  const plotWidth = Math.max(50, width - left - right);
  const slot = plotWidth / Math.max(1, data.length);
  const points = data.map((point, index) => ({ x: left + slot * (index + .5), y: top + plotHeight * (1 - point.value / ceiling) }));
  const line = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const midX = (point.x + previous.x) / 2;
    return `${path} C ${midX} ${previous.y}, ${midX} ${point.y}, ${point.x} ${point.y}`;
  }, '');
  const floor = top + plotHeight;
  const area = points.length ? `${line} L ${points[points.length - 1].x} ${floor} L ${points[0].x} ${floor} Z` : '';
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(4, Math.floor(plotWidth / 45))));
  const summary = `${description}. ${data.map(point => `${point.detail ?? point.label}: ${Number(point.value.toFixed(1))} minutes`).join('; ')}.`;

  return <Animated.View
    accessible accessibilityRole="image" accessibilityLabel={summary}
    onLayout={event => setWidth(Math.max(140, event.nativeEvent.layout.width))}
    style={{ width: '100%', height, opacity }}
  >
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} accessible={false}>
      <Defs><LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={colors.sage} stopOpacity=".3"/><Stop offset="1" stopColor={colors.sage} stopOpacity=".015"/></LinearGradient></Defs>
      {ticks.map((tick, index) => {
        const y = top + plotHeight * (1 - tick / ceiling);
        return <G key={index}>
          <Line x1={left} x2={width - right} y1={y} y2={y} stroke={colors.line} strokeDasharray={index === 0 ? undefined : '3 5'}/>
          <SvgText x={left - 7} y={y + 4} fill={colors.muted} fontSize={10} fontFamily={fonts.regular} textAnchor="end">{Number(tick.toFixed(2))}</SvgText>
        </G>;
      })}
      {variant === 'line' && <>
        <Path d={area} fill={`url(#${gradientId})`}/>
        <Path d={line} fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinecap="round"/>
        {data.length <= 12 && points.map((point, index) => <Circle key={index} cx={point.x} cy={point.y} r={3.5} fill={colors.surface} stroke={colors.primary} strokeWidth={2}/>)}
      </>}
      {data.map((point, index) => {
        const barWidth = Math.min(30, slot * .48);
        const barHeight = point.value ? Math.max(3, plotHeight * point.value / ceiling) : 3;
        return <G key={index}>
          {variant === 'bar' && <Rect x={points[index].x - barWidth / 2} y={floor - barHeight} width={barWidth} height={barHeight} rx={Math.min(6, barWidth / 2)} fill={point.current || highContrast ? colors.primary : point.value ? colors.accent : colors.line}/>}
          {(index % labelEvery === 0 || index === data.length - 1) && <SvgText x={points[index].x} y={height - 6} fill={point.current ? colors.primary : colors.muted} fontSize={10} fontFamily={point.current ? fonts.semibold : fonts.regular} textAnchor="middle">{point.label}</SvgText>}
        </G>;
      })}
    </Svg>
  </Animated.View>;
}

export function ProgressRing({ progress, size = 108, strokeWidth = 8, children, color }: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
  color?: string;
}) {
  const { colors } = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = Math.PI * 2 * radius;
  const value = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  return <View style={{ width: size, height: size }}>
    <Svg width={size} height={size} style={StyleSheet.absoluteFill} accessible={false}>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.line} strokeWidth={strokeWidth} fill="none"/>
      {value > 0 && <Circle cx={size / 2} cy={size / 2} r={radius} stroke={color ?? colors.primary} strokeWidth={strokeWidth} fill="none" strokeDasharray={`${circumference} ${circumference}`} strokeDashoffset={circumference * (1 - value)} strokeLinecap="round" rotation="-90" origin={`${size / 2}, ${size / 2}`}/>}
    </Svg>
    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>{children ?? <Text variant="title">{Math.round(value * 100)}%</Text>}</View>
  </View>;
}
