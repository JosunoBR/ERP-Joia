import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mega12.app',
  appName: 'App Mega 12',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true // Permite conexões HTTP para desenvolvimento local
  }
};

export default config;
