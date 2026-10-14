/**
 * Oyunun tüm ayar değerleri tek yerde. Zorluk eğrisini buradan ayarla.
 * Açılar radyan, hızlar radyan/saniye, süreler milisaniye cinsindendir.
 */
export const GAME = {
  /** İğnenin başlangıç açısı (saat 12 yönü). */
  startAngle: -Math.PI / 2,
  startSpeed: 2.2,
  /** Her isabette hız bu oranla çarpılır. */
  speedMultiplier: 1.035,
  maxSpeed: 7,

  /** Hedef yayın başlangıç genişliği. */
  startWidth: 0.6,
  widthMultiplier: 0.97,
  minWidth: 0.2,

  /** Yay yarı genişliğinin bu oranı içinde kalan dokunuş "mükemmel" sayılır. */
  perfectRatio: 0.25,

  /** Yayın hemen dışındaki kıl payı bölgesi (~7°). Kalkan burada devreye girer. */
  graze: 0.12,
  shieldsPerRound: 1,

  /** Bir sonraki hedefin iğneden uzaklığı: minGap + [0, gapRange). */
  minGap: 0.9,
  gapRange: 1.7,

  /** Tur başında ve uygulamaya dönüşte kaza dokunuşlarını yutan bekleme. */
  startGraceMs: 450,
  resumeGraceMs: 700,

  baseBpm: 60,
  bpmPerPoint: 4,
  maxBpmBonus: 120,

  /** Günlük modda günde kaç deneme hakkı var. */
  dailyAttempts: 3,
  /** Bu kadar dakika kesintisiz oyundan sonra nazikçe mola öner. */
  breakAfterMinutes: 20,
} as const;

export const TAU = Math.PI * 2;
export const toDeg = (rad: number) => (rad * 180) / Math.PI;
