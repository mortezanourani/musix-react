import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import type { MainStackParamList } from '../navigation/types';
import { useLibrary } from '../library/LibraryContext';

type SettingsScreenProps = NativeStackScreenProps<MainStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: SettingsScreenProps) {
    const { tracks, status, error, updateLibrary } = useLibrary();

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
                <Text style={styles.sectionTitle}>Library</Text>
                <Pressable
                    style={styles.option}
                    onPress={handleLibraryUpdate}
                    disabled={status === 'scanning'}
                >
                    <View style={styles.optionContent}>
                        <MaterialCommunityIcons
                            name="folder-sync"
                            size={24}
                            color={colors.text}
                        />
                        <Text style={styles.optionText}>Update Library</Text>
                    </View>
                    {status === 'scanning' ? (
                        <MaterialCommunityIcons
                            name="loading"
                            size={24}
                            color={colors.textMuted}
                        />
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

const styles = StyleSheet.create({
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
        option: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.surface,
            borderRadius: 12,
            padding: 16,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border,
        },
        themeOption: {
            marginTop: 8,
        },
        optionContent: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
        },
        optionText: {
            fontSize: 16,
            color: colors.text,
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