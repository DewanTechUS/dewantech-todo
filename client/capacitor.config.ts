import type { CapacitorConfig } from '@capacitor/cli';

// Before submitting to the stores, replace appId with an identifier you own
// (reverse-DNS of your domain). It CANNOT be changed after the first store release.
const config: CapacitorConfig = {
  appId: 'com.dewantech.donext',
  appName: 'DoNext',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
  },
  ios: {
    contentInset: 'automatic',
  },
};

export default config;
