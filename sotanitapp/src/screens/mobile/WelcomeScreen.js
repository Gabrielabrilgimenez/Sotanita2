import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../hooks/useAppTheme';
import { useFirstVisit } from '../../hooks/useFirstVisit';
import ScreenGradient from '../../components/ScreenGradient';

const appLogo = require('../../../assets/LOGO.png');
const loginButtonImage = require('../../../assets/init/login.png');
const registerButtonImage = require('../../../assets/init/register.png');
const guestButtonImage = require('../../../assets/init/guest.png');

export default function WelcomeScreen({ navigation }) {
  const { enterAsGuest } = useAuth();
  const { colors, spacing, typography, textScale } = useAppTheme();
  const { isFirstVisit, loading, markFirstVisitSeen } = useFirstVisit();

  const handleGuest = () => {
    enterAsGuest();
  };

  return (
    <ScreenGradient>
      <Modal visible={!loading && isFirstVisit} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.primary }]}> 
            <Text style={[styles.modalTitle, { color: colors.text, fontFamily: typography.families.nougat }]}>Bienvenido a Sotanita</Text>
            <Text style={[styles.modalMessage, { color: colors.textMuted }]}>Esta es la primera vez que entras desde este dispositivo o navegador. La próxima vez no volverá a mostrarse este mensaje.</Text>
            <Pressable onPress={markFirstVisitSeen} style={[styles.modalButton, { backgroundColor: colors.primary }]}> 
              <Text style={[styles.modalButtonText, { color: colors.background }]}>Continuar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View style={[styles.container, { padding: spacing.xl }]}> 
        <View style={styles.logoBlock}>
          <Image source={appLogo} style={styles.logoImage} resizeMode="contain" />
          <Text
            style={{
              color: colors.text,
              fontSize: typography.sizes.hero * 1.3 * textScale,
              fontWeight: typography.weights.bold,
              fontFamily: typography.families.nougat,
              textAlign: 'center',
              transform: [{ scaleY: 1.12 }],
              letterSpacing: -0.8,
            }}
          >
            AMANTES DEL MAL FUTBOL
          </Text>
          <Text style={{ color: colors.primary, fontSize: typography.sizes.lg * textScale }}>
            Cuando las jugadas están bien... pa no verlas.
          </Text>
        </View>

        <View style={styles.actions}>
          <View style={styles.authImageButtonsRow}>
            <Pressable onPress={() => navigation.navigate('Login')} style={styles.authImageButton}>
              <Image source={loginButtonImage} style={styles.authImageButtonAsset} resizeMode="contain" />
            </Pressable>

            <Pressable onPress={() => navigation.navigate('Register')} style={styles.authImageButton}>
              <Image source={registerButtonImage} style={styles.authImageButtonAsset} resizeMode="contain" />
            </Pressable>
          </View>

          <Pressable onPress={handleGuest} style={styles.guestButton}>
            <Image source={guestButtonImage} style={styles.guestButtonImage} resizeMode="contain" />
          </Pressable>
        </View>
      </View>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  logoBlock: {
    alignItems: 'center',
    marginBottom: 52,
    gap: 8,
  },
  logoImage: {
    width: 200,
    height: 200,
    marginBottom: 10,
  },
  actions: {
    gap: 30,
  },
  authImageButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  authImageButton: {
    flex: 1,
    aspectRatio: 1,
  },
  authImageButtonAsset: {
    width: '100%',
    height: '100%',
  },
  guestButton: {
    width: '100%',
    aspectRatio: 3.2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  guestButtonImage: {
    width: '100%',
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 24,
    borderWidth: 2,
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 14,
  },
  modalTitle: {
    textAlign: 'center',
    fontSize: 28,
    lineHeight: 32,
  },
  modalMessage: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
  },
  modalButton: {
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '800',
  },
});
