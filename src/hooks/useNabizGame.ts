import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { cancelAnimation, Easing, ReduceMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming, type SharedValue } from 'react-native-reanimated';

import type { Feedback } from '../feedback/Feedback';
import { activateFocus, angleAt, bpmFor, createRound, decoyAngle, lateLimitTime, passThroughMiss, pauseRound, recoverMiss, resolveTap, resumeRound, type MissOutcome, type Round } from '../game/engine';
import { ANOMALIES, type Anomaly, type GameMode } from '../game/modes';
import type { RunSummary } from '../game/progression';
import { dailyRng, type Rng } from '../game/rng';

export type Phase = 'menu' | 'playing' | 'over';
export interface Hud { score: number; combo: number; shields: number; bpm: number; lives: number; focus: number; focused: boolean; hits: number; anomaly: Anomaly }
export interface Callout { id: number; text: string; tone: 'perfect' | 'graze' }
export interface GameVisuals { needle: SharedValue<number>; shake: SharedValue<number>; beat: SharedValue<number>; scorePulse: SharedValue<number> }
interface Options { feedback: Feedback; screenShake: boolean; onRoundEnd: (summary: RunSummary) => void }
const EMPTY_HUD: Hud = { score: 0, combo: 0, shields: 0, bpm: 60, lives: 1, focus: 0, focused: false, hits: 0, anomaly: 'none' };

/** One UI-thread timing animation per leg. JS wakes only on input or its deadline. */
export function useNabizGame({ feedback, screenShake, onRoundEnd }: Options) {
  const [phase, setPhase] = useState<Phase>('menu');
  const [mode, setMode] = useState<GameMode>('classic');
  const [paused, setPaused] = useState(false);
  const [hud, setHud] = useState<Hud>(EMPTY_HUD);
  const [arc, setArc] = useState<{ target: number; width: number; decoy: number | null }>({ target: 0, width: 0, decoy: null });
  const [callout, setCallout] = useState<Callout | null>(null);
  const phaseRef = useRef<Phase>('menu');
  const modeRef = useRef<GameMode>('classic');
  const roundRef = useRef<Round | null>(null);
  const rngRef = useRef<Rng>(Math.random);
  const pausedRef = useRef(false);
  const autoResume = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadlineHandler = useRef<(r: Round) => void>(() => {});
  const calloutId = useRef(0);
  const latest = useRef({ feedback, screenShake, onRoundEnd });
  useLayoutEffect(() => { latest.current = { feedback, screenShake, onRoundEnd }; }, [feedback, screenShake, onRoundEnd]);
  const needle = useSharedValue(-Math.PI / 2);
  const shake = useSharedValue(0);
  const beat = useSharedValue(1);
  const scorePulse = useSharedValue(1);

  const stop = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
    cancelAnimation(needle);
  }, [needle]);

  const arm = useCallback((r: Round) => {
    stop();
    const now = performance.now();
    const limit = lateLimitTime(r);
    const grace = Math.max(0, r.anchorTime - now);
    needle.value = angleAt(r, now);
    needle.value = withDelay(grace, withTiming(angleAt(r, limit), {
      duration: Math.max(1, limit - Math.max(now, r.anchorTime)), easing: Easing.linear,
      // Essential gameplay movement must not be skipped by reduced-motion settings.
      reduceMotion: ReduceMotion.Never,
    }), ReduceMotion.Never);
    timer.current = setTimeout(() => {
      if (roundRef.current === r && phaseRef.current === 'playing' && !pausedRef.current) deadlineHandler.current(r);
    }, Math.max(1, limit - now));
  }, [needle, stop]);

  const sync = (r: Round) => {
    setHud({ score: r.score, combo: r.combo, shields: r.shields, bpm: bpmFor(r.score), lives: r.lives, focus: r.focus, focused: r.focused, hits: r.hits, anomaly: r.anomaly });
    setArc({ target: r.target, width: r.width, decoy: decoyAngle(r) });
  };
  const transition = (p: Phase) => { phaseRef.current = p; setPhase(p); };
  const announce = (text: string, tone: Callout['tone'] = 'perfect') => setCallout({ id: ++calloutId.current, text, tone });
  const doShake = useCallback((strength: number) => {
    if (!latest.current.screenShake) return;
    shake.value = withSequence(withTiming(strength, { duration: 35 }), withTiming(-strength * 0.5, { duration: 45 }), withTiming(0, { duration: 70 }));
  }, [shake]);

  const end = useCallback((outcome: MissOutcome, endReason: RunSummary['endReason'] = 'miss') => {
    const r = roundRef.current;
    if (!r || phaseRef.current !== 'playing') return;
    stop();
    needle.value = angleAt(r, performance.now());
    transition('over');
    pausedRef.current = false;
    setPaused(false);
    if (endReason === 'miss') { latest.current.feedback.fail(); doShake(7); }
    latest.current.feedback.setMusicMode('menu');
    latest.current.feedback.setActive(true);
    latest.current.onRoundEnd({ mode: modeRef.current, score: r.score, hits: r.hits, perfects: r.perfects, bestCombo: r.bestCombo, offDeg: outcome.offDeg, timing: outcome.timing, endReason });
  }, [stop, needle, doShake]);

  const miss = useCallback((r: Round, outcome: MissOutcome) => {
    const recovered = recoverMiss(r, performance.now(), rngRef.current);
    if (!recovered) { end(outcome); return; }
    roundRef.current = recovered;
    sync(recovered);
    arm(recovered);
    if (r.mode === 'chaos') { latest.current.feedback.graze(); doShake(5); announce(`${recovered.lives} can kaldı`, 'graze'); }
    else announce('Devam. Ritmini bul.', 'graze');
  }, [end, arm, doShake]);

  useLayoutEffect(() => {
    deadlineHandler.current = (r) => {
      if (performance.now() < lateLimitTime(r)) { arm(r); return; }
      miss(r, passThroughMiss());
    };
  }, [arm, miss]);

  const start = useCallback((nextMode: GameMode) => {
    stop();
    rngRef.current = nextMode === 'daily' ? dailyRng(new Date()) : Math.random;
    const r = createRound(performance.now(), rngRef.current, nextMode);
    roundRef.current = r;
    modeRef.current = nextMode;
    pausedRef.current = false;
    autoResume.current = false;
    setPaused(false);
    shake.value = 0; beat.value = 1; scorePulse.value = 1;
    setMode(nextMode); setCallout(null); sync(r); transition('playing');
    latest.current.feedback.setActive(true); latest.current.feedback.start(); latest.current.feedback.setMusicMode('play');
    arm(r);
  }, [stop, shake, beat, scorePulse, arm]);

  const backToMenu = useCallback(() => {
    stop(); pausedRef.current = false; setPaused(false); transition('menu');
    latest.current.feedback.setMusicMode('menu');
    latest.current.feedback.setActive(true);
  }, [stop]);

  const tap = useCallback(() => {
    if (phaseRef.current !== 'playing' || pausedRef.current || !roundRef.current) return;
    const r = roundRef.current;
    const { round, outcome } = resolveTap(r, performance.now(), rngRef.current);
    if (outcome.kind === 'ignored') return;
    if (outcome.kind === 'miss') { miss(r, outcome); return; }
    roundRef.current = round; sync(round); arm(round);
    if (outcome.kind === 'graze') { latest.current.feedback.graze(); announce('Kalkan seni kurtardı', 'graze'); return; }
    latest.current.feedback.hit(outcome.perfect, outcome.combo);
    beat.value = 0; beat.value = withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) });
    scorePulse.value = withSequence(withTiming(outcome.perfect ? 1.1 : 1.04, { duration: 65 }), withSpring(1, { damping: 16, stiffness: 240 }));
    if (round.anomaly !== r.anomaly) announce(ANOMALIES[round.anomaly].name);
    else if (round.focus === 5 && r.focus < 5) announce('Odak hazır!');
    else if (outcome.perfect) announce(outcome.combo > 1 ? `Mükemmel ×${outcome.combo}` : 'Mükemmel');
    else announce(`İsabet +${outcome.points}`);
    if (outcome.perfect) doShake(2);
  }, [miss, arm, beat, scorePulse, doShake]);

  const focus = useCallback(() => {
    if (phaseRef.current !== 'playing' || pausedRef.current || !roundRef.current) return;
    const next = activateFocus(roundRef.current, performance.now());
    if (!next) return;
    roundRef.current = next; sync(next); arm(next);
    latest.current.feedback.tap(); announce('Odak • Zaman yavaşladı');
  }, [arm]);

  const pause = useCallback(() => {
    if (phaseRef.current !== 'playing' || pausedRef.current || !roundRef.current) return;
    stop();
    roundRef.current = pauseRound(roundRef.current, performance.now());
    needle.value = roundRef.current.anchorAngle;
    pausedRef.current = true; setPaused(true);
    latest.current.feedback.setActive(false);
  }, [stop, needle]);
  const resume = useCallback(() => {
    if (!pausedRef.current || !roundRef.current || phaseRef.current !== 'playing') return;
    const r = resumeRound(roundRef.current, performance.now());
    roundRef.current = r; pausedRef.current = false; setPaused(false);
    latest.current.feedback.setActive(true); arm(r);
  }, [arm]);
  const finish = useCallback(() => end({ kind: 'miss', offDeg: 0, timing: 'late' }, 'finished'), [end]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') { autoResume.current = phaseRef.current === 'playing' && !pausedRef.current; pause(); latest.current.feedback.setActive(false); }
      else { latest.current.feedback.setActive(!pausedRef.current || autoResume.current); if (autoResume.current) resume(); autoResume.current = false; }
    });
    return () => sub.remove();
  }, [pause, resume]);
  useEffect(() => () => stop(), [stop]);

  return { phase, mode, paused, hud, arc, callout, visuals: { needle, shake, beat, scorePulse }, start, tap, focus, pause, resume, finish, backToMenu };
}
