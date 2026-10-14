import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import type { Theme } from '../game/themes';
import { darken, lighten } from '../ui/color';
import { fonts, type } from '../ui/typography';

interface Props {
  label: string;
  detail?: string;
  onPress: () => void;
  theme: Theme;
  variant?: 'primary' | 'secondary' | 'quiet';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const LEDGE = { primary: 7, secondary: 5, quiet: 0 } as const;

/**
 * Oyun konsolu tuşu gibi 3B buton: altta koyu bir kenar, üstte ışık alan yüz.
 * Basınca yüz kenara doğru iner.
 */
export function Button({ label, detail, onPress, theme, variant = 'secondary', disabled, style }: Props) {
  const primary = variant === 'primary';
  const quiet = variant === 'quiet';
  const ledge = LEDGE[variant];
  const face = primary
    ? [lighten(theme.target, 0.28), theme.target, darken(theme.target, 0.08)]
    : [lighten(theme.surface, 0.1), theme.surface, darken(theme.surface, 0.06)];
  const ledgeColor = primary ? theme.ledge : theme.ringDark;
  const color = primary ? '#FFFFFF' : theme.text;
  const radius = primary ? 26 : 18;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={detail ? `${label}, ${detail}` : label}
      accessibilityState={{ disabled: !!disabled }}
      hitSlop={6}
      style={[{ paddingBottom: ledge, opacity: disabled ? 0.45 : 1 }, style]}
    >
      {({ pressed }) => {
        const sink = pressed && !disabled ? ledge - 1 : 0;
        return (
          <View>
            {!quiet && <View style={[StyleSheet.absoluteFill, { top: ledge, bottom: -ledge, borderRadius: radius, backgroundColor: ledgeColor }]} />}
            <LinearGradient
              colors={quiet ? ['transparent', 'transparent'] : (face as [string, string, string])}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={[
                styles.face,
                primary && styles.primaryFace,
                { borderRadius: radius, transform: [{ translateY: sink }] },
                !quiet && { borderTopColor: lighten(primary ? theme.target : theme.surface, 0.35), borderTopWidth: 1.5 },
              ]}
            >
              <View style={[styles.row, !detail && styles.centered]}>
                <Text
                  style={[
                    styles.label,
                    primary && styles.primaryLabel,
                    { color },
                    primary && { textShadowColor: theme.ledge, textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 0 },
                  ]}
                >
                  {label}
                </Text>
                {detail ? <Text style={[styles.detail, { color: primary ? color : theme.muted }]}>{detail}</Text> : null}
              </View>
            </LinearGradient>
          </View>
        );
      }}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: { paddingVertical: 15, paddingHorizontal: 22, minHeight: 54, justifyContent: 'center' },
  primaryFace: { paddingVertical: 19, minHeight: 66 },
  row: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  centered: { justifyContent: 'center' },
  label: { fontFamily: fonts.bold, fontSize: type.body + 1 },
  primaryLabel: { fontSize: type.title + 4, flex: 1, textAlign: 'center', letterSpacing: 0.3 },
  detail: { fontFamily: fonts.regular, fontSize: type.small + 1 },
});
