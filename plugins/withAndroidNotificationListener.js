const { withAndroidManifest } = require('@expo/config-plugins');

const withAndroidNotificationListener = (config) => {
    return withAndroidManifest(config, async (config) => {
        const manifest = config.modResults;
        const mainApplication = manifest.manifest.application[0];

        // Add tools namespace
        if (!manifest.manifest.$['xmlns:tools']) {
            manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
        }

        // Add tools:replace="android:allowBackup" to application
        if (!mainApplication.$['tools:replace']) {
            mainApplication.$['tools:replace'] = 'android:allowBackup';
        } else if (!mainApplication.$['tools:replace'].includes('android:allowBackup')) {
            mainApplication.$['tools:replace'] += ',android:allowBackup';
        }

        // Add the service to the Android Manifest
        // <service android:name="com.leandrosimonato.reactnativeandroidnotificationlistener.RNAndroidNotificationListenerHeadlessJsTaskService" />

        if (!mainApplication.service) {
            mainApplication.service = [];
        }

        const serviceName = 'com.leandrosimonato.reactnativeandroidnotificationlistener.RNAndroidNotificationListenerHeadlessJsTaskService';

        // Check if service already exists
        const hasService = mainApplication.service.some(
            (service) => service.$['android:name'] === serviceName
        );

        if (!hasService) {
            mainApplication.service.push({
                $: {
                    'android:name': serviceName,
                    'android:permission': 'android.permission.BIND_JOB_SERVICE',
                    'android:exported': 'true',
                },
            });
        }

        // Also need to add the Listener Service itself
        // <service android:name="com.leandrosimonato.reactnativeandroidnotificationlistener.RNAndroidNotificationListener"
        //          android:label="@string/app_name"
        //          android:permission="android.permission.BIND_NOTIFICATION_LISTENER_SERVICE">
        //     <intent-filter>
        //         <action android:name="android.service.notification.NotificationListenerService" />
        //     </intent-filter>
        // </service>

        const listenerServiceName = 'com.leandrosimonato.reactnativeandroidnotificationlistener.RNAndroidNotificationListener';
        const hasListenerService = mainApplication.service.some(
            (service) => service.$['android:name'] === listenerServiceName
        );

        if (!hasListenerService) {
            mainApplication.service.push({
                $: {
                    'android:name': listenerServiceName,
                    'android:label': '@string/app_name',
                    'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
                    'android:exported': 'true', // Required for Android 12+
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
            });
        }

        return config;
    });
};

module.exports = withAndroidNotificationListener;
