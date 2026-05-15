import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from '../../utils/media';
import { useFocusEffect } from '@react-navigation/native';
import { getAllVideos, getCategories } from '../../api/backend';
import { useAppTheme } from '../../hooks/useAppTheme';
import ScreenGradient from '../../components/ScreenGradient';
import LoadingOverlay from '../../components/LoadingOverlay';

const qrCodeImage = require('../../../assets/qrcode.png');

function parseCreatedAt(value) {
  const timestamp = new Date(value || 0).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function isImageMedia(video) {
  const mediaType = String(video?.mediaType || '').toLowerCase();
  if (mediaType === 'image') return true;

  const firstMedia = Array.isArray(video?.mediaUrls) && video.mediaUrls.length
    ? video.mediaUrls[0]
    : video?.url;
  const source = String(firstMedia || '').toLowerCase();
  return /\.(png|jpg|jpeg|webp|gif)(\?|$)/.test(source);
}

function getPreviewUrl(video) {
  if (Array.isArray(video?.mediaUrls) && video.mediaUrls.length) {
    return video.mediaUrls[0];
  }
  return video?.url || '';
}

function VideoPreviewCard({ video, colors, typography, textScale }) {
  const previewUrl = getPreviewUrl(video);
  const imagePreview = isImageMedia(video);

  return (
    <View style={[styles.videoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
      <View style={styles.mediaFrame}>
        {imagePreview ? (
          <Image source={{ uri: previewUrl }} style={styles.media} resizeMode="cover" />
        ) : (
          <>
            <Video
              source={{ uri: previewUrl }}
              style={styles.media}
              shouldPlay={false}
              isMuted
              isLooping={false}
              resizeMode={ResizeMode.COVER}
            />
            <View style={styles.videoIconOverlay}>
              <Ionicons name="play-circle" size={34} color="#FFFFFFE6" />
            </View>
          </>
        )}
      </View>

      <View style={styles.videoMeta}>
        <Text
          style={{
            color: colors.text,
            fontSize: typography.sizes.sm * textScale,
            fontWeight: typography.weights.bold,
          }}
          numberOfLines={1}
        >
          {video?.title || 'Video'}
        </Text>
        <Text
          style={{
            color: colors.textMuted,
            fontSize: typography.sizes.xs * textScale,
            marginTop: 4,
          }}
          numberOfLines={1}
        >
          {video?.category || 'Sin categoria'}
        </Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const { colors, spacing, typography, textScale } = useAppTheme();
  const categorySelectorRef = useRef(null);
  const [videos, setVideos] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categoryPickerAnchor, setCategoryPickerAnchor] = useState({ x: 20, y: 110, width: 300, height: 50 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFeedData = useCallback(async () => {
    try {
      const [allVideos, availableCategories] = await Promise.all([
        getAllVideos(20, 60),
        getCategories(),
      ]);

      setVideos(Array.isArray(allVideos) ? allVideos : []);
      setCategories(Array.isArray(availableCategories) ? availableCategories.filter(Boolean) : []);
    } catch (error) {
      console.error('Error loading desktop feed:', error);
      setVideos([]);
      setCategories([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const run = async () => {
        setLoading(true);
        await loadFeedData();
        if (mounted) setLoading(false);
      };

      run();
      return () => {
        mounted = false;
      };
    }, [loadFeedData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFeedData();
    setRefreshing(false);
  }, [loadFeedData]);

  const sortedVideos = useMemo(() => {
    const normalized = [...videos].sort((left, right) => parseCreatedAt(right?.createdAt) - parseCreatedAt(left?.createdAt));

    if (!selectedCategory) {
      return normalized;
    }

    return normalized.filter((video) => String(video?.category || '').trim().toLowerCase() === selectedCategory.toLowerCase());
  }, [videos, selectedCategory]);

  const centralColumnVideos = useMemo(
    () => sortedVideos.filter((_, index) => index % 2 === 0),
    [sortedVideos]
  );
  const rightColumnVideos = useMemo(
    () => sortedVideos.filter((_, index) => index % 2 !== 0),
    [sortedVideos]
  );

  const selectedCategoryLabel = selectedCategory || 'Últimas Subidas';

  const openCategoryPicker = useCallback(() => {
    const node = categorySelectorRef.current;
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((x, y, width, height) => {
        setCategoryPickerAnchor({
          x: Number.isFinite(x) ? x : 20,
          y: Number.isFinite(y) ? y : 110,
          width: Number.isFinite(width) ? width : 300,
          height: Number.isFinite(height) ? height : 50,
        });
        setShowCategoryPicker(true);
      });
      return;
    }

    setShowCategoryPicker(true);
  }, []);

  return (
    <ScreenGradient>
      <View style={styles.root}>
        <View style={[styles.leftPanel, { borderRightColor: colors.border, paddingHorizontal: spacing.lg, paddingTop: spacing.xl }]}> 
          <Pressable
            ref={categorySelectorRef}
            onPress={openCategoryPicker}
            style={({ pressed }) => [
              styles.categorySelector,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                opacity: pressed ? 0.85 : 1,
                paddingHorizontal: spacing.md,
              },
            ]}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: typography.sizes.md * textScale,
                fontWeight: typography.weights.semibold,
                fontFamily: typography.families.nougat,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {selectedCategoryLabel}
            </Text>
            <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
          </Pressable>

          <View style={styles.qrBlock}>
            <Text
              style={{
                color: colors.text,
                fontSize: typography.sizes.xl * textScale,
                fontWeight: typography.weights.bold,
                fontFamily: typography.families.nougat,
                textAlign: 'center',
                marginBottom: spacing.md,
                paddingHorizontal: spacing.sm,
              }}
            >
              Prueba la Aplicacion Movil desde aqui
            </Text>
            <Image source={qrCodeImage} style={styles.qrImage} resizeMode="contain" />
          </View>
        </View>

        <View style={[styles.feedColumnsWrapper, { paddingTop: spacing.lg, paddingHorizontal: spacing.md }]}> 
          <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            contentContainerStyle={{ paddingBottom: spacing.xl }}
          >
            <View style={styles.twoColumns}>
              <View style={styles.videoColumn}>
                {centralColumnVideos.map((video) => (
                  <VideoPreviewCard
                    key={String(video.id || video._id || Math.random())}
                    video={video}
                    colors={colors}
                    typography={typography}
                    textScale={textScale}
                  />
                ))}
              </View>

              <View style={styles.videoColumn}>
                {rightColumnVideos.map((video) => (
                  <VideoPreviewCard
                    key={String(video.id || video._id || Math.random())}
                    video={video}
                    colors={colors}
                    typography={typography}
                    textScale={textScale}
                  />
                ))}
              </View>
            </View>

            {!sortedVideos.length ? (
              <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.surface }]}> 
                <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
                  No hay videos para esta categoria.
                </Text>
              </View>
            ) : null}
          </ScrollView>
        </View>

        <Modal
          visible={showCategoryPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCategoryPicker(false)}
        >
          <Pressable
            style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}
            onPress={() => setShowCategoryPicker(false)}
          >
            <Pressable
              onPress={() => {}}
              style={[
                styles.modalCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  left: categoryPickerAnchor.x,
                  top: categoryPickerAnchor.y + categoryPickerAnchor.height + 6,
                  width: categoryPickerAnchor.width,
                },
              ]}
            >
              <Pressable
                onPress={() => {
                  setSelectedCategory('');
                  setShowCategoryPicker(false);
                }}
                style={({ pressed }) => [
                  styles.modalItem,
                  { opacity: pressed ? 0.75 : 1, borderBottomColor: colors.border },
                ]}
              >
                <Text style={{ color: colors.text, fontWeight: typography.weights.semibold, fontFamily: typography.families.nougat, fontSize: typography.sizes.md * textScale }}>
                  Últimas Subidas
                </Text>
              </Pressable>

              {categories.map((item) => (
                <Pressable
                  key={String(item)}
                  onPress={() => {
                    setSelectedCategory(String(item));
                    setShowCategoryPicker(false);
                  }}
                  style={({ pressed }) => [
                    styles.modalItem,
                    { opacity: pressed ? 0.75 : 1, borderBottomColor: colors.border },
                  ]}
                >
                  <Text style={{ color: colors.text, fontFamily: typography.families.nougat, fontSize: typography.sizes.md * textScale }}>
                    {String(item)}
                  </Text>
                </Pressable>
              ))}
            </Pressable>
          </Pressable>
        </Modal>

        <LoadingOverlay visible={loading} />
      </View>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    width: '33.3333%',
    borderRightWidth: 1,
  },
  categorySelector: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qrBlock: {
    marginTop: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrImage: {
    width: '82%',
    aspectRatio: 1,
    maxWidth: 320,
  },
  feedColumnsWrapper: {
    width: '66.6667%',
  },
  twoColumns: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  videoColumn: {
    flex: 1,
    gap: 16,
  },
  videoCard: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  mediaFrame: {
    width: '100%',
    aspectRatio: 9 / 16,
    backgroundColor: '#000000',
    position: 'relative',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  videoIconOverlay: {
    position: 'absolute',
    inset: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  videoMeta: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 18,
    padding: 16,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 14,
    overflow: 'hidden',
    maxHeight: 320,
  },
  modalItem: {
    minHeight: 48,
    borderBottomWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
