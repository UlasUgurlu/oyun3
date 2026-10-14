import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import type { Theme } from '../game/themes';
import { alpha, lighten } from '../ui/color';
import { fonts } from '../ui/typography';
interface Props { label: string; detail?: string; onPress: () => void; theme: Theme; variant?: 'primary' | 'secondary' | 'quiet'; disabled?: boolean; style?: StyleProp<ViewStyle> }
export function Button({ label, detail, onPress, theme, variant = 'secondary', disabled, style }: Props) {
  const primary = variant === 'primary', quiet = variant === 'quiet';
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={label} accessibilityHint={detail} accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [{ opacity: disabled ? 0.4 : pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}>
      <LinearGradient colors={quiet ? ['transparent', 'transparent'] : primary ? [lighten(theme.target, 0.12), theme.target] : [theme.surface, theme.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.face, { borderColor: primary ? alpha('#FFFFFF', 0.18) : quiet ? 'transparent' : alpha(theme.ringLight, 0.3) }]}>
        <View style={styles.text}><Text style={[styles.label, { color: primary ? '#FFFFFF' : theme.text }]}>{label}</Text>{detail && <Text style={[styles.detail, { color: primary ? '#FFFFFFDD' : theme.muted }]}>{detail}</Text>}</View>
        {primary && <Text style={styles.arrow}>↗</Text>}
      </LinearGradient>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  face: { minHeight: 54, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 18, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  text: { flex: 1, alignItems: 'center' },
  label: { fontFamily: fonts.bold, fontSize: 17, textAlign: 'center' },
  detail: { fontFamily: fonts.regular, fontSize: 12, marginTop: 3, textAlign: 'center' },
  arrow: { color: '#FFFFFF', fontSize: 24 },
});
