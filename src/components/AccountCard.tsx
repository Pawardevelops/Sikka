/**
 * Sikka - Account Card Component
 * Animated, touchable card for displaying account info
 */

import React, { useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { Account } from '../types';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS, SHADOWS, ACCOUNT_ICONS } from '../constants/theme';
import { useSettings } from '../context/SettingsContext';
import { Icon } from './Icon';

interface AccountCardProps {
    account: Account;
    onPress: (account: Account) => void;
}

export function AccountCard({ account, onPress }: AccountCardProps) {
    const { formatCurrency } = useSettings();
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.95,
            useNativeDriver: true,
            friction: 8,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 8,
        }).start();
    };

    const iconName = ACCOUNT_ICONS[account.type] || 'account-balance';

    return (
        <TouchableOpacity
            activeOpacity={1}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            onPress={() => onPress(account)}
        >
            <Animated.View
                style={[
                    styles.container,
                    { transform: [{ scale: scaleAnim }] },
                ]}
            >
                <View style={styles.iconContainer}>
                    <Icon name={iconName as any} size={22} color={COLORS.primary} />
                </View>
                <Text style={styles.accountName}>{account.name}</Text>
                <Text style={styles.balance}>{formatCurrency(account.balance)}</Text>
            </Animated.View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.lg,
        width: 160,
        marginRight: SPACING.md,
        ...SHADOWS.md,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: BORDER_RADIUS.md,
        backgroundColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.xl,
    },
    icon: {
        fontSize: 22,
    },
    accountName: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textSecondary,
        marginBottom: SPACING.xs,
    },
    balance: {
        fontSize: FONT_SIZE.xl,
        fontWeight: '700',
        color: COLORS.text,
    },
});

export default AccountCard;
