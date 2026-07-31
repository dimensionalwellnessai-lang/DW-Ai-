import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../src/stores/auth';
import { useSubscriptionStore } from '../../src/stores/subscription';
import { aiService } from '../../src/services/ai';
import { ErrorState } from '../../src/components/ui/StateViews';
import { analytics } from '../../src/services/analytics';

export default function TodayScreen() {
  const user = useAuthStore((s) => s.user);
  const { status: subscriptionStatus, fetchStatus } = useSubscriptionStore();

  React.useEffect(() => {
    analytics.screen('Today');
    void fetchStatus();
  }, [fetchStatus]);

  const {
    data: briefing,
    isLoading: briefingLoading,
    error: briefingError,
    refetch,
  } = useQuery({
    queryKey: ['morning-briefing'],
    queryFn: () => aiService.getMorningBriefing(),
    retry: 2,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  const [refreshing, setRefreshing] = React.useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }

  const greeting = getGreeting();
  const displayName = user?.displayName ?? user?.username ?? user?.email?.split('@')[0] ?? 'there';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{displayName}</Text>
          </View>
          {!subscriptionStatus.isPro && (
            <TouchableOpacity
              style={styles.upgradeBadge}
              onPress={() => {
                analytics.track('paywall_open', { source: 'today_header' });
                router.push('/(modals)/paywall');
              }}
            >
              <Text style={styles.upgradeText}>✨ Upgrade</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* AI Briefing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Daily Briefing</Text>
          {briefingLoading ? (
            <View style={styles.skeletonCard} />
          ) : briefingError ? (
            <ErrorState
              title="Couldn't load briefing"
              message="Pull down to refresh or try again later."
              onRetry={() => void refetch()}
            />
          ) : (
            <View style={styles.briefingCard}>
              <Text style={styles.briefingText}>
                {briefing?.briefing ?? 'Welcome back! Ready to explore your wellness today?'}
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActions}>
            <QuickAction
              emoji="💬"
              label="Talk to DW"
              onPress={() => router.push('/(tabs)/guidance')}
            />
            <QuickAction
              emoji="🌈"
              label="My Dimensions"
              onPress={() => router.push('/(tabs)/dimensions')}
            />
            <QuickAction
              emoji="📝"
              label="Log Mood"
              onPress={() => {
                analytics.track('quick_action_mood_log', {});
                // TODO: Navigate to mood logging screen
              }}
            />
            <QuickAction
              emoji="⚡️"
              label="Energy Check"
              onPress={() => {
                analytics.track('quick_action_energy_check', {});
                // TODO: Navigate to energy check screen
              }}
            />
          </View>
        </View>

        {/* Subscription Gate Banner */}
        {!subscriptionStatus.isPro && (
          <TouchableOpacity
            style={styles.paywallBanner}
            onPress={() => {
              analytics.track('paywall_open', { source: 'today_banner' });
              router.push('/(modals)/paywall');
            }}
          >
            <Text style={styles.paywallEmoji}>✨</Text>
            <View style={styles.paywallTextContainer}>
              <Text style={styles.paywallTitle}>Unlock DW Plus</Text>
              <Text style={styles.paywallSubtitle}>
                Unlimited AI guidance, all 13 dimensions, and more.
              </Text>
            </View>
            <Text style={styles.paywallArrow}>→</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function QuickAction({
  emoji,
  label,
  onPress,
}: {
  emoji: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <Text style={styles.quickActionEmoji}>{emoji}</Text>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, gap: 24, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: { fontSize: 16, color: '#64748b', fontWeight: '500' },
  name: { fontSize: 28, color: '#0f172a', fontWeight: '800' },
  upgradeBadge: {
    backgroundColor: '#eef2ff',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  upgradeText: { color: '#6366f1', fontWeight: '700', fontSize: 13 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  briefingCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  briefingText: { fontSize: 16, color: '#334155', lineHeight: 26 },
  skeletonCard: {
    backgroundColor: '#e2e8f0',
    borderRadius: 16,
    height: 100,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAction: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    width: '47%',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickActionEmoji: { fontSize: 28 },
  quickActionLabel: { fontSize: 14, fontWeight: '600', color: '#334155', textAlign: 'center' },
  paywallBanner: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paywallEmoji: { fontSize: 28 },
  paywallTextContainer: { flex: 1 },
  paywallTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  paywallSubtitle: { fontSize: 13, color: '#94a3b8', marginTop: 2 },
  paywallArrow: { fontSize: 18, color: '#6366f1' },
});
