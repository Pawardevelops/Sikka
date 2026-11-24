/**
 * Sikka - Tab Bar
 * Design: design-system/components/TabBar + screens/Home-v2.html
 *
 * Floating white pill (shadow-float): Home · Review (signal badge) ·
 * raised night "add" button · Stats · Assets. The active tab grows into a
 * lime pill with its label. Settings lives behind the gear on Home.
 */

import React from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import Animated from 'react-native-reanimated';
import { popIn } from '../motion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from './Typography';
import { TabType } from '../types';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, SIKKA } from '../constants/theme';
import { Icon, IconName } from './Icon';


export const TAB_BAR_HEIGHT = 70;
const TAB_BAR_BOTTOM = 16;

interface TabBarProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
    /** Opens the review inbox. */
    onReview: () => void;
    /** Opens "add a payment". */
    onAdd: () => void;
    reviewCount?: number;
}

function TabButton({
    icon,
    label,
    active,
    onPress,
    badge,
}: {
    icon: IconName;
    label: string;
    active?: boolean;
    onPress: () => void;
    badge?: number;
}) {
    // Tabs are switched dozens of times a session: the active pill changes instantly.

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: !!active }}
            accessibilityLabel={badge ? `${label}, ${badge} waiting` : label}
            style={styles.touch}
        >
            <View style={active ? styles.active : styles.idle}>
                <Icon name={icon} size={22} color={COLORS.text} />
                {active && <Text style={styles.label} numberOfLines={1}>{label}</Text>}
            </View>
            {!!badge && (
                <Animated.View key={badge} entering={popIn()} style={styles.badge}>
                    <Text style={styles.badgeText}>{badge > 9 ? '9+' : badge}</Text>
                </Animated.View>
            )}
        </TouchableOpacity>
    );
}

export function TabBar({ activeTab, onTabChange, onReview, onAdd, reviewCount = 0 }: TabBarProps) {
    const insets = useSafeAreaInsets();
    return (
        <View style={[styles.bar, { bottom: TAB_BAR_BOTTOM + insets.bottom }]} accessibilityRole="tablist">
            <TabButton icon="home" label="Home" active={activeTab === 'dash'} onPress={() => onTabChange('dash')} />
            <TabButton icon="move-to-inbox" label="Review" onPress={onReview} badge={reviewCount} />
            <TouchableOpacity
                onPress={onAdd}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Add a payment"
                style={styles.add}
            >
                <Icon name="add" size={30} color={COLORS.brand} />
            </TouchableOpacity>
            <TabButton icon="bar-chart" label="Stats" active={activeTab === 'stats'} onPress={() => onTabChange('stats')} />
            <TabButton icon="account-balance-wallet" label="Assets" active={activeTab === 'assets'} onPress={() => onTabChange('assets')} />
        </View>
    );
}

const styles = StyleSheet.create({
    bar: {
        position: 'absolute',
        left: SPACING.lg,
        right: SPACING.lg,
        height: TAB_BAR_HEIGHT,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.surface,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingHorizontal: SPACING.sm,
        ...SHADOWS.lg,
    },
    touch: { minWidth: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
    idle: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
    active: {
        height: 46,
        paddingHorizontal: 14,
        borderRadius: 23,
        backgroundColor: COLORS.brand,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    label: { fontSize: 14, fontWeight: '800', color: COLORS.onBrand },
    badge: {
        position: 'absolute',
        top: 2,
        right: 2,
        minWidth: 18,
        height: 18,
        paddingHorizontal: 4,
        borderRadius: 9,
        backgroundColor: SIKKA.signal,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: { fontSize: 12, fontWeight: '800', color: COLORS.onBrand },
    add: {
        width: 64,
        height: 64,
        borderRadius: 32,
        marginTop: -34,
        backgroundColor: COLORS.night,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 6,
        borderColor: COLORS.background,
    },
});

export default TabBar;
