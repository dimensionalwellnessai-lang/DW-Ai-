import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
} from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        styles[`size_${size}`],
        styles[`variant_${variant}`],
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#ffffff' : '#6366f1'}
          size="small"
        />
      ) : (
        <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`], textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  size_sm: { paddingHorizontal: 16, paddingVertical: 8, minHeight: 36 },
  size_md: { paddingHorizontal: 20, paddingVertical: 12, minHeight: 48 },
  size_lg: { paddingHorizontal: 24, paddingVertical: 16, minHeight: 56 },

  variant_primary: { backgroundColor: '#6366f1' },
  variant_secondary: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  variant_ghost: { backgroundColor: 'transparent' },
  variant_destructive: { backgroundColor: '#ef4444' },

  disabled: { opacity: 0.5 },

  text: { fontWeight: '600' },
  text_primary: { color: '#ffffff' },
  text_secondary: { color: '#1e293b' },
  text_ghost: { color: '#6366f1' },
  text_destructive: { color: '#ffffff' },

  textSize_sm: { fontSize: 14 },
  textSize_md: { fontSize: 16 },
  textSize_lg: { fontSize: 18 },
});
