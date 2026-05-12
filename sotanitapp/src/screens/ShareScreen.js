import { useEffect, useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import ScreenGradient from '../components/ScreenGradient';
import { useAppTheme } from '../hooks/useAppTheme';
import { useAuth } from '../context/AuthContext';

const FRONTEND_URL = process.env.EXPO_PUBLIC_FRONTEND_URL || 'https://sotanita.vercel.app';

function getShareUrl(videoId) {
  const encodedVideoId = encodeURIComponent(String(videoId || ''));
  return `${FRONTEND_URL}/share/${encodedVideoId}`;
}

export default function ShareScreen({ navigation }) {
  const route = useRoute();
  const { colors, spacing, typography, textScale } = useAppTheme();
  const { isLoggedIn, guestMode } = useAuth();
  const isAuthenticated = isLoggedIn || guestMode;
  
  const videoId = route?.params?.videoId ? String(route.params.videoId) : '';
  const hasVideoId = Boolean(videoId);
  const shareUrl = getShareUrl(videoId);
  const feedUrl = `${FRONTEND_URL}/feed/${encodeURIComponent(videoId)}`;
  const feedUrlNoVideo = `${FRONTEND_URL}/feed`;
  const appDeepLink = `sotanitapp://feed/${encodeURIComponent(videoId)}`;
  const fallbackMessage = useMemo(() => {
    if (hasVideoId) {
      return 'Estamos enviándote al video correcto según tu dispositivo.';
    }

    return isAuthenticated
      ? 'Este enlace de compartir está incompleto. Te llevaremos al feed para que elijas el video.'
      : 'Este enlace de compartir está incompleto. Te llevaremos a la pantalla de bienvenida para iniciar sesión.';
  }, [hasVideoId, isAuthenticated]);

  useEffect(() => {
    // Si NO tiene videoId, redirigir según autenticación
    if (!hasVideoId) {
      if (Platform.OS !== 'web') {
        const timer = setTimeout(() => {
          // En mobile: ir a MainTabs (Feed) si autenticado, sino a Auth
          if (isAuthenticated) {
            navigation.replace('MainTabs', {
              screen: 'Home',
              params: {},
            });
          } else {
            navigation.replace('Auth');
          }
        }, 1300);

        return () => clearTimeout(timer);
      }

      // En web
      const timer = window.setTimeout(() => {
        if (isAuthenticated) {
          window.location.replace(feedUrlNoVideo);
        } else {
          // Ir a la página de bienvenida/login
          window.location.replace(`${FRONTEND_URL}/`);
        }
      }, 1300);

      return () => window.clearTimeout(timer);
    }

    // Si tiene videoId, proceder con el flujo de compartir
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
  }, [appDeepLink, feedUrl, feedUrlNoVideo, hasVideoId, isAuthenticated, navigation, videoId]);

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
            {fallbackMessage}
          </Text>

          {hasVideoId ? (
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
            {hasVideoId ? 'Si no se abre la app, cargaremos la versión web.' : 'Redirigiendo automáticamente...'}
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