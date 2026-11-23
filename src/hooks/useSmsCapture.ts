import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { useTransactions } from '../context/TransactionsContext';
import { useOnboarding } from '../context/OnboardingContext';
import { processQueuedSms } from '../services/sms';

/**
 * Whenever the app comes to the foreground: pick up payments the SMS receiver
 * saved in the background, then let the downloaded model read queued SMS.
 */
export function useSmsCapture() {
    const { refreshTransactions } = useTransactions();
    const { data } = useOnboarding();
    const ownerName = data.userName;

    useEffect(() => {
        if (Platform.OS !== 'android') return;
        const sync = async () => {
            await refreshTransactions();
            const captured = await processQueuedSms(ownerName).catch(() => 0);
            if (captured > 0) await refreshTransactions();
        };
        void sync();
        const sub = AppState.addEventListener('change', (s) => s === 'active' && void sync());
        return () => sub.remove();
    }, [refreshTransactions, ownerName]);
}
