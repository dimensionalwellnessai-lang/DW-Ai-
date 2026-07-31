import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { useAuthStore } from '../../src/stores/auth';
import { useSubscriptionStore } from '../../src/stores/subscription';
import { analytics } from '../../src/services/analytics';

export default function SettingsModal() {
  const { user } = useAuthStore();
  const { restorePurchases, isRestoring, status: subscriptionStatus } = useSubscriptionStore();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  async function handleRestorePurchases() {
    analytics.track('restore_purchases_attempt', { source: 'settings' });
    const restored = await restorePurchases();

    if (restored) {
      Alert.alert('Restored!', 'Your DW Plus subscription has been restored.');
    } else {
      Alert.alert('No Active Subscription', 'No active subscription found for this Apple ID.');
    }
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setIsDeletingAccount(true);
            try {
              const { authService } = await import('../../src/services/auth');
              await authService.deleteAccount();
              analytics.track('account_deleted', {});
              router.replace('/auth/welcome');
            } catch (error) {
              Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to delete account. Please try again.',
              );
            } finally {
              setIsDeletingAccount(false);
            }
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Subscription</Text>
            <Text style={styles.infoValue}>
              {subscriptionStatus.isPro ? '✨ DW Plus' : 'Free Plan'}
            </Text>
          </View>
        </View>

        {/* Subscription Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscriptions</Text>
          <Button
            title="Restore Purchases"
            onPress={handleRestorePurchases}
            variant="secondary"
            isLoading={isRestoring}
          />
          {!subscriptionStatus.isPro && (
            <Button
              title="Upgrade to DW Plus"
              onPress={() => {
                analytics.track('paywall_open', { source: 'settings' });
                router.push('/(modals)/paywall');
              }}
            />
          )}
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.dangerTitle]}>Danger Zone</Text>
          <Button
            title={isDeletingAccount ? 'Deleting...' : 'Delete Account'}
            onPress={handleDeleteAccount}
            variant="destructive"
            isLoading={isDeletingAccount}
            disabled={isDeletingAccount}
          />
          <Text style={styles.dangerNote}>
            Deleting your account is permanent and cannot be undone. All your data will be removed.
          </Text>
        </View>

        {/* Legal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <Text style={styles.legalText}>
            Privacy Policy: https://dimensionalwellnessai.com/privacy{'\n'}
            Terms of Service: https://dimensionalwellnessai.com/terms
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, gap: 24, paddingBottom: 40 },
  section: { gap: 12 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dangerTitle: { color: '#ef4444' },
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoLabel: { fontSize: 15, color: '#64748b' },
  infoValue: { fontSize: 15, fontWeight: '600', color: '#0f172a' },
  dangerNote: { fontSize: 12, color: '#94a3b8', lineHeight: 18 },
  legalText: { fontSize: 13, color: '#64748b', lineHeight: 20 },
});
