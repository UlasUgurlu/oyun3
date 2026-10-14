import { GAME, toDeg } from './constants';
import type { Rng } from './rng';
import { anomalyFor, type Anomaly, type GameMode } from './modes';

/**
 * Nabız oyun motoru: React'ten bağımsız, saf fonksiyonlar.
 *
 * Tasarım kararı: İğnenin açısı kare kare toplanmaz, zamanın doğrusal bir
 * fonksiyonu olarak hesaplanır: açı(t) = çapaAçısı + yön * hız * (t - çapaZamanı).
 * Böylece kare düşse bile dokunuşun değerlendirilmesi milisaniye hassasiyetinde
 * doğru kalır ve 60/90/120 Hz ekranlarda oyun aynı hızda çalışır.
 *
 * Açılar "sarılmamış" tutulur (2π'ye göre modlanmaz). Hedef her zaman iğnenin
 * gittiği yönde ve bir turdan az ileride kurulduğu için sarma hatası olamaz.
 */

export type Direction = 1 | -1;

export interface Round {
  mode: GameMode;
  anomaly: Anomaly;
  baseSpeed: number;
  baseWidth: number;
  lives: number;
  focus: number;
  focused: boolean;
  decoyTarget: number | null;
  anchorAngle: number;
  anchorTime: number;
  dir: Direction;
  speed: number;
  target: number;
  width: number;
  score: number;
  combo: number;
  bestCombo: number;
  hits: number;
  perfects: number;
  shields: number;
}

export type MissTiming = 'early' | 'late';

export type TapOutcome =
  | { kind: 'ignored' }
  | { kind: 'hit'; perfect: boolean; points: number; combo: number }
  | { kind: 'graze'; offDeg: number }
  | { kind: 'miss'; offDeg: number; timing: MissTiming };

export type MissOutcome = Extract<TapOutcome, { kind: 'miss' }>;

const nextGap = (rng: Rng) => GAME.minGap + rng() * GAME.gapRange;

export function createRound(now: number, rng: Rng, mode: GameMode = 'classic'): Round {
  const dir: Direction = 1;
  const speed = mode === 'zen' ? 1.55 : GAME.startSpeed;
  const width = mode === 'zen' ? 0.85 : GAME.startWidth;
  return {
    mode, anomaly: 'none', baseSpeed: speed, baseWidth: width,
    lives: mode === 'chaos' ? 3 : 1, focus: 0, focused: false, decoyTarget: null,
    anchorAngle: GAME.startAngle,
    anchorTime: now + GAME.startGraceMs,
    dir,
    speed,
    target: GAME.startAngle + dir * nextGap(rng),
    width,
    score: 0,
    combo: 0,
    bestCombo: 0,
    hits: 0,
    perfects: 0,
    shields: mode === 'zen' || mode === 'chaos' ? 0 : GAME.shieldsPerRound,
  };
}

/** t anındaki iğne açısı. Çapa zamanından önce iğne bekler. */
export function angleAt(r: Round, t: number): number {
  const elapsed = Math.max(0, t - r.anchorTime) / 1000;
  return r.anchorAngle + r.dir * r.speed * elapsed;
}

/** İğnenin yay merkezine göre yönlü uzaklığı: < 0 henüz gelmedi, > 0 geçti. */
export function signedOffset(r: Round, t: number): number {
  return (angleAt(r, t) - r.target) * r.dir;
}

/** İğnenin kıl payı bölgesini de geçip turu kaybettireceği an. */
export function lateLimitTime(r: Round): number {
  const travel = (r.target - r.anchorAngle) * r.dir + r.width / 2 + GAME.graze;
  return r.anchorTime + (travel / r.speed) * 1000;
}

/** Yön değiştirir ve yeni hedefi kurar. Puanlı isabette oyun da hızlanır. */
function advance(r: Round, t: number, rng: Rng, escalate: boolean, hits = r.hits): Round {
  const angle = angleAt(r, t);
  const dir = (r.anomaly === 'mirror' ? r.dir : -r.dir) as Direction;
  const baseSpeed = escalate && r.mode !== 'zen' ? Math.min(r.baseSpeed * GAME.speedMultiplier, GAME.maxSpeed) : r.baseSpeed;
  const baseWidth = escalate && r.mode !== 'zen' ? Math.max(r.baseWidth * GAME.widthMultiplier, GAME.minWidth) : r.baseWidth;
  const anomaly = r.mode === 'chaos' ? anomalyFor(hits) : 'none';
  const gap = nextGap(rng);
  return {
    ...r,
    anchorAngle: angle,
    anchorTime: t,
    dir,
    target: angle + dir * gap,
    decoyTarget: anomaly === 'decoy' ? angle + dir * gap * 0.45 : null,
    baseSpeed, baseWidth, anomaly, focused: false,
    speed: Math.min(baseSpeed * (anomaly === 'surge' ? 1.25 : 1), GAME.maxSpeed),
    width: anomaly === 'wide' ? Math.min(baseWidth * 1.65, 0.95) : baseWidth,
  };
}

export function resolveTap(r: Round, t: number, rng: Rng): { round: Round; outcome: TapOutcome } {
  if (t < r.anchorTime) return { round: r, outcome: { kind: 'ignored' } };

  const offset = signedOffset(r, t);
  const distance = Math.abs(offset);
  const half = r.width / 2;

  if (distance <= half) {
    const perfect = distance <= half * GAME.perfectRatio;
    const combo = perfect ? r.combo + 1 : 0;
    const points = (perfect ? 1 + combo : 1) * (r.anomaly === 'surge' ? 2 : 1);
    const next = advance(r, t, rng, true, r.hits + 1);
    return {
      round: {
        ...next,
        score: r.score + points,
        combo,
        bestCombo: Math.max(r.bestCombo, combo),
        hits: r.hits + 1,
        perfects: r.perfects + (perfect ? 1 : 0),
        focus: Math.min(5, r.focus + (perfect ? 1 : 0)),
      },
      outcome: { kind: 'hit', perfect, points, combo },
    };
  }

  // Kıl payı: kalkan varsa tur kurtulur ama puan ve hızlanma yok.
  if (distance <= half + GAME.graze && r.shields > 0) {
    const next = advance(r, t, rng, false);
    return {
      round: { ...next, shields: r.shields - 1, combo: 0 },
      outcome: { kind: 'graze', offDeg: toDeg(distance - half) },
    };
  }

  return {
    round: r,
    outcome: { kind: 'miss', offDeg: toDeg(distance - half), timing: offset < 0 ? 'early' : 'late' },
  };
}

/** A miss costs one Kaos life; practice continues without penalizing records. */
export function recoverMiss(r: Round, t: number, rng: Rng): Round | null {
  if (r.mode !== 'zen' && (r.mode !== 'chaos' || r.lives <= 1)) return null;
  const next = advance(r, t, rng, false);
  return { ...next, lives: r.mode === 'zen' ? r.lives : r.lives - 1, combo: 0, anchorTime: t + GAME.startGraceMs };
}

/** Slow only the current leg; its clock is re-anchored to prevent a jump. */
export function activateFocus(r: Round, t: number): Round | null {
  if (r.focus < 5 || r.focused || t < r.anchorTime || t >= lateLimitTime(r)) return null;
  return { ...r, anchorAngle: angleAt(r, t), anchorTime: t, speed: r.speed * 0.48, focus: 0, focused: true };
}

export function decoyAngle(r: Round): number | null {
  return r.decoyTarget;
}

/** Hiç dokunmadan hedefi kaçırınca oluşan sonuç. */
export function passThroughMiss(): MissOutcome {
  return { kind: 'miss', offDeg: toDeg(GAME.graze), timing: 'late' };
}

/** Uygulama arka plana geçince iğneyi olduğu yerde dondurur. */
export function pauseRound(r: Round, t: number): Round {
  if (t < r.anchorTime) return r;
  return { ...r, anchorAngle: angleAt(r, t), anchorTime: t };
}

/** Geri dönüşte kısa bir bekleme ile devam ettirir. */
export function resumeRound(r: Round, t: number): Round {
  return { ...r, anchorTime: Math.max(r.anchorTime, t + GAME.resumeGraceMs) };
}

export function bpmFor(score: number): number {
  return Math.round(GAME.baseBpm + Math.min(score * GAME.bpmPerPoint, GAME.maxBpmBonus));
}
