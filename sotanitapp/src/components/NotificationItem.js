import { StyleSheet, Text, View } from 'react-native';
import FifaCard from './FifaCard';
import { useAppTheme } from '../hooks/useAppTheme';

export default function NotificationItem({ item, onOpenVideo }) {
  const { colors, spacing, typography, textScale } = useAppTheme();
  const notification = item ?? {};

  if (!notification.user && !notification.actorUsername && !notification.action && !notification.videoTitle) {
    return null;
  }

  return (
    <View style={[styles.item, { backgroundColor: colors.surface, borderColor: colors.border, marginBottom: spacing.sm }]}> 
      <FifaCard
        username={notification.user || notification.actorUsername}
        team={notification.actorTeamName || 'Sin equipo'}
        position="---"
        backgroundUrl={notification.actorTeamImageUrl}
        frameUrl={notification.actorFrameImageId}
        frameId={notification.actorFrameId}
        photoUrl={notification.actorProfileImageUrl}
        size="small"
        disableShadow
      />
      <View style={styles.content}>
        <Text style={{ color: colors.text, fontSize: (typography.sizes.sm * 0.95) * textScale, lineHeight: 18 }}>
          <Text style={{ fontWeight: typography.weights.bold }}>{notification.user || notification.actorUsername}</Text>{' '}
          <Text style={{ color: colors.textMuted }}>{notification.action}</Text>
          {notification.videoTitle ? (
            <Text
              onPress={() => {
                if (notification.videoId && onOpenVideo) {
                  onOpenVideo(notification.videoId);
                }
              }}
              style={{
                color: colors.primary,
                textDecorationLine: 'underline',
                fontWeight: typography.weights.semibold,
              }}
            >
              {' '}{notification.videoTitle}
            </Text>
          ) : null}
        </Text>
        <Text style={{ color: colors.textMuted, fontSize: typography.sizes.xs * textScale, marginTop: 4 }}>{notification.time}</Text>
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
