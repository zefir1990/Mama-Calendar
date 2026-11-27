import { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { DateTimePicker } from '@expo/ui/community/datetime-picker';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useLocalization } from '@/localization';

interface DateTimeInputProps {
  dateTime: number;
  onChange: (dateTime: number) => void;
}

function formatDateLabel(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const datePart = date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  return `${datePart} ${timePart}`;
}

export function DateTimeInput({ dateTime, onChange }: DateTimeInputProps) {
  const theme = useTheme();
  const { t } = useLocalization();

  if (Platform.OS === 'web') {
    return <WebDateTimeInput dateTime={dateTime} onChange={onChange} theme={theme} />;
  }

  return <NativeDateTimeInput dateTime={dateTime} onChange={onChange} theme={theme} dateLabel={t.dateTimeInput.date} />;
}

function toLocalDateString(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function WebDateTimeInput({
  dateTime,
  onChange,
  theme,
}: DateTimeInputProps & { theme: ReturnType<typeof useTheme> }) {
  const dateString = toLocalDateString(dateTime);

  function handleDateChange(text: string) {
    if (text.length === 10) {
      const newDate = new Date(`${text}T00:00`);
      if (!isNaN(newDate.getTime())) {
        onChange(newDate.getTime());
      }
    }
  }

  return (
    <input
      type="date"
      value={dateString}
      onChange={(event) => handleDateChange(event.target.value)}
      style={{
        flex: 1,
        padding: Spacing.two,
        borderRadius: Spacing.two,
        border: `1px solid ${theme.textSecondary}`,
        background: theme.backgroundElement,
        color: theme.text,
        fontSize: 16,
      }}
    />
  );
}

function NativeDateTimeInput({
  dateTime,
  onChange,
  theme,
  dateLabel,
}: DateTimeInputProps & { theme: ReturnType<typeof useTheme>; dateLabel: string }) {
  const [showDatePicker, setShowDatePicker] = useState(false);

  function handleDateSelected(date: Date) {
    const newDateTime = new Date(date);
    newDateTime.setHours(0, 0, 0, 0);
    onChange(newDateTime.getTime());
    setShowDatePicker(false);
  }

  if (Platform.OS === 'ios') {
    return (
      <View style={styles.fieldContainer}>
        <ThemedText type="small" themeColor="textSecondary">
          {dateLabel}
        </ThemedText>
        <DateTimePicker
          value={new Date(dateTime)}
          mode="date"
          display="compact"
          accentColor={theme.text}
          onValueChange={(_, date) => handleDateSelected(date)}
        />
      </View>
    );
  }

  return (
    <View style={styles.fieldContainer}>
      <ThemedText type="small" themeColor="textSecondary">
        {dateLabel}
      </ThemedText>
      <Pressable
        onPress={() => setShowDatePicker(true)}
        style={[
          styles.pickerButton,
          { backgroundColor: theme.backgroundElement, borderColor: theme.textSecondary },
        ]}
      >
        <ThemedText>{formatDateLabel(dateTime)}</ThemedText>
      </Pressable>

      {showDatePicker && (
        <DateTimePicker
          value={new Date(dateTime)}
          mode="date"
          presentation="dialog"
          onValueChange={(_, date) => handleDateSelected(date)}
          onDismiss={() => setShowDatePicker(false)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldContainer: {
    flex: 1,
    gap: Spacing.half,
  },
  pickerButton: {
    padding: Spacing.two,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
});
