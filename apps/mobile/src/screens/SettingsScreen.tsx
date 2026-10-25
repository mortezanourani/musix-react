import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, type ComponentProps } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ThemeColors } from '../theme/colors';
import { useTheme, type ThemeMode } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import type { MainStackParamList } from '../navigation/types';
import { useLibrary } from '../library/LibraryContext';

type SettingsScreenProps = NativeStackScreenProps<MainStackParamList, 'Settings'>;

type ThemeOption = {
  mode: ThemeMode;
  label: string;
  description: string;
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
};

const THEME_OPTIONS: readonly ThemeOption[] = [
  {
    mode: 'system',
    label: 'System',
    description: 'Match your device appearance',
    icon: 'theme-light-dark',
  },
  {
    mode: 'light',
    label: 'Light',
    description: 'Always use the light theme',
    icon: 'white-balance-sunny',
  },
  {
    mode: 'dark',
    label: 'Dark',
    description: 'Always use the dark theme',
    icon: 'weather-night',
  },
];

export function SettingsScreen({ navigation }: SettingsScreenProps) {
  const { tracks, status, error, updateLibrary } = useLibrary();
  const { colors, mode, setMode } = useTheme();
  const styles = useThemedStyles(createStyles);

  const handleLibraryUpdate = useCallback(async () => {
    await updateLibrary();
  }, [updateLibrary]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>

        <View style={styles.card}>
          {THEME_OPTIONS.map((option, index) => {
            const selected = mode === option.mode;

            return (
              <Pressable
                key={option.mode}
                style={({ pressed }) => [
                  styles.option,
                  index > 0 && styles.optionDivider,
                  pressed && styles.optionPressed,
                ]}
                onPress={() => {
                  void setMode(option.mode);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${option.label} theme`}
              >
                <View style={styles.optionContent}>
                  <MaterialCommunityIcons
                    name={option.icon}
                    size={22}
                    color={selected ? colors.primary : colors.textMuted}
                  />
                  <View style={styles.optionTextGroup}>
                    <Text style={styles.optionText}>{option.label}</Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </View>
                </View>
                <MaterialCommunityIcons
                  name={selected ? 'radiobox-marked' : 'radiobox-blank'}
                  size={22}
                  color={selected ? colors.primary : colors.textSubtle}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Library</Text>
        <Pressable
          style={({ pressed }) => [styles.libraryOption, pressed && styles.optionPressed]}
          onPress={handleLibraryUpdate}
          disabled={status === 'scanning'}
        >
          <View style={styles.optionContent}>
            <MaterialCommunityIcons name="folder-sync" size={24} color={colors.text} />
            <Text style={styles.optionText}>Update Library</Text>
          </View>
          {status === 'scanning' ? (
            <MaterialCommunityIcons name="loading" size={24} color={colors.textMuted} />
          ) : null}
        </Pressable>

        {status === 'error' && error ? (
          <View style={styles.statusContainer}>
            <Text style={styles.statusError}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>Status: {status}</Text>
          <Text style={styles.tracksCount}>{tracks.length} tracks</Text>
        </View>
      </View>
    </ScrollView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      padding: 16,
      gap: 20,
    },
    section: {
      gap: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: 'hidden',
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      gap: 12,
    },
    optionDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    optionPressed: {
      opacity: 0.7,
    },
    libraryOption: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    optionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      gap: 12,
    },
    optionTextGroup: {
      flex: 1,
      gap: 2,
    },
    optionText: {
      fontSize: 16,
      color: colors.text,
    },
    optionDescription: {
      fontSize: 12,
      color: colors.textMuted,
    },
    statusContainer: {
      backgroundColor: colors.surface,
      borderRadius: 8,
      padding: 12,
      gap: 4,
    },
    statusText: {
      fontSize: 14,
      color: colors.textMuted,
    },
    statusError: {
      fontSize: 14,
      color: colors.danger,
    },
    tracksCount: {
      fontSize: 13,
      color: colors.textSubtle,
    },
  });
}
