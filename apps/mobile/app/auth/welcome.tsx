import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { analytics } from '../../src/services/analytics';

export default function WelcomeScreen() {
  React.useEffect(() => {
    analytics.screen('Welcome');
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>DW.ai</Text>
          <Text style={styles.tagline}>Your Dimensional Wellness AI</Text>
        </View>

        <View style={styles.features}>
          <FeatureRow emoji="🧠" text="AI-powered life coaching" />
          <FeatureRow emoji="🌈" text="Wellness across 13 life dimensions" />
          <FeatureRow emoji="⚡️" text="Energy-based, not habit-based" />
          <FeatureRow emoji="🔒" text="Your data, your control" />
        </View>

        <View style={styles.actions}>
          <Button
            title="Get Started"
            onPress={() => {
              analytics.track('onboarding_get_started', {});
              router.push('/auth/sign-up');
            }}
            size="lg"
            style={styles.primaryButton}
          />
          <Button
            title="Sign In"
            onPress={() => router.push('/auth/sign-in')}
            variant="ghost"
            size="lg"
          />
        </View>

        <Text style={styles.legal}>
          By continuing, you agree to our{' '}
          <Text style={styles.link}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.link}>Privacy Policy</Text>.
        </Text>
      </View>
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 60,
    gap: 8,
  },
  logoText: {
    fontSize: 56,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -2,
  },
  tagline: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
  features: {
    gap: 20,
    paddingVertical: 32,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  featureEmoji: { fontSize: 28 },
  featureText: { fontSize: 17, color: '#e2e8f0', fontWeight: '500', flex: 1 },
  actions: { gap: 12 },
  primaryButton: { backgroundColor: '#6366f1' },
  legal: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  link: { color: '#818cf8' },
});
