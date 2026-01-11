import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dimensionalwellness.app',
  appName: 'DW',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https'
  }
};

export default config;
