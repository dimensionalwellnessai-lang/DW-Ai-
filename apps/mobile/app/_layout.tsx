import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import { initializeSentry } from '../src/services/monitoring';
import { subscriptionService } from '../src/services/subscriptions';
import { analytics } from '../src/services/analytics';
import { useAuthStore } from '../src/stores/auth';

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
