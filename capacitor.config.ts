import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.dimensionalwellness.app',
  appName: 'DW',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
