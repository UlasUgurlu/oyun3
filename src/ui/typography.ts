
/**
 * Tek yazı ailesi: Bricolage Grotesque. Kalın ağırlığı büyük skor
 * rakamlarına karakter katar, normal ağırlığı küçük metinlerde sakin kalır.
 */
export const FONT_ASSETS = {
  BricolageGrotesque_400Regular: require('@expo-google-fonts/bricolage-grotesque/400Regular/BricolageGrotesque_400Regular.ttf'),
  BricolageGrotesque_500Medium: require('@expo-google-fonts/bricolage-grotesque/500Medium/BricolageGrotesque_500Medium.ttf'),
  BricolageGrotesque_700Bold: require('@expo-google-fonts/bricolage-grotesque/700Bold/BricolageGrotesque_700Bold.ttf'),
  BricolageGrotesque_800ExtraBold: require('@expo-google-fonts/bricolage-grotesque/800ExtraBold/BricolageGrotesque_800ExtraBold.ttf'),
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
