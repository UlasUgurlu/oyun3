import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { Theme } from '../game/themes';
import type { Callout } from '../hooks/useNabizGame';
import { fonts, type } from '../ui/typography';
import { ExtrudedText } from './ExtrudedText';

/** "Mükemmel ×3" gibi kısa övgüler: belirir, hafifçe yükselir, kaybolur. */
export function CalloutText({ callout, theme }: { callout: Callout | null; theme: Theme }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!callout) return;
    progress.value = 0;
    progress.value = withSequence(
      withTiming(1, { duration: 90 }),
      withDelay(callout.tone === 'graze' ? 900 : 420, withTiming(2, { duration: 260 })),
    );
  }, [callout, progress]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: p <= 1 ? p : 2 - p,
      transform: [{ translateY: -p * 14 }, { scale: p <= 1 ? 0.6 + p * 0.4 : 1 + (p - 1) * 0.08 }],
    };
  });

  const perfect = callout?.tone !== 'graze';
  return (
    <Animated.View style={[styles.wrap, style]} accessibilityLiveRegion="polite">
      <ExtrudedText
        color={perfect ? theme.perfect : theme.text}
        sideColor={perfect ? theme.ledge : theme.ringDark}
        glowColor={perfect ? theme.perfect : undefined}
        depth={perfect ? 4 : 2}
        style={[styles.text, !perfect && styles.small]}
      >
        {callout?.text ?? ' '}
      </ExtrudedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { minHeight: 60, justifyContent: 'center', paddingHorizontal: 24 },
  text: { fontFamily: fonts.heavy, fontSize: type.headline, textAlign: 'center' },
  small: { fontFamily: fonts.bold, fontSize: type.body + 1 },
});
