import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  Easing,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import type { Feedback } from '../feedback/Feedback';
import {
  angleAt,
  bpmFor,
  createRound,
  lateLimitTime,
  passThroughMiss,
  pauseRound,
  resolveTap,
  resumeRound,
  type MissOutcome,
  type Round,
} from '../game/engine';
import type { GameMode, RunSummary } from '../game/progression';
import { dailyRng, type Rng } from '../game/rng';

export type Phase = 'menu' | 'playing' | 'over';

export interface Hud {
  score: number;
  combo: number;
  shields: number;
  bpm: number;
}

export interface Callout {
  id: number;
  text: string;
  tone: 'perfect' | 'graze';
}

export interface GameVisuals {
  /** İğnenin açısı (radyan). */
  needle: SharedValue<number>;
  /** İğnenin dönüş yönü: 1 saat yönü, -1 tersi. İz efekti için. */
  dir: SharedValue<number>;
  shake: SharedValue<number>;
  /** Hedef yayın parlaması (0..1). */
  flash: SharedValue<number>;
  /** İsabetle başlayan kalp atışı dalgası (0 → 1). */
  beat: SharedValue<number>;
  scorePulse: SharedValue<number>;
  /** Parçacık patlamasının ilerleyişi (0 → 1), çıktığı açı ve rengi (1 = mükemmel). */
  burst: SharedValue<number>;
  burstAngle: SharedValue<number>;
  burstPerfect: SharedValue<number>;
  /** Art arda mükemmellerde yükselen "ateş modu" (0..1). */
  fever: SharedValue<number>;
  /** Kaybedince sahneyi kızartan şok (1 → 0). */
  shock: SharedValue<number>;
}

interface Options {
  feedback: Feedback;
  screenShake: boolean;
  onRoundEnd: (summary: RunSummary) => void;
}

const EMPTY_HUD: Hud = { score: 0, combo: 0, shields: 0, bpm: bpmFor(0) };

/**
 * Oyun durumu React state'inde değil ref'te durur; saniyede 60 render olmaz.
 * Her karede yalnızca `needle` paylaşımlı değeri güncellenir ve Reanimated
 * bunu UI iş parçacığında çizer. React state sadece skor gibi seyrek değişen
 * HUD bilgisi içindir.
 */
export function useNabizGame({ feedback, screenShake, onRoundEnd }: Options) {
  const [phase, setPhase] = useState<Phase>('menu');
  const [mode, setMode] = useState<GameMode>('classic');
  const [hud, setHud] = useState<Hud>(EMPTY_HUD);
  const [arc, setArc] = useState({ target: 0, width: 0 });
  const [callout, setCallout] = useState<Callout | null>(null);

  const phaseRef = useRef<Phase>('menu');
  const modeRef = useRef<GameMode>('classic');
  const roundRef = useRef<Round | null>(null);
  const rngRef = useRef<Rng>(Math.random);
  const pausedRef = useRef(false);
  const calloutId = useRef(0);

  // En güncel değerleri döngü kapanışlarına taşımak için.
  const latest = useRef({ feedback, screenShake, onRoundEnd });
  useLayoutEffect(() => {
    latest.current = { feedback, screenShake, onRoundEnd };
  }, [feedback, screenShake, onRoundEnd]);

  const needle = useSharedValue(-Math.PI / 2);
  const shake = useSharedValue(0);
  const flash = useSharedValue(0);
  const beat = useSharedValue(1);
  const scorePulse = useSharedValue(1);
  const dir = useSharedValue(1);
  const burst = useSharedValue(1);
  const burstAngle = useSharedValue(0);
  const burstPerfect = useSharedValue(0);
  const fever = useSharedValue(0);
  const shock = useSharedValue(0);

  const setPhaseSafe = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const syncView = (r: Round) => {
    setHud({ score: r.score, combo: r.combo, shields: r.shields, bpm: bpmFor(r.score) });
    setArc({ target: r.target, width: r.width });
  };

  const doShake = useCallback((strength: number) => {
    if (!latest.current.screenShake) return;
    shake.value = withSequence(
      withTiming(strength, { duration: 35 }),
      withTiming(-strength * 0.7, { duration: 45 }),
      withTiming(strength * 0.35, { duration: 45 }),
      withTiming(0, { duration: 60 }),
    );
  }, [shake]);

  const setFever = useCallback((combo: number) => {
    const level = combo >= 5 ? 1 : combo >= 3 ? 0.6 : 0;
    fever.value = withTiming(level, { duration: level > fever.value ? 250 : 600 });
  }, [fever]);

  const emitBurst = useCallback((angle: number, perfect: boolean) => {
    burstAngle.value = angle;
    burstPerfect.value = perfect ? 1 : 0;
    burst.value = 0;
    burst.value = withTiming(1, { duration: perfect ? 850 : 600, easing: Easing.out(Easing.quad) });
  }, [burst, burstAngle, burstPerfect]);

  const pulse = useCallback((perfect: boolean) => {
    flash.value = perfect ? 1 : 0.45;
    flash.value = withTiming(0, { duration: perfect ? 420 : 260 });
    beat.value = 0;
    beat.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });
    scorePulse.value = withSequence(
      withTiming(perfect ? 1.22 : 1.1, { duration: 70 }),
      withSpring(1, { damping: 12, stiffness: 260 }),
    );
  }, [flash, beat, scorePulse]);

  const showCallout = (text: string, tone: Callout['tone']) => {
    calloutId.current += 1;
    setCallout({ id: calloutId.current, text, tone });
  };

  const endRound = useCallback((outcome: MissOutcome) => {
    const r = roundRef.current;
    if (!r || phaseRef.current !== 'playing') return;
    setPhaseSafe('over');
    latest.current.feedback.fail();
    latest.current.feedback.setMusicMode('menu');
    doShake(16);
    fever.value = withTiming(0, { duration: 400 });
    shock.value = 1;
    shock.value = withTiming(0, { duration: 900, easing: Easing.out(Easing.cubic) });
    latest.current.onRoundEnd({
      mode: modeRef.current,
      score: r.score,
      hits: r.hits,
      perfects: r.perfects,
      bestCombo: r.bestCombo,
      offDeg: outcome.offDeg,
      timing: outcome.timing,
    });
  }, [doShake, fever, shock]);

  const start = useCallback((nextMode: GameMode) => {
    const now = performance.now();
    rngRef.current = nextMode === 'daily' ? dailyRng(new Date()) : Math.random;
    const r = createRound(now, rngRef.current);
    roundRef.current = r;
    modeRef.current = nextMode;
    pausedRef.current = false;
    needle.value = r.anchorAngle;
    dir.value = r.dir;
    shake.value = 0;
    fever.value = 0;
    shock.value = 0;
    latest.current.feedback.start();
    latest.current.feedback.setMusicMode('play');
    setMode(nextMode);
    setCallout(null);
    syncView(r);
    setPhaseSafe('playing');
  }, [needle, dir, shake, fever, shock]);

  const backToMenu = useCallback(() => {
    latest.current.feedback.setMusicMode('menu');
    setPhaseSafe('menu');
  }, []);

  /** Dokunma, ekranın dokunulduğu anın zamanıyla değerlendirilir. */
  const tap = useCallback(() => {
    if (phaseRef.current !== 'playing' || pausedRef.current) return;
    const r = roundRef.current;
    if (!r) return;
    const now = performance.now();
    const { round, outcome } = resolveTap(r, now, rngRef.current);

    switch (outcome.kind) {
      case 'ignored':
        return;
      case 'miss':
        endRound(outcome);
        return;
      case 'hit':
        roundRef.current = round;
        needle.value = angleAt(round, now);
        dir.value = round.dir;
        syncView(round);
        pulse(outcome.perfect);
        emitBurst(needle.value, outcome.perfect);
        setFever(outcome.combo);
        latest.current.feedback.hit(outcome.perfect, outcome.combo);
        if (outcome.perfect) {
          showCallout(outcome.combo > 1 ? `Mükemmel ×${outcome.combo}` : 'Mükemmel', 'perfect');
          doShake(outcome.combo >= 3 ? 6 : 3);
        }
        return;
      case 'graze':
        roundRef.current = round;
        needle.value = angleAt(round, now);
        dir.value = round.dir;
        syncView(round);
        setFever(0);
        latest.current.feedback.graze();
        showCallout(`Sıyırdın, kalkan seni kurtardı (${outcome.offDeg.toFixed(1)}°)`, 'graze');
        doShake(5);
        return;
    }
  }, [endRound, needle, dir, pulse, emitBurst, setFever, doShake]);

  // Oyun döngüsü: yalnızca oynarken çalışır.
  useEffect(() => {
    if (phase !== 'playing') return;
    let frame = 0;
    const loop = () => {
      const r = roundRef.current;
      if (r && !pausedRef.current) {
        const now = performance.now();
        if (now >= lateLimitTime(r)) {
          endRound(passThroughMiss());
          return;
        }
        needle.value = angleAt(r, now);
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [phase, endRound, needle]);

  // Uygulama arka plana geçerse tur donar, dönünce kısa beklemeyle devam eder.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const r = roundRef.current;
      latest.current.feedback.setActive(state === 'active');
      if (phaseRef.current !== 'playing' || !r) return;
      const now = performance.now();
      if (state === 'active' && pausedRef.current) {
        roundRef.current = resumeRound(r, now);
        pausedRef.current = false;
      } else if (state !== 'active' && !pausedRef.current) {
        roundRef.current = pauseRound(r, now);
        pausedRef.current = true;
      }
    });
    return () => sub.remove();
  }, []);

  const visuals: GameVisuals = {
    needle, dir, shake, flash, beat, scorePulse, burst, burstAngle, burstPerfect, fever, shock,
  };

  return { phase, mode, hud, arc, callout, visuals, start, tap, backToMenu };
}
