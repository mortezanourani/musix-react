import { useState } from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as MediaLibrary from 'expo-media-library/legacy';
import { useLibrary } from '../library/LibraryContext';
import type { MainStackParamList } from '../navigation/types';
import { writeTrackMetadata } from '../music/readTrackMetadata';
import type { ThemeColors } from '../theme/colors';
import { useThemedStyles } from '../theme/useThemedStyles';

type EditTrackScreenProps = NativeStackScreenProps<MainStackParamList, 'EditTrack'>;

export function EditTrackScreen({ navigation, route }: EditTrackScreenProps) {
  const { tracks, updateLibrary } = useLibrary();
  const track = tracks.find(({ id }) => id === route.params.trackId);
  const styles = useThemedStyles(createStyles);
  const [album, setAlbum] = useState(track?.album ?? '');
  const [trackNumber, setTrackNumber] = useState(
    track?.trackNumber === null || track?.trackNumber === undefined
      ? ''
      : String(track.trackNumber),
  );
  const [title, setTitle] = useState(track?.title ?? '');
  const [artist, setArtist] = useState(
    track?.artist ??
      track?.albumArtist ??
      (track?.mediaType === 'audiobook' ? track.author : null) ??
      '',
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!track || saving) {
      return;
    }

    const trimmedTitle = title.trim();
    const trimmedTrackNumber = trackNumber.trim();
    const parsedTrackNumber =
      trimmedTrackNumber === '' ? null : Number(trimmedTrackNumber);

    if (!trimmedTitle) {
      setError('Track title cannot be empty.');
      return;
    }

    if (
      parsedTrackNumber !== null &&
      (!Number.isSafeInteger(parsedTrackNumber) || parsedTrackNumber < 1)
    ) {
      setError('Track number must be a positive whole number, or left blank.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const contentUri = await MediaLibrary.getAssetContentUriAsync(track.id);
      await writeTrackMetadata(contentUri, {
        album: album.trim() || null,
        artist: artist.trim() || null,
        title: trimmedTitle,
        trackNumber: parsedTrackNumber,
      });
      await updateLibrary();
      navigation.goBack();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The audio tags could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  if (!track) {
    return (
      <View style={styles.unavailable}>
        <Text style={styles.error}>This audio file is no longer in your library.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.filename} numberOfLines={2}>
        {track.filename}
      </Text>
      <Text style={styles.notice}>
        These changes are written to the audio file on your device. Editing requires Android 11 or
        newer, and Android may ask you to allow access to the file.
      </Text>

      <View style={styles.form}>
        <Field label="Album name" value={album} onChangeText={setAlbum} />
        <Field
          label="Track number"
          value={trackNumber}
          onChangeText={setTrackNumber}
          keyboardType="number-pad"
        />
        <Field label="Track title" value={title} onChangeText={setTitle} />
        <Field label="Artist name" value={artist} onChangeText={setArtist} />
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: saving }}
        disabled={saving}
        onPress={() => void save()}
        style={({ pressed }) => [
          styles.saveButton,
          saving && styles.disabledButton,
          pressed && !saving && styles.pressed,
        ]}
      >
        <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save to file'}</Text>
      </Pressable>
    </ScrollView>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'number-pad';
};

function Field({ label, value, onChangeText, keyboardType = 'default' }: FieldProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize="sentences"
        placeholder={label}
        placeholderTextColor={styles.placeholder.color}
        selectionColor={styles.input.color}
        style={styles.input}
      />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      padding: 20,
      paddingBottom: 36,
      gap: 18,
    },
    filename: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    notice: {
      color: colors.textMuted,
      fontSize: 13,
      lineHeight: 19,
    },
    form: {
      gap: 16,
    },
    field: {
      gap: 7,
    },
    label: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
    },
    input: {
      minHeight: 48,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.surface,
      color: colors.text,
      fontSize: 15,
    },
    placeholder: {
      color: colors.textSubtle,
    },
    error: {
      color: colors.danger,
      fontSize: 13,
      lineHeight: 19,
    },
    saveButton: {
      minHeight: 50,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    saveButtonText: {
      color: colors.onPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
    disabledButton: {
      opacity: 0.6,
    },
    pressed: {
      opacity: 0.75,
    },
    unavailable: {
      flex: 1,
      justifyContent: 'center',
      padding: 24,
      backgroundColor: colors.background,
    },
  });
}
