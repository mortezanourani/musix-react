import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StyleSheet} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MainStackParamList } from './types';
import { AlbumTracksScreen } from '../screens/AlbumTracksScreen';
import { ArtistAlbumsScreen } from '../screens/ArtistAlbumsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { colors } from '../theme/colors';
import {SettingsScreen} from "../screens/SettingsScreen";

const Stack = createNativeStackNavigator<MainStackParamList>();

const stackScreenOptions = {
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.text,
    headerTitleStyle: { fontWeight: '600' as const },
    headerShadowVisible: false,
    contentStyle: { backgroundColor: colors.background },
};

export function MainStack() {
    const insets = useSafeAreaInsets();

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

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        borderTopWidth: StyleSheet.hairlineWidth,
        elevation: 0,
        height: 96,
        paddingTop: 6,
        paddingBottom: 12,
    },
    tabBarLabel: {
        fontSize: Math.round(12 * 0.9),
        fontWeight: '500',
        marginTop: 4,
    },
});
