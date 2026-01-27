import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.reilbrown.fliptheswitch',
  appName: 'Flip the Switch',
  webDir: 'dist/public',
  ios: {
    contentInset: 'always'
  }
};

export default config;
