import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.reilbrown.fliptheswitch',
  appName: 'DW-Ai',
  webDir: 'dist/public',
  ios: {
    contentInset: 'automatic'
  }
};

export default config;
