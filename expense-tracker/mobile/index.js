import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';
import { RNAndroidNotificationListenerHeadlessJsName } from 'react-native-android-notification-listener';
import headlessNotificationHandler from './src/services/notificationHandler';

import App from './App';

// Register the headless task for background notification handling
AppRegistry.registerHeadlessTask(
  RNAndroidNotificationListenerHeadlessJsName,
  () => headlessNotificationHandler
);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
