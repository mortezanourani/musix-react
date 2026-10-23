import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type PlaceholderScreenProps = {
  title: string;
  description: string;
  icon: IconName;
};

export function PlaceholderScreen({ title, description, icon }: PlaceholderScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 16 }]}>
      <Text style={styles.heading}>{title}</Text>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <MaterialCommunityIcons name={icon} size={34} color={colors.primary} />
        </View>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: colors.background,
  },
  heading: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 48,
  },
  iconCircle: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 38,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  description: {
    maxWidth: 280,
    marginTop: 18,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
