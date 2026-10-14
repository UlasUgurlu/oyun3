import { GAME } from '../constants';
import {
  angleAt,
  createRound,
  lateLimitTime,
  pauseRound,
  resolveTap,
  resumeRound,
  type Round,
} from '../engine';
import { DEFAULT_PROFILE, applyRun, beginDailyAttempt, sanitizeProfile, visibleStreak, type RunSummary } from '../progression';
import { dailyRng, dayKey } from '../rng';

const fixed = (v: number) => () => v;
const T0 = 10_000;

/** İğnenin hedef merkezden `offset` radyan uzakta olacağı an. */
function timeAtOffset(r: Round, offset: number) {
  const travel = (r.target - r.anchorAngle) * r.dir + offset;
  return r.anchorTime + (travel / r.speed) * 1000;
}

describe('engine', () => {
  it('waits during the start grace period', () => {
    const r = createRound(T0, fixed(0.5));
    expect(angleAt(r, T0)).toBe(GAME.startAngle);
    expect(resolveTap(r, T0 + 10, fixed(0.5)).outcome.kind).toBe('ignored');
  });

  it('scores a perfect hit at the arc center and escalates difficulty', () => {
    const r = createRound(T0, fixed(0.5));
    const { round, outcome } = resolveTap(r, timeAtOffset(r, 0), fixed(0.5));
    expect(outcome).toEqual({ kind: 'hit', perfect: true, points: 2, combo: 1 });
    expect(round.dir).toBe(-1);
    expect(round.speed).toBeCloseTo(GAME.startSpeed * GAME.speedMultiplier);
    expect(round.width).toBeCloseTo(GAME.startWidth * GAME.widthMultiplier);
    expect(round.score).toBe(2);
  });

  it('gives one point and resets combo on a non-perfect hit', () => {
    const r = createRound(T0, fixed(0.5));
    const { round, outcome } = resolveTap(r, timeAtOffset(r, -r.width / 2 + 0.01), fixed(0.5));
    expect(outcome).toMatchObject({ kind: 'hit', perfect: false, points: 1, combo: 0 });
    expect(round.combo).toBe(0);
  });

  it('places the next target ahead of the needle in the new direction', () => {
    const r = createRound(T0, fixed(0.5));
    const t = timeAtOffset(r, 0);
    const { round } = resolveTap(r, t, fixed(0.5));
    expect((round.target - angleAt(round, t)) * round.dir).toBeGreaterThan(0);
  });

  it('uses the shield for a near miss, then ends the round on the next one', () => {
    const r = createRound(T0, fixed(0.5));
    const near = r.width / 2 + GAME.graze / 2;
    const first = resolveTap(r, timeAtOffset(r, near), fixed(0.5));
    expect(first.outcome.kind).toBe('graze');
    expect(first.round.shields).toBe(0);
    expect(first.round.score).toBe(0);

    const r2 = first.round;
    const second = resolveTap(r2, timeAtOffset(r2, r2.width / 2 + GAME.graze / 2), fixed(0.5));
    expect(second.outcome).toMatchObject({ kind: 'miss', timing: 'late' });
  });

  it('reports early misses with the real angular distance', () => {
    const r = createRound(T0, fixed(0.5));
    const off = r.width / 2 + 0.5;
    const { outcome } = resolveTap(r, timeAtOffset(r, -off), fixed(0.5));
    expect(outcome.kind).toBe('miss');
    if (outcome.kind === 'miss') {
      expect(outcome.timing).toBe('early');
      expect(outcome.offDeg).toBeCloseTo((0.5 * 180) / Math.PI);
    }
  });

  it('computes the pass-through deadline at the edge of the graze zone', () => {
    const r = createRound(T0, fixed(0.5));
    expect(lateLimitTime(r)).toBeCloseTo(timeAtOffset(r, r.width / 2 + GAME.graze));
  });

  it('freezes the needle while paused and adds a grace period on resume', () => {
    const r = createRound(T0, fixed(0.5));
    const t = r.anchorTime + 300;
    const paused = pauseRound(r, t);
    expect(angleAt(paused, t)).toBeCloseTo(angleAt(r, t));
    const resumed = resumeRound(paused, t + 60_000);
    expect(angleAt(resumed, t + 60_000 + 100)).toBeCloseTo(angleAt(r, t));
  });

  it('never exceeds speed and width limits', () => {
    let r = createRound(T0, fixed(0.5));
    for (let i = 0; i < 200; i++) r = resolveTap(r, timeAtOffset(r, 0), fixed(0.5)).round;
    expect(r.speed).toBeLessThanOrEqual(GAME.maxSpeed);
    expect(r.width).toBeGreaterThanOrEqual(GAME.minWidth);
  });

  it('gives everyone the same daily sequence', () => {
    const day = new Date(2026, 9, 14);
    const a = dailyRng(day);
    const b = dailyRng(day);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
    expect(dailyRng(new Date(2026, 9, 15))()).not.toEqual(dailyRng(day)());
  });
});

describe('progression', () => {
  const run = (score: number, mode: RunSummary['mode'] = 'classic'): RunSummary => ({
    mode,
    score,
    hits: score,
    perfects: 0,
    bestCombo: 0,
    offDeg: 3,
    timing: 'late',
  });

  it('tracks best score and unlocks themes by total hits', () => {
    const { profile, report } = applyRun({ ...DEFAULT_PROFILE, totalHits: 140 }, run(20), new Date());
    expect(profile.best).toBe(20);
    expect(report.isNewBest).toBe(true);
    expect(report.unlockedThemes.map((t) => t.id)).toEqual(['gece']);
  });

  it('limits daily attempts and resets them the next day', () => {
    const day1 = new Date(2026, 9, 14, 12);
    let p = DEFAULT_PROFILE;
    for (let i = 0; i < GAME.dailyAttempts; i++) p = beginDailyAttempt(p, day1)!;
    expect(beginDailyAttempt(p, day1)).toBeNull();
    expect(beginDailyAttempt(p, new Date(2026, 9, 15, 9))).not.toBeNull();
  });

  it('grows the streak on consecutive days and resets it after a gap without penalty', () => {
    const d1 = new Date(2026, 9, 14, 12);
    const d2 = new Date(2026, 9, 15, 12);
    const d4 = new Date(2026, 9, 17, 12);
    let p = applyRun(beginDailyAttempt(DEFAULT_PROFILE, d1)!, run(5, 'daily'), d1).profile;
    p = applyRun(beginDailyAttempt(p, d1)!, run(7, 'daily'), d1).profile;
    expect(p.daily.streak).toBe(1);
    p = applyRun(beginDailyAttempt(p, d2)!, run(4, 'daily'), d2).profile;
    expect(p.daily.streak).toBe(2);
    expect(visibleStreak(p, d4)).toBe(0);
    expect(applyRun(beginDailyAttempt(p, d4)!, run(1, 'daily'), d4).profile.daily.streak).toBe(1);
    expect(p.daily.dayKey).toBe(dayKey(d2));
  });

  it('repairs corrupted saved data', () => {
    const p = sanitizeProfile({ best: -5, totalHits: 'x', settings: { sound: false } });
    expect(p.best).toBe(0);
    expect(p.totalHits).toBe(0);
    expect(p.settings).toEqual({ sound: false, music: true, haptics: true, screenShake: true, motion: true });
  });
});
