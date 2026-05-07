import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Animated, Dimensions, FlatList, Pressable, StyleSheet, Text, View, ActivityIndicator, RefreshControl, Alert, Image, ScrollView, TextInput, Modal, Platform } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode, Audio } from 'expo-av';
import { useAppTheme } from '../hooks/useAppTheme';
import { getVideos, getCategories, likeVideo, unlikeVideo, getVideoComments, postVideoComment, uploadCommentAudio, deleteVideoComment } from '../api/backend';
import { useAuth } from '../context/AuthContext';
import { formatLikes } from '../utils/format';

const isLikelyVideoUrl = (url) => {
  const value = String(url || '').toLowerCase();
  return value.includes('/video/') || value.endsWith('.mp4') || value.endsWith('.mov') || value.endsWith('.m4v');
};

const MediaCarousel = ({ urls, height }) => {
  const { colors } = useAppTheme();
  const [activeDot, setActiveDot] = useState(0);
  const [width, setWidth] = useState(0);

  const handleScrollEnd = (event) => {
    if (!width) return;
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setActiveDot(Math.max(0, Math.min(nextIndex, urls.length - 1)));
  };

  return (
    <View
      style={[styles.mediaContainer, { height }]}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
      >
        {urls.map((url) => (
          <Image
            key={url}
            source={{ uri: url }}
            resizeMode="cover"
            style={{ width: width || '100%', height }}
          />
        ))}
      </ScrollView>

      {urls.length > 1 ? (
        <View style={styles.dotsRow}>
          {urls.map((_, index) => (
            <View
              key={`dot-${index}`}
              style={[
                styles.dot,
                {
                  backgroundColor: index === activeDot ? colors.white : 'rgba(255,255,255,0.5)',
                  width: index === activeDot ? 16 : 6,
                },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};

const FeedVideoItem = ({ video, isActive, height, onLikePress, onCommentPress, commentsCount, liking, isAudioPlaying }) => {
  const { colors, typography, textScale, spacing } = useAppTheme();
  const videoRef = useRef(null);
  const lastTapRef = useRef(0);
  const mediaUrls = Array.isArray(video.mediaUrls) && video.mediaUrls.length
    ? video.mediaUrls
    : video.url
      ? [video.url]
      : [];
  const mediaType = video.mediaType || (isLikelyVideoUrl(video.url) ? 'video' : 'image');
  const isVideo = mediaType === 'video';

  useEffect(() => {
    if (!isVideo) return;
    // Asegurar que el audio se escuche en iOS incluso con el boton de silencio
    Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
  }, [isVideo]);

  useEffect(() => {
    let cancelled = false;

    const syncPlayback = async () => {
      if (!videoRef.current || cancelled) return;

      try {
        if (isActive && !isAudioPlaying) {
          await videoRef.current.playAsync();
        } else {
          await videoRef.current.pauseAsync();
          await videoRef.current.setPositionAsync(0);
        }
      } catch (error) {
        console.log('Playback sync error:', error);
      }
    };

    syncPlayback();

    return () => {
      cancelled = true;
    };
  }, [isActive, isVideo, isAudioPlaying]);

  const handleMediaTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 250) {
      onLikePress(video);
    }
    lastTapRef.current = now;
  };

  return (
    <Pressable style={[styles.videoContainer, { height }]} onPress={handleMediaTap}> 
      {isVideo ? (
        <Video
          ref={videoRef}
          style={StyleSheet.absoluteFillObject}
          source={{ uri: video.url }}
          resizeMode={ResizeMode.CONTAIN}
          isLooping
          shouldPlay={isActive && !isAudioPlaying}
          isMuted={!isActive || isAudioPlaying}
          volume={1.0}
        />
      ) : mediaUrls.length > 1 ? (
        <MediaCarousel urls={mediaUrls} height={height} />
      ) : (
        <Image
          source={{ uri: video.url }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.8)']}
        style={styles.bottomGradient}
      />
      
      <View style={[styles.infoWrapper, { bottom: spacing.md }]}>
        <Text style={[styles.title, { fontSize: typography.sizes.lg * textScale, color: colors.white, fontWeight: 'bold' }]}>
          @{video.id_usuario ? video.id_usuario.split('@')[0] : 'usuario'}
        </Text>
        <Text style={[styles.description, { fontSize: typography.sizes.md * textScale, color: colors.white }]}>
          {video.title}
        </Text>
        {video.description ? (
           <Text style={[styles.descriptionText, { fontSize: typography.sizes.sm * textScale, color: '#DDD', marginTop: 4 }]}>
              {video.description}
           </Text>
        ) : null}
        <View style={[styles.categoryBadge, { backgroundColor: colors.primary }]}>
          <Text style={[styles.categoryText, { color: colors.black, fontWeight: 'bold', fontSize: typography.sizes.xs }]}>
            {video.category}
          </Text>
        </View>
      </View>

      <View style={[styles.sideActions, { bottom: spacing.xxl }]}>
        <Pressable style={styles.actionWrap} onPress={() => onLikePress(video)} disabled={liking}>
          <View style={[styles.actionCircle, { backgroundColor: `${colors.black}88` }]}>
            <Ionicons name={video.hasLiked ? 'heart' : 'heart-outline'} size={28} color={video.hasLiked ? '#ef4444' : colors.white} />
          </View>
          <Text style={styles.actionText}>{formatLikes(video.likes || 0)}</Text>
        </Pressable>

        <Pressable style={styles.actionWrap} onPress={() => onCommentPress(video.id)}>
          <View style={[styles.actionCircle, { backgroundColor: `${colors.black}88` }]}>
            <Ionicons name="chatbubble-outline" size={26} color={colors.white} />
          </View>
          <Text style={styles.actionText}>{commentsCount}</Text>
        </Pressable>

        <Pressable style={styles.actionWrap}>
          <View style={[styles.actionCircle, { backgroundColor: `${colors.black}88` }]}>
            <Ionicons name="share-social-outline" size={26} color={colors.white} />
          </View>
          <Text style={styles.actionText}>Compartir</Text>
        </Pressable>
      </View>
    </Pressable>
  );
};

export default function HomeScreen({ navigation }) {
  const { colors, typography, textScale, darkMode, highContrast } = useAppTheme();
  const isFocused = useIsFocused();
  const { user, isLoggedIn } = useAuth();
  
  const [videos, setVideos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [likingVideoId, setLikingVideoId] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [commentsByVideo, setCommentsByVideo] = useState({});
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const commentsAnim = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get('window').width;
  const recordingRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaChunksRef = useRef([]);
  const audioRef = useRef(null);
  const [activeAudioId, setActiveAudioId] = useState(null);
  const [audioPositionMs, setAudioPositionMs] = useState(0);
  const [audioDurationMs, setAudioDurationMs] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const offsetRef = useRef(0);
  const hasMoreRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const activeIndexRef = useRef(0);
  const listRef = useRef(null);
  const categoryItemFontSize = 22 * textScale;
  const categorySelectedFontSize = 26 * textScale;
  const categoryTextColor = highContrast
    ? colors.primary
    : darkMode
      ? colors.white
      : '#1E40AF';
  const categoryLabel = selectedCategory || 'Últimos videos';

  const normalizedSelectedCategory = String(selectedCategory || '').trim().toLowerCase();
  const visibleVideos = normalizedSelectedCategory
    ? videos.filter((video) => String(video.category || '').trim().toLowerCase() === normalizedSelectedCategory)
    : videos;

  const loadCategories = useCallback(async () => {
    try {
      const data = await getCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    }
  }, []);

  const refreshFeed = useCallback(async () => {
    setRefreshing(true);

    try {
      const limit = 5;
      const data = await getVideos(limit, 0, selectedCategory);
      const currentUserId = String(user?.email || '').trim().toLowerCase();
      const normalizedData = data.map((video) => {
        const likedBy = Array.isArray(video.likedBy) ? video.likedBy.map((value) => String(value).toLowerCase()) : [];
        return {
          ...video,
          hasLiked: currentUserId ? likedBy.includes(currentUserId) : false,
        };
      });

      setVideos(normalizedData);
      setActiveIndex(0);
      activeIndexRef.current = 0;

      const nextOffset = data.length;
      offsetRef.current = nextOffset;
      setOffset(nextOffset);

      const nextHasMore = data.length === limit;
      hasMoreRef.current = nextHasMore;
      setHasMore(nextHasMore);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [user?.email, selectedCategory]);

  const fetchMoreFeedVideos = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreRef.current) return;

    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const limit = 5;
      const currentOffset = offsetRef.current;
      const data = await getVideos(limit, currentOffset, selectedCategory);
      const currentUserId = String(user?.email || '').trim().toLowerCase();
      const normalizedData = data.map((video) => {
        const likedBy = Array.isArray(video.likedBy) ? video.likedBy.map((value) => String(value).toLowerCase()) : [];
        return {
          ...video,
          hasLiked: currentUserId ? likedBy.includes(currentUserId) : false,
        };
      });

      setVideos((prev) => [...prev, ...normalizedData]);

      const nextOffset = currentOffset + data.length;
      offsetRef.current = nextOffset;
      setOffset(nextOffset);

      const nextHasMore = data.length === limit;
      hasMoreRef.current = nextHasMore;
      setHasMore(nextHasMore);
    } catch (error) {
      console.error('Error fetching more videos:', error);
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [user?.email, selectedCategory]);

  const handleLike = useCallback(async (video) => {
    if (!isLoggedIn || !user?.email) {
      Alert.alert('Inicia sesion', 'Debes iniciar sesion para gestionar likes.');
      return;
    }

    if (!video?.id || likingVideoId === video.id) return;

    const wasLiked = Boolean(video.hasLiked);

    setLikingVideoId(video.id);

    // Actualizacion optimista para una respuesta instantanea en UI.
    setVideos((prev) => prev.map((item) => (
      item.id === video.id
        ? {
            ...item,
            likes: wasLiked
              ? Math.max(0, Number(item.likes || 0) - 1)
              : Number(item.likes || 0) + 1,
            hasLiked: !wasLiked,
          }
        : item
    )));

    try {
      const response = wasLiked
        ? await unlikeVideo(video.id, user.email)
        : await likeVideo(video.id, user.email);

      setVideos((prev) => prev.map((item) => (
        item.id === video.id
          ? {
              ...item,
              likes: Number(response.likes ?? item.likes ?? 0),
              hasLiked: Boolean(response.liked),
            }
          : item
      )));
    } catch (error) {
      // Revertir optimista en caso de fallo real.
      setVideos((prev) => prev.map((item) => (
        item.id === video.id
          ? {
              ...item,
              likes: wasLiked
                ? Number(item.likes || 0) + 1
                : Math.max(0, Number(item.likes || 0) - 1),
              hasLiked: wasLiked,
            }
          : item
      )));
      Alert.alert('Error', error.message || 'No se pudo actualizar el like.');
    } finally {
      setLikingVideoId(null);
    }
  }, [isLoggedIn, user?.email, likingVideoId]);

  const mapComment = useCallback((comment) => ({
    id: comment.id,
    author: comment.username,
    userId: comment.userId,
    type: comment.type,
    content: comment.type === 'audio' ? null : comment.text,
    audioUrl: comment.audioUrl,
  }), []);

  const openComments = useCallback(async (videoId) => {
    setSelectedVideoId(videoId);
    setShowComments(true);
    try {
      const data = await getVideoComments(videoId);
      setCommentsByVideo((prev) => ({
        ...prev,
        [videoId]: data.map(mapComment),
      }));
      setVideos((prev) => prev.map((item) => (
        item.id === videoId
          ? { ...item, commentsCount: data.length }
          : item
      )));
    } catch (error) {
      console.error('Error cargando comentarios:', error);
    }
  }, [mapComment]);

  const closeComments = useCallback(() => {
    Animated.timing(commentsAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) return;
      if (audioRef.current) {
        audioRef.current.pauseAsync().catch(() => {});
      }
      setIsAudioPlaying(false);
      setShowComments(false);
      setSelectedVideoId(null);
      setCommentText('');
      setIsRecording(false);
    });
  }, [commentsAnim]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.unloadAsync().catch(() => {});
        audioRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const formatTime = (ms) => {
    if (!ms || ms < 0) return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleToggleAudio = useCallback(async (comment) => {
    const audioUrl = comment?.audioUrl || comment?.audio_url;
    if (!audioUrl || audioUrl === 'pending') {
      Alert.alert('Audio no disponible', 'Este comentario aun no tiene audio.');
      return;
    }

    try {
      if (activeAudioId === comment.id && audioRef.current) {
        const status = await audioRef.current.getStatusAsync();
        if (status.isPlaying) {
          await audioRef.current.pauseAsync();
          setIsAudioPlaying(false);
        } else {
          await audioRef.current.playAsync();
          setIsAudioPlaying(true);
        }
        return;
      }

      if (audioRef.current) {
        await audioRef.current.unloadAsync();
        audioRef.current = null;
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          setAudioPositionMs(status.positionMillis || 0);
          setAudioDurationMs(status.durationMillis || 0);
          setIsAudioPlaying(Boolean(status.isPlaying));
          if (status.didJustFinish) {
            setIsAudioPlaying(false);
            setAudioPositionMs(0);
          }
        }
      );

      audioRef.current = sound;
      setActiveAudioId(comment.id);
      setIsAudioPlaying(true);
    } catch (error) {
      Alert.alert('Error', 'No se pudo reproducir el audio.');
    }
  }, [activeAudioId]);

  useEffect(() => {
    offsetRef.current = 0;
    setOffset(0);
    hasMoreRef.current = true;
    setHasMore(true);
    loadingMoreRef.current = false;
    setLoadingMore(false);
    activeIndexRef.current = 0;
    setActiveIndex(0);
    setVideos([]);
    setLoading(true);
    if (!listRef.current) return;
    listRef.current.scrollToOffset({ offset: 0, animated: false });
  }, [selectedCategory]);

  const handleDeleteComment = useCallback((commentId) => {
    if (!selectedVideoId || !commentId || !user?.email) return;
    Alert.alert('Eliminar comentario', 'Quieres eliminar este comentario?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Borrar',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteVideoComment(commentId, user.email);
            setCommentsByVideo((prev) => ({
              ...prev,
              [selectedVideoId]: (prev[selectedVideoId] || []).filter((c) => c.id !== commentId),
            }));
            setVideos((prev) => prev.map((item) => (
              item.id === selectedVideoId
                ? { ...item, commentsCount: Math.max(0, (item.commentsCount || 0) - 1) }
                : item
            )));
          } catch (error) {
            Alert.alert('Error', error.message || 'No se pudo eliminar el comentario.');
          }
        },
      },
    ]);
  }, [selectedVideoId, user?.email]);

  const handleStopRecording = useCallback(async () => {
    if (!selectedVideoId) return;

    if (Platform.OS === 'web') {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') return;
      setIsUploadingAudio(true);

      const stopPromise = new Promise((resolve) => {
        recorder.onstop = () => resolve();
      });

      recorder.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      setIsRecording(false);

      await stopPromise;

      try {
        const blob = new Blob(mediaChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'comment-audio.webm', { type: 'audio/webm' });
        const formData = new FormData();
        formData.append('file', file);
        const uploadResult = await uploadCommentAudio(formData);
        const payload = {
          id_usuario: user?.email || 'usuario',
          username: user?.username || (user?.email ? user.email.split('@')[0] : 'usuario'),
          type: 'audio',
          text: null,
          audioUrl: uploadResult.url,
        };
        const response = await postVideoComment(selectedVideoId, payload);
        const formatted = mapComment(response);
        setCommentsByVideo((prev) => ({
          ...prev,
          [selectedVideoId]: [formatted, ...(prev[selectedVideoId] || [])],
        }));
        setVideos((prev) => prev.map((item) => (
          item.id === selectedVideoId
            ? { ...item, commentsCount: (item.commentsCount || 0) + 1 }
            : item
        )));
      } catch (error) {
        Alert.alert('Error', error.message || 'No se pudo subir el audio.');
      } finally {
        setIsUploadingAudio(false);
      }

      return;
    }

    try {
      const recording = recordingRef.current;
      if (!recording) return;
      setIsRecording(false);
      setIsUploadingAudio(true);
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      recordingRef.current = null;

      if (!uri) {
        setIsUploadingAudio(false);
        Alert.alert('Error', 'No se pudo obtener el audio.');
        return;
      }

      const formData = new FormData();
      formData.append('file', {
        uri,
        type: 'audio/m4a',
        name: 'comment-audio.m4a',
      });

      const uploadResult = await uploadCommentAudio(formData);
      const payload = {
        id_usuario: user?.email || 'usuario',
        username: user?.username || (user?.email ? user.email.split('@')[0] : 'usuario'),
        type: 'audio',
        text: null,
        audioUrl: uploadResult.url,
      };

      const response = await postVideoComment(selectedVideoId, payload);
      const formatted = mapComment(response);

      setCommentsByVideo((prev) => ({
        ...prev,
        [selectedVideoId]: [formatted, ...(prev[selectedVideoId] || [])],
      }));
      setVideos((prev) => prev.map((item) => (
        item.id === selectedVideoId
          ? { ...item, commentsCount: (item.commentsCount || 0) + 1 }
          : item
      )));
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo subir el audio.');
    } finally {
      setIsUploadingAudio(false);
    }
  }, [selectedVideoId, user?.email, user?.username, mapComment]);

  useEffect(() => {
    if (!showComments) return;
    commentsAnim.setValue(0);
    Animated.timing(commentsAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [showComments, commentsAnim]);

  const handleSendComment = useCallback(async () => {
    if (!selectedVideoId) return;
    if (isUploadingAudio) {
      Alert.alert('Espera', 'Se esta subiendo el audio.');
      return;
    }

    if (isRecording) {
      await handleStopRecording();
      return;
    }

    if (!commentText.trim()) {
      Alert.alert('Vacio', 'Escribe un comentario o graba un audio.');
      return;
    }

    try {
      const payload = {
        id_usuario: user?.email || 'usuario',
        username: user?.username || (user?.email ? user.email.split('@')[0] : 'usuario'),
        type: 'text',
        text: commentText.trim(),
        audioUrl: null,
      };

      const response = await postVideoComment(selectedVideoId, payload);
      const formatted = mapComment(response);

      setCommentsByVideo((prev) => ({
        ...prev,
        [selectedVideoId]: [formatted, ...(prev[selectedVideoId] || [])],
      }));
      setVideos((prev) => prev.map((item) => (
        item.id === selectedVideoId
          ? { ...item, commentsCount: (item.commentsCount || 0) + 1 }
          : item
      )));
      setCommentText('');
      setIsRecording(false);
    } catch (error) {
      Alert.alert('Error', error.message || 'No se pudo enviar el comentario.');
    }
  }, [commentText, isRecording, isUploadingAudio, selectedVideoId, user?.email, user?.username, mapComment, handleStopRecording]);

  const handleToggleRecording = useCallback(async () => {
    if (!selectedVideoId) return;

    if (isUploadingAudio || isRecording) return;

    if (Platform.OS === 'web') {
      if (!navigator?.mediaDevices?.getUserMedia || !globalThis.MediaRecorder) {
        Alert.alert('No disponible', 'Tu navegador no soporta grabacion de audio.');
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        const recorder = new MediaRecorder(stream);
        mediaChunksRef.current = [];
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            mediaChunksRef.current.push(event.data);
          }
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setCommentText('');
        setIsRecording(true);
      } catch (error) {
        Alert.alert('Permisos requeridos', 'Necesitas permisos de microfono.');
      }
      return;
    }

    if (!isRecording) {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permisos requeridos', 'Necesitas permisos de microfono.');
        return;
      }

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      recordingRef.current = recording;
      setCommentText('');
      setIsRecording(true);
      return;
    }
  }, [selectedVideoId, isRecording, isUploadingAudio, user?.email, user?.username, mapComment]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useFocusEffect(
    useCallback(() => {
      refreshFeed();
    }, [refreshFeed])
  );

  const onRefresh = useCallback(() => {
    loadCategories();
    refreshFeed();
  }, [loadCategories, refreshFeed]);

  const updateActiveIndexFromOffset = useCallback((offsetY) => {
    if (!containerHeight || visibleVideos.length === 0) return;
    const nextIndex = Math.round(offsetY / containerHeight);
    const clampedIndex = Math.max(0, Math.min(nextIndex, visibleVideos.length - 1));
    if (clampedIndex !== activeIndexRef.current) {
      activeIndexRef.current = clampedIndex;
      setActiveIndex(clampedIndex);
    }
  }, [containerHeight, visibleVideos.length]);

  const onMomentumScrollEnd = useCallback((event) => {
    updateActiveIndexFromOffset(event.nativeEvent.contentOffset.y);
  }, [updateActiveIndexFromOffset]);

  const onScroll = useCallback((event) => {
    updateActiveIndexFromOffset(event.nativeEvent.contentOffset.y);
  }, [updateActiveIndexFromOffset]);

  const activeComments = selectedVideoId ? (commentsByVideo[selectedVideoId] || []) : [];

  return (
    <View style={styles.root}>
      <View style={styles.categoryBar}>
        <View
          style={[
            styles.categorySelectWrap,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Pressable style={styles.categorySelectButton} onPress={() => setShowCategoryPicker(true)}>
            <Text
              style={{
                color: categoryTextColor,
                fontFamily: typography.families.nougat,
                fontSize: categorySelectedFontSize,
                textAlign: 'center',
                flex: 1,
              }}
              numberOfLines={1}
            >
              {categoryLabel}
            </Text>
            <Ionicons name="chevron-down" size={20} color={categoryTextColor} />
          </Pressable>
        </View>
      </View>

      <Modal
        visible={showCategoryPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCategoryPicker(false)}
      >
        <Pressable
          style={[styles.categoryOverlay, { backgroundColor: colors.overlay }]}
          onPress={() => setShowCategoryPicker(false)}
        >
          <View style={[styles.categoryMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Pressable
              onPress={() => {
                setSelectedCategory('');
                setShowCategoryPicker(false);
              }}
              style={[
                styles.categoryMenuItem,
                selectedCategory === '' && { backgroundColor: `${colors.primary}22` },
              ]}
            >
              <Text
                style={{
                  color: categoryTextColor,
                  fontFamily: typography.families.nougat,
                  fontSize: categoryItemFontSize,
                  textAlign: 'center',
                }}
              >
                Últimos videos
              </Text>
            </Pressable>
            {categories.map((category) => (
              <Pressable
                key={category}
                onPress={() => {
                  setSelectedCategory(category);
                  setShowCategoryPicker(false);
                }}
                style={[
                  styles.categoryMenuItem,
                  category === selectedCategory && { backgroundColor: `${colors.primary}22` },
                ]}
              >
                <Text
                  style={{
                    color: categoryTextColor,
                    fontFamily: typography.families.nougat,
                    fontSize: categoryItemFontSize,
                    textAlign: 'center',
                  }}
                >
                  {category}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      <View style={styles.listWrap} onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}>
      {loading && videos.length === 0 ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : containerHeight > 0 ? (
        <FlatList
          ref={listRef}
          data={visibleVideos}
          extraData={{ activeIndex, isFocused, containerHeight }}
          renderItem={({ item, index }) => (
            <FeedVideoItem 
               video={item} 
               isActive={index === activeIndex && isFocused} 
               height={containerHeight}
               onLikePress={handleLike}
               onCommentPress={openComments}
               commentsCount={item.commentsCount ?? (commentsByVideo[item.id] || []).length}
               isAudioPlaying={isAudioPlaying}
               liking={likingVideoId === item.id}
            />
          )}
          keyExtractor={(item) => item.id.toString()}
          pagingEnabled
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={onMomentumScrollEnd}
          getItemLayout={(_, index) => ({
            length: containerHeight,
            offset: containerHeight * index,
            index,
          })}
          initialNumToRender={2}
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews
          onEndReached={fetchMoreFeedVideos}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
               <Text style={[styles.emptyText, { color: colors.white }]}>No hay videos publicados</Text>
            </View>
          }
        />
      ) : null}
      </View>

      <Modal visible={showComments} transparent animationType="none" onRequestClose={closeComments}>
        <View style={[styles.commentsOverlay, { backgroundColor: colors.overlay }]}> 
          <Animated.View
            style={[
              styles.commentsPanel,
              {
                backgroundColor: colors.surface,
                transform: [{ translateX: commentsAnim.interpolate({ inputRange: [0, 1], outputRange: [screenWidth, 0] }) }],
              },
            ]}
          >
            <View style={[styles.commentsHeader, { borderBottomColor: colors.border }]}> 
              <Text style={{ color: colors.text, fontWeight: '700', fontSize: 18 }}>Comentarios</Text>
              <Pressable onPress={closeComments}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
              {activeComments.length === 0 ? (
                <Text style={{ color: colors.textMuted }}>No hay comentarios todavia.</Text>
              ) : (
                activeComments.map((comment) => (
                  <View key={comment.id} style={styles.commentRow}>
                    <View style={[styles.commentAvatar, { backgroundColor: colors.surfaceElevated }]} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.commentHeaderRow}>
                        <Text style={{ color: colors.text, fontWeight: '700' }}>@{comment.author || comment.username}</Text>
                        {String(comment.userId || '').trim().toLowerCase() === String(user?.email || '').trim().toLowerCase() ? (
                          <Pressable onPress={() => handleDeleteComment(comment.id)} style={styles.commentDelete}>
                            <Ionicons name="trash" size={16} color={colors.danger} />
                          </Pressable>
                        ) : null}
                      </View>
                      {(comment.type || comment?.type) === 'audio' ? (
                        <Pressable
                          style={[styles.audioBubble, { backgroundColor: colors.surfaceElevated }]}
                          onPress={() => handleToggleAudio(comment)}
                        >
                          <Ionicons
                            name={activeAudioId === comment.id && isAudioPlaying ? 'pause' : 'play'}
                            size={16}
                            color={colors.text}
                          />
                          <Text style={{ color: colors.text, marginLeft: 8 }}>
                            {activeAudioId === comment.id
                              ? `${formatTime(audioPositionMs)} / ${formatTime(audioDurationMs)}`
                              : 'Audio'}
                          </Text>
                        </Pressable>
                      ) : (
                        <Text style={{ color: colors.text }}>{comment.content || comment.text}</Text>
                      )}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={[styles.commentInputRow, { borderTopColor: colors.border }]}> 
              <TextInput
                value={commentText}
                onChangeText={setCommentText}
                placeholder="Escribe un comentario..."
                placeholderTextColor={colors.textMuted}
                style={[styles.commentInput, { backgroundColor: colors.surfaceElevated, color: colors.text }]}
                editable={!isRecording && !isUploadingAudio}
              />
              <Pressable
                style={[styles.actionCircle, { backgroundColor: isRecording ? colors.primary : colors.surfaceElevated }]}
                onPress={handleToggleRecording}
              >
                <Ionicons name="mic" size={18} color={isRecording ? colors.black : colors.text} />
              </Pressable>
              <Pressable style={[styles.actionCircle, { backgroundColor: colors.primary }]} onPress={handleSendComment}>
                <Ionicons name="send" size={18} color={colors.black} />
              </Pressable>
            </View>
            {isRecording || isUploadingAudio ? (
              <View style={styles.recordingBar}>
                <View style={styles.recordingDot} />
                <Text style={{ color: colors.text }}>{isUploadingAudio ? 'Subiendo audio...' : 'Grabando audio...'}</Text>
              </View>
            ) : null}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  categoryBar: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6 },
  categorySelectWrap: { borderWidth: 0, borderRadius: 0, minHeight: 52, justifyContent: 'center', backgroundColor: 'transparent' },
  categorySelectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 8 },
  categoryOverlay: { flex: 1, justifyContent: 'center', padding: 18 },
  categoryMenu: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  categoryMenuItem: { paddingVertical: 14, paddingHorizontal: 16 },
  listWrap: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 200 },
  emptyText: { fontSize: 16, fontWeight: '600' },
  videoContainer: { width: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  mediaContainer: { width: '100%', backgroundColor: '#000' },
  dotsRow: { position: 'absolute', bottom: 18, width: '100%', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { height: 6, borderRadius: 3 },
  bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%' },
  infoWrapper: { position: 'absolute', left: 16, right: 80, zIndex: 10 },
  title: { marginBottom: 4, textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10 },
  description: { fontWeight: '500', textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10 },
  descriptionText: { textShadowColor: 'rgba(0, 0, 0, 0.75)', textShadowOffset: { width: -1, height: 1 }, textShadowRadius: 10 },
  categoryBadge: { marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  categoryText: { textTransform: 'uppercase' },
  sideActions: { position: 'absolute', right: 16, alignItems: 'center', gap: 20, zIndex: 10 },
  actionWrap: { alignItems: 'center', gap: 4 },
  actionCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  actionText: { color: '#FFF', fontSize: 12, fontWeight: 'bold' },
  commentsOverlay: { flex: 1, justifyContent: 'flex-end' },
  commentsPanel: { width: '92%', height: '100%', alignSelf: 'flex-end', borderTopLeftRadius: 24, borderBottomLeftRadius: 24 },
  commentsHeader: { padding: 16, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  commentRow: { flexDirection: 'row', gap: 10 },
  commentHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  commentDelete: { marginLeft: 8, padding: 4 },
  commentAvatar: { width: 38, height: 38, borderRadius: 19 },
  commentInputRow: { borderTopWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  commentInput: { flex: 1, minHeight: 46, borderRadius: 24, paddingHorizontal: 16 },
  audioBubble: { marginTop: 6, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' },
  recordingBar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 16 },
  recordingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }
});
