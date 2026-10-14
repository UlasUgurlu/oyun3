/** "#RRGGBB" renkleri arasında karışım ve saydamlık yardımcıları. */
const parse = (hex: string) => {
  const h = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');

export function mix(a: string, b: string, amount: number): string {
  const ca = parse(a);
  const cb = parse(b);
  return `#${ca.map((v, i) => toHex(v + (cb[i] - v) * amount)).join('')}`;
}

export const lighten = (hex: string, amount: number) => mix(hex, '#FFFFFF', amount);
export const darken = (hex: string, amount: number) => mix(hex, '#000000', amount);

export function alpha(hex: string, a: number): string {
  const [r, g, b] = parse(hex);
  return `rgba(${r},${g},${b},${a})`;
}
