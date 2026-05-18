import { Image, Pressable, StyleSheet, Text, View, Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import ScreenGradient from '../../components/ScreenGradient';
import { useAppTheme } from '../../hooks/useAppTheme';

const appLogo = require('../../../assets/LOGO.png');

export default function MobilePlatformScreen({ navigation }) {
  const { colors, spacing, typography, textScale } = useAppTheme();
  const [isIosWeb, setIsIosWeb] = useState(false);

  const isWeb = Platform.OS === 'web';

  const handleIosPress = () => {
    navigation.navigate('Welcome');
  };

  useEffect(() => {
    if (!isWeb || typeof navigator === 'undefined') return;
    const ua = String(navigator.userAgent || '').toLowerCase();
    const platformRaw = String(navigator.userAgentData?.platform || navigator.platform || '').toLowerCase();
    const isiPhone = ua.includes('iphone');
    const isiPad = ua.includes('ipad');
    const isiPod = ua.includes('ipod');
    const isAndroid = ua.includes('android');
    const isApplePlatform = platformRaw.includes('iphone') || platformRaw.includes('ipad') || platformRaw.includes('ipod');
    const isAppleMobile = (isiPhone || isiPad || isiPod) && !isAndroid && isApplePlatform;

    setIsIosWeb(isAppleMobile);

    if (isAppleMobile) {
      setTimeout(() => {
        navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
      }, 10);
    }
  }, [isWeb, navigation]);

  return (
    <ScreenGradient>
      <View style={[styles.container, { padding: spacing.xl }]}> 
        <View style={styles.logoBlock}>
          <Image source={appLogo} style={styles.logoImage} resizeMode="contain" />
          <Text
            style={{
              color: colors.text,
              fontSize: typography.sizes.hero * 1.05 * textScale,
              fontWeight: typography.weights.bold,
              fontFamily: typography.families.nougat,
              textAlign: 'center',
              transform: [{ scaleY: 1.12 }],
              letterSpacing: -0.8,
            }}
          >
            AMANTES DEL MAL FUTBOL
          </Text>
          <Text style={{ color: colors.primary, fontSize: typography.sizes.lg * textScale, textAlign: 'center' }}>
            Selecciona tu sistema
          </Text>
        </View>

        {!isIosWeb ? (
          <View style={styles.actions}>
            <Pressable
              onPress={() => {}}
              style={[styles.platformButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Ionicons name="download-outline" size={24} color={colors.primary} />
              <Text style={{ color: colors.text, fontSize: typography.sizes.lg * textScale, fontWeight: typography.weights.semibold }}>
                Instalar APK
              </Text>
            </Pressable>

            <Pressable
              onPress={handleIosPress}
              style={[styles.platformButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Ionicons name="globe-outline" size={24} color={colors.text} />
              <Text style={{ color: colors.text, fontSize: typography.sizes.lg * textScale, fontWeight: typography.weights.semibold }}>
                Acceder web
              </Text>
            </Pressable>
          </View>
        ) : (
          <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
            Redirigiendo a Welcome...
          </Text>
        )}
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
    marginBottom: 40,
    gap: 8,
  },
  logoImage: {
    width: 160,
    height: 160,
    marginBottom: 6,
  },
  actions: {
    gap: 16,
  },
  platformButton: {
    borderWidth: 2,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
});
