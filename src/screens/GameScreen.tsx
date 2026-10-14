import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Backdrop } from '../components/Backdrop';
import { CalloutText } from '../components/CalloutText';
import { ExtrudedText } from '../components/ExtrudedText';
import { Dial } from '../components/Dial';
import { GameOverPanel } from '../components/GameOverPanel';
import { MenuPanel } from '../components/MenuPanel';
import { SettingsSheet } from '../components/SettingsSheet';
import { Feedback } from '../feedback/Feedback';
import { GAME } from '../game/constants';
import {
  applyRun,
  beginDailyAttempt,
  dailyAttemptsLeft,
  rollDaily,
  visibleStreak,
  type RunReport,
  type RunSummary,
  type Settings,
} from '../game/progression';
import { dayNumber } from '../game/rng';
import { getTheme, isUnlocked } from '../game/themes';
import { useNabizGame } from '../hooks/useNabizGame';
import { useProfile } from '../hooks/useProfile';
import { fonts, type } from '../ui/typography';

export function GameScreen() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { profile, profileRef, ready, save, update, reset } = useProfile();
  const theme = getTheme(profile.themeId);

  const [feedback] = useState(() => new Feedback());
  const [report, setReport] = useState<RunReport | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [suggestBreak, setSuggestBreak] = useState(false);
  const [sessionStart] = useState(() => Date.now());
  const breakOffered = useRef(false);

  useEffect(() => {
    feedback.init();
    return () => feedback.dispose();
  }, [feedback]);

  useEffect(() => feedback.setSettings(profile.settings), [feedback, profile.settings]);

  const onRoundEnd = useCallback(
    (summary: RunSummary) => {
      const result = applyRun(profileRef.current, summary, new Date());
      save(result.profile);
      setReport(result.report);
      if ((result.report.isNewBest && summary.score > 0) || result.report.unlockedThemes.length > 0) {
        setTimeout(() => feedback.record(), 650);
      }
      const minutes = (Date.now() - sessionStart) / 60_000;
      const offer = !breakOffered.current && minutes >= GAME.breakAfterMinutes;
      if (offer) breakOffered.current = true;
      setSuggestBreak(offer);
    },
    [feedback, profileRef, save, sessionStart],
  );

  const game = useNabizGame({ feedback, screenShake: profile.settings.screenShake, onRoundEnd });

  const playClassic = useCallback(() => {
    feedback.tap();
    setReport(null);
    game.start('classic');
  }, [feedback, game]);

  const playDaily = useCallback(() => {
    const next = beginDailyAttempt(profileRef.current, new Date());
    if (!next) return;
    feedback.tap();
    save(next);
    setReport(null);
    game.start('daily');
  }, [feedback, game, profileRef, save]);

  const now = new Date();
  const attemptsLeft = dailyAttemptsLeft(profile, now);
  const canRetry = game.mode === 'classic' || attemptsLeft > 0;

  const retry = () => {
    if (game.mode === 'daily' && attemptsLeft > 0) playDaily();
    else playClassic();
  };

  const share = useCallback(() => {
    if (report?.daily) Share.share({ message: report.daily.shareText }).catch(() => {});
  }, [report]);

  const goMenu = useCallback(() => {
    feedback.tap();
    game.backToMenu();
  }, [feedback, game]);

  // Android geri tuşu oyundan menüye döner.
  const { phase, backToMenu } = game;
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (phase === 'menu') return false;
      backToMenu();
      return true;
    });
    return () => sub.remove();
  }, [phase, backToMenu]);

  const selectTheme = (id: string) => {
    if (!isUnlocked(getTheme(id), profile.totalHits)) return;
    feedback.tap();
    update((p) => ({ ...p, themeId: id }));
  };

  const changeSettings = (settings: Settings) => update((p) => ({ ...p, settings }));

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: game.visuals.shake.value }] }));

  if (!ready) return <View style={[styles.fill, { backgroundColor: theme.background }]} />;

  const playing = game.phase === 'playing';
  const dialSize = Math.min(width - 72, height * 0.42, 380);
  const daily = rollDaily(profile, now).daily;
  const firstGames = profile.gamesPlayed < 3 && game.hud.score === 0;

  return (
    <View
      style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 18 }]}
      onTouchStart={playing ? game.tap : undefined}
      accessible={playing}
      accessibilityLabel={playing ? 'Oyun alanı. İğne renkli yayın içindeyken dokun.' : undefined}
    >
      <StatusBar style={theme.statusBar} />
      <Backdrop width={width} height={height} theme={theme} visuals={game.visuals} motion={profile.settings.motion} />

      <View style={styles.header}>
        {playing ? (
          <>
            <Text style={[styles.headerText, { color: theme.muted }]}>
              {game.mode === 'daily' ? `Günün Nabzı #${dayNumber(now)}` : `♥ ${game.hud.bpm} bpm`}
            </Text>
            <Text style={[styles.headerText, { color: game.hud.shields > 0 ? theme.text : theme.muted }]}>
              {game.hud.shields > 0 ? '🛡️ Kalkan hazır' : 'Kalkan yok'}
            </Text>
          </>
        ) : (
          <>
            <View accessibilityRole="header" accessibilityLabel="Nabız">
              <ExtrudedText color={theme.text} sideColor={theme.ledge} glowColor={theme.target} depth={4} style={styles.brand}>
                Nabız
              </ExtrudedText>
            </View>
            <Pressable onPress={() => setSettingsOpen(true)} hitSlop={12} accessibilityRole="button">
              <Text style={[styles.headerText, { color: theme.muted }]}>Ayarlar</Text>
            </Pressable>
          </>
        )}
      </View>

      <Animated.View style={[styles.stage, shakeStyle]}>
        <Dial
          size={dialSize}
          theme={theme}
          target={game.arc.target}
          width={game.arc.width}
          showTarget={game.phase !== 'menu'}
          score={game.phase === 'menu' ? profile.best : game.hud.score}
          visuals={game.visuals}
          motion={profile.settings.motion}
        />
        <CalloutText callout={playing ? game.callout : null} theme={theme} />
      </Animated.View>

      <View style={styles.bottom}>
        {game.phase === 'menu' && (
          <MenuPanel
            theme={theme}
            best={profile.best}
            totalHits={profile.totalHits}
            streak={visibleStreak(profile, now)}
            dayNumber={dayNumber(now)}
            dailyAttemptsLeft={attemptsLeft}
            dailyBest={daily.dayBest}
            onPlay={playClassic}
            onDaily={playDaily}
            onSelectTheme={selectTheme}
          />
        )}

        {playing && (
          <Animated.Text entering={FadeIn} style={[styles.hint, { color: theme.muted }]}>
            {firstGames
              ? 'İğne renkli yayın içindeyken ekranın herhangi bir yerine dokun. Tam ortası mükemmel sayılır.'
              : `En iyi ${profile.best}`}
          </Animated.Text>
        )}

        {game.phase === 'over' && report && (
          <GameOverPanel
            theme={theme}
            report={report}
            canRetry={canRetry}
            suggestBreak={suggestBreak}
            onRetry={retry}
            onShare={share}
            onMenu={goMenu}
          />
        )}
      </View>

      <SettingsSheet
        visible={settingsOpen}
        theme={theme}
        settings={profile.settings}
        onChange={changeSettings}
        onResetProgress={() => {
          reset();
          setSettingsOpen(false);
        }}
        onClose={() => setSettingsOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  root: { flex: 1, paddingHorizontal: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  brand: { fontFamily: fonts.heavy, fontSize: type.headline + 6, letterSpacing: -0.5 },
  headerText: { fontFamily: fonts.medium, fontSize: type.body },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  bottom: { minHeight: 120, justifyContent: 'flex-end' },
  hint: { fontFamily: fonts.regular, fontSize: type.body, textAlign: 'center', lineHeight: 22 },
});
