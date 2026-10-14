import { GAME, toDeg } from './constants';
import type { Rng } from './rng';

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

export function createRound(now: number, rng: Rng): Round {
  const dir: Direction = 1;
  return {
    anchorAngle: GAME.startAngle,
    anchorTime: now + GAME.startGraceMs,
    dir,
    speed: GAME.startSpeed,
    target: GAME.startAngle + dir * nextGap(rng),
    width: GAME.startWidth,
    score: 0,
    combo: 0,
    bestCombo: 0,
    hits: 0,
    perfects: 0,
    shields: GAME.shieldsPerRound,
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
function advance(r: Round, t: number, rng: Rng, escalate: boolean): Round {
  const angle = angleAt(r, t);
  const dir = (r.dir === 1 ? -1 : 1) as Direction;
  return {
    ...r,
    anchorAngle: angle,
    anchorTime: t,
    dir,
    target: angle + dir * nextGap(rng),
    speed: escalate ? Math.min(r.speed * GAME.speedMultiplier, GAME.maxSpeed) : r.speed,
    width: escalate ? Math.max(r.width * GAME.widthMultiplier, GAME.minWidth) : r.width,
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
    const points = perfect ? 1 + combo : 1;
    const next = advance(r, t, rng, true);
    return {
      round: {
        ...next,
        score: r.score + points,
        combo,
        bestCombo: Math.max(r.bestCombo, combo),
        hits: r.hits + 1,
        perfects: r.perfects + (perfect ? 1 : 0),
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
