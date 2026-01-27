import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.reilbrown.fliptheswitch',
  appName: 'DW-Ai',
  webDir: 'dist/public',
  ios: {
    contentInset: 'always'
  },
  android: {
    // Allow mixed content for local development
    allowMixedContent: true,
    // Use edge-to-edge mode for better safe area handling
    backgroundColor: '#e1e6ed'
  }
};

export default config;
