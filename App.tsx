import { useFonts } from 'expo-font';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DEFAULT_THEME_ID, getTheme } from './src/game/themes';
import { GameScreen } from './src/screens/GameScreen';
import { FONT_ASSETS } from './src/ui/typography';

export default function App() {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);

  // Font yüklenemezse sistem fontuyla devam edilir; oyun asla açılışta takılmaz.
  if (!fontsLoaded && !fontError) {
    return <View style={{ flex: 1, backgroundColor: getTheme(DEFAULT_THEME_ID).background }} />;
  }

  return (
    <SafeAreaProvider>
      <GameScreen />
    </SafeAreaProvider>
  );
}
