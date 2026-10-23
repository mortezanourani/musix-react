import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLibrary } from '../library/LibraryContext';
import { colors } from '../theme/colors';

export function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { tracks, status, error, updateLibrary } = useLibrary();
  const scanning = status === 'scanning';

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.heading}>Search</Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Update Library"
        disabled={scanning}
        onPress={updateLibrary}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          scanning && styles.buttonDisabled,
        ]}
      >
        {scanning ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Text style={styles.buttonLabel}>Update Library</Text>
        )}
      </Pressable>

      <Text style={styles.status}>
        {status === 'ready'
          ? `${tracks.length} ${tracks.length === 1 ? 'file' : 'files'} in Music`
          : scanning
            ? 'Scanning the Music directory…'
            : status === 'restoring'
              ? 'Restoring your library…'
              : status === 'error'
                ? 'Library update failed.'
                : 'Reads audio files from the Music directory.'}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name="magnify" size={34} color={colors.primary} />
        </View>
        <Text style={styles.description}>
          Search across your library. This tab arrives in a later phase.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 8,
    backgroundColor: colors.background,
  },
  heading: {
    marginBottom: 20,
    color: colors.text,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  buttonPressed: {
    backgroundColor: colors.primaryPressed,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonLabel: {
    color: colors.onPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  status: {
    marginTop: 12,
    color: colors.textMuted,
    fontSize: 12,
  },
  error: {
    marginTop: 8,
    color: colors.danger,
    fontSize: 12,
    lineHeight: 17,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 48,
  },
  iconCircle: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 38,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  description: {
    maxWidth: 280,
    marginTop: 18,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
