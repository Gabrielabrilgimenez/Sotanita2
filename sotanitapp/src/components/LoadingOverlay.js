import { Image, Modal, StyleSheet, View } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';

const loadingGif = require('../../assets/loading.gif');

export default function LoadingOverlay({ visible = false }) {
  const { darkMode, highContrast } = useAppTheme();

  if (!visible) {
    return null;
  }

  const overlayColor = highContrast
    ? 'rgba(0,0,0,0.85)'
    : darkMode
      ? 'rgba(0,0,0,0.7)'
      : 'rgba(17,24,39,0.7)';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => {}}
    >
      <View style={[styles.backdrop, { backgroundColor: overlayColor }]}> 
        <Image
          source={loadingGif}
          style={styles.gif}
          resizeMode="contain"
          accessibilityLabel="Cargando"
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gif: {
    width: 160,
    height: 160,
  },
});
