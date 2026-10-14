import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { THEMES, isUnlocked, type Theme } from '../game/themes';
import { alpha, lighten } from '../ui/color';
import { fonts, type } from '../ui/typography';
import { Button } from './Button';

interface Props {
  theme: Theme;
  best: number;
  totalHits: number;
  streak: number;
  dayNumber: number;
  dailyAttemptsLeft: number;
  dailyBest: number;
  onPlay: () => void;
  onDaily: () => void;
  onSelectTheme: (id: string) => void;
}

export function MenuPanel(p: Props) {
  const { theme } = p;
  const dailyDetail =
    p.dailyAttemptsLeft > 0
      ? `${p.dailyAttemptsLeft} hak kaldı`
      : `Bugünkü en iyin ${p.dailyBest}, yarın yeni tur`;

  return (
    <Animated.View entering={FadeIn.duration(220)} style={styles.wrap}>
      <Button label="Oyna" onPress={p.onPlay} theme={theme} variant="primary" />
      <Button
        label={`Günün Nabzı #${p.dayNumber}`}
        detail={dailyDetail}
        onPress={p.onDaily}
        theme={theme}
        disabled={p.dailyAttemptsLeft === 0}
      />

      <View
        style={[
          styles.stats,
          { backgroundColor: alpha(theme.surface, 0.75), borderTopColor: alpha(lighten(theme.surface, 0.4), 0.7) },
        ]}
      >
        <Stat label="En iyi" value={p.best} theme={theme} />
        <Stat label="Günlük seri" value={p.streak > 0 ? `${p.streak} 🔥` : '0'} theme={theme} />
        <Stat label="Toplam isabet" value={p.totalHits} theme={theme} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.themes}>
        {THEMES.map((t) => {
          const open = isUnlocked(t, p.totalHits);
          const active = t.id === theme.id;
          return (
            <Pressable
              key={t.id}
              disabled={!open}
              onPress={() => p.onSelectTheme(t.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active, disabled: !open }}
              accessibilityLabel={open ? `${t.name} teması` : `${t.name} teması, ${t.unlockAt} isabette açılır`}
              style={[
                styles.chip,
                {
                  backgroundColor: t.background,
                  borderColor: active ? t.target : alpha(t.ringLight, 0.5),
                  shadowColor: t.target,
                  shadowOpacity: active ? 0.6 : 0,
                },
              ]}
            >
              <View style={[styles.swatch, { backgroundColor: t.target }]} />
              <Text style={[styles.chipText, { color: t.text, opacity: open ? 1 : 0.6 }]}>
                {open ? t.name : `🔒 ${t.unlockAt}`}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

function Stat({ label, value, theme }: { label: string; value: number | string; theme: Theme }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, width: '100%' },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderTopWidth: 1.5,
  },
  stat: { flex: 1 },
  statValue: { fontFamily: fonts.bold, fontSize: type.title, fontVariant: ['tabular-nums'] },
  statLabel: { fontFamily: fonts.regular, fontSize: type.small },
  themes: { gap: 8, paddingVertical: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
  },
  swatch: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },
  chipText: { fontFamily: fonts.medium, fontSize: type.small },
});
