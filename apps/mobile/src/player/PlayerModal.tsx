import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getTrackArtistName } from '@musix/core';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArtworkTile } from '../components/ArtworkTile';
import {
  usePlayer,
  usePlayerProgress,
  type RepeatMode,
  type SleepTimer,
} from '../player/PlayerContext';
import { PLAYBACK_RATE_OPTIONS } from '../player/playbackStorage';
import type { ThemeColors } from '../theme/colors';
import { useTheme } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { formatDuration, formatPlaybackTime } from '../utils/format';

/** How far the player must be dragged down before it minimizes. */
const DISMISS_DISTANCE = 110;

/** How fast the player must be flicked down before it minimizes. */
const DISMISS_VELOCITY = 0.9;

/** Fixed queue row height (including margin), used to jump to the current track. */
const QUEUE_ROW_HEIGHT = 68;

/** The sheets that can cover the player. */
type PlayerPanel = 'queue' | 'speed' | 'sleep';

/** Sleep timer lengths offered in minutes. */
const SLEEP_TIMER_MINUTES = [5, 15, 30, 45, 60] as const;

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
  const [scrubSeconds, setScrubSeconds] = useState<number | null>(null);
  const [panel, setPanel] = useState<PlayerPanel | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const translateY = useRef(new Animated.Value(0)).current;
  const scrubSecondRef = useRef<number | null>(null);
  const closePanel = useCallback(() => setPanel(null), []);

  const {
    currentTrack,
    queue,
    currentIndex,
    isPlaying,
    isVisible,
    shuffleEnabled,
    repeatMode,
    playbackRate,
    sleepTimer,
    canGoNext,
    canGoPrevious,
    minimizePlayer,
    togglePlayback,
    playNext,
    playPrevious,
    seekForward,
    seekBackward,
    seekTo,
    toggleShuffle,
    cycleRepeatMode,
    setPlaybackRate,
    setSleepTimer,
    setSleepTimerToEndOfTrack,
  } = usePlayer();
  const { position, duration, error } = usePlayerProgress();

  // Pan handlers are created once, so they read the latest values through refs.
  const durationRef = useRef(duration);
  const progressWidthRef = useRef(progressWidth);
  const seekToRef = useRef(seekTo);
  durationRef.current = duration;
  progressWidthRef.current = progressWidth;
  seekToRef.current = seekTo;

  useEffect(() => {
    if (isVisible) {
      translateY.setValue(0);
    } else {
      setPanel(null);
      setScrubSeconds(null);
      scrubSecondRef.current = null;
    }
  }, [isVisible, translateY]);

  // Tick once per second while a countdown timer is active so its label
  // counts down without re-rendering every player consumer.
  useEffect(() => {
    if (!isVisible || sleepTimer.mode !== 'duration') {
      return;
    }

    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1_000);

    return () => clearInterval(interval);
  }, [isVisible, sleepTimer]);

  // A track change cancels any in-flight scrub so it cannot seek the new track.
  useEffect(() => {
    scrubSecondRef.current = null;
    setScrubSeconds(null);
  }, [currentTrack?.id]);

  const dismissPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) =>
          gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
        onPanResponderMove: (_, gesture) => {
          translateY.setValue(Math.max(0, gesture.dy));
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > DISMISS_DISTANCE || gesture.vy > DISMISS_VELOCITY) {
            Animated.timing(translateY, {
              toValue: height,
              duration: 160,
              useNativeDriver: true,
            }).start(() => {
              translateY.setValue(0);
              minimizePlayer();
            });
            return;
          }

          Animated.spring(translateY, {
            toValue: 0,
            bounciness: 0,
            useNativeDriver: true,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(translateY, {
            toValue: 0,
            bounciness: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [height, minimizePlayer, translateY],
  );

  const progressPan = useMemo(() => {
    const updateScrub = (locationX: number) => {
      const trackWidth = progressWidthRef.current;
      const trackDuration = durationRef.current;

      if (trackWidth <= 0 || trackDuration <= 0) {
        return;
      }

      const fraction = Math.min(Math.max(locationX / trackWidth, 0), 1);
      const seconds = fraction * trackDuration;
      scrubSecondRef.current = seconds;
      setScrubSeconds(seconds);
    };

    const finishScrub = () => {
      const seconds = scrubSecondRef.current;
      scrubSecondRef.current = null;
      setScrubSeconds(null);

      if (seconds !== null) {
        seekToRef.current(seconds);
      }
    };

    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => updateScrub(event.nativeEvent.locationX),
      onPanResponderMove: (event) => updateScrub(event.nativeEvent.locationX),
      onPanResponderRelease: finishScrub,
      onPanResponderTerminate: finishScrub,
      // Keep the scrub gesture even while the sheet's dismiss pan is active.
      onPanResponderTerminationRequest: () => false,
    });
  }, []);

  if (!currentTrack) {
    return null;
  }

  const displayPosition = scrubSeconds ?? position;
  const progress = duration > 0 ? Math.min(Math.max(displayPosition / duration, 0), 1) : 0;
  const isAudiobook = currentTrack.mediaType === 'audiobook';
  const artworkSize = Math.min(width - 64, height * 0.36, 360);
  const canGoBack = isAudiobook || canGoPrevious;
  const canGoForward = isAudiobook || canGoNext;
  const repeatIcon = repeatMode === 'one' ? 'repeat-once' : 'repeat';
  const sleepStatus = describeSleepTimer(sleepTimer, now);

  const handleProgressLayout = (event: LayoutChangeEvent) => {
    setProgressWidth(event.nativeEvent.layout.width);
  };

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      onRequestClose={() => {
        if (panel) {
          setPanel(null);
          return;
        }

        minimizePlayer();
      }}
      statusBarTranslucent
      transparent
    >
      <View style={styles.modalBackdrop}>
        <Animated.View
          style={[styles.screen, { transform: [{ translateY }] }]}
        >
          <View
            style={[
              styles.content,
              { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 20 },
            ]}
            {...dismissPan.panHandlers}
          >
            <View style={styles.dragArea}>
              <View style={styles.grabber} />

              <View style={styles.topBar}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Minimize player"
                  onPress={minimizePlayer}
                  hitSlop={12}
                  style={({ pressed }) => [styles.topBarButton, pressed && styles.pressed]}
                >
                  <MaterialCommunityIcons name="chevron-down" size={30} color={colors.text} />
                </Pressable>

                <View style={styles.topBarCenter}>
                  <Text style={styles.eyebrow}>NOW PLAYING</Text>
                  <Text style={styles.queuePosition}>
                    {currentIndex + 1} of {queue.length}
                  </Text>
                </View>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open queue"
                  onPress={() => setPanel('queue')}
                  hitSlop={12}
                  style={({ pressed }) => [styles.topBarButton, pressed && styles.pressed]}
                >
                  <MaterialCommunityIcons name="playlist-music" size={26} color={colors.text} />
                </Pressable>
              </View>
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
                <View
                  accessible
                  accessibilityRole="adjustable"
                  accessibilityLabel="Playback position"
                  accessibilityValue={{
                    min: 0,
                    max: Math.round(duration),
                    now: Math.round(displayPosition),
                  }}
                  accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
                  onAccessibilityAction={(event) => {
                    if (event.nativeEvent.actionName === 'increment') {
                      seekTo(displayPosition + 10);
                    } else if (event.nativeEvent.actionName === 'decrement') {
                      seekTo(displayPosition - 10);
                    }
                  }}
                  onLayout={handleProgressLayout}
                  style={styles.progressHitArea}
                  {...progressPan.panHandlers}
                >
                  <View style={styles.progressTrack} pointerEvents="none">
                    <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                    <View style={[styles.progressThumb, { left: `${progress * 100}%` }]} />
                  </View>
                </View>

                <View style={styles.timeRow}>
                  <Text style={styles.time}>{formatPlaybackTime(displayPosition)}</Text>
                  {sleepStatus ? (
                    <Text style={styles.sleepStatus} numberOfLines={1}>
                      {sleepStatus}
                    </Text>
                  ) : null}
                  <Text style={styles.time}>{formatPlaybackTime(duration)}</Text>
                </View>
              </View>

              <View style={styles.controls}>
                {isAudiobook ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Playback speed ${formatPlaybackRate(playbackRate)}`}
                    onPress={() => setPanel('speed')}
                    hitSlop={8}
                    style={({ pressed }) => [styles.modeButton, pressed && styles.pressed]}
                  >
                    <Text
                      style={[
                        styles.rateLabel,
                        playbackRate !== 1 && styles.rateLabelActive,
                      ]}
                    >
                      {formatPlaybackRate(playbackRate)}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={shuffleEnabled ? 'Turn shuffle off' : 'Turn shuffle on'}
                    accessibilityState={{ selected: shuffleEnabled }}
                    onPress={toggleShuffle}
                    hitSlop={8}
                    style={({ pressed }) => [styles.modeButton, pressed && styles.pressed]}
                  >
                    <MaterialCommunityIcons
                      name={shuffleEnabled ? 'shuffle' : 'shuffle-disabled'}
                      size={24}
                      color={shuffleEnabled ? colors.primary : colors.textMuted}
                    />
                  </Pressable>
                )}

                {isAudiobook ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Rewind 10 seconds"
                    onPress={seekBackward}
                    hitSlop={12}
                    style={({ pressed }) => [styles.sideButton, pressed && styles.pressed]}
                  >
                    <MaterialCommunityIcons name="rewind-10" size={34} color={colors.text} />
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Previous track"
                    accessibilityState={{ disabled: !canGoBack }}
                    disabled={!canGoBack}
                    onPress={playPrevious}
                    hitSlop={12}
                    style={({ pressed }) => [styles.sideButton, pressed && styles.pressed]}
                  >
                    <MaterialCommunityIcons
                      name="skip-previous"
                      size={34}
                      color={canGoBack ? colors.text : colors.textSubtle}
                    />
                  </Pressable>
                )}

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

                {isAudiobook ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Forward 10 seconds"
                    onPress={seekForward}
                    hitSlop={12}
                    style={({ pressed }) => [styles.sideButton, pressed && styles.pressed]}
                  >
                    <MaterialCommunityIcons name="fast-forward-10" size={34} color={colors.text} />
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Next track"
                    accessibilityState={{ disabled: !canGoForward }}
                    disabled={!canGoForward}
                    onPress={playNext}
                    hitSlop={12}
                    style={({ pressed }) => [styles.sideButton, pressed && styles.pressed]}
                  >
                    <MaterialCommunityIcons
                      name="skip-next"
                      size={34}
                      color={canGoForward ? colors.text : colors.textSubtle}
                    />
                  </Pressable>
                )}

                {isAudiobook ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      sleepTimer.mode === 'off'
                        ? 'Set sleep timer'
                        : sleepStatus ?? 'Sleep timer'
                    }
                    accessibilityState={{ selected: sleepTimer.mode !== 'off' }}
                    onPress={() => setPanel('sleep')}
                    hitSlop={8}
                    style={({ pressed }) => [styles.modeButton, pressed && styles.pressed]}
                  >
                    <MaterialCommunityIcons
                      name={sleepTimer.mode === 'off' ? 'timer-outline' : 'timer'}
                      size={24}
                      color={sleepTimer.mode === 'off' ? colors.textMuted : colors.primary}
                    />
                  </Pressable>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={repeatLabel(repeatMode)}
                    accessibilityState={{ selected: repeatMode !== 'off' }}
                    onPress={cycleRepeatMode}
                    hitSlop={8}
                    style={({ pressed }) => [styles.modeButton, pressed && styles.pressed]}
                  >
                    <MaterialCommunityIcons
                      name={repeatIcon}
                      size={24}
                      color={repeatMode === 'off' ? colors.textMuted : colors.primary}
                    />
                  </Pressable>
                )}
              </View>
            </View>
          </View>

          {panel === 'queue' ? <QueuePanel onClose={closePanel} /> : null}
          {panel === 'speed' ? <SpeedPanel onClose={closePanel} /> : null}
          {panel === 'sleep' ? <SleepPanel onClose={closePanel} /> : null}
        </Animated.View>
      </View>
    </Modal>
  );
}

const QueuePanel = memo(function QueuePanel({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const {
    queue,
    currentIndex,
    isPlaying,
    shuffleEnabled,
    repeatMode,
    playQueueItem,
    moveQueueItem,
    removeQueueItem,
  } = usePlayer();

  return (
    <View
      style={[
        styles.queueOverlay,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 },
      ]}
    >
      <PanelHeader
        title="Queue"
        summary={`${queue.length} ${queue.length === 1 ? 'track' : 'tracks'} · ${
          shuffleEnabled ? 'Shuffled' : 'In order'
        } · ${repeatLabel(repeatMode)}`}
        onClose={onClose}
      />

      <FlatList
        data={queue}
        keyExtractor={(track, index) => `${track.id}:${index}`}
        extraData={`${currentIndex}:${isPlaying}`}
        style={styles.queueList}
        contentContainerStyle={styles.queueListContent}
        initialScrollIndex={currentIndex > 0 ? currentIndex : undefined}
        getItemLayout={(_, index) => ({
          length: QUEUE_ROW_HEIGHT,
          offset: QUEUE_ROW_HEIGHT * index,
          index,
        })}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.queueEmpty}>The queue is empty.</Text>}
        renderItem={({ item, index }) => {
          const active = index === currentIndex;

          return (
            <View style={[styles.queueRow, active && styles.queueRowActive]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Play ${item.title}`}
                accessibilityState={{ selected: active }}
                onPress={() => playQueueItem(index)}
                style={({ pressed }) => [styles.queueRowContent, pressed && styles.pressed]}
              >
                <View style={styles.queueArtwork}>
                  <ArtworkTile
                    artworkUri={item.artworkUri}
                    title={item.title}
                    kind={item.mediaType === 'audiobook' ? 'audiobook' : 'track'}
                    borderRadius={8}
                    iconSize={20}
                  />
                </View>

                <View style={styles.queueRowBody}>
                  <Text
                    style={[styles.queueRowTitle, active && styles.queueRowTitleActive]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text style={styles.queueRowMeta} numberOfLines={1}>
                    {getTrackArtistName(item)} · {formatDuration(item.durationMs)}
                  </Text>
                </View>

                {active ? (
                  <MaterialCommunityIcons
                    name={isPlaying ? 'volume-high' : 'pause'}
                    size={18}
                    color={colors.primary}
                    style={styles.queuePlayingIcon}
                  />
                ) : null}
              </Pressable>

              <View style={styles.queueActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Move up"
                  accessibilityState={{ disabled: index === 0 }}
                  disabled={index === 0}
                  onPress={() => moveQueueItem(index, index - 1)}
                  hitSlop={4}
                  style={({ pressed }) => [styles.queueAction, pressed && styles.pressed]}
                >
                  <MaterialCommunityIcons
                    name="chevron-up"
                    size={20}
                    color={index === 0 ? colors.textSubtle : colors.textMuted}
                  />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Move down"
                  accessibilityState={{ disabled: index === queue.length - 1 }}
                  disabled={index === queue.length - 1}
                  onPress={() => moveQueueItem(index, index + 1)}
                  hitSlop={4}
                  style={({ pressed }) => [styles.queueAction, pressed && styles.pressed]}
                >
                  <MaterialCommunityIcons
                    name="chevron-down"
                    size={20}
                    color={index === queue.length - 1 ? colors.textSubtle : colors.textMuted}
                  />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Remove from queue"
                  accessibilityState={{ disabled: queue.length === 1 }}
                  disabled={queue.length === 1}
                  onPress={() => removeQueueItem(index)}
                  hitSlop={4}
                  style={({ pressed }) => [styles.queueAction, pressed && styles.pressed]}
                >
                  <MaterialCommunityIcons
                    name="close-circle-outline"
                    size={20}
                    color={queue.length === 1 ? colors.textSubtle : colors.textMuted}
                  />
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </View>
  );
});

function PanelHeader({
  title,
  summary,
  onClose,
}: {
  title: string;
  summary?: string;
  onClose: () => void;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.queueHeader}>
      <View style={styles.queueHeaderText}>
        <Text style={styles.queueTitle}>{title}</Text>
        {summary ? <Text style={styles.queueSummary}>{summary}</Text> : null}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Close ${title.toLocaleLowerCase()}`}
        onPress={onClose}
        hitSlop={12}
        style={({ pressed }) => [styles.queueClose, pressed && styles.pressed]}
      >
        <MaterialCommunityIcons name="chevron-down" size={28} color={colors.text} />
      </Pressable>
    </View>
  );
}

const SpeedPanel = memo(function SpeedPanel({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { currentTrack, playbackRate, setPlaybackRate } = usePlayer();
  const isAudiobook = currentTrack?.mediaType === 'audiobook';

  return (
    <View
      style={[
        styles.queueOverlay,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 },
      ]}
    >
      <PanelHeader
        title="Playback speed"
        summary={`Saved for ${isAudiobook ? 'audiobooks' : 'music'}. Pitch stays the same.`}
        onClose={onClose}
      />

      <ScrollView
        contentContainerStyle={styles.panelList}
        showsVerticalScrollIndicator={false}
      >
        {PLAYBACK_RATE_OPTIONS.map((rate) => {
          const selected = Math.abs(playbackRate - rate) < 0.001;

          return (
            <Pressable
              key={rate}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${formatPlaybackRate(rate)} speed`}
              onPress={() => {
                setPlaybackRate(rate);
                onClose();
              }}
              style={({ pressed }) => [
                styles.optionRow,
                selected && styles.optionRowSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                {formatPlaybackRate(rate)}
              </Text>

              <View style={styles.optionTrailing}>
                {rate === 1 ? <Text style={styles.optionHint}>Normal</Text> : null}
                {selected ? (
                  <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
});

const SleepPanel = memo(function SleepPanel({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  const { sleepTimer, setSleepTimer, setSleepTimerToEndOfTrack } = usePlayer();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (sleepTimer.mode !== 'duration') {
      return;
    }

    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1_000);

    return () => clearInterval(interval);
  }, [sleepTimer]);

  const choose = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <View
      style={[
        styles.queueOverlay,
        { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 },
      ]}
    >
      <PanelHeader
        title="Sleep timer"
        summary={sleepTimerSummary(sleepTimer, now)}
        onClose={onClose}
      />

      <ScrollView
        contentContainerStyle={styles.panelList}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: sleepTimer.mode === 'off' }}
          accessibilityLabel="Turn sleep timer off"
          onPress={() => choose(() => setSleepTimer(null))}
          style={({ pressed }) => [
            styles.optionRow,
            sleepTimer.mode === 'off' && styles.optionRowSelected,
            pressed && styles.pressed,
          ]}
        >
          <Text
            style={[
              styles.optionLabel,
              sleepTimer.mode === 'off' && styles.optionLabelSelected,
            ]}
          >
            Off
          </Text>
          {sleepTimer.mode === 'off' ? (
            <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
          ) : null}
        </Pressable>

        {SLEEP_TIMER_MINUTES.map((minutes) => {
          const selected =
            sleepTimer.mode === 'duration' && sleepTimer.minutes === minutes;

          return (
            <Pressable
              key={minutes}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`Stop after ${minutes} minutes`}
              onPress={() => choose(() => setSleepTimer(minutes))}
              style={({ pressed }) => [
                styles.optionRow,
                selected && styles.optionRowSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                {minutes} minutes
              </Text>
              {selected ? (
                <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
              ) : null}
            </Pressable>
          );
        })}

        <Pressable
          accessibilityRole="radio"
          accessibilityState={{ checked: sleepTimer.mode === 'endOfTrack' }}
          accessibilityLabel="Stop at the end of this track"
          onPress={() => choose(setSleepTimerToEndOfTrack)}
          style={({ pressed }) => [
            styles.optionRow,
            sleepTimer.mode === 'endOfTrack' && styles.optionRowSelected,
            pressed && styles.pressed,
          ]}
        >
          <View style={styles.optionTextGroup}>
            <Text
              style={[
                styles.optionLabel,
                sleepTimer.mode === 'endOfTrack' && styles.optionLabelSelected,
              ]}
            >
              End of this track
            </Text>
            <Text style={styles.optionHint}>Best for audiobook chapters</Text>
          </View>
          {sleepTimer.mode === 'endOfTrack' ? (
            <MaterialCommunityIcons name="check" size={20} color={colors.primary} />
          ) : null}
        </Pressable>
      </ScrollView>
    </View>
  );
});

function formatPlaybackRate(rate: number): string {
  return `${rate}×`;
}

function describeSleepTimer(timer: SleepTimer, now: number): string | null {
  if (timer.mode === 'endOfTrack') {
    return 'Sleep · end of track';
  }

  if (timer.mode === 'duration') {
    return `Sleep · ${formatRemainingTime(timer.endsAt, now)}`;
  }

  return null;
}

function sleepTimerSummary(timer: SleepTimer, now: number): string {
  if (timer.mode === 'endOfTrack') {
    return 'Stops at the end of this track.';
  }

  if (timer.mode === 'duration') {
    return `Stops in ${formatRemainingTime(timer.endsAt, now)}.`;
  }

  return 'Playback keeps going until you stop it.';
}

function formatRemainingTime(endsAt: number, now: number): string {
  const remainingSeconds = Math.max(0, Math.ceil((endsAt - now) / 1_000));
  return formatPlaybackTime(remainingSeconds);
}

function repeatLabel(mode: RepeatMode): string {
  switch (mode) {
    case 'all':
      return 'Repeat all';
    case 'one':
      return 'Repeat one';
    default:
      return 'Repeat off';
  }
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    modalBackdrop: {
      flex: 1,
      backgroundColor: colors.background,
    },
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
    },
    dragArea: {
      paddingBottom: 8,
    },
    grabber: {
      alignSelf: 'center',
      width: 36,
      height: 4,
      marginBottom: 6,
      borderRadius: 2,
      backgroundColor: colors.border,
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
      gap: 2,
    },
    progressHitArea: {
      height: 28,
      justifyContent: 'center',
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
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    time: {
      color: colors.textSubtle,
      fontSize: 11,
      fontVariant: ['tabular-nums'],
    },
    sleepStatus: {
      flexShrink: 1,
      color: colors.primary,
      fontSize: 11,
      fontWeight: '600',
      textAlign: 'center',
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 2,
    },
    modeButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rateLabel: {
      color: colors.textMuted,
      fontSize: 12,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    rateLabelActive: {
      color: colors.primary,
    },
    sideButton: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
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
    queueOverlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      paddingHorizontal: 20,
      backgroundColor: colors.background,
    },
    queueHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginBottom: 14,
    },
    queueHeaderText: {
      flex: 1,
      gap: 3,
    },
    queueTitle: {
      color: colors.text,
      fontSize: 24,
      fontWeight: '700',
    },
    queueSummary: {
      color: colors.textMuted,
      fontSize: 12,
    },
    queueList: {
      flex: 1,
    },
    queueClose: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    queueListContent: {
      paddingBottom: 12,
    },
    queueEmpty: {
      marginTop: 24,
      color: colors.textSubtle,
      fontSize: 13,
      textAlign: 'center',
    },
    queueRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
      paddingRight: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    queueRowActive: {
      borderColor: colors.primary,
    },
    queueRowContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      paddingLeft: 8,
      paddingRight: 4,
    },
    queueArtwork: {
      width: 42,
    },
    queueRowBody: {
      flex: 1,
      gap: 3,
    },
    queueRowTitle: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    queueRowTitleActive: {
      color: colors.primary,
    },
    queueRowMeta: {
      color: colors.textMuted,
      fontSize: 11,
    },
    queuePlayingIcon: {
      marginLeft: 2,
    },
    queueActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    queueAction: {
      width: 30,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    panelList: {
      paddingBottom: 12,
      gap: 8,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    optionRowSelected: {
      borderColor: colors.primary,
    },
    optionLabel: {
      color: colors.text,
      fontSize: 15,
    },
    optionLabelSelected: {
      color: colors.primary,
      fontWeight: '600',
    },
    optionHint: {
      color: colors.textMuted,
      fontSize: 12,
    },
    optionTrailing: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    optionTextGroup: {
      flex: 1,
      gap: 2,
    },
  });
}
