/**
 * Registers Sikka's SMS capture in AndroidManifest.xml:
 *   - RECEIVE_SMS + READ_SMS permissions (READ_SMS for "Check today's SMS")
 *   - SmsReceiver (SMS_RECEIVED broadcast)
 *   - SmsHeadlessTaskService (runs the "SikkaSmsReceived" JS task)
 *
 * The Kotlin sources live in android/app/src/main/java/com/sikka/expense/sms/;
 * SmsInboxPackage is registered in MainApplication.kt.
 */
const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

const RECEIVER = 'com.sikka.expense.sms.SmsReceiver';
const SERVICE = 'com.sikka.expense.sms.SmsHeadlessTaskService';

const withSmsReceiver = (config) => {
    config = AndroidConfig.Permissions.withPermissions(config, ['android.permission.RECEIVE_SMS', 'android.permission.READ_SMS']);

    return withAndroidManifest(config, (config) => {
        const manifest = config.modResults;
        const app = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);

        if (!manifest.manifest.$['xmlns:tools']) {
            manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
        }
        const replace = app.$['tools:replace'];
        if (!replace) app.$['tools:replace'] = 'android:allowBackup';
        else if (!replace.includes('android:allowBackup')) app.$['tools:replace'] = `${replace},android:allowBackup`;

        app.receiver = (app.receiver || []).filter((r) => r.$['android:name'] !== RECEIVER);
        app.receiver.push({
            $: {
                'android:name': RECEIVER,
                'android:exported': 'true',
                // Only the system SMS provider may deliver this broadcast.
                'android:permission': 'android.permission.BROADCAST_SMS',
            },
            'intent-filter': [
                {
                    $: { 'android:priority': '999' },
                    action: [{ $: { 'android:name': 'android.provider.Telephony.SMS_RECEIVED' } }],
                },
            ],
        });

        app.service = (app.service || []).filter((s) => s.$['android:name'] !== SERVICE);
        app.service.push({ $: { 'android:name': SERVICE, 'android:exported': 'false' } });

        return config;
    });
};

module.exports = withSmsReceiver;
