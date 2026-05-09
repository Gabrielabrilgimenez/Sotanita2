import { StyleSheet, Text, View } from 'react-native';
import FifaCard from './FifaCard';
import { useAppTheme } from '../hooks/useAppTheme';

export default function NotificationItem({ item, onOpenVideo }) {
  const { colors, spacing, typography, textScale } = useAppTheme();

  return (
    <View style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: spacing.sm }]}> 
      <FifaCard
        username={item.user || item.actorUsername}
        team={item.actorTeamName || 'Sin equipo'}
        position="---"
        backgroundUrl={item.actorTeamImageUrl}
        frameUrl={item.actorFrameImageId}
        frameId={item.actorFrameId}
        photoUrl={item.actorProfileImageUrl}
        size="small"
        disableShadow
      />
      <View style={styles.content}>
        <Text style={{ color: colors.text, fontSize: (typography.sizes.sm * 0.95) * textScale, lineHeight: 18 }}>
          <Text style={{ fontWeight: typography.weights.bold }}>{item.user || item.actorUsername}</Text>{' '}
          <Text style={{ color: colors.textMuted }}>{item.action}</Text>
          {item.videoTitle ? (
            <Text
              onPress={() => {
                if (item.videoId && onOpenVideo) {
                  onOpenVideo(item.videoId);
                }
              }}
              style={{
                color: colors.primary,
                textDecorationLine: 'underline',
                fontWeight: typography.weights.semibold,
              }}
            >
              {' '}{item.videoTitle}
            </Text>
          ) : null}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: typography.sizes.xs * textScale, marginTop: 4 }}>{item.time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  content: {
    flex: 1,
  },
});
