import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "org.muonnoi.app",
  appName: "muonnoi",
  webDir: "../apps/web",
  server: {
    androidScheme: "https",
    iosScheme: "https"
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true
    }
  }
};

export default config;
