/**
 * Environment configuration for DW.ai mobile app.
 * Supports development, staging, and production environments.
 */

const ENV = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';

interface EnvConfig {
  apiBaseUrl: string;
  revenueCatApiKeyIos: string;
  revenueCatApiKeyAndroid: string;
  sentryDsn: string;
  posthogApiKey: string;
  posthogHost: string;
  environment: 'development' | 'staging' | 'production';
}

const development: EnvConfig = {
  apiBaseUrl: 'http://localhost:5000',
  revenueCatApiKeyIos: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  revenueCatApiKeyAndroid: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  posthogApiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '',
  posthogHost: 'https://app.posthog.com',
  environment: 'development',
};

const staging: EnvConfig = {
  apiBaseUrl: 'https://staging.dimensionalwellnessai.com',
  revenueCatApiKeyIos: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  revenueCatApiKeyAndroid: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  posthogApiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '',
  posthogHost: 'https://app.posthog.com',
  environment: 'staging',
};

const production: EnvConfig = {
  apiBaseUrl: 'https://dimensionalwellnessai.com',
  revenueCatApiKeyIos: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  revenueCatApiKeyAndroid: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  posthogApiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '',
  posthogHost: 'https://app.posthog.com',
  environment: 'production',
};

const configs: Record<string, EnvConfig> = {
  development,
  staging,
  production,
};

const selectedConfig = configs[ENV] ?? development;
const apiBaseUrlOverride = process.env.EXPO_PUBLIC_API_BASE_URL;

export const Config: EnvConfig = {
  ...selectedConfig,
  apiBaseUrl: apiBaseUrlOverride || selectedConfig.apiBaseUrl,
};
