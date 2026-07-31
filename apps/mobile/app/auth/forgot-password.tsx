import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { authService } from '../../src/services/auth';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    if (!email.trim()) {
      Alert.alert('Missing email', 'Please enter your email address.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.forgotPassword(email.trim());
      setSent(true);
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to send reset email. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.emoji}>📧</Text>
          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.message}>
            We've sent a password reset link to {email}. Check your inbox and follow the instructions.
          </Text>
          <Button title="Back to Sign In" onPress={() => router.back()} style={styles.button} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <View style={styles.content}>
          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.subtitle}>
            Enter your email and we'll send you a reset link.
          </Text>

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
            style={styles.input}
          />

          <Button
            title="Send Reset Link"
            onPress={handleSubmit}
            isLoading={isLoading}
            size="lg"
            style={styles.button}
          />

          <Button
            title="Back to Sign In"
            onPress={() => router.back()}
            variant="ghost"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  kav: { flex: 1 },
  content: { flex: 1, padding: 24, gap: 16 },
  emoji: { fontSize: 48, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#0f172a' },
  subtitle: { fontSize: 16, color: '#64748b' },
  message: { fontSize: 16, color: '#475569', lineHeight: 24, textAlign: 'center' },
  input: { marginVertical: 8 },
  button: { marginTop: 8 },
});
