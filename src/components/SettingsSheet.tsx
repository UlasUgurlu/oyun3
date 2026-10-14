import { Alert, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Settings } from '../game/progression';
import type { Theme } from '../game/themes';
import { fonts, type } from '../ui/typography';
import { Button } from './Button';

interface Props {
  visible: boolean;
  theme: Theme;
  settings: Settings;
  onChange: (settings: Settings) => void;
  onResetProgress: () => void;
  onClose: () => void;
}

const ROWS: { key: keyof Settings; label: string; hint: string }[] = [
  { key: 'sound', label: 'Ses efektleri', hint: 'Telefon sessizdeyken zaten çalmaz' },
  { key: 'music', label: 'Müzik', hint: 'Kalp atışı ritmiyle akan arka plan müziği' },
  { key: 'haptics', label: 'Titreşim', hint: 'İsabet ve kaçırmalarda hafif titreşim' },
  { key: 'screenShake', label: 'Ekran sarsıntısı', hint: 'Hareket hassasiyetin varsa kapat' },
  { key: 'motion', label: '3B eğim hareketi', hint: 'Telefonu eğince sahne de döner' },
];

export function SettingsSheet({ visible, theme, settings, onChange, onResetProgress, onClose }: Props) {
  const insets = useSafeAreaInsets();

  const confirmReset = () =>
    Alert.alert('İlerlemeyi sıfırla', 'Rekorun, toplam isabetlerin, açtığın temalar ve günlük serin silinir.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sıfırla', style: 'destructive', onPress: onResetProgress },
    ]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Ayarları kapat" />
      <View style={[styles.sheet, { backgroundColor: theme.surface, paddingBottom: insets.bottom + 20 }]}>
        <Text style={[styles.title, { color: theme.text }]}>Ayarlar</Text>
        {ROWS.map((row) => (
          <View key={row.key} style={styles.row}>
            <View style={styles.flex}>
              <Text style={[styles.label, { color: theme.text }]}>{row.label}</Text>
              <Text style={[styles.hint, { color: theme.muted }]}>{row.hint}</Text>
            </View>
            <Switch
              value={settings[row.key]}
              onValueChange={(v) => onChange({ ...settings, [row.key]: v })}
              trackColor={{ true: theme.target, false: theme.track }}
              thumbColor={theme.needle}
              accessibilityLabel={row.label}
            />
          </View>
        ))}
        <Button label="İlerlemeyi sıfırla" onPress={confirmReset} theme={theme} variant="quiet" />
        <Button label="Kapat" onPress={onClose} theme={theme} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 14 },
  title: { fontFamily: fonts.bold, fontSize: type.headline, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  flex: { flex: 1 },
  label: { fontFamily: fonts.medium, fontSize: type.body + 1 },
  hint: { fontFamily: fonts.regular, fontSize: type.small, marginTop: 2 },
});
