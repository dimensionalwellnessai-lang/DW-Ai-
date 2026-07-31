import React, { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import { initializeSentry } from '../src/services/monitoring';
import { subscriptionService } from '../src/services/subscriptions';
import { revalidateEntitlement } from '../src/services/entitlement';
import { analytics } from '../src/services/analytics';
import { useAuthStore } from '../src/stores/auth';
import { useSubscriptionStore } from '../src/stores/subscription';

// Keep splash screen visible while we initialize
void SplashScreen.preventAutoHideAsync().catch((error) => {
  Sentry.captureException(error);
});

// Initialize monitoring early
initializeSentry();

// Initialize analytics
analytics.initialize();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10,   // 10 minutes
    },
    mutations: {
      retry: 0,
    },
  },
});

function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const fetchStatus = useSubscriptionStore((s) => s.fetchStatus);

  // Track whether the app is in the foreground to trigger revalidation on resume
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    async function init() {
      try {
        await subscriptionService.initialize();
        await initialize();
      } catch (error) {
        Sentry.captureException(error);
      } finally {
        await SplashScreen.hideAsync();
      }
    }
    void init();
  }, [initialize]);

  // Revalidate entitlement whenever the app comes back to the foreground.
  // This handles cases where the user subscribed via the App Store app or
  // approved a deferred/parental purchase while DW was backgrounded.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const wasBackground =
        appState.current === 'background' || appState.current === 'inactive';
      const isForeground = nextState === 'active';

      if (wasBackground && isForeground) {
        void revalidateEntitlement()
          .then((status) => {
            // Sync refreshed entitlement into the store so UI reflects current state
            useSubscriptionStore.setState({
              status,
              entitlementLastValidated: Date.now(),
            });
          })
          .catch(() => {
            // Non-fatal — cached value or safe default already handled inside revalidateEntitlement
          });
      }

      appState.current = nextState;
    });

    return () => subscription.remove();
  }, [fetchStatus]);

  if (!isInitialized) {
    return null; // Splash screen visible
  }

  return (
    <>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen
          name="(modals)/paywall"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Upgrade to DW Plus',
          }}
        />
        <Stack.Screen
          name="(modals)/settings"
          options={{
            presentation: 'modal',
            headerShown: true,
            title: 'Settings',
          }}
        />
      </Stack>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootLayout />
    </QueryClientProvider>
  );
}

export default Sentry.wrap(App);
