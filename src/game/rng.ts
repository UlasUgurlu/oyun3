export type Rng = () => number;

/** Mulberry32: küçük, hızlı ve tohumlu (deterministik) rastgele sayı üreteci. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Bir metinden 32 bitlik tohum üretir (FNV-1a). */
export function hashSeed(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Yerel saate göre gün anahtarı: "2026-10-14". */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function previousDayKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}

const LAUNCH_DAY = new Date(2026, 0, 1);

/** Paylaşım metnindeki "Nabız #N" numarası. */
export function dayNumber(date: Date): number {
  const start = Date.UTC(LAUNCH_DAY.getFullYear(), LAUNCH_DAY.getMonth(), LAUNCH_DAY.getDate());
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((today - start) / 86_400_000) + 1;
}

/** Herkesin aynı gün aynı hedef dizisini oynaması için günlük üreteç. */
export function dailyRng(date: Date): Rng {
  return mulberry32(hashSeed(`nabiz:${dayKey(date)}`));
}
