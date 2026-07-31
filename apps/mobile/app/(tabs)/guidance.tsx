import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { useSubscriptionStore } from '../../src/stores/subscription';
import { aiService, type ChatMessage } from '../../src/services/ai';
import { analytics } from '../../src/services/analytics';
import { captureError } from '../../src/services/monitoring';

const DAILY_FREE_LIMIT = 3;

export default function GuidanceScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        "Hi! I'm DW, your dimensional wellness guide. How are you feeling today? What would you like to explore?",
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [freeUsageCount, setFreeUsageCount] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const { status: subscriptionStatus } = useSubscriptionStore();

  React.useEffect(() => {
    analytics.screen('Guidance');
    analytics.track('core_ai_flow_opened', {});
  }, []);

  const canSendMessage = subscriptionStatus.isPro || freeUsageCount < DAILY_FREE_LIMIT;

  async function handleSend() {
    const userMessage = input.trim();
    if (!userMessage || isLoading) return;

    if (!canSendMessage) {
      analytics.track('paywall_open', { source: 'guidance_limit_reached' });
      router.push('/(modals)/paywall');
      return;
    }

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      analytics.track('core_ai_message_sent', { hasSessionId: Boolean(sessionId) });

      const response = await aiService.sendMessage({
        message: userMessage,
        sessionId,
      });

      setSessionId(response.sessionId);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.message },
      ]);

      if (!subscriptionStatus.isPro) {
        setFreeUsageCount((c) => c + 1);
      }

      analytics.track('core_ai_message_received', {});
    } catch (error) {
      captureError(error, { screen: 'Guidance', action: 'sendMessage' });
      const errorMsg =
        error instanceof Error ? error.message : 'Something went wrong. Please try again.';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `I'm having trouble connecting right now. ${errorMsg}`,
        },
      ]);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
        keyboardVerticalOffset={88}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(_, index) => String(index)}
          renderItem={({ item }) => <MessageBubble message={item} />}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        />

        {/* Free usage indicator */}
        {!subscriptionStatus.isPro && freeUsageCount > 0 && (
          <View style={styles.usageBanner}>
            <Text style={styles.usageText}>
              {DAILY_FREE_LIMIT - freeUsageCount} free messages remaining today
            </Text>
            <Text
              style={styles.upgradeLink}
              onPress={() => {
                analytics.track('paywall_open', { source: 'guidance_usage_banner' });
                router.push('/(modals)/paywall');
              }}
            >
              Upgrade →
            </Text>
          </View>
        )}

        <View style={styles.inputRow}>
          <Input
            value={input}
            onChangeText={setInput}
            placeholder={canSendMessage ? "What's on your mind?" : 'Upgrade for unlimited access'}
            returnKeyType="send"
            onSubmitEditing={handleSend}
            editable={!isLoading && canSendMessage}
            style={styles.inputContainer}
            multiline
          />
          <Button
            title={isLoading ? '...' : 'Send'}
            onPress={handleSend}
            isLoading={isLoading}
            disabled={!input.trim() || !canSendMessage}
            size="md"
            style={styles.sendButton}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
      {!isUser && <Text style={styles.avatar}>🤖</Text>}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  kav: { flex: 1 },
  messageList: { padding: 16, gap: 12, paddingBottom: 24 },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 8,
  },
  messageRowUser: { justifyContent: 'flex-end' },
  avatar: { fontSize: 28, marginBottom: 4 },
  bubble: {
    maxWidth: '80%',
    borderRadius: 18,
    padding: 14,
  },
  bubbleAssistant: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: '#6366f1',
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: 16, color: '#0f172a', lineHeight: 22 },
  bubbleTextUser: { color: '#ffffff' },
  usageBanner: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    backgroundColor: '#fef3c7',
    borderTopWidth: 1,
    borderColor: '#fde68a',
  },
  usageText: { fontSize: 13, color: '#92400e' },
  upgradeLink: { fontSize: 13, color: '#6366f1', fontWeight: '700' },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'flex-end',
  },
  inputContainer: { flex: 1 },
  sendButton: { minWidth: 72 },
});
