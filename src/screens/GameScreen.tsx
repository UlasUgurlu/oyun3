import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Backdrop } from '../components/Backdrop';
import { Brand } from '../components/Brand';
import { Button } from '../components/Button';
import { CalloutText } from '../components/CalloutText';
import { Dial } from '../components/Dial';
import { GameOverPanel } from '../components/GameOverPanel';
import { MenuPanel } from '../components/MenuPanel';
import { SettingsSheet } from '../components/SettingsSheet';
import { Feedback } from '../feedback/Feedback';
import { ANOMALIES, modeName, type GameMode } from '../game/modes';
import { applyRun, beginDailyAttempt, dailyAttemptsLeft, type RunReport, type RunSummary, type Settings } from '../game/progression';
import { getTheme, isUnlocked } from '../game/themes';
import { useNabizGame } from '../hooks/useNabizGame';
import { useProfile } from '../hooks/useProfile';
import { alpha } from '../ui/color';
import { fonts } from '../ui/typography';

export function GameScreen() {
  const insets = useSafeAreaInsets(), { width, height } = useWindowDimensions();
  const { profile, profileRef, ready, save, update, reset } = useProfile();
  const theme = getTheme(profile.themeId);
  const [feedback] = useState(() => new Feedback());
  const [report, setReport] = useState<RunReport | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GameMode>('classic');
  const [sessionStart] = useState(() => Date.now());
  const [suggestBreak, setSuggestBreak] = useState(false);
  const recordTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { void feedback.init(); return () => { feedback.dispose(); if (recordTimer.current) clearTimeout(recordTimer.current); }; }, [feedback]);
  useEffect(() => feedback.setSettings(profile.settings), [feedback, profile.settings]);
  const onRoundEnd = useCallback((summary: RunSummary) => {
    const result = applyRun(profileRef.current, summary, new Date());
    save(result.profile); setReport(result.report);
    setSuggestBreak(Date.now() - sessionStart > 20 * 60_000);
    if (result.report.isNewBest && summary.score > 0) recordTimer.current = setTimeout(() => feedback.record(), 400);
  }, [feedback, profileRef, save, sessionStart]);
  const game = useNabizGame({ feedback, screenShake: profile.settings.screenShake && !profile.settings.lowPower, onRoundEnd });
  const play = (mode: GameMode) => {
    if (mode === 'daily') {
      const next = beginDailyAttempt(profileRef.current, new Date());
      if (!next) return;
      save(next);
    }
    if (recordTimer.current) clearTimeout(recordTimer.current);
    setReport(null); setSelectedMode(mode); game.start(mode);
  };
  const attempts = dailyAttemptsLeft(profile, new Date());
  const canRetry = game.mode !== 'daily' || attempts > 0;
  const share = () => {
    if (!report) return;
    const s = report.summary;
    void Share.share({ message: report.daily?.shareText ?? `Nabız • ${modeName(s.mode)}\n${s.score} puan · ${s.perfects} mükemmel · Seri ×${s.bestCombo}\nRitmini bul. Sınırını aş.` }).catch(() => {});
  };
  const selectTheme = (id: string) => {
    if (!isUnlocked(getTheme(id), profile.totalHits)) return;
    feedback.tap(); update((p) => ({ ...p, themeId: id }));
  };
  const changeSettings = (settings: Settings) => update((p) => ({ ...p, settings }));
  const { phase, backToMenu } = game;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { if (phase === 'menu') return false; backToMenu(); return true; });
    return () => sub.remove();
  }, [phase, backToMenu]);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: game.visuals.shake.value }] }));
  if (!ready) return <View style={[styles.root, { backgroundColor: theme.background }]} />;
  const playing = phase === 'playing';
  const effects = profile.settings.motion && !profile.settings.lowPower;
  const dialSize = Math.max(220, Math.min(width - 40, height * 0.43, 370));
  const anomaly = ANOMALIES[game.hud.anomaly];
  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top + 6, paddingBottom: Math.max(8, insets.bottom) }]}>
      <StatusBar style={theme.statusBar} />
      <Backdrop theme={theme} />
      <View style={styles.header}>
        {phase === 'menu' ? <Text style={[styles.eyebrow, { color: theme.muted }]}>REFLEKS · RİTİM · ODAK</Text> : <Brand theme={theme} compact />}
        <Pressable onPress={playing ? game.pause : () => setSettingsOpen(true)} hitSlop={10} accessibilityRole="button" accessibilityLabel={playing ? 'Duraklat' : 'Ayarlar'} style={[styles.headerButton, { borderColor: alpha(theme.ringLight, 0.35), backgroundColor: alpha(theme.surface, 0.5) }]}><Text style={[styles.headerText, { color: theme.text }]}>{playing ? 'Ⅱ' : '⚙'}  {playing ? 'Duraklat' : 'Ayarlar'}</Text></Pressable>
      </View>
      {phase === 'menu' && <MenuPanel theme={theme} profile={profile} selectedMode={selectedMode} onSelectMode={setSelectedMode} onPlay={play} onSelectTheme={selectTheme} />}
      {playing && <>
        <View style={styles.hud}>
          <View><Text style={[styles.modeLabel, { color: theme.text }]}>{modeName(game.mode)}</Text><Text style={[styles.hudDetail, { color: theme.muted }]}>{game.hud.bpm} BPM · {game.hud.hits} isabet</Text></View>
          <Text style={[styles.life, { color: theme.target }]}>{game.mode === 'chaos' ? '♥'.repeat(game.hud.lives) + '♡'.repeat(3 - game.hud.lives) : game.mode === 'zen' ? '∞' : game.hud.shields ? '◇ Kalkan' : '◇ Son şans'}</Text>
        </View>
        <View style={[styles.rule, { backgroundColor: alpha(theme.surface, 0.8), borderColor: alpha(game.hud.anomaly === 'none' ? theme.ringLight : theme.target, 0.35) }]}><View style={[styles.signal, { backgroundColor: game.hud.anomaly === 'decoy' ? '#B291FF' : theme.target }]} /><View style={styles.flex}><Text style={[styles.ruleTitle, { color: theme.text }]}>{game.hud.focused ? 'Odak aktif' : game.mode === 'zen' ? 'Özgür ritim' : anomaly.name}</Text><Text style={[styles.hudDetail, { color: theme.muted }]}>{game.hud.focused ? 'Bu hedefte zaman daha yavaş akıyor.' : game.mode === 'zen' ? 'Kaçırsan da devam edersin. Acele etme.' : game.hud.anomaly === 'decoy' ? 'Mor, çizgili yay tuzak. Düz, renkli yayı yakala!' : anomaly.detail}</Text></View></View>
        <Pressable onPressIn={game.tap} disabled={game.paused} accessibilityRole="button" accessibilityLabel="Oyun alanı" accessibilityHint="İbre renkli yayın içindeyken dokun." style={styles.stage}>
          <Animated.View style={shakeStyle} pointerEvents="none">
            <Dial size={dialSize} theme={theme} target={game.arc.target} width={game.arc.width} decoy={game.arc.decoy} score={game.hud.score} combo={game.hud.combo} visuals={game.visuals} effects={effects} />
          </Animated.View>
          <CalloutText callout={game.callout} theme={theme} />
          <Text style={[styles.tapHint, { color: theme.muted }]}>YAYI YAKALA · BURAYA DOKUN</Text>
        </Pressable>
        <Pressable onPress={game.focus} disabled={game.hud.focus < 5 || game.paused} accessibilityRole="button" accessibilityLabel="Odak" accessibilityState={{ disabled: game.hud.focus < 5 }} style={[styles.focus, { borderColor: game.hud.focus === 5 ? theme.perfect : alpha(theme.ringLight, 0.35), backgroundColor: theme.surface }]}>
          <View><Text style={[styles.focusTitle, { color: game.hud.focus === 5 ? theme.perfect : theme.text }]}>✦ Odak {game.hud.focus === 5 ? 'hazır' : `${game.hud.focus}/5`}</Text><Text style={[styles.hudDetail, { color: theme.muted }]}>{game.hud.focus === 5 ? 'Dokun, ibreyi yavaşlat' : 'Mükemmel isabetlerle doldur'}</Text></View>
          <View style={styles.focusCells}>{[0, 1, 2, 3, 4].map((i) => <View key={i} style={[styles.cell, { backgroundColor: i < game.hud.focus ? theme.perfect : theme.track }]} />)}</View>
        </Pressable>
        {game.mode === 'zen' && <Button label="Antrenmanı bitir" onPress={game.finish} theme={theme} variant="quiet" />}
      </>}
      {phase === 'over' && report && <GameOverPanel theme={theme} report={report} canRetry={canRetry} suggestBreak={suggestBreak} onRetry={() => play(canRetry ? game.mode : 'classic')} onMenu={backToMenu} onShare={share} />}
      {playing && game.paused && <View style={[StyleSheet.absoluteFill, styles.pause, { backgroundColor: alpha(theme.background, 0.98) }]}><Text style={[styles.pauseSymbol, { color: theme.target }]}>Ⅱ</Text><Text style={[styles.pauseTitle, { color: theme.text }]}>Ritim bekleyebilir.</Text><Text style={[styles.pauseDetail, { color: theme.muted }]}>Hazır olduğunda kaldığın yerden devam et.</Text><View style={styles.pauseActions}><Button label="Devam et" onPress={game.resume} theme={theme} variant="primary" /><Button label="Menüye dön" onPress={backToMenu} theme={theme} /></View></View>}
      <SettingsSheet visible={settingsOpen} theme={theme} settings={profile.settings} onChange={changeSettings} onResetProgress={() => { reset(); setSettingsOpen(false); }} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}
const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 20 }, flex: { flex: 1 },
  header: { minHeight: 48, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  eyebrow: { fontFamily: fonts.medium, fontSize: 8, letterSpacing: 1.5 }, headerButton: { borderWidth: 1, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 12 },
  headerText: { fontFamily: fonts.medium, fontSize: 12 }, hud: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  modeLabel: { fontFamily: fonts.bold, fontSize: 22 }, hudDetail: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 16, marginTop: 3 },
  life: { fontFamily: fonts.bold, fontSize: 19, letterSpacing: 2 }, rule: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, padding: 14, borderRadius: 16 },
  signal: { width: 6, height: 28, borderRadius: 3 }, ruleTitle: { fontFamily: fonts.bold, fontSize: 13 },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 285 }, tapHint: { fontFamily: fonts.medium, fontSize: 8, letterSpacing: 1.8, marginTop: 4 },
  focus: { borderWidth: 1, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 10 },
  focusTitle: { fontFamily: fonts.bold, fontSize: 17 }, focusCells: { flexDirection: 'row', gap: 4 },
  cell: { width: 9, height: 24, borderRadius: 3 }, pause: { alignItems: 'center', justifyContent: 'center', padding: 28 },
  pauseSymbol: { fontSize: 48, marginBottom: 20 }, pauseTitle: { fontFamily: fonts.heavy, fontSize: 28, textAlign: 'center' },
  pauseDetail: { fontFamily: fonts.regular, fontSize: 13, textAlign: 'center', marginTop: 12, lineHeight: 20 },
  pauseActions: { width: '100%', gap: 12, marginTop: 32 },
});
