import React, { useEffect, useMemo, useState } from 'react';
import { AppState, AppStateStatus, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import { AppErrorBoundary } from '../src/components/AppErrorBoundary';
import { ErrorState } from '../src/components/ui/StateViews';
import { analytics } from '../src/services/analytics';
import {
  captureError,
  initializeSentry,
} from '../src/services/monitoring';
import {
  revalidateAppSession,
  runAppBootstrap,
  type BootstrapStage,
} from '../src/bootstrap/app-bootstrap';
import { shouldRetryRequest } from '../src/lib/reliability';

void SplashScreen.preventAutoHideAsync().catch((error) => {
  Sentry.captureException(error);
});

initializeSentry();
analytics.initialize();

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) =>
          shouldRetryRequest({
            attempt: failureCount - 1,
            retries: 2,
            status:
              error && typeof error === 'object' && 'status' in error
                ? Number((error as { status?: number }).status)
                : undefined,
          }),
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 10,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

function BootstrapLoading({ stage }: { stage: BootstrapStage }) {
  const stageLabel: Record<BootstrapStage, string> = {
    idle: 'Preparing your experience…',
    'restore-auth': 'Restoring your secure session…',
    'resolve-entitlements': 'Checking your access…',
    'resolve-route': 'Setting up your home…',
    'prefetch-core-data': 'Loading your essentials…',
    ready: 'Ready.',
    failed: 'We ran into a startup issue.',
  };

  return (
    <View style={styles.loadingContainer}>
      <Text style={styles.loadingTitle}>DW.ai</Text>
      <Text style={styles.loadingText}>{stageLabel[stage]}</Text>
    </View>
  );
}

function RootLayout() {
  const queryClient = useMemo(() => createQueryClient(), []);
  const [bootstrapStage, setBootstrapStage] = useState<BootstrapStage>('idle');
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapAttempt, setBootstrapAttempt] = useState(0);

  useEffect(() => {
    let mounted = true;
    let timedOut = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    async function initialize() {
      setBootstrapStage('idle');
      setBootstrapError(null);

      try {
        timeout = setTimeout(() => {
          if (mounted) {
            timedOut = true;
            setBootstrapError('Startup is taking longer than expected. Please retry.');
            setBootstrapStage('failed');
          }
        }, 20_000);

        await runAppBootstrap(queryClient, (stage) => {
          if (mounted) {
            setBootstrapStage(stage);
          }
        });

        if (timeout) {
          clearTimeout(timeout);
        }

        if (!mounted || timedOut) {
          return;
        }

        setBootstrapStage('ready');
      } catch (error) {
        if (!mounted) {
          return;
        }

        if (timeout) {
          clearTimeout(timeout);
        }

        captureError(error, { area: 'bootstrap' });
        setBootstrapError(
          error instanceof Error
            ? error.message
            : 'We could not finish startup. Please try again.',
        );
        setBootstrapStage('failed');
      } finally {
        await SplashScreen.hideAsync();
      }
    }

    void initialize();

    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      void revalidateAppSession(queryClient, nextState);
    });

    const onUnhandledRejection = (event: { reason?: unknown }) => {
      captureError(event.reason, { area: 'unhandled_promise_rejection' });
    };

    (globalThis as typeof globalThis & {
      addEventListener?: (type: string, listener: (...args: unknown[]) => void) => void;
      removeEventListener?: (type: string, listener: (...args: unknown[]) => void) => void;
    }).addEventListener?.('unhandledrejection', onUnhandledRejection);

    return () => {
      mounted = false;
      if (timeout) {
        clearTimeout(timeout);
      }
      subscription.remove();
      (globalThis as typeof globalThis & {
        removeEventListener?: (type: string, listener: (...args: unknown[]) => void) => void;
      }).removeEventListener?.('unhandledrejection', onUnhandledRejection);
    };
  }, [bootstrapAttempt, queryClient]);

  if (bootstrapStage !== 'ready') {
    return (
      <QueryClientProvider client={queryClient}>
        {bootstrapStage === 'failed' ? (
          <ErrorState
            title="Startup needs another try"
            message={
              bootstrapError ??
              'We could not complete startup. Please retry when you are ready.'
            }
            onRetry={() => {
              setBootstrapStage('idle');
              setBootstrapError(null);
              setBootstrapAttempt((attempt) => attempt + 1);
            }}
          />
        ) : (
          <BootstrapLoading stage={bootstrapStage} />
        )}
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppErrorBoundary>
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
      </AppErrorBoundary>
    </QueryClientProvider>
  );
}

export default Sentry.wrap(RootLayout);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
    backgroundColor: '#0f172a',
  },
  loadingTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: '#ffffff',
  },
  loadingText: {
    fontSize: 16,
    color: '#cbd5e1',
    textAlign: 'center',
  },
});
