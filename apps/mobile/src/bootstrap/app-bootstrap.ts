import type { QueryClient } from '@tanstack/react-query';
import type { AppStateStatus } from 'react-native';
import { aiService } from '../services/ai';
import { analytics } from '../services/analytics';
import { resolveInitialRoute } from '../lib/reliability';
import { captureError } from '../services/monitoring';
import { subscriptionService } from '../services/subscriptions';
import { useAuthStore } from '../stores/auth';
import { useSubscriptionStore } from '../stores/subscription';

export type BootstrapStage =
  | 'idle'
  | 'restore-auth'
  | 'resolve-entitlements'
  | 'resolve-route'
  | 'prefetch-core-data'
  | 'ready'
  | 'failed';

export interface BootstrapResult {
  stage: BootstrapStage;
  initialRoute: '/(tabs)' | '/auth/welcome';
}

export async function runAppBootstrap(
  queryClient: QueryClient,
  onStageChange?: (stage: BootstrapStage) => void,
): Promise<BootstrapResult> {
  analytics.track('app_bootstrap_started', {});

  try {
    onStageChange?.('restore-auth');
    const user = await useAuthStore.getState().initialize();
    analytics.track('app_bootstrap_stage_success', { stage: 'restore-auth' });

    onStageChange?.('resolve-entitlements');
    await subscriptionService.initialize();
    if (user) {
      await subscriptionService.identifyUser(user.id);
    }
    await useSubscriptionStore.getState().fetchStatus();
    analytics.track('app_bootstrap_stage_success', { stage: 'resolve-entitlements' });

    const initialRoute = resolveInitialRoute(Boolean(user));
    onStageChange?.('resolve-route');
    analytics.track('app_bootstrap_stage_success', {
      stage: 'resolve-route',
      route: initialRoute,
    });

    onStageChange?.('prefetch-core-data');
    if (user) {
      await Promise.allSettled([
        queryClient.prefetchQuery({
          queryKey: ['morning-briefing'],
          queryFn: () => aiService.getMorningBriefing(),
        }),
        queryClient.prefetchQuery({
          queryKey: ['mood-context'],
          queryFn: () => aiService.getMoodContext(),
        }),
        queryClient.prefetchQuery({
          queryKey: ['subscription-offering'],
          queryFn: () => subscriptionService.fetchOfferings(),
        }),
      ]);
    }

    analytics.track('app_bootstrap_stage_success', { stage: 'prefetch-core-data' });
    analytics.track('app_bootstrap_success', { route: initialRoute });
    return { stage: 'ready', initialRoute };
  } catch (error) {
    captureError(error, { area: 'bootstrap' });
    analytics.track('app_bootstrap_failure', {
      errorClass: error instanceof Error ? error.name : 'UnknownError',
    });
    throw error;
  }
}

let lastResumeAt = 0;

export async function revalidateAppSession(
  queryClient: QueryClient,
  appState: AppStateStatus,
): Promise<void> {
  if (appState !== 'active') {
    return;
  }

  const now = Date.now();
  if (now - lastResumeAt < 15_000) {
    return;
  }
  lastResumeAt = now;

  try {
    const user = await useAuthStore.getState().revalidate();

    // Entitlements can change outside the app (App Store purchase/approval),
    // so revalidate them on resume even without an authenticated session.
    await useSubscriptionStore.getState().fetchStatus();

    if (user) {
      await queryClient.invalidateQueries({ queryKey: ['morning-briefing'] });
      await queryClient.invalidateQueries({ queryKey: ['mood-context'] });
    }
  } catch (error) {
    captureError(error, { area: 'bootstrap', action: 'resume_revalidate' });
  }
}
