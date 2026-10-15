import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { modeName } from '../game/modes';
import type { RunReport } from '../game/progression';
import type { Theme } from '../game/themes';
import { alpha } from '../ui/color';
import { fonts } from '../ui/typography';
import { Button } from './Button';
interface Props { theme: Theme; report: RunReport; canRetry: boolean; suggestBreak: boolean; onRetry: () => void; onShare: () => void; onMenu: () => void }
export function GameOverPanel({ theme, report, canRetry, suggestBreak, onRetry, onShare, onMenu }: Props) {
  const s = report.summary, finished = s.endReason === 'finished';
  const heading = finished ? 'Ritmin güçleniyor.' : report.isNewBest && s.score > 0 ? 'Yeni zirve!' : s.timing === 'early' ? 'Biraz erken.' : 'Bir ritim daha?';
  return <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
    <Text style={[styles.eyebrow, { color: theme.target }]}>{modeName(s.mode).toLocaleUpperCase('tr-TR')} · TUR SONU</Text>
    <Text style={[styles.heading, { color: theme.text }]}>{heading}</Text>
    <Text style={[styles.score, { color: theme.text }]}>{s.score}</Text>
    <Text style={[styles.sub, { color: theme.muted }]}>{finished ? 'Antrenman tamamlandı' : `Hedefi ${s.offDeg.toFixed(1)}° ile ${s.timing === 'early' ? 'erken' : 'geç'} kaçırdın`}</Text>
    <View style={[styles.stats, { backgroundColor: theme.surface, borderColor: alpha(theme.ringLight, 0.35) }]}>
      {[['İSABET', s.hits], ['MÜKEMMEL', s.perfects], ['EN UZUN SERİ', s.bestCombo]].map(([label, value]) => <View key={label} accessible accessibilityLabel={`${label}: ${value}`} style={styles.stat}><Text style={[styles.value, { color: theme.text }]}>{value}</Text><Text style={[styles.label, { color: theme.muted }]}>{label}</Text></View>)}
    </View>
    <Text style={[styles.xp, { color: theme.perfect }]}>+{report.xpGained} XP {report.isNewBest && s.score > 0 ? '· Kişisel rekor' : `· Rekor ${report.previousBest}`}</Text>
    {report.completedMissions.map((name) => <Text key={name} style={[styles.sub, { color: theme.perfect }]}>✓ Görev tamamlandı: {name}</Text>)}
    {report.unlockedThemes.map((t) => <Text key={t.id} style={[styles.sub, { color: theme.perfect }]}>◇ Yeni tema: {t.name}</Text>)}
    {report.daily && <Text style={[styles.sub, { color: theme.muted }]}>Bugünün rekoru {report.daily.dayBest} · {report.daily.attemptsLeft} deneme kaldı</Text>}
    {suggestBreak && <Text style={[styles.sub, { color: theme.muted }]}>Kısa bir mola ver, yeni ritimle dön.</Text>}
    <Button label={canRetry ? 'Tekrar' : 'Klasik oyna'} onPress={onRetry} theme={theme} variant="primary" />
    <View style={styles.actions}><Button label="Menü" onPress={onMenu} theme={theme} style={styles.flex} /><Button label="Paylaş" onPress={onShare} theme={theme} style={styles.flex} /></View>
  </ScrollView>;
}
const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'stretch', gap: 14, paddingVertical: 28 },
  eyebrow: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 2, textAlign: 'center' },
  heading: { fontFamily: fonts.heavy, fontSize: 34, letterSpacing: -1, textAlign: 'center' },
  score: { fontFamily: fonts.heavy, fontSize: 96, lineHeight: 108, letterSpacing: -5, textAlign: 'center', fontVariant: ['tabular-nums'] },
  sub: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  stats: { flexDirection: 'row', borderWidth: 1, borderRadius: 20, paddingVertical: 18 },
  stat: { flex: 1, alignItems: 'center', gap: 5 }, value: { fontFamily: fonts.bold, fontSize: 24 },
  label: { fontFamily: fonts.medium, fontSize: 8, letterSpacing: 0.7 }, xp: { fontFamily: fonts.bold, fontSize: 14, textAlign: 'center', marginBottom: 6 },
  actions: { flexDirection: 'row', gap: 12 }, flex: { flex: 1 },
});
