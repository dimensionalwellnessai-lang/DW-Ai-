import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { subscriptionService, PurchaseError } from '../../src/services/subscriptions';
import { useSubscriptionStore } from '../../src/stores/subscription';
import { ErrorState, NoticeState } from '../../src/components/ui/StateViews';
import { analytics, ANALYTICS_EVENTS } from '../../src/services/analytics';
import type { PurchasesPackage } from 'react-native-purchases';

export default function PaywallModal() {
  const {
    purchase,
    restorePurchases,
    isPurchasing,
    isRestoring,
    status,
    error,
    warning,
    clearError,
    purchaseError,
    clearPurchaseError,
  } =
    useSubscriptionStore();

  // Local state for restore result — avoids race with async store updates
  const [restoreResult, setRestoreResult] = useState<'success' | 'none' | 'error' | null>(null);

  // Ref to prevent duplicate purchase taps (idempotency guard)
  const purchaseInFlight = useRef(false);

  useEffect(() => {
    analytics.screen('Paywall');
    analytics.track(ANALYTICS_EVENTS.PAYWALL_VIEW, {});
  }, []);

  // Surface generic status/offering errors from the store
  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error, clearError]);

  // Surface typed purchase errors (skip cancelled — that's not an error)
  useEffect(() => {
    if (purchaseError && purchaseError.reason !== 'cancelled') {
      const title =
        purchaseError.reason === 'network'
          ? 'No Internet Connection'
          : purchaseError.reason === 'store'
            ? 'Store Unavailable'
            : purchaseError.reason === 'pending'
              ? 'Purchase Pending'
              : 'Purchase Failed';

      Alert.alert(title, purchaseError.message, [
        { text: 'OK', onPress: clearPurchaseError },
      ]);
    }
  }, [purchaseError, clearPurchaseError]);

  // Redirect if user becomes Pro (e.g., purchase succeeded or restored)
  useEffect(() => {
    if (status.isPro) {
      router.back();
    }
  }, [status.isPro]);

  // Show restore result dialog
  useEffect(() => {
    if (restoreResult === null) return;

    if (restoreResult === 'success') {
      Alert.alert(
        'Purchases Restored ✓',
        'Your DW Plus subscription has been restored.',
        [{ text: 'Continue', onPress: () => router.back() }],
      );
    } else if (restoreResult === 'none') {
      Alert.alert(
        'No Active Subscription',
        'No active DW Plus subscription was found for this Apple ID. If you believe this is wrong, contact support.',
        [{ text: 'OK' }],
      );
    } else {
      Alert.alert(
        'Restore Failed',
        'We couldn\'t restore your purchases. Please check your internet connection and try again.',
        [{ text: 'OK' }],
      );
    }

    setRestoreResult(null);
  }, [restoreResult]);

  const {
    data: offering,
    isLoading: offeringLoading,
    error: offeringError,
    refetch,
  } = useQuery({
    queryKey: ['subscription-offering'],
    queryFn: () => subscriptionService.fetchOfferings(),
    retry: 2,
  });

  async function handlePurchase(pkg: PurchasesPackage) {
    // Idempotency guard — prevent double-tap
    if (purchaseInFlight.current || isPurchasing) return;

    analytics.track(ANALYTICS_EVENTS.PLAN_SELECT, {
      packageIdentifier: pkg.identifier,
    });

    purchaseInFlight.current = true;
    try {
      const isNowPro = await purchase(pkg);
      if (isNowPro) {
        Alert.alert(
          'Welcome to DW Plus! ✨',
          'You now have access to all premium features.',
          [{ text: 'Continue', onPress: () => router.back() }],
        );
      }
      // If not pro after purchase (e.g., pending), no action — store reflects state
    } catch {
      // Error already stored in purchaseError; Alert shown by the effect above
    } finally {
      purchaseInFlight.current = false;
    }
  }

  async function handleRestore() {
    try {
      const restoredStatus = await restorePurchases();
      setRestoreResult(restoredStatus.isPro ? 'success' : 'none');
    } catch {
      setRestoreResult('error');
    }
  }

  // ---------------------------------------------------------------------------
  // Render: loading
  // ---------------------------------------------------------------------------

  if (offeringLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={styles.loadingText}>Loading plans…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: offering fetch error
  // ---------------------------------------------------------------------------

  if (offeringError) {
    const isNetworkError =
      offeringError instanceof PurchaseError && offeringError.reason === 'network';
    const isStoreError =
      offeringError instanceof PurchaseError && offeringError.reason === 'store';

    const errorTitle = isNetworkError
      ? 'No Internet Connection'
      : isStoreError
        ? 'Store Unavailable'
        : "Couldn't Load Plans";

    const errorMessage = isNetworkError
      ? 'Please check your connection and try again.'
      : isStoreError
        ? 'The App Store is temporarily unavailable. Please try again later.'
        : "We're having trouble loading subscription options. Please try again.";

    return (
      <SafeAreaView style={styles.container}>
        <ErrorState
          title={errorTitle}
          message={errorMessage}
          onRetry={() => void refetch()}
        />
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: paywall
  // ---------------------------------------------------------------------------

  const packages = offering?.availablePackages ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>✨</Text>
          <Text style={styles.heroTitle}>DW Plus</Text>
          <Text style={styles.heroSubtitle}>
            Your complete dimensional wellness system
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <FeatureRow emoji="🌈" text="All 13 wellness dimensions" />
          <FeatureRow emoji="💬" text="Unlimited AI guidance conversations" />
          <FeatureRow emoji="📊" text="Deep insights and progress tracking" />
          <FeatureRow emoji="🎯" text="Personalized life system building" />
          <FeatureRow emoji="🔔" text="Proactive wellness nudges" />
          <FeatureRow emoji="📱" text="Priority support" />
        </View>

        {/* Packages */}
        {warning && <NoticeState message={warning} />}

        {packages.length === 0 ? (
          <View style={styles.noPackages}>
            <Text style={styles.noPackagesText}>
              {Platform.OS === 'ios'
                ? 'Subscription plans are temporarily unavailable. Your current access stays unchanged while we retry.'
                : 'Subscription not available on this platform right now.'}
            </Text>
            <TouchableOpacity onPress={() => void refetch()}>
              <Text style={styles.retryText}>Retry loading plans</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.packages}>
            {packages.map((pkg) => (
              <PackageCard
                key={pkg.identifier}
                pkg={pkg}
                onPress={() => { void handlePurchase(pkg); }}
                isLoading={isPurchasing}
              />
            ))}
          </View>
        )}

        {/* Restore */}
        <TouchableOpacity
          onPress={() => void handleRestore()}
          disabled={isRestoring}
          accessibilityLabel="Restore previous purchases"
          accessibilityRole="button"
        >
          <Text style={styles.restoreText}>
            {isRestoring ? 'Restoring…' : 'Restore Previous Purchases'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.legalText}>
          Subscriptions auto-renew unless cancelled at least 24 hours before the end of the
          current period. Manage subscriptions in your App Store account settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function FeatureRow({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text style={styles.featureEmoji}>{emoji}</Text>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

function PackageCard({
  pkg,
  onPress,
  isLoading,
}: {
  pkg: PurchasesPackage;
  onPress: () => void;
  isLoading: boolean;
}) {
  const isAnnual =
    pkg.identifier.toLowerCase().includes('annual') ||
    pkg.identifier.toLowerCase().includes('yearly');

  const introPrice = pkg.product.introPrice;
  const hasFreeTrial =
    introPrice != null &&
    (introPrice.priceString === '$0.00' ||
      introPrice.price === 0);

  const trialLabel = hasFreeTrial
    ? `Start free trial`
    : isAnnual
      ? 'Subscribe'
      : 'Start';

  return (
    <TouchableOpacity
      style={[styles.packageCard, isAnnual && styles.packageCardFeatured]}
      onPress={onPress}
      disabled={isLoading}
      activeOpacity={0.8}
      accessibilityLabel={`${isAnnual ? 'Annual' : 'Monthly'} plan — ${pkg.product.priceString}`}
      accessibilityRole="button"
    >
      {isAnnual && (
        <View style={styles.savingsBadge}>
          <Text style={styles.savingsBadgeText}>Best Value</Text>
        </View>
      )}
      <View style={styles.packageInfo}>
        <Text style={[styles.packageTitle, isAnnual && styles.packageTitleFeatured]}>
          {isAnnual ? 'Annual' : 'Monthly'}
        </Text>
        <Text style={[styles.packagePrice, isAnnual && styles.packagePriceFeatured]}>
          {pkg.product.priceString}
          <Text style={styles.packagePeriod}>{isAnnual ? '/year' : '/month'}</Text>
        </Text>
        {hasFreeTrial && introPrice ? (
          <Text style={styles.packageNote}>
            {introPrice.periodNumberOfUnits} {introPrice.periodUnit?.toLowerCase()} free trial, then {pkg.product.priceString}/{isAnnual ? 'year' : 'month'}
          </Text>
        ) : isAnnual ? (
          <Text style={styles.packageNote}>Cancel anytime</Text>
        ) : null}
      </View>
      {isLoading ? (
        <ActivityIndicator color={isAnnual ? '#ffffff' : '#6366f1'} />
      ) : (
        <Text style={[styles.packageCta, isAnnual && styles.packageCtaFeatured]}>
          {trialLabel}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: '#64748b', fontSize: 16 },
  content: { padding: 24, gap: 24, paddingBottom: 40 },
  hero: { alignItems: 'center', gap: 8 },
  heroEmoji: { fontSize: 56 },
  heroTitle: { fontSize: 36, fontWeight: '800', color: '#0f172a' },
  heroSubtitle: { fontSize: 16, color: '#64748b', textAlign: 'center' },
  features: { gap: 14, backgroundColor: '#f8fafc', borderRadius: 16, padding: 20 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureEmoji: { fontSize: 22 },
  featureText: { fontSize: 16, color: '#0f172a', fontWeight: '500', flex: 1 },
  packages: { gap: 12 },
  noPackages: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  noPackagesText: { color: '#64748b', textAlign: 'center', fontSize: 15 },
  retryText: {
    marginTop: 12,
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '700',
  },
  packageCard: {
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    position: 'relative',
  },
  packageCardFeatured: {
    borderColor: '#6366f1',
    backgroundColor: '#6366f1',
  },
  savingsBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  savingsBadgeText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
  packageInfo: { flex: 1 },
  packageTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  packageTitleFeatured: { color: '#ffffff' },
  packagePrice: { fontSize: 22, fontWeight: '800', color: '#6366f1', marginTop: 2 },
  packagePriceFeatured: { color: '#ffffff' },
  packagePeriod: { fontSize: 14, fontWeight: '400' },
  packageNote: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  packageCta: { fontSize: 16, fontWeight: '700', color: '#6366f1' },
  packageCtaFeatured: { color: '#ffffff' },
  restoreText: {
    textAlign: 'center',
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  legalText: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
  },
});
