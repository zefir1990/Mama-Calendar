import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { DateTimeInput } from '@/components/date-time-input';
import { EventItem } from '@/components/event-item';
import { LoginForm } from '@/components/login-form';
import type { Event as CalendarEvent } from '@/types/event';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useEvents } from '@/context/event-context';
import { useTheme } from '@/hooks/use-theme';
import { useLocalization } from '@/localization';

const EVENT_EMOJIS = [
  '🎉', '🎂', '📅', '✈️', '🏥', '🎄', '🎓', '💼',
  '🏃', '🎵', '🍽️', '🎬', '🛒', '🏠', '🎪', '📝',
  '💊', '🐾', '🎮', '📚',
];

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

type Tab = 'enterInfo' | 'important';

export default function EventsScreen() {
  const { isAuthenticated, logout } = useAuth();
  const { events, loading, error, addEvent, updateEvent, removeEvent, refreshEvents } = useEvents();
  const theme = useTheme();
  const { t } = useLocalization();

  const [activeTab, setActiveTab] = useState<Tab>('important');
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [descriptionText, setDescriptionText] = useState('');
  const [eventDate, setEventDate] = useState(Date.now());
  const [selectedEmoji, setSelectedEmoji] = useState('');

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  const sortedEvents = [...events].sort((a, b) => a.date - b.date);

  const importantEvents = useMemo(() => {
    const now = Date.now();
    const threeDaysLater = now + THREE_DAYS_MS;
    return sortedEvents.filter(
      (calendarEvent) => calendarEvent.date >= now && calendarEvent.date <= threeDaysLater
    );
  }, [sortedEvents]);

  const displayedEvents = activeTab === 'important' ? importantEvents : sortedEvents;

  function openNewForm() {
    setEditingEvent(null);
    setDescriptionText('');
    setEventDate(Date.now());
    setSelectedEmoji('');
    setIsFormVisible(true);
  }

  function openEditForm(calendarEvent: CalendarEvent) {
    setEditingEvent(calendarEvent);
    setDescriptionText(calendarEvent.description);
    setEventDate(calendarEvent.date);
    setSelectedEmoji(calendarEvent.emoji || '');
    setIsFormVisible(true);
  }

  function handleSubmit() {
    const trimmed = descriptionText.trim();
    if (trimmed.length === 0) {
      return;
    }
    const emoji = selectedEmoji || undefined;
    if (editingEvent) {
      updateEvent(editingEvent.id, trimmed, eventDate, emoji);
    } else {
      addEvent(trimmed, eventDate, emoji);
    }
    setDescriptionText('');
    setEventDate(Date.now());
    setSelectedEmoji('');
    setEditingEvent(null);
    setIsFormVisible(false);
  }

  function handleCancelForm() {
    setDescriptionText('');
    setEventDate(Date.now());
    setSelectedEmoji('');
    setEditingEvent(null);
    setIsFormVisible(false);
  }

  function handleLogout() {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(t.auth.confirmLogoutMessage);
      if (confirmed) {
        logout();
      }
    } else {
      Alert.alert(
        t.auth.confirmLogoutTitle,
        t.auth.confirmLogoutMessage,
        [
          { text: t.auth.cancelLogout, style: 'cancel' },
          { text: t.auth.logout, style: 'destructive', onPress: logout },
        ],
      );
    }
  }

  const isEditing = editingEvent !== null;
  const bottomInset = BottomTabInset + Spacing.three;

  return (
    <ThemedView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.headerSection, { paddingTop: Spacing.four }]}>
          <ThemedText type="title">{t.events.title}</ThemedText>
          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <ThemedText themeColor="textSecondary">{t.auth.logout}</ThemedText>
          </Pressable>
        </View>

        <View style={styles.tabBar}>
          <Pressable
            onPress={() => setActiveTab('important')}
            style={[
              styles.tab,
              activeTab === 'important' && { borderBottomColor: theme.text, borderBottomWidth: 2 },
            ]}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab !== 'important' && { color: theme.textSecondary },
              ]}
            >
              {t.events.importantTab}
            </ThemedText>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab('enterInfo')}
            style={[
              styles.tab,
              activeTab === 'enterInfo' && { borderBottomColor: theme.text, borderBottomWidth: 2 },
            ]}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab !== 'enterInfo' && { color: theme.textSecondary },
              ]}
            >
              {t.events.enterInfoTab}
            </ThemedText>
          </Pressable>
        </View>

        {loading && events.length === 0 ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={theme.text} />
          </View>
        ) : error && events.length === 0 ? (
          <View style={styles.centerState}>
            <ThemedText themeColor="textSecondary" style={styles.errorText}>
              {error}
            </ThemedText>
            <Pressable onPress={refreshEvents} style={[styles.retryButton, { borderColor: theme.text }]}>
              <ThemedText>{t.events.retry}</ThemedText>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={displayedEvents}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: activeTab === 'enterInfo' && isFormVisible ? 120 : bottomInset },
            ]}
            ListEmptyComponent={
              <ThemedView style={styles.emptyState}>
                <ThemedText themeColor="textSecondary" style={styles.emptyText}>
                  {activeTab === 'important' ? t.events.emptyTitleImportant : t.events.emptyTitle}
                </ThemedText>
                <ThemedText themeColor="textSecondary" type="small">
                  {activeTab === 'important' ? t.events.emptyHintImportant : t.events.emptyHint}
                </ThemedText>
              </ThemedView>
            }
            renderItem={({ item }) => (
              <EventItem event={item} onRemove={removeEvent} onSelect={openEditForm} />
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            style={styles.list}
          />
        )}

        {activeTab === 'enterInfo' && isFormVisible && (
          <ThemedView type="backgroundElement" style={styles.form}>
            <View style={styles.formFields}>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: theme.background, color: theme.text, borderColor: theme.textSecondary },
                ]}
                value={descriptionText}
                onChangeText={setDescriptionText}
                placeholder={t.events.formPlaceholder}
                placeholderTextColor={theme.textSecondary}
                autoFocus
              />
              <View style={styles.emojiPickerSection}>
                <ThemedText type="small" themeColor="textSecondary">
                  {t.events.emojiLabel}
                </ThemedText>
                <View style={styles.emojiRow}>
                  {EVENT_EMOJIS.map((emoji) => (
                    <Pressable
                      key={emoji}
                      onPress={() => setSelectedEmoji(selectedEmoji === emoji ? '' : emoji)}
                      style={[
                        styles.emojiOption,
                        selectedEmoji === emoji && {
                          backgroundColor: theme.text,
                          borderColor: theme.text,
                        },
                      ]}
                    >
                      <ThemedText
                        style={[
                          styles.emojiText,
                          selectedEmoji === emoji && { color: theme.background },
                        ]}
                      >
                        {emoji}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
              <DateTimeInput
                dateTime={eventDate}
                onChange={setEventDate}
              />
            </View>
            <View style={styles.formActions}>
              <Pressable onPress={handleCancelForm} style={styles.cancelButton}>
                <ThemedText themeColor="textSecondary">{t.events.formCancel}</ThemedText>
              </Pressable>
              <Pressable
                onPress={handleSubmit}
                style={[
                  styles.addButton,
                  {
                    backgroundColor: descriptionText.trim() ? theme.text : theme.textSecondary,
                    opacity: descriptionText.trim() ? 1 : 0.5,
                  },
                ]}
                disabled={!descriptionText.trim()}
              >
                <ThemedText themeColor="background" style={styles.addButtonText}>{isEditing ? t.events.formSave : t.events.formAdd}</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        )}

        {activeTab === 'enterInfo' && !isFormVisible && (
          <Pressable
            onPress={openNewForm}
            style={[styles.fab, { backgroundColor: theme.text }]}
          >
            <ThemedText style={[styles.fabText, { color: theme.background }]}>+</ThemedText>
          </Pressable>
        )}
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: 120,
  },
  headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
  centerState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  errorText: {
    textAlign: 'center',
    fontSize: 16,
  },
  retryButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
    gap: Spacing.one,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
  },
  separator: {
    height: Spacing.two,
  },
  form: {
    padding: Spacing.four,
    gap: Spacing.three,
    borderTopLeftRadius: Spacing.five,
    borderTopRightRadius: Spacing.five,
  },
  formFields: {
    gap: Spacing.three,
  },
  emojiPickerSection: {
    gap: Spacing.half,
  },
  emojiRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  emojiOption: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  emojiText: {
    fontSize: 18,
  },
  textInput: {
    padding: Spacing.three,
    borderRadius: Spacing.two,
    borderWidth: 1,
    fontSize: 16,
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.three,
    alignItems: 'center',
  },
  cancelButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  addButton: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.two,
  },
  addButtonText: {
    fontWeight: '700',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.five,
    right: Spacing.five,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 30,
  },
  logoutButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
});