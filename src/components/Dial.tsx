import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import type { Theme } from '../game/themes';
import type { GameVisuals } from '../hooks/useNabizGame';
import { alpha } from '../ui/color';
import { fonts } from '../ui/typography';

interface Props {
  size: number; theme: Theme; target: number; width: number; decoy: number | null;
  score: number; combo: number; visuals: GameVisuals; effects: boolean;
}
export function arcPath(c: number, r: number, from: number, to: number) {
  const x1 = c + r * Math.cos(from), y1 = c + r * Math.sin(from);
  const x2 = c + r * Math.cos(to), y2 = c + r * Math.sin(to);
  return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > Math.PI ? 1 : 0} 1 ${x2} ${y2}`;
}
const TICKS = Array.from({ length: 48 }, (_, i) => i * Math.PI / 24);

/** The dial is static SVG. Only the native needle layer rotates each frame. */
export const Dial = memo(function Dial({ size, theme, target, width, decoy, score, combo, visuals, effects }: Props) {
  const c = size / 2, r = size * 0.385, w = size * 0.058;
  const needleStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${visuals.needle.value}rad` }] }));
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: effects ? (1 - visuals.beat.value) * 0.45 : 0,
    transform: [{ scale: 0.8 + visuals.beat.value * 0.32 }],
  }));
  const scoreStyle = useAnimatedStyle(() => ({ transform: [{ scale: effects ? visuals.scorePulse.value : 1 }] }));
  return (
    <View style={{ width: size, height: size }} pointerEvents="none">
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="metal" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={theme.ringLight} /><Stop offset="1" stopColor={theme.track} /></LinearGradient>
          <LinearGradient id="signal" x1="0" y1="0" x2="1" y2="1"><Stop offset="0" stopColor={theme.perfect} /><Stop offset="1" stopColor={theme.target} /></LinearGradient>
        </Defs>
        <Circle cx={c} cy={c} r={r + w + 7} fill="none" stroke={alpha(theme.ringLight, 0.25)} strokeWidth="1" />
        {TICKS.map((a, i) => <Line key={i} x1={c + (size * (i % 4 === 0 ? 0.457 : 0.468)) * Math.cos(a)} y1={c + (size * (i % 4 === 0 ? 0.457 : 0.468)) * Math.sin(a)} x2={c + (size * 0.483) * Math.cos(a)} y2={c + (size * 0.483) * Math.sin(a)} stroke={alpha(theme.muted, i % 4 === 0 ? 0.7 : 0.25)} strokeWidth={i % 4 === 0 ? 2 : 1} />)}
        <Circle cx={c} cy={c} r={r} fill="none" stroke="url(#metal)" strokeWidth={w} />
        <Circle cx={c} cy={c} r={r - w} fill={alpha(theme.surface, 0.48)} stroke={alpha(theme.ringLight, 0.3)} strokeWidth="1" />
        {decoy !== null && <Path d={arcPath(c, r, decoy - width / 2, decoy + width / 2)} fill="none" stroke="#B291FF" strokeWidth={w * 0.8} strokeDasharray="3 5" />}
        <Path d={arcPath(c, r, target - width / 2, target + width / 2)} fill="none" stroke={alpha(theme.target, 0.15)} strokeWidth={w * 1.7} strokeLinecap="round" />
        <Path d={arcPath(c, r, target - width / 2, target + width / 2)} fill="none" stroke="url(#signal)" strokeWidth={w} strokeLinecap="butt" />
        <Path d={arcPath(c, r, target - width * 0.125, target + width * 0.125)} fill="none" stroke={theme.needle} strokeWidth={w * 0.38} />
        <Path d={`M ${c - 38} ${c + size * 0.2695} L ${c - 20} ${c + size * 0.2695} L ${c - 11} ${c + size * 0.2695 - size * 0.027} L ${c - 3} ${c + size * 0.2695 + size * 0.027} L ${c + 6} ${c + size * 0.2695 - size * 0.04} L ${c + 16} ${c + size * 0.2695} L ${c + 38} ${c + size * 0.2695}`} fill="none" stroke={theme.target} strokeWidth="2" strokeLinejoin="round" />
      </Svg>
      <Animated.View style={[styles.ripple, { left: c - r, top: c - r, width: r * 2, height: r * 2, borderRadius: r, borderColor: theme.perfect }, rippleStyle]} />
      <Animated.View style={[StyleSheet.absoluteFill, needleStyle]}>
        <View style={[styles.ray, { left: c + r - w * 1.3, top: c - 2, width: w * 2.6, backgroundColor: theme.needle }]} />
        <View style={[styles.dot, { left: c + r + w * 0.8, top: c - 5, backgroundColor: theme.target, borderColor: theme.needle }]} />
      </Animated.View>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={[styles.caption, { color: theme.muted }]}>NABIZ PUANI</Text>
        <Animated.Text style={[styles.score, { color: theme.text, fontSize: size * 0.21, lineHeight: size * 0.27 }, scoreStyle]}>{score}</Animated.Text>
        <Text style={[styles.combo, { color: combo > 1 ? theme.perfect : theme.muted }]}>{combo > 1 ? `SERİ ×${combo}` : 'RİTMİ YAKALA'}</Text>
      </View>
    </View>
  );
});
const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingBottom: 12 },
  caption: { fontFamily: fonts.medium, fontSize: 10, letterSpacing: 2 },
  score: { fontFamily: fonts.heavy, fontVariant: ['tabular-nums'], letterSpacing: -3, lineHeight: 86 },
  combo: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 1.5 },
  ray: { position: 'absolute', height: 4, borderRadius: 2 },
  dot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  ripple: { position: 'absolute', borderWidth: 2 },
});
