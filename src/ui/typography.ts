import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';

/**
 * Tek yazı ailesi: Bricolage Grotesque. Kalın ağırlığı büyük skor
 * rakamlarına karakter katar, normal ağırlığı küçük metinlerde sakin kalır.
 */
export const FONT_ASSETS = {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
};

export const fonts = {
  regular: 'BricolageGrotesque_400Regular',
  medium: 'BricolageGrotesque_500Medium',
  bold: 'BricolageGrotesque_700Bold',
  heavy: 'BricolageGrotesque_800ExtraBold',
} as const;

/** Ölçek: 13 / 16 / 20 / 28 / 44 */
export const type = {
  small: 13,
  body: 16,
  title: 20,
  headline: 28,
  display: 44,
} as const;
