/**
 * Sikka - Tab Bar Component
 * Classic per-tab animation pattern (Instagram/Spotify style).
 *
 * Each tab independently animates its own state — no cross-tab
 * sliding elements, so alignment is always perfect.
 *
 * Animations per tab:
 *   - Icon scales up with a spring bounce when becoming active
 *   - Icon translates up slightly
 *   - Active dot fades in below the label
 *   - Label color transitions via opacity layering
 */

import React, { useRef, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated } from 'react-native';
import { TabType } from '../types';
import { COLORS, SPACING, FONT_SIZE } from '../constants/theme';
import { Icon } from './Icon';

// ─── Tab Definitions ──────────────────────────────────────────────────
interface TabDef {
    key: TabType;
    icon: string;
    label: string;
}

const TABS: TabDef[] = [
    { key: 'dash', icon: 'dashboard', label: 'Dash' },
    { key: 'assets', icon: 'account-balance-wallet', label: 'Assets' },
    { key: 'stats', icon: 'bar-chart', label: 'Stats' },
    { key: 'settings', icon: 'settings', label: 'Settings' },
];

const TAB_BAR_HEIGHT = 72;

// ─── Props ────────────────────────────────────────────────────────────
interface TabBarProps {
    activeTab: TabType;
    onTabChange: (tab: TabType) => void;
}

// ─── Animated Tab Item ────────────────────────────────────────────────
/**
 * Each tab owns a single Animated.Value `progress` that drives ALL
 * its visual properties (scale, translateY, dot opacity, etc).
 * This keeps the component simple and all animations perfectly in sync.
 */
function AnimatedTabItem({
    tab,
    isActive,
    onPress,
}: {
    tab: TabDef;
    isActive: boolean;
    onPress: () => void;
}) {
    // Single driver: 0 = inactive, 1 = active
    const progress = useRef(new Animated.Value(isActive ? 1 : 0)).current;

    useEffect(() => {
        Animated.spring(progress, {
            toValue: isActive ? 1 : 0,
            friction: isActive ? 4 : 8,   // bouncier when activating
            tension: isActive ? 160 : 60,  // snappier when activating
            useNativeDriver: true,
        }).start();
    }, [isActive]);

    // Derived animations from the single progress value
    const iconScale = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0.85, 1.15],
    });

    const iconTranslateY = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -4],
    });

    const dotScale = progress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0.5, 1],
    });

    const dotOpacity = progress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0.3, 1],
    });

    const activeTextOpacity = progress; // 0..1
    const inactiveTextOpacity = progress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
    });

    return (
        <TouchableOpacity
            style={styles.tabItem}
            onPress={onPress}
            activeOpacity={0.6}
        >
            {/* Icon with bounce */}
            <Animated.View
                style={{
                    transform: [
                        { scale: iconScale },
                        { translateY: iconTranslateY },
                    ],
                }}
            >
                <Icon
                    name={tab.icon as any}
                    size={24}
                    color={isActive ? COLORS.primary : COLORS.textMuted}
                />
            </Animated.View>

            {/* Label — two layers for smooth color crossfade */}
            <View style={styles.labelContainer}>
                <Animated.Text
                    style={[styles.tabLabel, styles.tabLabelInactive, { opacity: inactiveTextOpacity }]}
                    numberOfLines={1}
                >
                    {tab.label}
                </Animated.Text>
                <Animated.Text
                    style={[styles.tabLabel, styles.tabLabelActive, { opacity: activeTextOpacity }]}
                    numberOfLines={1}
                >
                    {tab.label}
                </Animated.Text>
            </View>

            {/* Active dot indicator */}
            <Animated.View
                style={[
                    styles.activeDot,
                    {
                        opacity: dotOpacity,
                        transform: [{ scale: dotScale }],
                    },
                ]}
            />
        </TouchableOpacity>
    );
}

// ─── TabBar ───────────────────────────────────────────────────────────
export function TabBar({ activeTab, onTabChange }: TabBarProps) {
    return (
        <View style={styles.tabBar}>
            {TABS.map((tab) => (
                <AnimatedTabItem
                    key={tab.key}
                    tab={tab}
                    isActive={activeTab === tab.key}
                    onPress={() => onTabChange(tab.key)}
                />
            ))}
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    tabBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: TAB_BAR_HEIGHT,
        backgroundColor: COLORS.surface,
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: SPACING.sm,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.border,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        paddingTop: 6,
    },
    labelContainer: {
        position: 'relative',
        height: 14,
        justifyContent: 'center',
        marginTop: 3,
    },
    tabLabel: {
        fontSize: FONT_SIZE.xs,
        fontWeight: '600',
        textAlign: 'center',
    },
    tabLabelInactive: {
        color: COLORS.textMuted,
    },
    tabLabelActive: {
        color: COLORS.primary,
        position: 'absolute',
        alignSelf: 'center',
    },
    activeDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: COLORS.primary,
        marginTop: 3,
        // Subtle glow
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 4,
        elevation: 2,
    },
});

export default TabBar;
