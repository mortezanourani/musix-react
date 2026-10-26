import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getTrackArtistName, getAlbumId } from '@musix/core';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArtworkTile } from '../components/ArtworkTile';
import { usePlayer, usePlayerProgress } from '../player/PlayerContext';
import { useLibrary } from '../library/LibraryContext';
import type { ThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { formatPlaybackTime } from '../utils/format';

/**
 * A true modal overlay (not a navigation screen) that presents the current
 * track and its playback controls.
 */
export function PlayerModal() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [progressWidth, setProgressWidth] = useState(0);

  const {
    currentTrack,
    queue,
    currentIndex,
    isPlaying,
    isVisible,
    minimizePlayer,
    togglePlayback,
    playNext,
    playPrevious,
    seekForward,
    seekBackward,
    seekTo,
  } = usePlayer();
  const { position, duration, error } = usePlayerProgress();
  const { audiobookAlbumIds } = useLibrary();

  if (!currentTrack) {
    return null;
  }

  const progress = duration > 0 ? Math.min(Math.max(position / duration, 0), 1) : 0;
  const canGoNext = currentIndex < queue.length - 1;
  const albumId = getAlbumId(currentTrack);
  const isAudiobook = audiobookAlbumIds.has(albumId);
  const artworkSize = Math.min(width - 64, height * 0.36, 360);

  const handleProgressLayout = (event: LayoutChangeEvent) => {
    setProgressWidth(event.nativeEvent.layout.width);
  };

  const handleSeek = (event: GestureResponderEvent) => {
    if (progressWidth <= 0 || duration <= 0) {
      return;
    }

    const fraction = Math.min(Math.max(event.nativeEvent.locationX / progressWidth, 0), 1);
    seekTo(fraction * duration);
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      onRequestClose={minimizePlayer}
      statusBarTranslucent
    >
      <View
        style={[
          styles.screen,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 },
        ]}
      >
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Minimize player"
            onPress={minimizePlayer}
            hitSlop={12}
            style={styles.topBarButton}
          >
            <MaterialCommunityIcons name="chevron-down" size={30} color={colors.text} />
          </Pressable>

          <View style={styles.topBarCenter}>
            <Text style={styles.eyebrow}>NOW PLAYING</Text>
            <Text style={styles.queuePosition}>
              {currentIndex + 1} of {queue.length}
            </Text>
          </View>

          <View style={styles.topBarButton} />
        </View>

        <View style={styles.body}>
          <View style={[styles.artwork, { width: artworkSize }]}>
            <ArtworkTile
              artworkUri={currentTrack.artworkUri}
              title={currentTrack.title}
              kind={isAudiobook ? 'audiobook' : 'track'}
              borderRadius={24}
              iconSize={Math.round(artworkSize * 0.34)}
            />
          </View>

          <View style={styles.meta}>
            <Text style={styles.title} numberOfLines={2}>
              {currentTrack.title}
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {getTrackArtistName(currentTrack)}
            </Text>
            {currentTrack.album ? (
              <Text style={styles.album} numberOfLines={1}>
                {currentTrack.album}
              </Text>
            ) : null}
            {error ? (
              <Text style={styles.error} numberOfLines={2}>
                This track could not be played.
              </Text>
            ) : null}
          </View>

          <View style={styles.progressBlock}>
            <Pressable
              accessibilityRole="adjustable"
              accessibilityLabel="Playback position"
              accessibilityValue={{
                min: 0,
                max: Math.round(duration),
                now: Math.round(position),
              }}
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === 'increment') {
                  seekTo(position + 10);
                } else if (event.nativeEvent.actionName === 'decrement') {
                  seekTo(position - 10);
                }
              }}
              onLayout={handleProgressLayout}
              onPress={handleSeek}
              hitSlop={{ top: 14, bottom: 14 }}
              style={styles.progressTrack}
            >
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              <View style={[styles.progressThumb, { left: `${progress * 100}%` }]} />
            </Pressable>

            <View style={styles.timeRow}>
              <Text style={styles.time}>{formatPlaybackTime(position)}</Text>
              <Text style={styles.time}>{formatPlaybackTime(duration)}</Text>
            </View>
          </View>

          <View style={styles.controls}>
            {isAudiobook ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Rewind 10 seconds"
                  onPress={seekBackward}
                  hitSlop={12}
                  style={({ pressed }) => [styles.sideButton, pressed && styles.pressed]}
                >
                  <MaterialCommunityIcons name="rewind-10" size={38} color={colors.text} />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                  onPress={togglePlayback}
                  style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}
                >
                  <MaterialCommunityIcons
                    name={isPlaying ? 'pause' : 'play'}
                    size={36}
                    color={colors.onPrimary}
                    style={styles.playButtonIcon}
                  />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Forward 10 seconds"
                  onPress={seekForward}
                  hitSlop={12}
                  style={({ pressed }) => [styles.sideButton, pressed && styles.pressed]}
                >
                  <MaterialCommunityIcons name="fast-forward-10" size={38} color={colors.text} />
                </Pressable>
              </>
            ) : (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous track"
                  onPress={playPrevious}
                  hitSlop={12}
                  style={({ pressed }) => [styles.sideButton, pressed && styles.pressed]}
                >
                  <MaterialCommunityIcons name="skip-previous" size={38} color={colors.text} />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
                  onPress={togglePlayback}
                  style={({ pressed }) => [styles.playButton, pressed && styles.pressed]}
                >
                  <MaterialCommunityIcons
                    name={isPlaying ? 'pause' : 'play'}
                    size={36}
                    color={colors.onPrimary}
                    style={styles.playButtonIcon}
                  />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next track"
                  accessibilityState={{ disabled: !canGoNext }}
                  disabled={!canGoNext}
                  onPress={playNext}
                  hitSlop={12}
                  style={({ pressed }) => [styles.sideButton, pressed && styles.pressed]}
                >
                  <MaterialCommunityIcons
                    name="skip-next"
                    size={38}
                    color={canGoNext ? colors.text : colors.textSubtle}
                  />
                </Pressable>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
      paddingHorizontal: 24,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    topBarButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBarCenter: {
      alignItems: 'center',
      gap: 2,
    },
    eyebrow: {
      color: colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
    },
    queuePosition: {
      color: colors.textSubtle,
      fontSize: 11,
    },
    body: {
      flex: 1,
      justifyContent: 'center',
      gap: 24,
    },
    artwork: {
      alignSelf: 'center',
      borderRadius: 24,
      backgroundColor: colors.surface,
      shadowColor: '#000000',
      shadowOpacity: 0.25,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 12,
    },
    meta: {
      gap: 5,
    },
    title: {
      color: colors.text,
      fontSize: 25,
      fontWeight: '700',
      textAlign: 'center',
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: 16,
      textAlign: 'center',
    },
    album: {
      color: colors.textSubtle,
      fontSize: 13,
      textAlign: 'center',
    },
    error: {
      color: colors.primary,
      fontSize: 12,
      textAlign: 'center',
    },
    progressBlock: {
      gap: 8,
    },
    progressTrack: {
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      justifyContent: 'center',
    },
    progressFill: {
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      borderRadius: 2,
      backgroundColor: colors.primary,
    },
    progressThumb: {
      position: 'absolute',
      top: -4,
      marginLeft: -6,
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    timeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    time: {
      color: colors.textSubtle,
      fontSize: 11,
      fontVariant: ['tabular-nums'],
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 36,
    },
    sideButton: {
      padding: 6,
    },
    playButton: {
      width: 72,
      height: 72,
      borderRadius: 24,
      transform: 'rotate(45deg)',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    playButtonIcon: {
      transform: 'rotate(-45deg)',
    },
    pressed: {
      opacity: 0.65,
    },
  });
}
