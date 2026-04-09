declare module 'react-native-android-notification-listener' {
  export interface NotificationData {
    app: string;
    title: string;
    text: string;
    icon: string;
    time: number;
    groupKey?: string;
  }

  export const RNAndroidNotificationListenerHeadlessJsName: string;

  export default class RNAndroidNotificationListener {
    static getPermissionStatus(): Promise<'authorized' | 'denied' | 'unknown'>;
    static requestPermission(): Promise<void>;
    static onNotificationPosted(callback: (notification: NotificationData) => void): void;
    static stop(): void;
  }
}
