import { activateFocus, angleAt, createRound, decoyAngle, lateLimitTime, pauseRound, recoverMiss, resolveTap, resumeRound, type Round } from '../engine';
import { DEFAULT_PROFILE, MISSIONS, applyRun, missionsFor, rankFor, sanitizeProfile, type RunSummary } from '../progression';
import { dayKey } from '../rng';
const rng = () => 0.5;
const centerTime = (r: Round) => r.anchorTime + Math.abs(r.target - r.anchorAngle) / r.speed * 1000;
const hit = (r: Round) => resolveTap(r, centerTime(r), rng).round;
const summary = (mode: RunSummary['mode'] = 'classic'): RunSummary => ({ mode, score: 40, hits: 20, perfects: 5, bestCombo: 5, offDeg: 1, timing: 'late' });

describe('new game rules', () => {
  it('Kaos has exactly three lives and classic cannot recover a miss', () => {
    const r = createRound(0, rng, 'chaos');
    const two = recoverMiss(r, lateLimitTime(r), rng)!;
    const one = recoverMiss(two, lateLimitTime(two), rng)!;
    expect([r.lives, two.lives, one.lives]).toEqual([3, 2, 1]);
    expect(recoverMiss(one, lateLimitTime(one), rng)).toBeNull();
    expect(recoverMiss(createRound(0, rng), 1000, rng)).toBeNull();
  });
  it('cycles through all anomalies after groups of four hits', () => {
    let r = createRound(0, rng, 'chaos');
    const seen = [r.anomaly];
    for (let i = 1; i <= 20; i++) { r = hit(r); if (i % 4 === 0) seen.push(r.anomaly); }
    expect(seen).toEqual(['none', 'surge', 'mirror', 'decoy', 'wide', 'none']);
  });
  it('doubles scores in surge and keeps direction under the mirror rule', () => {
    let r = createRound(0, rng, 'chaos');
    for (let i = 0; i < 4; i++) r = hit(r);
    const result = resolveTap(r, centerTime(r), rng);
    expect(result.outcome).toMatchObject({ kind: 'hit', points: 12 });
    for (let i = 4; i < 8; i++) r = hit(r);
    expect(r.anomaly).toBe('mirror');
    expect(hit(r).dir).toBe(r.dir);
  });
  it('the decoy is not a valid target and stays still when focus changes the clock', () => {
    let r = createRound(0, rng, 'chaos');
    for (let i = 0; i < 12; i++) r = hit(r);
    const fake = decoyAngle(r)!;
    const fakeTime = r.anchorTime + Math.abs(fake - r.anchorAngle) / r.speed * 1000;
    expect(resolveTap(r, fakeTime, rng).outcome.kind).toBe('miss');
    expect(decoyAngle(activateFocus(r, r.anchorTime + 10)!)).toBe(fake);
  });
  it('focus has no angular jump, extends the deadline, consumes its charge and ends on the next hit', () => {
    let r = createRound(0, rng);
    for (let i = 0; i < 5; i++) r = hit(r);
    const t = r.anchorTime + 30;
    const focused = activateFocus(r, t)!;
    expect(angleAt(focused, t)).toBeCloseTo(angleAt(r, t));
    expect(lateLimitTime(focused)).toBeGreaterThan(lateLimitTime(r));
    expect(focused.focus).toBe(0);
    expect(activateFocus(focused, t + 10)).toBeNull();
    const next = hit(focused);
    expect(next.focused).toBe(false);
    expect(next.speed).toBe(next.baseSpeed);
  });
  it('cannot activate focus during grace, after timeout, or without charge', () => {
    const r = { ...createRound(1000, rng), focus: 5 };
    expect(activateFocus(r, 1100)).toBeNull();
    expect(activateFocus(r, lateLimitTime(r))).toBeNull();
    expect(activateFocus({ ...r, focus: 4 }, centerTime(r))).toBeNull();
  });
  it('practice survives misses and does not speed up after 1000 hits', () => {
    let r = createRound(0, rng, 'zen');
    const speed = r.speed, width = r.width;
    for (let i = 0; i < 1000; i++) r = i % 4 === 0 ? recoverMiss(r, lateLimitTime(r), rng)! : hit(r);
    expect(r.speed).toBe(speed); expect(r.width).toBe(width); expect(r.lives).toBe(1);
  });
  it('has finite forward deadlines and bounded difficulty throughout long Kaos sessions', () => {
    let r = createRound(0, rng, 'chaos');
    for (let i = 0; i < 3000; i++) {
      r = hit(r);
      expect(Number.isFinite(lateLimitTime(r))).toBe(true);
      expect(lateLimitTime(r)).toBeGreaterThan(r.anchorTime);
      expect((r.target - r.anchorAngle) * r.dir).toBeGreaterThan(0);
      expect(r.speed).toBeLessThanOrEqual(7); expect(r.width).toBeGreaterThanOrEqual(0.2);
    }
  });
  it('preserves focused speed and target over a long background pause', () => {
    const r = activateFocus({ ...createRound(0, rng), focus: 5 }, 500)!;
    const paused = pauseRound(r, 600), resumed = resumeRound(paused, 60600);
    expect(resumed.speed).toBe(r.speed); expect(resumed.target).toBe(r.target);
    expect(angleAt(resumed, 60700)).toBeCloseTo(angleAt(r, 600));
  });
});

describe('saved progress and daily rewards', () => {
  const date = new Date(2026, 9, 15, 12);
  it('upgrades v1 records, selected themes, preferences and daily attempts', () => {
    const p = sanitizeProfile({ version: 1, best: 77, totalHits: 170, themeId: 'gece', settings: { sound: false, motion: false }, daily: { dayKey: dayKey(date), attemptsUsed: 2, dayBest: 50 } });
    expect(p.version).toBe(2); expect(p.best).toBe(77); expect(p.modeBests.classic).toBe(77);
    expect(p.modeBests.daily).toBe(50); expect(p.themeId).toBe('gece'); expect(p.xp).toBe(510);
    expect(p.settings.sound).toBe(false); expect(p.settings.motion).toBe(false); expect(p.daily.attemptsUsed).toBe(2);
  });
  it('awards each daily mission only once and renews them on a new day', () => {
    const first = applyRun(DEFAULT_PROFILE, summary(), date);
    expect(first.report.completedMissions).toHaveLength(3);
    expect(first.report.xpGained).toBe(70 + MISSIONS.reduce((n, q) => n + q.reward, 0));
    const second = applyRun(first.profile, summary(), date);
    expect(second.report.completedMissions).toHaveLength(0); expect(second.report.xpGained).toBe(70);
    const tomorrow = new Date(2026, 9, 16, 12);
    expect(missionsFor(second.profile, tomorrow).hits).toBe(0);
    expect(applyRun(second.profile, summary(), tomorrow).report.completedMissions).toHaveLength(3);
  });
  it('tracks mode records separately and excludes practice from competitive records and missions', () => {
    const zen = applyRun(DEFAULT_PROFILE, summary('zen'), date);
    expect(zen.profile.best).toBe(0); expect(zen.profile.modeBests.zen).toBe(40);
    expect(zen.profile.missions.hits).toBe(0); expect(zen.report.completedMissions).toHaveLength(0);
    const chaos = applyRun(zen.profile, summary('chaos'), date);
    expect(chaos.profile.best).toBe(0); expect(chaos.profile.modeBests.chaos).toBe(40);
  });
  it('keeps level progress bounded at each rank boundary', () => {
    for (const xp of [0, 79, 80, 319, 320, 1000, 100000]) {
      const r = rankFor(xp); expect(r.progress).toBeGreaterThanOrEqual(0); expect(r.progress).toBeLessThan(1); expect(r.remaining).toBeGreaterThan(0);
    }
  });
});
