import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LibraryProvider } from './src/library/LibraryContext';
import { MainStack } from './src/navigation/MainStack';
import { MiniPlayer } from './src/player/MiniPlayer';
import { PlayerProvider } from './src/player/PlayerContext';
import { PlayerModal } from './src/player/PlayerModal';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LibraryProvider>
          <PlayerProvider>
            <View style={styles.app}>
              <ThemedNavigation />
              <MiniPlayer />
            </View>
            <PlayerModal />
          </PlayerProvider>
        </LibraryProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ThemedNavigation() {
  const { colors, isDark } = useTheme();

  const navigationTheme = useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;

    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        notification: colors.primary,
      },
    };
  }, [colors, isDark]);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationContainer theme={navigationTheme}>
        <MainStack />
      </NavigationContainer>
    </>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
  },
});
