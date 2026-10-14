import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import type { RunReport } from '../game/progression';
import type { Theme } from '../game/themes';
import { alpha, lighten } from '../ui/color';
import { fonts, type } from '../ui/typography';
import { Button } from './Button';

interface Props {
  theme: Theme;
  report: RunReport;
  canRetry: boolean;
  suggestBreak: boolean;
  onRetry: () => void;
  onShare: () => void;
  onMenu: () => void;
}

/** Kıl payını gerçek ölçüme göre anlatır; uydurma "az kaldı" yok. */
function missHeadline(offDeg: number, timing: 'early' | 'late') {
  const deg = offDeg < 10 ? offDeg.toFixed(1) : Math.round(offDeg).toString();
  if (offDeg < 1.5) return `Kıl payı, sadece ${deg}° ile kaçırdın`;
  if (offDeg < 6) return `Çok yakındın, ${deg}° ile kaçırdın`;
  return timing === 'early' ? `Erken davrandın, hedefe ${deg}° vardı` : `Geç kaldın, ${deg}° ile kaçırdın`;
}

export function GameOverPanel({ theme, report, canRetry, suggestBreak, onRetry, onShare, onMenu }: Props) {
  const { summary } = report;
  const isDaily = summary.mode === 'daily';

  return (
    <Animated.View
      entering={FadeInDown.duration(260).springify().damping(16)}
      style={[
        styles.wrap,
        {
          backgroundColor: alpha(theme.surface, 0.88),
          borderTopColor: alpha(lighten(theme.surface, 0.4), 0.8),
          shadowColor: '#000',
        },
      ]}
    >
      <Text style={[styles.headline, { color: theme.text }]}>{missHeadline(summary.offDeg, summary.timing)}</Text>

      {report.isNewBest && summary.score > 0 ? (
        <Animated.Text entering={FadeInDown.delay(120)} style={[styles.badge, { color: theme.perfect }]}>
          Yeni rekor, önceki {report.previousBest}
        </Animated.Text>
      ) : null}

      <Text style={[styles.meta, { color: theme.muted }]}>
        {summary.hits} isabet, {summary.perfects} mükemmel, en uzun seri {summary.bestCombo}
      </Text>

      {report.unlockedThemes.map((t) => (
        <Text key={t.id} style={[styles.meta, { color: theme.perfect }]}>
          Yeni tema açıldı: {t.name}
        </Text>
      ))}

      {isDaily && report.daily ? (
        <Text style={[styles.meta, { color: theme.muted }]}>
          Günün Nabzı #{report.daily.dayNumber}: bugünkü en iyin {report.daily.dayBest}, {report.daily.attemptsLeft} hak kaldı
        </Text>
      ) : null}

      {suggestBreak ? (
        <Text style={[styles.meta, { color: theme.text }]}>
          Bir süredir oynuyorsun. Kısa bir mola gözlerine ve parmaklarına iyi gelir.
        </Text>
      ) : null}

      <View style={styles.actions}>
        {canRetry ? (
          <Button label="Tekrar" onPress={onRetry} theme={theme} variant="primary" />
        ) : (
          <Button label="Klasik oyna" onPress={onRetry} theme={theme} variant="primary" />
        )}
        <View style={styles.row}>
          {isDaily ? (
            <Button label="Sonucu paylaş" onPress={onShare} theme={theme} style={styles.flex} />
          ) : null}
          <Button label="Menü" onPress={onMenu} theme={theme} variant={isDaily ? 'secondary' : 'quiet'} style={styles.flex} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    gap: 8,
    borderRadius: 26,
    padding: 18,
    borderTopWidth: 1.5,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 14,
  },
  headline: { fontFamily: fonts.bold, fontSize: type.title + 2, lineHeight: 28 },
  badge: { fontFamily: fonts.bold, fontSize: type.body },
  meta: { fontFamily: fonts.regular, fontSize: type.body - 1, lineHeight: 21 },
  actions: { gap: 10, marginTop: 12 },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
