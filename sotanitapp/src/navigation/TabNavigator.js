import { useEffect, useRef, useState, useCallback } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Animated, Easing, FlatList, Image, Modal, Pressable, StyleSheet, Text, View, useWindowDimensions, Alert } from 'react-native';
import { io } from 'socket.io-client';
import { getScreenComponent } from '../screens/index';
import { useAuth } from '../context/AuthContext';
import { useAppTheme } from '../hooks/useAppTheme';
import { SOCKET_BASE_URL, getAllNotifications, getUnreadNotificationsCount, markNotificationsRead, deleteAllNotifications } from '../api/backend';
import NotificationItem from '../components/NotificationItem';
import FifaCard from '../components/FifaCard';
import LoadingOverlay from '../components/LoadingOverlay';

const Tab = createBottomTabNavigator();
const closeButtonDark = require('../../assets/botonX/dark.png');
const closeButtonLight = require('../../assets/botonX/light.png');
const closeButtonContrast = require('../../assets/botonX/contrast.png');
const TAB_BAR_HEIGHT = 68;
const TAB_BAR_VERTICAL_PADDING = 8;
const TAB_CARD_TRANSLATE_Y = -34;
const TAB_CARD_DOCK_OFFSET_Y = -6;
const TAB_CARD_SIZE = { width: 84, height: 120 };
const PROFILE_CARD_SIZE = { width: 174, height: 246 };
const PROFILE_CARD_TARGET_TOP = 74;

function formatRelativeTime(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return 'ahora';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return 'ahora';
  if (diffMinutes < 60) return `${diffMinutes}m`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d`;
}

export default function TabNavigator({ navigation }) {
  const { user, isLoggedIn } = useAuth();
  const { colors, spacing, typography, textScale, darkMode, highContrast } = useAppTheme();
  const { width, height } = useWindowDimensions();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [modalNotifications, setModalNotifications] = useState([]);
  const [loadingModalNotifications, setLoadingModalNotifications] = useState(false);
  const [loadingDeleteNotifications, setLoadingDeleteNotifications] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showProfileTransition, setShowProfileTransition] = useState(false);
  const [isProfileAnimating, setIsProfileAnimating] = useState(false);
  const profileTransition = useRef(new Animated.Value(0)).current;
  const notificationsAnim = useRef(new Animated.Value(0)).current;
  const socketRef = useRef(null);
  const profileCloseButtonSource = highContrast
    ? closeButtonContrast
    : darkMode
      ? closeButtonDark
      : closeButtonLight;

  const profilePreview = {
    username: isLoggedIn && user?.username ? user.username : 'Invitado',
    team: isLoggedIn && user?.team ? user.team : 'Sin equipo',
    position: isLoggedIn && user?.position ? user.position : '---',
    rating: isLoggedIn ? 88 : 0,
    profileImageUrl: isLoggedIn ? user?.profileImageUrl : null,
    teamImageUrl: isLoggedIn ? user?.teamImageUrl : null,
    frameImageId: isLoggedIn ? user?.frameImageId : null,
    frameId: isLoggedIn ? user?.frameId : null,
  };

  const startAnimationFromProfileTab = (navigation) => {
    if (isProfileAnimating) {
      return;
    }

    setIsProfileAnimating(true);
    setShowProfileTransition(true);
    profileTransition.setValue(0);

    Animated.sequence([
      Animated.timing(profileTransition, {
        toValue: 0.92,
        duration: 620,
        easing: Easing.bezier(0.2, 0.9, 0.25, 1),
        useNativeDriver: true,
      }),
      Animated.timing(profileTransition, {
        toValue: 1,
        duration: 140,
        easing: Easing.out(Easing.back(1.8)),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      setShowProfileTransition(false);
      setIsProfileAnimating(false);
      if (finished) {
        navigation.navigate('Profile');
      }
    });
  };

  const startAnimationToFeedFromProfile = (navigation) => {
    if (isProfileAnimating) {
      return;
    }

    setIsProfileAnimating(true);
    setShowProfileTransition(true);
    profileTransition.setValue(1);

    Animated.sequence([
      Animated.timing(profileTransition, {
        toValue: 0.08,
        duration: 620,
        easing: Easing.bezier(0.2, 0.9, 0.25, 1),
        useNativeDriver: true,
      }),
      Animated.timing(profileTransition, {
        toValue: 0,
        duration: 140,
        easing: Easing.out(Easing.back(1.8)),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      setShowProfileTransition(false);
      setIsProfileAnimating(false);
      if (finished) {
        navigation.navigate('Home');
      }
    });
  };

  const initialScale = TAB_CARD_SIZE.width / PROFILE_CARD_SIZE.width;
  const tabStartLeft = width / 2 - TAB_CARD_SIZE.width / 2;
  const tabContentHeight = TAB_BAR_HEIGHT - TAB_BAR_VERTICAL_PADDING * 2;
  const tabStartTop =
    height -
    TAB_BAR_HEIGHT +
    TAB_BAR_VERTICAL_PADDING +
    (tabContentHeight - TAB_CARD_SIZE.height) / 2 +
    TAB_CARD_TRANSLATE_Y +
    TAB_CARD_DOCK_OFFSET_Y;
  const startX = tabStartLeft - (PROFILE_CARD_SIZE.width * (1 - initialScale)) / 2;
  const startY = tabStartTop - (PROFILE_CARD_SIZE.height * (1 - initialScale)) / 2;
  const targetX = width / 2 - PROFILE_CARD_SIZE.width / 2;
  const targetY = PROFILE_CARD_TARGET_TOP;
  const moveToX = targetX - startX;
  const moveToY = targetY - startY;

  const transitionTranslateY = profileTransition.interpolate({
    inputRange: [0, 0.3, 0.68, 0.9, 1],
    outputRange: [0, moveToY * 0.18, moveToY * 0.66, moveToY * 0.95, moveToY],
  });

  const transitionTranslateX = profileTransition.interpolate({
    inputRange: [0, 0.3, 0.62, 0.9, 1],
    outputRange: [0, moveToX - 28, moveToX + 24, moveToX - 6, moveToX],
  });

  const transitionScale = profileTransition.interpolate({
    inputRange: [0, 0.55, 0.9, 1],
    outputRange: [initialScale, initialScale * 1.22, 1.04, 1],
  });

  const transitionRotateZ = profileTransition.interpolate({
    inputRange: [0, 0.64, 1],
    outputRange: ['0deg', '540deg', '720deg'],
  });

  useEffect(() => {
    const loadModalNotifications = async () => {
      if (!showNotifications) return;

      if (!isLoggedIn || !user?.email) {
        setModalNotifications([]);
        return;
      }

      setLoadingModalNotifications(true);
      try {
        const currentUserEmail = String(user.email).trim().toLowerCase();
        const data = await getAllNotifications(currentUserEmail, 50, 50);
        const filtered = data.filter(
          (item) => String(item.recipientUserId || '').trim().toLowerCase() === currentUserEmail
        );

        const mapped = filtered.map((item) => ({
          id: item.id,
          user: String(item.actorUsername || item.actorUserId || 'Usuario').split('@')[0],
          actorUsername: item.actorUsername,
          action: 'le ha dado me gusta a tu video',
          videoId: item.videoId,
          videoTitle: item.videoTitle || '',
          time: formatRelativeTime(item.createdAt),
          actorProfileImageUrl: item.actorProfileImageUrl,
          actorTeamName: item.actorTeamName,
          actorTeamImageUrl: item.actorTeamImageUrl,
          actorFrameImageId: item.actorFrameImageId,
        }));

        setModalNotifications(mapped);
        await markNotificationsRead(currentUserEmail);
        setUnreadCount(0);
      } catch (error) {
        console.error('Error cargando notificaciones del modal:', error);
        setModalNotifications([]);
      } finally {
        setLoadingModalNotifications(false);
      }
    };

    loadModalNotifications();
  }, [showNotifications, isLoggedIn, user?.email]);

  useEffect(() => {
    if (showNotifications) {
      setShowNotificationsModal(true);
      notificationsAnim.setValue(0);
      Animated.timing(notificationsAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
      return;
    }

    if (showNotificationsModal) {
      Animated.timing(notificationsAnim, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setShowNotificationsModal(false);
        }
      });
    }
  }, [notificationsAnim, showNotifications, showNotificationsModal]);

  const handleDeleteAllNotifications = useCallback(async () => {
    if (!isLoggedIn || !user?.email) {
      Alert.alert('Error', 'Debes estar logueado para eliminar notificaciones.');
      return;
    }

    try {
      setLoadingDeleteNotifications(true);
      const currentUserEmail = String(user.email).trim().toLowerCase();
      await deleteAllNotifications(currentUserEmail);
      setModalNotifications([]);
      setUnreadCount(0);
      setShowDeleteConfirmModal(false);
    } catch (error) {
      console.error('Error al eliminar notificaciones:', error);
      Alert.alert('Error', `No se pudieron eliminar las notificaciones: ${error.message}`);
    } finally {
      setLoadingDeleteNotifications(false);
    }
  }, [isLoggedIn, user?.email]);

  // WebSocket para actualizar notificaciones en tiempo real
  useEffect(() => {
    if (!isLoggedIn || !user?.email) {
      // Desconectar si el usuario se desloguea
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setUnreadCount(0);
      return;
    }

    // Conectar al WebSocket
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_BASE_URL, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });

      // Cuando se conecta, enviar el email del usuario
      socketRef.current.on('connect', () => {
        console.log('📡 Conectado al WebSocket');
        socketRef.current.emit('userConnect', String(user.email).trim().toLowerCase());
      });

      // Escuchar nuevas notificaciones
      socketRef.current.on('newNotification', (notification) => {
        console.log('🔔 Nueva notificación:', notification);
        setUnreadCount((prev) => prev + 1);
      });

      socketRef.current.on('disconnect', () => {
        console.log('❌ Desconectado del WebSocket');
      });

      socketRef.current.on('error', (error) => {
        console.error('❌ Error en WebSocket:', error);
      });
    }

    // Cargar el contador inicial
    const loadInitialCount = async () => {
      try {
        const count = await getUnreadNotificationsCount(String(user.email).trim().toLowerCase());
        setUnreadCount(count);
      } catch (error) {
        console.error('Error cargando contador inicial:', error);
      }
    };

    loadInitialCount();

    // Limpiar al desmontar el componente
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [isLoggedIn, user?.email]);

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            height: TAB_BAR_HEIGHT,
            paddingTop: 8,
            paddingBottom: 8,
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            overflow: 'visible',
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarIcon: ({ color, focused }) => {
            if (route.name === 'Profile') {
              if (isProfileAnimating) {
                return <View style={[styles.profileCardTab, { opacity: 0 }]} />;
              }

              if (focused) {
                return (
                  <View style={styles.profileCardTab}>
                    <Image source={profileCloseButtonSource} style={styles.profileCardAsset} resizeMode="stretch" />
                  </View>
                );
              }

              return (
                <View
                  style={[
                    styles.profileCardTab,
                    { opacity: focused ? 1 : 0.78 },
                  ]}
                >
                  <FifaCard
                    size="small"
                    username={profilePreview.username}
                    team={profilePreview.team}
                    position={profilePreview.position}
                    rating={profilePreview.rating}
                    photoUrl={profilePreview.profileImageUrl}
                    backgroundUrl={profilePreview.teamImageUrl}
                    frameUrl={profilePreview.frameImageId}
                    frameId={profilePreview.frameId}
                    disableShadow
                  />
                </View>
              );
            }

            let icon = 'ellipse';

            if (route.name === 'Home') icon = focused ? 'home' : 'home-outline';
            if (route.name === 'Ranking') icon = focused ? 'trophy' : 'trophy-outline';
            if (route.name === 'Notifications') icon = focused ? 'notifications' : 'notifications-outline';
            if (route.name === 'Upload') icon = focused ? 'add-circle' : 'add-circle-outline';

            if (route.name === 'Notifications') {
              return (
                <View style={styles.iconWrap}>
                  <Ionicons name={icon} color={color} size={24} />
                  {unreadCount > 0 ? (
                    <View style={[styles.badge, { backgroundColor: colors.primary }]}> 
                      <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                    </View>
                  ) : null}
                </View>
              );
            }

            return <Ionicons name={icon} color={color} size={24} />;
          },
        })}
      >
        <Tab.Screen
          name="Home"
          component={getScreenComponent('HomeScreen')}
          listeners={{ tabPress: () => setShowNotifications(false) }}
        />
        <Tab.Screen
          name="Ranking"
          component={getScreenComponent('RankingScreen')}
          listeners={{ tabPress: () => setShowNotifications(false) }}
        />
        <Tab.Screen
          name="Profile"
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              setShowNotifications(false);

              const state = navigation.getState();
              const activeRoute = state.routes[state.index]?.name;
              const isOnProfile = activeRoute === 'Profile';

              if (!isOnProfile) {
                e.preventDefault();
                startAnimationFromProfileTab(navigation);
                return;
              }

              e.preventDefault();
              startAnimationToFeedFromProfile(navigation);
            },
          })}
        >
          {(screenProps) => {
            const ProfileScreen = getScreenComponent('ProfileScreen');
            return (
              <ProfileScreen
                {...screenProps}
                hideProfileCard={showProfileTransition && isProfileAnimating}
              />
            );
          }}
        </Tab.Screen>
        <Tab.Screen
          name="Notifications"
          component={getScreenComponent('NotificationsScreen')}
          listeners={{
            tabPress: (e) => {
              e.preventDefault();
              setShowNotifications((prev) => !prev);
            },
          }}
        />
        <Tab.Screen
          name="Upload"
          component={getScreenComponent('UploadScreen')}
          listeners={{ tabPress: () => setShowNotifications(false) }}
        />
      </Tab.Navigator>

      {showProfileTransition ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.profileTransitionCard,
            {
              left: startX,
              top: startY,
              transform: [
                { translateX: transitionTranslateX },
                { translateY: transitionTranslateY },
                { rotateZ: transitionRotateZ },
                { scale: transitionScale },
              ],
            },
          ]}
        >
          <FifaCard
            size="xlarge"
            username={profilePreview.username}
            team={profilePreview.team}
            position={profilePreview.position}
            rating={profilePreview.rating}
            photoUrl={profilePreview.profileImageUrl}
            backgroundUrl={profilePreview.teamImageUrl}
            frameUrl={profilePreview.frameImageId}
            frameId={profilePreview.frameId}
            disableShadow
          />
        </Animated.View>
      ) : null}

      <Modal
        visible={showNotificationsModal}
        transparent
        animationType="none"
        onRequestClose={() => {
          setShowDeleteConfirmModal(false);
          setShowNotifications(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowNotifications(false)} pointerEvents="auto">
            <Animated.View style={[styles.modalBackdrop, { backgroundColor: colors.overlay, opacity: notificationsAnim }]} pointerEvents="none" />
          </Pressable>
          {modalNotifications.length > 0 && (
            <Pressable
              onPress={() => setShowDeleteConfirmModal(true)}
              style={[styles.cleanButtonFixed, { backgroundColor: colors.danger }]}
            >
              <Ionicons name="trash-outline" size={28} color={colors.white} />
            </Pressable>
          )}
          <Animated.View
            style={[
              styles.bottomSheet,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                transform: [
                  {
                    translateY: notificationsAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [420, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}> 
              <Text
                style={{
                  color: colors.text,
                  fontWeight: typography.weights.bold,
                  fontFamily: typography.families.nougat,
                  fontSize: typography.sizes.xl * textScale,
                  textAlign: 'center',
                  flex: 1,
                }}
              >
                NOTIFICACIONES
              </Text>
              <Pressable onPress={() => setShowNotifications(false)}>
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <FlatList
              data={modalNotifications}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={{ padding: spacing.sm, paddingBottom: spacing.md }}
              renderItem={({ item }) => (
                <NotificationItem
                  item={item}
                  onOpenVideo={(videoId) => {
                    if (!videoId) return;
                    setShowNotifications(false);
                    navigation.navigate('MyVideos', {
                      videoId,
                      sourceTab: 'uploaded',
                    });
                  }}
                />
              )}
              ListEmptyComponent={
                <View style={{ paddingTop: spacing.sm, alignItems: 'center' }}>
                  <Text style={{ color: colors.textMuted }}>
                    {loadingModalNotifications ? 'Cargando notificaciones...' : 'No tienes notificaciones'}
                  </Text>
                </View>
              }
            />
          </Animated.View>
        </View>
      </Modal>

      <Modal
        visible={showDeleteConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirmModal(false)}
      >
        <View style={styles.confirmOverlay}>
          <Pressable
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]}
            onPress={() => setShowDeleteConfirmModal(false)}
          />
          <View style={[styles.confirmCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="trash-outline" size={34} color={colors.danger} />
            <Text
              style={{
                color: colors.text,
                fontFamily: typography.families.nougat,
                fontSize: typography.sizes.lg * textScale,
                fontWeight: typography.weights.bold,
                textAlign: 'center',
                marginTop: spacing.sm,
              }}
            >
              ¿Quieres borrar notificaciones?
            </Text>
            <Text
              style={{
                color: colors.textMuted,
                textAlign: 'center',
                marginTop: spacing.xs,
                lineHeight: 20,
              }}
            >
              Se eliminarán todas las notificaciones de este usuario.
            </Text>

            <View style={styles.confirmActions}>
              <Pressable
                onPress={() => setShowDeleteConfirmModal(false)}
                style={[styles.confirmButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              >
                <Text style={{ color: colors.text, fontWeight: typography.weights.semibold }}>Borrar</Text>
              </Pressable>

              <Pressable
                onPress={handleDeleteAllNotifications}
                style={[styles.confirmButton, { backgroundColor: colors.danger, borderColor: colors.danger }]}
              >
                <Text style={{ color: colors.white, fontWeight: typography.weights.semibold }}>Confirmar</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <LoadingOverlay visible={loadingDeleteNotifications} />
    </>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomSheet: {
    width: '100%',
    maxHeight: '72%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  sheetHeader: {
    minHeight: 48,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  cleanButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cleanButtonFixed: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  confirmOverlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 340,
    borderWidth: 1,
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCardTab: {
    width: 84,
    height: 120,
    borderRadius: 9,
    overflow: 'hidden',
    transform: [{ translateY: TAB_CARD_TRANSLATE_Y }],
  },
  profileTransitionCard: {
    position: 'absolute',
    zIndex: 999,
  },
  profileCardAsset: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
});
