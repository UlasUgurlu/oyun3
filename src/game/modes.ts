export type GameMode = 'classic' | 'chaos' | 'zen' | 'daily';
export type Anomaly = 'none' | 'surge' | 'mirror' | 'decoy' | 'wide';

export const MODES: { id: GameMode; name: string; symbol: string; detail: string; tag: string }[] = [
  { id: 'classic', name: 'Klasik', symbol: '◎', detail: 'Tek dokunuş, değişen yön. Mükemmel isabetlerle serini büyüt.', tag: 'SAF REFLEKS' },
  { id: 'chaos', name: 'Kaos', symbol: 'ϟ', detail: '3 can. Her 4 isabette hız patlaması, ters kural veya sahte hedef!', tag: 'SÜRPRİZ KURALLAR' },
  { id: 'zen', name: 'Serbest', symbol: '∞', detail: 'Kaybetmek yok. Rahat tempoda çalış; hazır olduğunda turu bitir.', tag: 'ANTRENMAN' },
  { id: 'daily', name: 'Günün Nabzı', symbol: '✦', detail: 'Her gün aynı hedef dizisi, sadece 3 deneme. Kendi rekorunu aş.', tag: 'GÜNLÜK MEYDAN OKUMA' },
];

export const ANOMALIES: Record<Anomaly, { name: string; detail: string }> = {
  none: { name: 'Ritmi yakala', detail: 'Renkli yayda dokun. Ortası mükemmel.' },
  surge: { name: 'Aşırı akım', detail: 'İbre hızlandı. Bu bölümde puanlar ×2!' },
  mirror: { name: 'Ters kural', detail: 'İsabetten sonra yön değişmez. Dikkat!' },
  decoy: { name: 'Sahte sinyal', detail: 'Mor, çizgili hedef bir tuzak. Mercanı yakala!' },
  wide: { name: 'Nefes aralığı', detail: 'Hedef genişledi. Serini yeniden kur.' },
};

export function anomalyFor(hits: number): Anomaly {
  const events: Anomaly[] = ['none', 'surge', 'mirror', 'decoy', 'wide'];
  return events[Math.floor(hits / 4) % events.length];
}

export function modeName(mode: GameMode): string {
  return MODES.find((m) => m.id === mode)!.name;
}
