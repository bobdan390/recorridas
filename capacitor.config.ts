import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
      sound: null,
    },
  },
  appId: 'io.ionic.recorridas',
  appName: 'corridas',
  webDir: 'www'
};

export default config;
