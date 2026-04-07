import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.s0823pro.phototopdf',
  appName: '写真→PDF',
  webDir: 'dist',
  ios: {
    allowsLinkPreview: false,
    scrollEnabled: false,
    limitsNavigationsToAppBoundDomains: true,
  },
  plugins: {
    AdMob: {
      appIdIos: 'ca-app-pub-6731542556992059~2701803691',
      appIdAndroid: 'ca-app-pub-6731542556992059~3925713460',
    },
    ScreenOrientation: {
      default: 'portrait',
    },
  },
};

export default config;
