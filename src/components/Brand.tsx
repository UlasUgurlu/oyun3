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
  hero: { alignItems: 'center', paddingBottom: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  center: { alignItems: 'center' },
  logo: { width: 112, height: 112, borderRadius: 30, marginBottom: 6 },
  smallLogo: { width: 36, height: 36, borderRadius: 10 },
  title: { fontFamily: fonts.heavy, fontSize: 52, letterSpacing: -2 },
  smallTitle: { fontFamily: fonts.heavy, fontSize: 24, letterSpacing: -0.7 },
  tagline: { fontFamily: fonts.regular, fontSize: 14, marginTop: 2 },
});
