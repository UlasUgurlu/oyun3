export interface Theme {
  id: string;
  name: string;
  /** Bu temayı açmak için gereken toplam isabet sayısı. */
  unlockAt: number;
  background: string;
  surface: string;
  track: string;
  target: string;
  perfect: string;
  needle: string;
  text: string;
  muted: string;
  statusBar: 'light' | 'dark';
  /** Sahnenin ortasındaki ışık. */
  backgroundGlow: string;
  /** Halkanın ışık alan ve gölgede kalan yüzleri (3B metal görünüm). */
  ringLight: string;
  ringDark: string;
  /** 3B butonların alt kenarı. */
  ledge: string;
}

/**
 * Renkler kalp ve kan dolaşımı fikrinden geliyor: koyu şarap zemini,
 * mercan kırmızısı hedef, mükemmel isabetler için sıcak altın.
 */
export const THEMES: readonly Theme[] = [
  {
    id: 'sarap',
    backgroundGlow: '#6B1A36',
    ringLight: '#7A3A52',
    ringDark: '#1E0812',
    ledge: '#B3263A',
    name: 'Şarap',
    unlockAt: 0,
    background: '#2A0E1A',
    surface: '#3A1526',
    track: '#4A2133',
    target: '#FF4D5E',
    perfect: '#FFC857',
    needle: '#FFF1EC',
    text: '#F7D6D0',
    muted: '#B88A93',
    statusBar: 'light',
  },
  {
    id: 'gece',
    backgroundGlow: '#2B3F86',
    ringLight: '#41558F',
    ringDark: '#090E22',
    ledge: '#2FA594',
    name: 'Gece mavisi',
    unlockAt: 150,
    background: '#0E1630',
    surface: '#18234A',
    track: '#243262',
    target: '#5EE6D0',
    perfect: '#FFD166',
    needle: '#F2F5FF',
    text: '#DDE5FF',
    muted: '#8C98C4',
    statusBar: 'light',
  },
  {
    id: 'safak',
    backgroundGlow: '#FFFFFF',
    ringLight: '#FFF4EC',
    ringDark: '#D79C80',
    ledge: '#A81E33',
    name: 'Şafak',
    unlockAt: 400,
    background: '#FFE9DC',
    surface: '#FFDCC8',
    track: '#F3C2A8',
    target: '#E8364F',
    perfect: '#7A3CFF',
    needle: '#3B1020',
    text: '#3B1020',
    muted: '#8A5A60',
    statusBar: 'dark',
  },
  {
    id: 'orman',
    backgroundGlow: '#2E6B4E',
    ringLight: '#3E6E5B',
    ringDark: '#0A1A12',
    ledge: '#B5741F',
    name: 'Orman',
    unlockAt: 800,
    background: '#10241B',
    surface: '#18352A',
    track: '#21473A',
    target: '#F2A541',
    perfect: '#F6F2C4',
    needle: '#F3F7EE',
    text: '#DCEBDD',
    muted: '#8FAE98',
    statusBar: 'light',
  },
  {
    id: 'altin',
    backgroundGlow: '#6B4A0E',
    ringLight: '#8A6A2A',
    ringDark: '#120C02',
    ledge: '#B98400',
    name: 'Altın',
    unlockAt: 1500,
    background: '#1C1405',
    surface: '#2C210A',
    track: '#3F2F10',
    target: '#FFC21A',
    perfect: '#FFF6D6',
    needle: '#FFF8E5',
    text: '#FBEBC4',
    muted: '#B39A63',
    statusBar: 'light',
  },
];

export const DEFAULT_THEME_ID = THEMES[0].id;

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export function isUnlocked(theme: Theme, totalHits: number): boolean {
  return totalHits >= theme.unlockAt;
}

/** İki toplam isabet değeri arasında yeni açılan temalar. */
export function newlyUnlocked(before: number, after: number): Theme[] {
  return THEMES.filter((t) => t.unlockAt > before && t.unlockAt <= after);
}
