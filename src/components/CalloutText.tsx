import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import type { Theme } from '../game/themes';
import type { Callout } from '../hooks/useNabizGame';
import { fonts } from '../ui/typography';
export function CalloutText({ callout, theme }: { callout: Callout | null; theme: Theme }) {
  const progress = useSharedValue(0);
  useEffect(() => { progress.value = callout ? withSequence(withTiming(1, { duration: 80 }), withDelay(500, withTiming(0, { duration: 160 }))) : 0; }, [callout, progress]);
  const style = useAnimatedStyle(() => ({ opacity: progress.value, transform: [{ translateY: (1 - progress.value) * 6 }] }));
  return <Animated.Text style={[styles.text, { color: callout?.tone === 'graze' ? theme.muted : theme.perfect }, style]} accessibilityLiveRegion="polite">{callout?.text ?? ' '}</Animated.Text>;
}
const styles = StyleSheet.create({ text: { minHeight: 40, fontFamily: fonts.bold, fontSize: 18, textAlign: 'center', paddingHorizontal: 12, paddingTop: 8 } });
