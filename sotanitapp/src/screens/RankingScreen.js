import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import StrokeText from '../components/StrokeText';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppTheme } from '../hooks/useAppTheme';
import useResetScrollOnFocus from '../hooks/useResetScrollOnFocus';
import ScreenGradient from '../components/ScreenGradient';
import FifaCard from '../components/FifaCard';
import { formatLikes } from '../utils/format';
import { getCategories, getWeeklyRankings } from '../api/backend';

export default function RankingScreen({ navigation }) {
  const { colors, spacing, typography, textScale, darkMode, highContrast } = useAppTheme();
  const categoryItemFontSize = 22 * textScale;
  const categorySelectedFontSize = 26 * textScale;
  const categoryTextColor = highContrast
    ? colors.primary
    : darkMode
      ? colors.white
      : colors.primary;
  const [categories, setCategories] = useState(['Todos']);
  const [category, setCategory] = useState('Todos');
  const [showPicker, setShowPicker] = useState(false);
  const [activeTab, setActiveTab] = useState('previous'); // 'previous' | 'live'
  const [loading, setLoading] = useState(true);
  const [rankingData, setRankingData] = useState({ general: [], selectedRanking: [], byCategory: {} });
  const [weekLabel, setWeekLabel] = useState('');
  const scrollRef = useRef(null);

  useResetScrollOnFocus(scrollRef);

  const loadCategories = useCallback(async () => {
    try {
      const data = await getCategories();
      const normalized = ['Todos', ...new Set((Array.isArray(data) ? data : []).map((value) => String(value || '').trim()).filter(Boolean))];
      setCategories(normalized);
      if (!normalized.includes(category)) {
        setCategory('Todos');
      }
    } catch (error) {
      console.error('Error cargando categorias del ranking:', error);
      setCategories(['Todos']);
    }
  }, [category]);

  const loadRanking = useCallback(async (selectedCategory = category, live = activeTab === 'live') => {
    setLoading(true);
    try {
      const data = await getWeeklyRankings(selectedCategory, live);
      setRankingData({
        general: Array.isArray(data?.general) ? data.general : [],
        selectedRanking: Array.isArray(data?.selectedRanking) ? data.selectedRanking : [],
        byCategory: data?.byCategory || {},
      });
      if (data?.week?.start && data?.week?.end) {
        const start = new Date(data.week.start);
        const end = new Date(data.week.end);
        const startLabel = start.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        const endLabel = end.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
        setWeekLabel(`${startLabel} - ${endLabel}`);
      } else {
        setWeekLabel('');
      }
    } catch (error) {
      console.error('Error cargando ranking semanal:', error);
      setRankingData({ general: [], selectedRanking: [], byCategory: {} });
      setWeekLabel('');
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadRanking(category, activeTab === 'live');
  }, [category, loadRanking]);

  useEffect(() => {
    loadRanking(category, activeTab === 'live');
  }, [activeTab]);

  useFocusEffect(
    useCallback(() => {
      loadCategories();
      loadRanking(category, activeTab === 'live');
    }, [category, loadCategories, loadRanking])
  );

  const activeRanking = useMemo(() => {
    if (category === 'Todos') {
      return rankingData.general;
    }
    return rankingData.selectedRanking;
  }, [category, rankingData.general, rankingData.selectedRanking]);

  const topThree = activeRanking.slice(0, 3);
  const hasResults = topThree.length > 0;

  const renderPodiumCard = (item, rank, size, accentColor) => {
    if (!item) {
      return (
        <View style={{ alignItems: 'center', width: size === 'large' ? 164 : 124 }}>
          <View style={[styles.emptyCard, { borderColor: colors.border, backgroundColor: `${colors.surface}AA` }]}>
            <Text style={{ color: colors.textMuted, fontWeight: typography.weights.semibold }}>Sin datos</Text>
          </View>
        </View>
      );
    }

    const numberColor = rank === 1 ? '#D4AF37' : rank === 2 ? '#C0C0C0' : '#CD7F32';
    const numberFontSize = size === 'large' ? 40 * textScale : 32 * textScale;

    return (
      <View style={{ alignItems: 'center', width: size === 'large' ? 164 : 124 }}>
        <View style={{ position: 'relative' }}>
          <View style={{ position: 'absolute', top: 8, right: 8, zIndex: 10, width: 56, alignItems: 'flex-end' }}>
            <StrokeText
              strokeColor="black"
              strokeWidth={3}
              style={{ fontFamily: typography.families.nougat, fontSize: numberFontSize, color: numberColor }}
            >
              {String(rank)}
            </StrokeText>
          </View>

          <FifaCard
            username={item.username}
            team={item.teamName || item.team}
            position={item.position}
            rating={item.rating}
            photoUrl={item.profileImageUrl}
            backgroundUrl={item.teamImageUrl}
            frameUrl={item.frameImageId}
            frameId={item.frameId}
            size={size}
            disableShadow
            onPress={() => navigation.navigate('Home', { videoId: item.videoId })}
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <Ionicons name="heart" size={size === 'large' ? 16 : 14} color="#EF4444" />
          <Text style={{ color: colors.text, fontWeight: typography.weights.bold }}>{formatLikes(item.likes)}</Text>
        </View>
        <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: typography.sizes.sm * textScale }}>
          {item.commentsCount} comentarios
        </Text>
        <Text style={{ color: colors.textMuted, marginTop: 4, fontSize: typography.sizes.xs * textScale }}>
          Puntuación: {item.score}
        </Text>
      </View>
    );
  };

  return (
    <ScreenGradient>
      <ScrollView ref={scrollRef} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={[styles.header, { borderBottomColor: colors.border, padding: spacing.md }]}> 
          <View style={[styles.categorySelectWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Pressable style={styles.categorySelectButton} onPress={() => setShowPicker(true)}>
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
                {category}
              </Text>
              <Ionicons name="chevron-down" size={20} color={categoryTextColor} />
            </Pressable>
          </View>

          <View style={styles.tabRow}>
            <Pressable onPress={() => setActiveTab('previous')} style={[styles.tabToggle, activeTab === 'previous' && { backgroundColor: `${colors.primary}22` }]}>
              <Text style={{ color: activeTab === 'previous' ? colors.primary : colors.text, fontWeight: typography.weights.bold, textAlign: 'center' }}>ULTIMOS GANADORES</Text>
            </Pressable>
            <Pressable onPress={() => setActiveTab('live')} style={[styles.tabToggle, activeTab === 'live' && { backgroundColor: `${colors.primary}22` }]}>
              <Text style={{ color: activeTab === 'live' ? colors.primary : colors.text, fontWeight: typography.weights.bold, textAlign: 'center' }}>RANKING EN VIVO</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ paddingHorizontal: spacing.xl, paddingTop: spacing.lg, alignItems: 'center' }}>
          <Text style={{ color: colors.primary, fontWeight: typography.weights.bold, fontSize: typography.sizes.xxl * textScale, fontFamily: typography.families.nougat }}>
            Ranking Semanal
          </Text>
          <Text style={{ color: colors.textMuted, marginTop: spacing.xs }}>Top 3 de la semana {weekLabel ? `· ${weekLabel}` : ''}</Text>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 60, alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : hasResults ? (
          <>
                <View style={{ paddingTop: 22, alignItems: 'center' }}>
                  {renderPodiumCard(topThree[0], 1, 'large', colors.primary)}
                </View>

            <View style={[styles.bottomPodium, { paddingHorizontal: spacing.md }]}> 
              {renderPodiumCard(topThree[1], 2, 'medium', '#9CA3AF')}
              {renderPodiumCard(topThree[2], 3, 'medium', '#B45309')}
            </View>
          </>
        ) : (
          <View style={{ paddingHorizontal: spacing.xl, paddingTop: 56, alignItems: 'center', gap: spacing.sm }}>
            <Text style={{ color: colors.text, fontSize: typography.sizes.lg * textScale, fontWeight: typography.weights.bold, textAlign: 'center' }}>
              Todavía no hay suficiente actividad para mostrar el ranking.
            </Text>
            <Text style={{ color: colors.textMuted, textAlign: 'center' }}>
              Cuando haya videos, likes y comentarios de esta semana aparecerán aquí.
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal visible={showPicker} transparent animationType="fade" onRequestClose={() => setShowPicker(false)}>
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={() => setShowPicker(false)}>
          <View style={[styles.menu, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            {categories.map((item) => (
              <Pressable
                key={item}
                onPress={() => {
                  setCategory(item);
                  setShowPicker(false);
                }}
                style={[styles.menuItem, item === category && { backgroundColor: `${colors.primary}22` }]}
              >
                <Text style={{ color: categoryTextColor, fontFamily: typography.families.nougat, fontSize: categoryItemFontSize, textAlign: 'center' }}>{item}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  categoryBtn: {
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  categorySelectWrap: { borderWidth: 0, borderRadius: 18, minHeight: 52, justifyContent: 'center', backgroundColor: 'transparent', width: '100%' },
  categorySelectButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 8 },
  categoryMenu: { borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  categoryMenuItem: { paddingVertical: 14, paddingHorizontal: 16 },
  tabRow: {
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  tabToggle: {
    flex: 1,
    minHeight: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  rankBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -14,
    zIndex: 2,
  },
  bottomPodium: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    alignItems: 'flex-start',
  },
  emptyCard: {
    width: 100,
    height: 142,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  menu: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
