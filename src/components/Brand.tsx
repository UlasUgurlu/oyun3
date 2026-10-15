import { Image, StyleSheet, Text, View } from 'react-native';
import type { Theme } from '../game/themes';
import { fonts } from '../ui/typography';
export function Brand({ theme, compact = false }: { theme: Theme; compact?: boolean }) {
  return (
    <View style={compact ? styles.row : styles.hero}>
      <Image source={require('../../assets/nabiz-logo.png')} style={compact ? styles.smallLogo : styles.logo} accessibilityLabel="Nabız logosu" />
      <View style={!compact && styles.center}>
        <Text style={[compact ? styles.smallTitle : styles.title, { color: theme.text }]}>Nabız</Text>
        {!compact && <Text style={[styles.tagline, { color: theme.muted }]}>Ritmini bul. Sınırını aş.</Text>}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  center: { alignItems: 'flex-start' },
  logo: { width: 64, height: 64, borderRadius: 20 },
  smallLogo: { width: 36, height: 36, borderRadius: 10 },
  title: { fontFamily: fonts.heavy, fontSize: 40, lineHeight: 48, includeFontPadding: false, letterSpacing: -2 },
  smallTitle: { fontFamily: fonts.heavy, fontSize: 24, letterSpacing: -0.7 },
  tagline: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, marginTop: 2 },
});
