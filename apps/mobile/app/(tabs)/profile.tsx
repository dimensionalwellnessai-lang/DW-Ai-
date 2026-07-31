import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/stores/auth';
import { useSubscriptionStore } from '../../src/stores/subscription';
import { Button } from '../../src/components/ui/Button';
import { analytics } from '../../src/services/analytics';

export default function ProfileScreen() {
  const { user, logout, isLoading } = useAuthStore();
  const { status: subscriptionStatus } = useSubscriptionStore();

  React.useEffect(() => {
    analytics.screen('Profile');
  }, []);

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/auth/welcome');
        },
      },
    ]);
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            analytics.track('delete_account_intent', {});
            router.push('/(modals)/settings');
          },
        },
      ],
    );
  }

  const displayName = user?.displayName ?? user?.username ?? user?.email?.split('@')[0] ?? 'User';

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* User info */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{displayName.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={[styles.tierBadge, subscriptionStatus.isPro && styles.tierBadgePro]}>
            <Text style={[styles.tierText, subscriptionStatus.isPro && styles.tierTextPro]}>
              {subscriptionStatus.isPro ? '✨ DW Plus' : '🆓 Free Plan'}
            </Text>
          </View>
        </View>

        {/* Subscription section */}
        {!subscriptionStatus.isPro && (
          <TouchableOpacity
            style={styles.upgradeCard}
            onPress={() => {
              analytics.track('paywall_open', { source: 'profile' });
              router.push('/(modals)/paywall');
            }}
          >
            <Text style={styles.upgradeTitle}>Upgrade to DW Plus</Text>
            <Text style={styles.upgradeSubtitle}>
              Unlock all 13 dimensions, unlimited AI guidance, and premium features.
            </Text>
            <Text style={styles.upgradeArrow}>Get Started →</Text>
          </TouchableOpacity>
        )}

        {/* Restore Purchases */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          <SettingsRow
            label="Restore Purchases"
            emoji="♻️"
            onPress={() => {
              analytics.track('restore_purchases_open', { source: 'profile' });
              router.push('/(modals)/settings');
            }}
          />
          {subscriptionStatus.isPro && (
            <SettingsRow
              label="Manage Subscription"
              emoji="⚙️"
              onPress={() => {
                analytics.track('manage_subscription_open', {});
                // On iOS this would open Apple subscription management
              }}
            />
          )}
        </View>

        {/* Settings section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <SettingsRow
            label="Settings"
            emoji="⚙️"
            onPress={() => router.push('/(modals)/settings')}
          />
          <SettingsRow
            label="Privacy Policy"
            emoji="🔒"
            onPress={() => analytics.track('privacy_policy_open', {})}
          />
          <SettingsRow
            label="Terms of Service"
            emoji="📄"
            onPress={() => analytics.track('terms_open', {})}
          />
        </View>

        {/* Danger zone */}
        <View style={styles.section}>
          <Button
            title="Sign Out"
            onPress={handleLogout}
            variant="secondary"
            isLoading={isLoading}
          />
          <Button
            title="Delete Account"
            onPress={handleDeleteAccount}
            variant="destructive"
            style={styles.deleteButton}
          />
        </View>

        <Text style={styles.version}>DW.ai v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsRow({
  label,
  emoji,
  onPress,
}: {
  label: string;
  emoji: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress}>
      <Text style={styles.rowEmoji}>{emoji}</Text>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowArrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 20, gap: 24, paddingBottom: 40 },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  avatarText: { fontSize: 32, fontWeight: '800', color: '#ffffff' },
  displayName: { fontSize: 22, fontWeight: '700', color: '#0f172a' },
  email: { fontSize: 14, color: '#64748b' },
  tierBadge: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  tierBadgePro: { backgroundColor: '#eef2ff' },
  tierText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  tierTextPro: { color: '#6366f1' },
  upgradeCard: {
    backgroundColor: '#0f172a',
    borderRadius: 16,
    padding: 20,
    gap: 6,
  },
  upgradeTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  upgradeSubtitle: { fontSize: 14, color: '#94a3b8', lineHeight: 20 },
  upgradeArrow: { fontSize: 15, color: '#818cf8', fontWeight: '700', marginTop: 4 },
  section: { gap: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rowEmoji: { fontSize: 20 },
  rowLabel: { flex: 1, fontSize: 16, color: '#0f172a', fontWeight: '500' },
  rowArrow: { fontSize: 18, color: '#94a3b8' },
  deleteButton: { marginTop: 4 },
  version: { textAlign: 'center', fontSize: 12, color: '#cbd5e1' },
});
