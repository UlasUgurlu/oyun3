import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MODES, type GameMode } from '../game/modes';
import { MISSIONS, dailyAttemptsLeft, missionsFor, rankFor, rollDaily, visibleStreak, type Profile } from '../game/progression';
import { THEMES, isUnlocked, type Theme } from '../game/themes';
import { alpha } from '../ui/color';
import { fonts } from '../ui/typography';
import { Brand } from './Brand';
import { Button } from './Button';

interface Props { theme: Theme; profile: Profile; now: Date; selectedMode: GameMode; onSelectMode: (m: GameMode) => void; onPlay: (m: GameMode) => void; onSelectTheme: (id: string) => void }
export function MenuPanel({ theme, profile, now, selectedMode, onSelectMode, onPlay, onSelectTheme }: Props) {
  const [tab, setTab] = useState<'play' | 'missions' | 'themes'>('play');
  const [help, setHelp] = useState(false);
  const rank = rankFor(profile.xp), missions = missionsFor(profile, now);
  const mode = MODES.find((m) => m.id === selectedMode)!;
  const attempts = dailyAttemptsLeft(profile, now);
  const card = { backgroundColor: alpha(theme.surface, 0.8), borderColor: alpha(theme.ringLight, 0.3) };
  return (
    <View style={styles.fill}>
      <ScrollView key={tab} showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Brand theme={theme} />
        <View style={[styles.stats, card]}>
          {[[`${selectedMode === 'daily' ? 'GÜNLÜK' : mode.name.toLocaleUpperCase('tr-TR')} REKORU`, profile.modeBests[selectedMode]], ['SEVİYE', rank.level], ['İSABET', profile.totalHits]].map(([label, value]) => <View key={label} style={styles.stat}><Text style={[styles.statValue, { color: theme.text }]}>{value}</Text><Text style={[styles.caption, { color: theme.muted }]}>{label}</Text></View>)}
        </View>
        {tab === 'play' && <>
          <View style={styles.sectionRow}><Text style={[styles.section, { color: theme.text }]}>Ritmini seç</Text><Text style={[styles.caption, { color: theme.muted }]}>4 FARKLI MOD</Text></View>
          <View style={styles.grid}>
            {MODES.map((m) => {
              const active = selectedMode === m.id;
              return <Pressable key={m.id} onPress={() => onSelectMode(m.id)} accessibilityRole="button" accessibilityLabel={m.name} accessibilityState={{ selected: active }}
                style={({ pressed }) => [styles.mode, card, { borderColor: active ? theme.target : card.borderColor, backgroundColor: active ? alpha(theme.target, 0.12) : card.backgroundColor, opacity: pressed ? 0.7 : 1 }]}>
                <View style={styles.modeTop}><Text style={[styles.symbol, { color: active ? theme.target : theme.muted }]}>{m.symbol}</Text><View style={[styles.selectDot, { backgroundColor: active ? theme.target : theme.track }]} /></View>
                <Text style={[styles.modeName, { color: theme.text }]}>{m.name}</Text><Text style={[styles.tiny, { color: theme.muted }]}>{m.tag}</Text>
              </Pressable>;
            })}
          </View>
          <Text style={[styles.modeDetail, { color: theme.muted }]}>{mode.detail}{selectedMode === 'daily' ? ` ${attempts} deneme kaldı.` : ''}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Nasıl oynanır?" onPress={() => setHelp(!help)} style={styles.helpButton}><Text style={[styles.helpLabel, { color: theme.muted }]}>{help ? 'Rehberi kapat ↑' : 'Nasıl oynanır? ↓'}</Text></Pressable>
          {help && <View style={[styles.help, card]}>
            <Text style={[styles.helpText, { color: theme.text }]}>01   İbre renkli yayın içindeyken oyun alanına dokun.</Text>
            <Text style={[styles.helpText, { color: theme.text }]}>02   Beyaz merkez mükemmel isabet: seri ve daha çok puan.</Text>
            <Text style={[styles.helpText, { color: theme.text }]}>03   5 mükemmelde Odak dolar. Tuşa bas, zamanı yavaşlat.</Text>
            <Text style={[styles.helpText, { color: theme.muted }]}>Kaos modunda kuralları üstteki sinyal kartından takip et. Serbest modunda hata yapmak turu bitirmez.</Text>
          </View>}
        </>}
        {tab === 'missions' && <>
          <View style={[styles.rank, card]}><Text style={[styles.caption, { color: theme.target }]}>SEVİYE {rank.level} • {rank.name.toLocaleUpperCase('tr-TR')}</Text><Text style={[styles.rankTitle, { color: theme.text }]}>Her isabet bir adım.</Text><Progress amount={rank.progress} color={theme.target} track={theme.track} /><Text style={[styles.small, { color: theme.muted }]}>{rank.remaining} XP sonra yeni seviye · Toplam {profile.xp} XP</Text></View>
          <Text style={[styles.section, { color: theme.text }]}>Bugünün görevleri</Text>
          <Text style={[styles.small, { color: theme.muted }]}>Klasik, Kaos ve günlük modda ilerler. Ödüller otomatik eklenir.</Text>
          {MISSIONS.map((q) => {
            const done = missions.claimed.includes(q.id), value = Math.min(q.goal, missions[q.id]);
            return <View key={q.id} style={[styles.quest, card]}><View style={styles.sectionRow}><Text style={[styles.questTitle, { color: theme.text }]}>{done ? '✓ ' : '◇ '}{q.name}</Text><Text style={[styles.reward, { color: done ? theme.perfect : theme.target }]}>{done ? 'TAMAMLANDI' : `+${q.reward} XP`}</Text></View><Text style={[styles.small, { color: theme.muted }]}>{q.detail}</Text><Progress amount={value / q.goal} color={done ? theme.perfect : theme.target} track={theme.track} /><Text style={[styles.tiny, { color: theme.muted }]}>{value} / {q.goal}</Text></View>;
          })}
        </>}
        {tab === 'themes' && <>
          <Text style={[styles.section, { color: theme.text }]}>Sinyal koleksiyonu</Text>
          <Text style={[styles.small, { color: theme.muted }]}>İsabet yap, yeni renk evrenlerini aç. Seçimin anında uygulanır.</Text>
          {THEMES.map((t) => {
            const open = isUnlocked(t, profile.totalHits), selected = theme.id === t.id;
            return <Pressable key={t.id} onPress={() => onSelectTheme(t.id)} disabled={!open} accessibilityRole="button" accessibilityLabel={`${t.name} teması`} accessibilityState={{ selected, disabled: !open }} style={[styles.themeCard, { backgroundColor: t.surface, borderColor: selected ? t.target : alpha(t.ringLight, 0.35) }]}>
              <View style={[styles.miniDial, { borderColor: t.target, backgroundColor: t.background }]}><View style={[styles.miniDot, { backgroundColor: t.perfect }]} /></View>
              <View style={styles.fill}><Text style={[styles.questTitle, { color: t.text }]}>{t.name}</Text><Text style={[styles.small, { color: t.muted }]}>{selected ? 'Seçili' : open ? 'Koleksiyonda' : `${Math.min(profile.totalHits, t.unlockAt)} / ${t.unlockAt} isabet`}</Text></View>
              <Text style={[styles.symbol, { color: open ? t.target : t.muted }]}>{selected ? '✓' : open ? '↗' : '◇'}</Text>
            </Pressable>;
          })}
        </>}
        <Text style={[styles.footer, { color: theme.muted }]}>NABIZ 1.1 · ÇEVRİMDIŞI OYNA</Text>
      </ScrollView>
      {tab === 'play' && <View style={styles.start}><Button label="Ritmi başlat" detail={selectedMode === 'daily' ? `Bugünün rekoru: ${rollDaily(profile, now).daily.dayBest} • Seri ${visibleStreak(profile, now)}` : `${mode.name} • Rekor ${profile.modeBests[selectedMode]}`} onPress={() => onPlay(selectedMode)} theme={theme} variant="primary" disabled={selectedMode === 'daily' && attempts === 0} /></View>}
      <View style={[styles.tabs, { backgroundColor: theme.background, borderColor: alpha(theme.ringLight, 0.25) }]}>
        {([{ id: 'play', label: 'Oyna', icon: '◎' }, { id: 'missions', label: 'Görevler', icon: '✦' }, { id: 'themes', label: 'Koleksiyon', icon: '◇' }] as const).map((t) =>
          <Pressable key={t.id} onPress={() => setTab(t.id)} accessibilityRole="button" accessibilityLabel={t.label} accessibilityState={{ selected: tab === t.id }} style={styles.tab}><Text style={[styles.tabIcon, { color: tab === t.id ? theme.target : theme.muted }]}>{t.icon}</Text><Text style={[styles.tabLabel, { color: tab === t.id ? theme.text : theme.muted }]}>{t.label}</Text></Pressable>)}
      </View>
    </View>
  );
}
function Progress({ amount, color, track }: { amount: number; color: string; track: string }) { return <View style={[styles.progress, { backgroundColor: track }]}><View style={[styles.progressFill, { backgroundColor: color, width: `${Math.max(0, Math.min(100, amount * 100))}%` }]} /></View>; }
const styles = StyleSheet.create({
  fill: { flex: 1 }, content: { gap: 13, paddingTop: 6, paddingBottom: 18 },
  start: { paddingVertical: 10 },
  stats: { flexDirection: 'row', borderWidth: 1, borderRadius: 18, paddingVertical: 12 },
  stat: { flex: 1, alignItems: 'center' }, statValue: { fontFamily: fonts.bold, fontSize: 23, fontVariant: ['tabular-nums'] },
  caption: { fontFamily: fonts.medium, fontSize: 9, letterSpacing: 1.2, marginTop: 3 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  section: { fontFamily: fonts.bold, fontSize: 20, marginTop: 5 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  mode: { width: '48%', flexGrow: 1, padding: 13, borderRadius: 18, borderWidth: 1.5, gap: 5 },
  modeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, symbol: { fontSize: 25 },
  selectDot: { width: 6, height: 6, borderRadius: 3 }, modeName: { fontFamily: fonts.bold, fontSize: 16 },
  tiny: { fontFamily: fonts.medium, fontSize: 9, letterSpacing: 0.4 }, modeDetail: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 19, minHeight: 38 },
  small: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18 }, helpButton: { padding: 8, alignItems: 'center' },
  helpLabel: { fontFamily: fonts.medium, fontSize: 12 }, help: { padding: 17, borderWidth: 1, borderRadius: 18, gap: 12 },
  helpText: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 20 }, rank: { padding: 18, borderWidth: 1, borderRadius: 20, gap: 11 },
  rankTitle: { fontFamily: fonts.bold, fontSize: 24 }, progress: { height: 5, borderRadius: 3, overflow: 'hidden', marginVertical: 4 },
  progressFill: { height: 5, borderRadius: 3 }, quest: { borderWidth: 1, borderRadius: 18, padding: 18, gap: 8 },
  questTitle: { fontFamily: fonts.bold, fontSize: 16 }, reward: { fontFamily: fonts.bold, fontSize: 10 },
  themeCard: { padding: 17, flexDirection: 'row', alignItems: 'center', gap: 15, borderRadius: 20, borderWidth: 1.5 },
  miniDial: { width: 46, height: 46, borderRadius: 23, borderWidth: 4, justifyContent: 'center', alignItems: 'center' },
  miniDot: { width: 10, height: 10, borderRadius: 5 }, tabs: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 9, paddingBottom: 6 },
  tab: { flex: 1, alignItems: 'center', gap: 3 }, tabIcon: { fontSize: 23 }, tabLabel: { fontFamily: fonts.medium, fontSize: 11 },
  footer: { fontFamily: fonts.medium, fontSize: 8, letterSpacing: 2, textAlign: 'center', marginVertical: 10 },
});
