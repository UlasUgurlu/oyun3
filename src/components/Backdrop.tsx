import { LinearGradient } from 'expo-linear-gradient';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { Theme } from '../game/themes';
import { alpha } from '../ui/color';

/** Static gradients are composited once; no canvas, sensors or frame callbacks. */
export const Backdrop = memo(function Backdrop({ theme }: { theme: Theme }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={[theme.backgroundGlow, theme.background, theme.background]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />
      <View style={[styles.orbit, { borderColor: alpha(theme.target, 0.08) }]} />
      <View style={[styles.line, { backgroundColor: alpha(theme.perfect, 0.15) }]} />
    </View>
  );
});
const styles = StyleSheet.create({
  orbit: { position: 'absolute', top: -210, right: -170, width: 460, height: 460, borderRadius: 230, borderWidth: 1 },
  line: { position: 'absolute', top: 170, right: 0, width: 70, height: 1 },
});
