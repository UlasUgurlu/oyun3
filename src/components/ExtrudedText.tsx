import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

import { alpha } from '../ui/color';

interface Props {
  children: string | number;
  color: string;
  /** Kabartmanın yan yüz rengi. */
  sideColor: string;
  glowColor?: string;
  depth?: number;
  style?: StyleProp<TextStyle>;
}

/**
 * Yazıyı katman katman üst üste dizerek 3B kabartma etkisi verir.
 * Arkadaki katmanlar aşağı doğru kaydırılır, en üstte ışık alan yüz durur.
 */
export function ExtrudedText({ children, color, sideColor, glowColor, depth = 6, style }: Props) {
  const layers = Array.from({ length: depth }, (_, i) => depth - i);
  return (
    <View>
      {layers.map((d) => (
        <Text
          key={d}
          style={[style, styles.layer, { color: sideColor, transform: [{ translateY: d }] }]}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        >
          {children}
        </Text>
      ))}
      <Text
        style={[
          style,
          { color },
          glowColor && { textShadowColor: alpha(glowColor, 0.55), textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, right: 0, top: 0 },
});
