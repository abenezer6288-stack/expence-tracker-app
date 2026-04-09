const { withAndroidManifest } = require('@expo/config-plugins');

const withAndroidNotificationListener = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    // Add notification listener service
    if (!androidManifest.application) {
      androidManifest.application = [{}];
    }

    const application = androidManifest.application[0];

    if (!application.service) {
      application.service = [];
    }

    // Add the notification listener service
    const notificationListenerService = {
      $: {
        'android:name': 'com.github.wumke.RNAndroidNotificationListener.RNAndroidNotificationListenerService',
        'android:label': '@string/app_name',
        'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
        'android:exported': 'true',
      },
      'intent-filter': [
        {
          action: [
            {
              $: {
                'android:name': 'android.service.notification.NotificationListenerService',
              },
            },
          ],
        },
      ],
    };

    // Check if service already exists
    const serviceExists = application.service.some(
      (service) =>
        service.$['android:name'] ===
        'com.github.wumke.RNAndroidNotificationListener.RNAndroidNotificationListenerService'
    );

    if (!serviceExists) {
      application.service.push(notificationListenerService);
    }

    return config;
  });
};

module.exports = withAndroidNotificationListener;
