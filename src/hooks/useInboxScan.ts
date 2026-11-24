import { useCallback, useState } from 'react';
import { Linking, PermissionsAndroid, Platform } from 'react-native';
import { useTransactions } from '../context/TransactionsContext';
import { useOnboarding } from '../context/OnboardingContext';
import { scanInbox } from '../services/sms';
import { useNavigation } from '../context/NavigationContext';
import { usePrefs } from '../context/PrefsContext';

/**
 * "Check recent SMS": `start()` asks for SMS access and opens the range picker;
 * `scan(from, to)` re-reads that part of the inbox and adds payments that were missed.
 */
export function useInboxScan() {
    const { refreshTransactions } = useTransactions();
    const { data } = useOnboarding();
    const [pickerOpen, setPickerOpen] = useState(false);
    const [scanning, setScanning] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const { openScreen } = useNavigation();
    const { update } = usePrefs();

    const start = useCallback(async () => {
        if (scanning) return;
        if (Platform.OS !== 'android') {
            // Web preview: no permission to ask for.
            setPickerOpen(true);
            return;
        }
        const perm = PermissionsAndroid.PERMISSIONS.READ_SMS;
        if (!(await PermissionsAndroid.check(perm))) {
            const result = await PermissionsAndroid.request(perm, {
                title: 'Check your SMS',
                message: 'Sikka reads bank SMS on your phone to add payments it missed. Nothing leaves your phone.',
                buttonPositive: 'Allow',
                buttonNegative: 'Not now',
            });
            if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
                setMessage('SMS access is off. Turn it on in Settings > Apps > Sikka > Permissions.');
                Linking.openSettings();
                return;
            }
            if (result !== PermissionsAndroid.RESULTS.GRANTED) {
                setMessage('Sikka needs SMS access to check your inbox.');
                return;
            }
        }
        setMessage(null);
        setPickerOpen(true);
    }, [scanning]);

    const closePicker = useCallback(() => setPickerOpen(false), []);

    const scan = useCallback(
        async (from: number, to: number) => {
            setPickerOpen(false);
            setScanning(true);
            setMessage(null);
            try {
                const res = await scanInbox(from, to, data.userName);
                await refreshTransactions();
                update({ lastSyncAt: Date.now() });
                openScreen({ name: 'syncResult', from, to, ...res });
                if (res.captured > 0) {
                    setMessage(`Found ${res.captured} new ${res.captured === 1 ? 'payment' : 'payments'}. They're waiting for review.`);
                } else if (res.unread > 0) {
                    setMessage(
                        `No new payments. ${res.unread} bank ${res.unread === 1 ? 'message' : 'messages'} couldn't be read — a model in Settings > Smarter SMS reading can help.`,
                    );
                } else {
                    setMessage(res.scanned > 0 ? "You're up to date. Nothing was missed in those dates." : 'No SMS in those dates.');
                }
            } catch (e) {
                console.warn('[Sikka] Inbox scan failed:', e);
                setMessage("Couldn't read your SMS inbox. Try again.");
            } finally {
                setScanning(false);
            }
        },
        [data.userName, refreshTransactions, openScreen, update],
    );

    return { start, pickerOpen, closePicker, scan, scanning, message };
}
