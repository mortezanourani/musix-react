import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LibraryProvider } from './src/library/LibraryContext';
import { RootTabs } from './src/navigation/RootTabs';
import { colors } from './src/theme/colors';

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.primary,
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <LibraryProvider>
        <NavigationContainer theme={navigationTheme}>
          <RootTabs />
        </NavigationContainer>
      </LibraryProvider>
    </SafeAreaProvider>
  );
}
