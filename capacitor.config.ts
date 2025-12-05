import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.xyakim.bored',
  appName: 'Bored',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: "#09090b",
    },
  },
  android: {
    // 强制横屏
    allowMixedContent: true,
  },
  // 全局横屏配置
  server: {
    androidScheme: 'https'
  }
};

export default config;
