import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MainStackParamList } from './types';
import { AlbumTracksScreen } from '../screens/AlbumTracksScreen';
import { ArtistAlbumsScreen } from '../screens/ArtistAlbumsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { useTheme } from '../theme/ThemeContext';
import {SettingsScreen} from "../screens/SettingsScreen";

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainStack() {
    const { colors } = useTheme();

    const stackScreenOptions = useMemo(
        () => ({
            headerStyle: { backgroundColor: colors.background },
            headerTintColor: colors.text,
            headerTitleStyle: { fontWeight: '600' as const },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.background },
        }),
        [colors],
    );

    return (
        <Stack.Navigator screenOptions={stackScreenOptions}>
            <Stack.Screen
                name="HomeFeed"
                component={HomeScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ title: 'Settings' }}
            />
            <Stack.Screen
                name="ArtistAlbums"
                component={ArtistAlbumsScreen}
                options={({ route }) => ({ title: route.params.artistName })}
            />
            <Stack.Screen name="AlbumTracks" component={AlbumTracksScreen} />
        </Stack.Navigator>
    );
}
