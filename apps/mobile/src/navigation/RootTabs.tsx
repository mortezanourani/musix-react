import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type {
  AlbumsStackParamList,
  ArtistsStackParamList,
  HomeStackParamList,
  RootTabParamList,
} from './types';
import { AlbumTracksScreen } from '../screens/AlbumTracksScreen';
import { AlbumsScreen } from '../screens/AlbumsScreen';
import { ArtistAlbumsScreen } from '../screens/ArtistAlbumsScreen';
import { ArtistsScreen } from '../screens/ArtistsScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { colors } from '../theme/colors';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const tabIcons: Record<keyof RootTabParamList, { active: IconName; inactive: IconName }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Albums: { active: 'album', inactive: 'album' },
  Artists: { active: 'account-music', inactive: 'account-music-outline' },
  Books: { active: 'book-open-page-variant', inactive: 'book-open-page-variant-outline' },
  Search: { active: 'magnify', inactive: 'magnify' },
};

const Tab = createBottomTabNavigator<RootTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const AlbumsStack = createNativeStackNavigator<AlbumsStackParamList>();
const ArtistsStack = createNativeStackNavigator<ArtistsStackParamList>();

const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '600' as const },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};

export function RootTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: [styles.tabBar, { paddingBottom: Math.max(insets.bottom, 12) }],
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ focused, color, size }) => (
          <MaterialCommunityIcons
            name={focused ? tabIcons[route.name].active : tabIcons[route.name].inactive}
            size={Math.round(size * 1.1)}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeNavigator} />
      <Tab.Screen name="Albums" component={AlbumsNavigator} />
      <Tab.Screen name="Artists" component={ArtistsNavigator} />
      <Tab.Screen name="Books" component={BooksScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
    </Tab.Navigator>
  );
}

function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={stackScreenOptions}>
      <HomeStack.Screen
        name="HomeFeed"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <HomeStack.Screen
        name="ArtistAlbums"
        component={ArtistAlbumsScreen}
        options={({ route }) => ({ title: route.params.artistName })}
      />
      <HomeStack.Screen name="AlbumTracks" component={AlbumTracksScreen} />
    </HomeStack.Navigator>
  );
}

function AlbumsNavigator() {
  return (
    <AlbumsStack.Navigator screenOptions={stackScreenOptions}>
      <AlbumsStack.Screen
        name="AlbumsList"
        component={AlbumsScreen}
        options={{ headerShown: false }}
      />
      <AlbumsStack.Screen name="AlbumTracks" component={AlbumTracksScreen} />
    </AlbumsStack.Navigator>
  );
}

function ArtistsNavigator() {
  return (
    <ArtistsStack.Navigator screenOptions={stackScreenOptions}>
      <ArtistsStack.Screen
        name="ArtistsList"
        component={ArtistsScreen}
        options={{ headerShown: false }}
      />
      <ArtistsStack.Screen
        name="ArtistAlbums"
        component={ArtistAlbumsScreen}
        options={({ route }) => ({ title: route.params.artistName })}
      />
      <ArtistsStack.Screen name="AlbumTracks" component={AlbumTracksScreen} />
    </ArtistsStack.Navigator>
  );
}

function BooksScreen() {
  return (
    <PlaceholderScreen
      title="Books"
      icon="book-open-page-variant"
      description="Your audiobooks will live here. This tab arrives in a later phase."
    />
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
