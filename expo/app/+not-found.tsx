import { Link, Stack } from 'expo-router';
import { StyleSheet, View, Text } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import colors from '@/constants/colors';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Not Found',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }} 
      />
      <View style={styles.container}>
        <AlertCircle size={48} color={colors.textMuted} strokeWidth={1} />
        <Text style={styles.title}>Page Not Found</Text>
        <Text style={styles.subtitle}>This screen does not exist.</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>Go to Dashboard</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: '300' as const,
    color: colors.text,
    marginTop: 24,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 32,
  },
  link: {
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  linkText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: '500' as const,
    letterSpacing: 1,
  },
});
