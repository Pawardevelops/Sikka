/**
 * Sikka - Unlock
 * Design: design-system/screens/Unlock-v2.html
 * Night screen, sleepy Sikku, pulsing lime fingerprint button.
 */

import React, { useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Typography';
import { COLORS, SPACING, SIKKA, CATEGORY_PALETTE } from '../constants/theme';
import { useSecurity } from '../context/SecurityContext';
import { useOnboarding } from '../context/OnboardingContext';
import { useTransactions } from '../context/TransactionsContext';
import { Icon } from './Icon';
import { Sikku } from './ui';

export function BiometricLockScreen() {
    const insets = useSafeAreaInsets();
    const { authenticate } = useSecurity();
    const { data } = useOnboarding();
    const { transactions } = useTransactions();
    const waiting = transactions.filter((t) => t.status === 'pending' && !t.isDeleted).length;

    useEffect(() => {
        // Prompt once on mount.
        const timer = setTimeout(() => authenticate(), 500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const name = data.userName?.trim();

    return (
        <View style={[styles.container, { paddingTop: insets.top + 80, paddingBottom: insets.bottom + 40 }]}>
            {/* Decorations */}
            <View style={[styles.deco, { left: -60, top: -60, width: 200, height: 200, backgroundColor: '#2E2B24' }]} />
            <View style={[styles.deco, { right: -40, top: 240, width: 120, height: 120, backgroundColor: '#2E2B24' }]} />
            <View style={[styles.deco, { left: 40, top: 300, width: 16, height: 16, backgroundColor: CATEGORY_PALETTE.dining.bg }]} />
            <View style={[styles.deco, { right: 60, top: 120, width: 12, height: 12, backgroundColor: CATEGORY_PALETTE.fun.bg }]} />

            {/* Seen every unlock: no entrance, no loops. The fingerprint button is the one thing to look at. */}
            <Sikku size={120} mood="sleepy" outline={SIKKA.ground} />

            <View style={styles.center}>
                <Text style={styles.title} accessibilityRole="header">
                    Welcome back{name ? `,\n${name}` : ''}
                </Text>
                {waiting > 0 && (
                    <View style={styles.waiting}>
                        <Text style={styles.waitingText}>
                            {waiting} {waiting === 1 ? 'payment' : 'payments'} waiting for you
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.bottom}>
                <View style={styles.btnWrap}>
                    <TouchableOpacity
                        style={styles.fingerprint}
                        onPress={() => authenticate()}
                        activeOpacity={0.85}
                        accessibilityRole="button"
                        accessibilityLabel="Unlock with fingerprint"
                    >
                        <Icon name="fingerprint" size={56} color={COLORS.onBrand} />
                    </TouchableOpacity>
                </View>
                <Text style={styles.hint}>Touch to open your ledger</Text>
                <TouchableOpacity onPress={() => authenticate()} accessibilityRole="button" style={styles.pin}>
                    <Text style={styles.pinText}>Use phone PIN</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.night,
        alignItems: 'center',
        paddingHorizontal: SPACING.xxl,
        overflow: 'hidden',
    },
    deco: { position: 'absolute', borderRadius: 999 },
    center: { alignItems: 'center', gap: 14, marginTop: 18 },
    title: { fontSize: 34, lineHeight: 36, fontWeight: '800', letterSpacing: -0.8, color: COLORS.onNight, textAlign: 'center' },
    waiting: { backgroundColor: CATEGORY_PALETTE.dining.bg, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
    waitingText: { fontSize: 14, fontWeight: '800', color: COLORS.onBrand },
    bottom: { marginTop: 'auto', alignItems: 'center' },
    btnWrap: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
    fingerprint: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: COLORS.brand,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 12,
        borderColor: 'rgba(198, 226, 107, 0.18)',
    },
    hint: { fontSize: 14, color: '#D9D1C1', marginTop: 18 },
    pin: { height: 44, justifyContent: 'center' },
    pinText: { fontSize: 15, fontWeight: '800', color: COLORS.onNight },
});
