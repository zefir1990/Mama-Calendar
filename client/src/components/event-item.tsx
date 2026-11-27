import { Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { formatDateTime } from '@/components/date-time-input';
import { Spacing } from '@/constants/theme';
import { Event } from '@/types/event';
import { useLocalization } from '@/localization';

interface EventItemProps {
  event: Event;
  onRemove: (id: string) => void;
  onSelect: (event: Event) => void;
}

function isToday(timestamp: number): boolean {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    return false;
  }
  return date.toDateString() === new Date().toDateString();
}

export function EventItem({ event, onRemove, onSelect }: EventItemProps) {
  const today = isToday(event.date);
  const { t } = useLocalization();

  function handleRemove() {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(t.eventItem.confirmRemoveMessage);
      if (confirmed) {
        onRemove(event.id);
      }
    } else {
      Alert.alert(
        t.eventItem.confirmRemoveTitle,
        t.eventItem.confirmRemoveMessage,
        [
          { text: t.eventItem.cancelRemove, style: 'cancel' },
          { text: t.eventItem.remove, style: 'destructive', onPress: () => onRemove(event.id) },
        ],
      );
    }
  }

  return (
    <Pressable onPress={() => onSelect(event)}>
      <ThemedView
        type="backgroundElement"
        style={[styles.container, today && styles.todayContainer]}
      >
        <View style={styles.content}>
          <View style={styles.descriptionRow}>
            {event.emoji ? <ThemedText style={styles.emoji}>{event.emoji}</ThemedText> : null}
            <ThemedText style={styles.text}>{event.description}</ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {formatDateTime(event.date)}
          </ThemedText>
        </View>
        <Pressable
          onPress={handleRemove}
          style={({ pressed }) => [
            styles.removeButton,
            { backgroundColor: pressed ? '#ff444420' : 'transparent' },
          ]}
        >
          <ThemedText style={{ color: today ? '#ffffff' : '#888888', fontSize: 18, fontWeight: '700' }}>
            ✕
          </ThemedText>
        </Pressable>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.three,
    borderRadius: Spacing.three,
    gap: Spacing.two,
  },
  content: {
    flex: 1,
    gap: Spacing.half,
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  emoji: {
    fontSize: 20,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  removeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  todayContainer: {
    backgroundColor: '#B71C1C',
  },
});
