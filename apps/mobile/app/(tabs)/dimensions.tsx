import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useSubscriptionStore } from '../../src/stores/subscription';
import { analytics } from '../../src/services/analytics';

const DIMENSIONS = [
  { id: 'emotional', emoji: '💙', label: 'Emotional', description: 'Feelings, mood, mental health' },
  { id: 'physical', emoji: '💪', label: 'Physical', description: 'Body, movement, sleep' },
  { id: 'spiritual', emoji: '✨', label: 'Spiritual', description: 'Purpose, beliefs, inner peace' },
  { id: 'financial', emoji: '💰', label: 'Financial', description: 'Money, security, abundance' },
  { id: 'social', emoji: '🤝', label: 'Social', description: 'Relationships, community' },
  { id: 'career', emoji: '🚀', label: 'Career', description: 'Work, purpose, growth' },
  { id: 'intellectual', emoji: '🧠', label: 'Intellectual', description: 'Learning, creativity, curiosity' },
  { id: 'environmental', emoji: '🌿', label: 'Environmental', description: 'Home, nature, surroundings' },
  { id: 'nutritional', emoji: '🥗', label: 'Nutritional', description: 'Food, nourishment, energy' },
  { id: 'creative', emoji: '🎨', label: 'Creative', description: 'Expression, art, innovation' },
  { id: 'family', emoji: '👨‍👩‍👧', label: 'Family', description: 'Loved ones, home life' },
  { id: 'recreational', emoji: '🎯', label: 'Recreational', description: 'Hobbies, fun, rest' },
  { id: 'values', emoji: '⚖️', label: 'Values', description: 'Core beliefs, principles' },
];

const FREE_DIMENSIONS = ['emotional', 'physical', 'career'];

export default function DimensionsScreen() {
  const { status: subscriptionStatus } = useSubscriptionStore();

  React.useEffect(() => {
    analytics.screen('Dimensions');
  }, []);

  function handleDimensionPress(dimensionId: string) {
    const isFree = FREE_DIMENSIONS.includes(dimensionId);

    if (!subscriptionStatus.isPro && !isFree) {
      analytics.track('paywall_open', { source: 'dimensions_locked', dimension: dimensionId });
      router.push('/(modals)/paywall');
      return;
    }

    analytics.track('dimension_opened', { dimension: dimensionId });
    // TODO: Navigate to dimension detail screen
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          Your wellness across all life dimensions
        </Text>

        {!subscriptionStatus.isPro && (
          <TouchableOpacity
            style={styles.upgradeBanner}
            onPress={() => {
              analytics.track('paywall_open', { source: 'dimensions_banner' });
              router.push('/(modals)/paywall');
            }}
          >
            <Text style={styles.upgradeBannerText}>
              ✨ Upgrade to access all 13 dimensions
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.grid}>
          {DIMENSIONS.map((dim) => {
            const isLocked = !subscriptionStatus.isPro && !FREE_DIMENSIONS.includes(dim.id);
            return (
              <TouchableOpacity
                key={dim.id}
                style={[styles.card, isLocked && styles.cardLocked]}
                onPress={() => handleDimensionPress(dim.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.cardEmoji}>{isLocked ? '🔒' : dim.emoji}</Text>
                <Text style={[styles.cardLabel, isLocked && styles.cardLabelLocked]}>
                  {dim.label}
                </Text>
                <Text style={styles.cardDesc} numberOfLines={2}>
                  {dim.description}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, gap: 16, paddingBottom: 40 },
  subtitle: { fontSize: 15, color: '#64748b', textAlign: 'center' },
  upgradeBanner: {
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  upgradeBannerText: { color: '#6366f1', fontWeight: '700', fontSize: 14 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    width: '47%',
    gap: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLocked: { backgroundColor: '#f8fafc', opacity: 0.7 },
  cardEmoji: { fontSize: 28 },
  cardLabel: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  cardLabelLocked: { color: '#94a3b8' },
  cardDesc: { fontSize: 12, color: '#64748b', lineHeight: 16 },
});
