import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import ScreenGradient from '../components/ScreenGradient';
import { useAppTheme } from '../hooks/useAppTheme';

const FRONTEND_URL = process.env.EXPO_PUBLIC_FRONTEND_URL || 'https://sotanita.vercel.app';

function getShareUrl(videoId) {
  const encodedVideoId = encodeURIComponent(String(videoId || ''));
  return `${FRONTEND_URL}/share?videoId=${encodedVideoId}`;
}

export default function ShareScreen({ navigation }) {
  const route = useRoute();
  const { colors, spacing, typography, textScale } = useAppTheme();
  const videoId = route?.params?.videoId ? String(route.params.videoId) : '';
  const shareUrl = getShareUrl(videoId);
  const feedUrl = `${FRONTEND_URL}/feed?videoId=${encodeURIComponent(videoId)}`;
  const appDeepLink = `sotanitapp://feed?videoId=${encodeURIComponent(videoId)}`;

  useEffect(() => {
    if (!videoId) {
      return;
    }

    if (Platform.OS !== 'web') {
      navigation.replace('MainTabs', {
        screen: 'Home',
        params: { videoId },
      });
      return;
    }

    const isDesktopLike = typeof window !== 'undefined' && window.innerWidth >= 600;

    if (isDesktopLike) {
      window.location.replace(feedUrl);
      return;
    }

    let fallbackTimer = null;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible' && fallbackTimer) {
        clearTimeout(fallbackTimer);
        fallbackTimer = null;
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.location.href = appDeepLink;

    fallbackTimer = window.setTimeout(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (document.visibilityState === 'visible') {
        window.location.replace(feedUrl);
      }
    }, 1400);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (fallbackTimer) {
        clearTimeout(fallbackTimer);
      }
    };
  }, [appDeepLink, feedUrl, navigation, videoId]);

  return (
    <ScreenGradient>
      <View style={[styles.container, { padding: spacing.xl }]}> 
        <View style={[styles.card, { backgroundColor: colors.surface }]}> 
          <Text
            style={{
              color: colors.text,
              fontSize: typography.sizes.hero * 0.9 * textScale,
              fontWeight: typography.weights.bold,
              textAlign: 'center',
            }}
          >
            Abriendo video
          </Text>

          <Text
            style={{
              color: colors.textMuted,
              fontSize: typography.sizes.md * textScale,
              textAlign: 'center',
              lineHeight: 24,
            }}
          >
            {videoId
              ? 'Estamos enviándote al sitio correcto según tu dispositivo.'
              : 'No se encontró un identificador de video válido.'}
          </Text>

          {videoId ? (
            <View style={styles.metaBox}>
              <Text style={{ color: colors.primary, fontSize: typography.sizes.sm * textScale }}>
                Video ID
              </Text>
              <Text style={{ color: colors.text, fontSize: typography.sizes.lg * textScale, fontWeight: typography.weights.bold }}>
                {videoId}
              </Text>
            </View>
          ) : null}

          <Text style={[styles.footer, { color: colors.textMuted, fontSize: typography.sizes.xs * textScale }]}> 
            Si no se abre la app, cargaremos la versión web.
          </Text>
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
  card: {
    borderRadius: 24,
    padding: 24,
    gap: 18,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  metaBox: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  footer: {
    textAlign: 'center',
    marginTop: 8,
  },
});