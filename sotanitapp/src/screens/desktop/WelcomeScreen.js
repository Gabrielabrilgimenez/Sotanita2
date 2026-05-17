import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useAppTheme } from '../../hooks/useAppTheme';

const loginButtonImage = require('../../../assets/init/login.png');
const registerButtonImage = require('../../../assets/init/register.png');
const guestButtonImage = require('../../../assets/init/guest_pc.png');

export default function WelcomeScreen({ navigation }) {
  const { enterAsGuest } = useAuth();
  const { width } = useWindowDimensions();
  const { colors, spacing, typography, textScale, darkMode } = useAppTheme();
  const titleFontSize = Math.min(96, Math.max(44, width * 0.065)) * textScale;
  const buttonWidth = Math.min(330, Math.max(220, width * 0.23));
  const backgroundColors = darkMode
    ? ['#020617', '#051649', '#020B2F']
    : ['#F6FAFF', '#DEE9FF', '#CBDBFF'];

  const handleGuest = () => {
    enterAsGuest();
  };

  return (
    <LinearGradient colors={backgroundColors} style={styles.background}>
      <View style={[styles.container, { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg }]}> 
        <Text
          style={[
            styles.title,
            {
              color: colors.text,
              fontFamily: typography.families.nougat,
              fontSize: titleFontSize,
              lineHeight: titleFontSize * 1.03,
              maxWidth: width * 0.8,
            },
          ]}
        >
          AMANTES DEL MAL FUTBOL
        </Text>

        <View style={[styles.divider, { backgroundColor: colors.primary, width: width * 0.7 }]} />

        <View style={styles.buttonsRow}>
          <Pressable onPress={() => navigation.navigate('Login')} style={[styles.imageButton, { width: buttonWidth }]}>
            <Image source={loginButtonImage} style={styles.imageButtonAsset} resizeMode="contain" />
          </Pressable>

          <Pressable onPress={() => navigation.navigate('Register')} style={[styles.imageButton, { width: buttonWidth }]}>
            <Image source={registerButtonImage} style={styles.imageButtonAsset} resizeMode="contain" />
          </Pressable>

          <Pressable onPress={handleGuest} style={[styles.imageButton, { width: buttonWidth }]}>
            <Image source={guestButtonImage} style={styles.imageButtonAsset} resizeMode="contain" />
          </Pressable>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.primary, width: width * 0.7 }]} />

        <Text
          style={[
            styles.subtitle,
            {
              color: colors.primary,
              fontSize: typography.sizes.lg * textScale,
            },
          ]}
        >
          La app donde los mejores no siempre la acaban metiendo
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'space-evenly',
    alignItems: 'center',
    minHeight: 560,
    gap: 22,
  },
  title: {
    textAlign: 'center',
    transform: [{ scaleY: 1.08 }],
    letterSpacing: -0.5,
  },
  divider: {
    height: 5,
    borderRadius: 999,
  },
  buttonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    width: '100%',
    maxWidth: 1100,
  },
  imageButton: {
    aspectRatio: 0.92,
  },
  imageButtonAsset: {
    width: '100%',
    height: '100%',
  },
  subtitle: {
    textAlign: 'center',
    fontWeight: '700',
  },
});
