import { GAME } from './constants';
import type { MissTiming } from './engine';
import { dayKey, dayNumber, previousDayKey } from './rng';
import { DEFAULT_THEME_ID, newlyUnlocked, type Theme } from './themes';
import type { GameMode } from './modes';

export type { GameMode } from './modes';

export interface Settings {
  sound: boolean;
  music: boolean;
  haptics: boolean;
  screenShake: boolean;
  /** Short cosmetic pulses; there are no continuously active sensors. */
  motion: boolean;
  lowPower: boolean;
}

export interface DailyState {
  dayKey: string | null;
  attemptsUsed: number;
  dayBest: number;
  /** Günlük turun en son tamamlandığı gün; seri hesabı için. */
  lastCompletedDay: string | null;
  streak: number;
}

export interface Profile {
  version: 2;
  best: number;
  totalHits: number;
  gamesPlayed: number;
  themeId: string;
  settings: Settings;
  daily: DailyState;
  xp: number;
  modeBests: Record<GameMode, number>;
  missions: { dayKey: string | null; hits: number; perfects: number; best: number; claimed: string[] };
}

export interface RunSummary {
  mode: GameMode;
  score: number;
  hits: number;
  perfects: number;
  bestCombo: number;
  offDeg: number;
  timing: MissTiming;
  endReason?: 'miss' | 'finished';
}

export interface RunReport {
  summary: RunSummary;
  isNewBest: boolean;
  previousBest: number;
  unlockedThemes: Theme[];
  xpGained: number;
  completedMissions: string[];
  daily?: {
    dayNumber: number;
    attemptsLeft: number;
    dayBest: number;
    streak: number;
    shareText: string;
  };
}

export const DEFAULT_PROFILE: Profile = {
  version: 2,
  best: 0,
  totalHits: 0,
  gamesPlayed: 0,
  themeId: DEFAULT_THEME_ID,
  settings: { sound: true, music: true, haptics: true, screenShake: false, motion: true, lowPower: false },
  daily: { dayKey: null, attemptsUsed: 0, dayBest: 0, lastCompletedDay: null, streak: 0 },
  xp: 0,
  modeBests: { classic: 0, chaos: 0, zen: 0, daily: 0 },
  missions: { dayKey: null, hits: 0, perfects: 0, best: 0, claimed: [] },
};

/** Kayıttan gelen veriyi doğrular; bozuk ya da eksik alanlar varsayılana döner. */
export function sanitizeProfile(raw: unknown): Profile {
  if (!raw || typeof raw !== 'object') return DEFAULT_PROFILE;
  const p = raw as Partial<Profile>;
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d);
  const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
  const str = (v: unknown) => (typeof v === 'string' ? v : null);
  const s = (p.settings ?? {}) as Partial<Settings>;
  const d = (p.daily ?? {}) as Partial<DailyState>;
  const b = (p.modeBests ?? {}) as Partial<Profile['modeBests']>;
  const m = (p.missions ?? {}) as Partial<Profile['missions']>;
  return {
    version: 2,
    best: num(p.best, 0),
    totalHits: num(p.totalHits, 0),
    gamesPlayed: num(p.gamesPlayed, 0),
    themeId: str(p.themeId) ?? DEFAULT_THEME_ID,
    settings: {
      sound: bool(s.sound, true),
      music: bool(s.music, true),
      haptics: bool(s.haptics, true),
      screenShake: bool(s.screenShake, false),
      motion: bool(s.motion, true),
      lowPower: bool(s.lowPower, false),
    },
    daily: {
      dayKey: str(d.dayKey),
      attemptsUsed: num(d.attemptsUsed, 0),
      dayBest: num(d.dayBest, 0),
      lastCompletedDay: str(d.lastCompletedDay),
      streak: num(d.streak, 0),
    },
    xp: num(p.xp, num(p.totalHits, 0) * 3),
    modeBests: { classic: num(b.classic, num(p.best, 0)), chaos: num(b.chaos, 0), zen: num(b.zen, 0), daily: num(b.daily, num(d.dayBest, 0)) },
    missions: { dayKey: str(m.dayKey), hits: num(m.hits, 0), perfects: num(m.perfects, 0), best: num(m.best, 0), claimed: Array.isArray(m.claimed) ? m.claimed.filter((v): v is string => typeof v === 'string' && MISSIONS.some((q) => q.id === v)) : [] },
  };
}

export const MISSIONS = [
  { id: 'hits', name: 'Ritmi yakala', detail: 'Bugün 20 isabet yap', goal: 20, reward: 60 },
  { id: 'perfects', name: 'Tam merkez', detail: 'Bugün 5 mükemmel yap', goal: 5, reward: 80 },
  { id: 'best', name: 'Sınırını aş', detail: 'Tek turda 30 puana ulaş', goal: 30, reward: 100 },
] as const;

export function missionsFor(profile: Profile, now: Date) {
  return profile.missions.dayKey === dayKey(now) ? profile.missions : { ...DEFAULT_PROFILE.missions, dayKey: dayKey(now) };
}

export function rankFor(xp: number) {
  const level = Math.floor(Math.sqrt(xp / 80)) + 1;
  const floor = 80 * (level - 1) ** 2;
  const next = 80 * level ** 2;
  const names = ['Yeni sinyal', 'Ritim avcısı', 'Akım ustası', 'Nabız efsanesi'];
  return { level, name: names[Math.min(3, Math.floor((level - 1) / 4))], progress: (xp - floor) / (next - floor), remaining: next - xp };
}

/** Gün değiştiyse günlük deneme haklarını sıfırlar. */
export function rollDaily(profile: Profile, now: Date): Profile {
  const today = dayKey(now);
  if (profile.daily.dayKey === today) return profile;
  return { ...profile, daily: { ...profile.daily, dayKey: today, attemptsUsed: 0, dayBest: 0 } };
}

export function dailyAttemptsLeft(profile: Profile, now: Date): number {
  const p = rollDaily(profile, now);
  return Math.max(0, GAME.dailyAttempts - p.daily.attemptsUsed);
}

/**
 * Seri, son tamamlanan gün bugün ya da dün değilse kırılmış sayılır.
 * Ceza yok: sayaç yalnızca sıfırdan başlar.
 */
export function visibleStreak(profile: Profile, now: Date): number {
  const today = dayKey(now);
  const last = profile.daily.lastCompletedDay;
  return last === today || last === previousDayKey(today) ? profile.daily.streak : 0;
}

/** Günlük deneme hakkı turun başında düşülür; yarıda bırakmak hak kazandırmaz. */
export function beginDailyAttempt(profile: Profile, now: Date): Profile | null {
  const p = rollDaily(profile, now);
  if (p.daily.attemptsUsed >= GAME.dailyAttempts) return null;
  return { ...p, daily: { ...p.daily, attemptsUsed: p.daily.attemptsUsed + 1 } };
}

export function buildShareText(n: number, summary: RunSummary, dayBest: number, streak: number): string {
  const lines = [
    `Nabız #${n} 🫀`,
    `${dayBest} puan, ${summary.perfects} mükemmel isabet, en uzun seri ${summary.bestCombo}`,
  ];
  if (streak > 1) lines.push(`${streak} gündür ritmi tutuyorum 🔥`);
  return lines.join('\n');
}

export function applyRun(profile: Profile, summary: RunSummary, now: Date): { profile: Profile; report: RunReport } {
  const previousBest = profile.modeBests[summary.mode];
  const isNewBest = summary.score > previousBest;
  const totalHits = profile.totalHits + summary.hits;
  const eligible = summary.mode !== 'zen';
  const oldMissions = missionsFor(profile, now);
  const missions = { ...oldMissions, claimed: [...oldMissions.claimed], hits: oldMissions.hits + (eligible ? summary.hits : 0), perfects: oldMissions.perfects + (eligible ? summary.perfects : 0), best: Math.max(oldMissions.best, eligible ? summary.score : 0) };
  const completed = MISSIONS.filter((m) => !missions.claimed.includes(m.id) && missions[m.id] >= m.goal);
  missions.claimed.push(...completed.map((m) => m.id));
  const xpGained = summary.hits * (eligible ? 3 : 1) + summary.perfects * 2 + completed.reduce((n, m) => n + m.reward, 0);
  let next: Profile = {
    ...profile,
    best: summary.mode === 'classic' || summary.mode === 'daily' ? Math.max(profile.best, summary.score) : profile.best,
    totalHits,
    gamesPlayed: profile.gamesPlayed + 1,
    xp: profile.xp + xpGained,
    modeBests: { ...profile.modeBests, [summary.mode]: Math.max(previousBest, summary.score) },
    missions,
  };

  const report: RunReport = {
    summary,
    isNewBest,
    previousBest,
    unlockedThemes: newlyUnlocked(profile.totalHits, totalHits),
    xpGained,
    completedMissions: completed.map((m) => m.name),
  };

  if (summary.mode === 'daily') {
    next = rollDaily(next, now);
    const today = dayKey(now);
    const d = next.daily;
    let streak = d.streak;
    if (d.lastCompletedDay !== today) {
      streak = d.lastCompletedDay === previousDayKey(today) ? d.streak + 1 : 1;
    }
    const dayBest = Math.max(d.dayBest, summary.score);
    next = { ...next, daily: { ...d, dayBest, streak, lastCompletedDay: today } };
    const n = dayNumber(now);
    report.daily = {
      dayNumber: n,
      attemptsLeft: Math.max(0, GAME.dailyAttempts - d.attemptsUsed),
      dayBest,
      streak,
      shareText: buildShareText(n, summary, dayBest, streak),
    };
  }

  return { profile: next, report };
}
