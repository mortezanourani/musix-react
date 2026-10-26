import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getTrackArtistName } from '@musix/core';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArtworkTile } from '../components/ArtworkTile';
import type { ThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { usePlayer, usePlayerProgress } from './PlayerContext';

/**
 * Bottom bar shown while the player modal is minimized. It keeps the current
 * track visible and controllable without leaving the page the user is on.
 */
export function MiniPlayer() {
  const { currentTrack, isVisible } = usePlayer();

  if (!currentTrack || isVisible) {
    return null;
  }

  return <MiniPlayerBar />;
}

/** Only mounted while visible, so hidden progress updates cost nothing. */
function MiniPlayerBar() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const {
    currentTrack,
    queue,
    currentIndex,
    isPlaying,
    openPlayer,
    togglePlayback,
    playNext,
  } = usePlayer();
  const { position, duration } = usePlayerProgress();

  if (!currentTrack) {
    return null;
  }

  const progress = duration > 0 ? Math.min(Math.max(position / duration, 0), 1) : 0;
  const canGoNext = currentIndex < queue.length - 1;

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open player for ${currentTrack.title}`}
        onPress={openPlayer}
        style={styles.info}
      >
        <View style={styles.artwork}>
          <ArtworkTile
            artworkUri={currentTrack.artworkUri}
            title={currentTrack.title}
            kind="track"
            borderRadius={8}
            iconSize={24}
          />

          <Pressable
              accessibilityRole="button"
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
              onPress={togglePlayback}
              hitSlop={8}
              style={({ pressed }) => [styles.control, styles.playButton, pressed && styles.pressed]}
          >
            <MaterialCommunityIcons
                name={isPlaying ? 'pause' : 'play'}
                size={24}
                color={colors.primary}
            />
          </Pressable>
        </View>

        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {getTrackArtistName(currentTrack)}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 10,
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      shadowColor: '#000000',
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: -4 },
      elevation: 12,
    },
    progressTrack: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 2,
      backgroundColor: colors.border,
    },
    progressFill: {
      height: 2,
      backgroundColor: colors.primary,
    },
    info: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: 12,
    },
    artwork: {
      width: 48,
    },
    body: {
      flex: 1,
      marginLeft: 10,
      marginRight: 10,
    },
    title: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '600',
    },
    subtitle: {
      marginTop: 2,
      color: colors.textMuted,
      fontSize: 12,
    },
    control: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    playButton: {
      width: 48,
      height: 48,
      borderRadius: 8,
      position: 'absolute',
      backgroundColor: colors.crystal,
    },
    pressed: {
      opacity: 0.65,
    },
  });
}
