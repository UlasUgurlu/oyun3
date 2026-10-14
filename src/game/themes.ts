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
    backgroundGlow: '#1A2140',
    ringLight: '#455779',
    ringDark: '#060A15',
    ledge: '#B3263A',
    name: 'Neon',
    unlockAt: 0,
    background: '#090F20',
    surface: '#141E34',
    track: '#23304C',
    target: '#FF5277',
    perfect: '#66E8DC',
    needle: '#FFF5EC',
    text: '#F5F5FF',
    muted: '#8998B5',
    statusBar: 'light',
  },
  {
    id: 'gece',
    backgroundGlow: '#2B3F86',
    ringLight: '#41558F',
    ringDark: '#090E22',
    ledge: '#2FA594',
    name: 'Buz akımı',
    unlockAt: 40,
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
    backgroundGlow: '#3B2138',
    ringLight: '#6D465D',
    ringDark: '#180C18',
    ledge: '#A81E33',
    name: 'Gün batımı',
    unlockAt: 120,
    background: '#241423',
    surface: '#38203A',
    track: '#553150',
    target: '#FF966E',
    perfect: '#E9BBFF',
    needle: '#FFF5ED',
    text: '#FFF5ED',
    muted: '#BF9AAB',
    statusBar: 'light',
  },
  {
    id: 'orman',
    backgroundGlow: '#2E6B4E',
    ringLight: '#3E6E5B',
    ringDark: '#0A1A12',
    ledge: '#B5741F',
    name: 'Biyosinyal',
    unlockAt: 300,
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
    name: 'Altın frekans',
    unlockAt: 600,
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
