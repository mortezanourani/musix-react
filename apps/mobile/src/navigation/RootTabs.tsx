import { MaterialCommunityIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { ComponentProps } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreen } from '../screens/HomeScreen';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { colors } from '../theme/colors';

export type RootTabParamList = {
  Home: undefined;
  Albums: undefined;
  Artists: undefined;
  Books: undefined;
  Search: undefined;
};

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const tabIcons: Record<keyof RootTabParamList, { active: IconName; inactive: IconName }> = {
  Home: { active: 'home', inactive: 'home-outline' },
  Albums: { active: 'album', inactive: 'album' },
  Artists: { active: 'account-music', inactive: 'account-music-outline' },
  Books: { active: 'book-open-page-variant', inactive: 'book-open-page-variant-outline' },
  Search: { active: 'magnify', inactive: 'magnify' },
};

const Tab = createBottomTabNavigator<RootTabParamList>();

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
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Albums" component={AlbumsScreen} />
      <Tab.Screen name="Artists" component={ArtistsScreen} />
      <Tab.Screen name="Books" component={BooksScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
    </Tab.Navigator>
  );
}

function AlbumsScreen() {
  return (
    <PlaceholderScreen
      title="Albums"
      icon="album"
      description="Albums will appear here once track tags are read from your files."
    />
  );
}

function ArtistsScreen() {
  return (
    <PlaceholderScreen
      title="Artists"
      icon="account-music"
      description="Artists will appear here once track tags are read from your files."
    />
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
