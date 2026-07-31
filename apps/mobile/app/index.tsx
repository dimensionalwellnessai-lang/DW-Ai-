import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/stores/auth';

/**
 * Root index: redirect based on auth state.
 */
export default function Index() {
  const user = useAuthStore((s) => s.user);

  if (user) {
    return <Redirect href="/(tabs)" />;
  }
  return <Redirect href="/auth/welcome" />;
}
