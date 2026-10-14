import { GAME } from './constants';
import type { MissTiming } from './engine';
import { dayKey, dayNumber, previousDayKey } from './rng';
import { DEFAULT_THEME_ID, newlyUnlocked, type Theme } from './themes';

export type GameMode = 'classic' | 'daily';

export interface Settings {
  sound: boolean;
  music: boolean;
  haptics: boolean;
  screenShake: boolean;
  /** Telefonu eğince sahnenin 3B olarak hareket etmesi. */
  motion: boolean;
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
  version: 1;
  best: number;
  totalHits: number;
  gamesPlayed: number;
  themeId: string;
  settings: Settings;
  daily: DailyState;
}

export interface RunSummary {
  mode: GameMode;
  score: number;
  hits: number;
  perfects: number;
  bestCombo: number;
  offDeg: number;
  timing: MissTiming;
}

export interface RunReport {
  summary: RunSummary;
  isNewBest: boolean;
  previousBest: number;
  unlockedThemes: Theme[];
  daily?: {
    dayNumber: number;
    attemptsLeft: number;
    dayBest: number;
    streak: number;
    shareText: string;
  };
}

export const DEFAULT_PROFILE: Profile = {
  version: 1,
  best: 0,
  totalHits: 0,
  gamesPlayed: 0,
  themeId: DEFAULT_THEME_ID,
  settings: { sound: true, music: true, haptics: true, screenShake: true, motion: true },
  daily: { dayKey: null, attemptsUsed: 0, dayBest: 0, lastCompletedDay: null, streak: 0 },
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
  return {
    version: 1,
    best: num(p.best, 0),
    totalHits: num(p.totalHits, 0),
    gamesPlayed: num(p.gamesPlayed, 0),
    themeId: str(p.themeId) ?? DEFAULT_THEME_ID,
    settings: {
      sound: bool(s.sound, true),
      music: bool(s.music, true),
      haptics: bool(s.haptics, true),
      screenShake: bool(s.screenShake, true),
      motion: bool(s.motion, true),
    },
    daily: {
      dayKey: str(d.dayKey),
      attemptsUsed: num(d.attemptsUsed, 0),
      dayBest: num(d.dayBest, 0),
      lastCompletedDay: str(d.lastCompletedDay),
      streak: num(d.streak, 0),
    },
  };
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
  const isNewBest = summary.score > profile.best;
  const totalHits = profile.totalHits + summary.hits;
  let next: Profile = {
    ...profile,
    best: Math.max(profile.best, summary.score),
    totalHits,
    gamesPlayed: profile.gamesPlayed + 1,
  };

  const report: RunReport = {
    summary,
    isNewBest,
    previousBest: profile.best,
    unlockedThemes: newlyUnlocked(profile.totalHits, totalHits),
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
