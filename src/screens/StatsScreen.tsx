/**
 * Sikka - Stats Screen
 * Financial statistics with animations
 */

import React, { useEffect, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Animated,
} from 'react-native';
import { useCurrency } from '../context/CurrencyContext';
import { MOCK_CATEGORY_STATS } from '../data/mockData';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../constants/theme';
import { useSafeTop } from '../components/SafeScreen';
import { Icon } from '../components/Icon';

export function StatsScreen() {
    const { formatAmount } = useCurrency();
    const safeTop = useSafeTop();

    // Animation refs
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const cardScale = useRef(new Animated.Value(0.9)).current;
    const barAnims = useRef(MOCK_CATEGORY_STATS.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        // Fade in title and period selector
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start();

        // Scale in summary cards
        Animated.spring(cardScale, {
            toValue: 1,
            friction: 6,
            tension: 40,
            delay: 100,
            useNativeDriver: true,
        }).start();

        // Animate category bars with stagger
        Animated.stagger(100, barAnims.map(anim =>
            Animated.spring(anim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: false, // Can't use native driver for width
            })
        )).start();
    }, []);

    return (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingTop: safeTop }]}
            showsVerticalScrollIndicator={false}
        >
            <Animated.View style={{ opacity: fadeAnim }}>
                <Text style={styles.screenTitle}>Statistics</Text>

                {/* Period Selector */}
                <View style={styles.periodSelector}>
                    {['Week', 'Month', 'Year'].map((period, i) => (
                        <TouchableOpacity
                            key={period}
                            style={[styles.periodBtn, i === 1 && styles.periodBtnActive]}
                        >
                            <Text style={[styles.periodText, i === 1 && styles.periodTextActive]}>
                                {period}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </Animated.View>

            {/* Summary Cards with Scale Animation */}
            <Animated.View style={[
                styles.summaryRow,
                { transform: [{ scale: cardScale }] }
            ]}>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>INCOME</Text>
                    <Text style={[styles.summaryValue, { color: COLORS.success }]}>
                        {formatAmount(4250)}
                    </Text>
                </View>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>EXPENSES</Text>
                    <Text style={[styles.summaryValue, { color: COLORS.error }]}>
                        {formatAmount(2890)}
                    </Text>
                </View>
            </Animated.View>

            {/* Spending by Category with Animated Bars */}
            <Animated.View style={{ opacity: fadeAnim }}>
                <Text style={styles.sectionTitle}>SPENDING BY CATEGORY</Text>
            </Animated.View>
            {MOCK_CATEGORY_STATS.map((cat, index) => (
                <Animated.View
                    key={cat.name}
                    style={{
                        opacity: barAnims[index],
                        transform: [{
                            translateX: barAnims[index].interpolate({
                                inputRange: [0, 1],
                                outputRange: [-20, 0],
                            }),
                        }],
                    }}
                >
                    <View style={styles.categoryRow}>
                        <View style={styles.categoryIcon}>
                            <Icon name={cat.icon as any} size={20} color={COLORS.text} />
                        </View>
                        <View style={styles.categoryContent}>
                            <View style={styles.categoryHeader}>
                                <Text style={styles.categoryName}>{cat.name}</Text>
                                <Text style={styles.categoryAmount}>{formatAmount(cat.amount)}</Text>
                            </View>
                            <View style={styles.categoryBarBg}>
                                <Animated.View
                                    style={[
                                        styles.categoryBar,
                                        {
                                            width: barAnims[index].interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ['0%', `${cat.percent}%`],
                                            }),
                                        },
                                    ]}
                                />
                            </View>
                        </View>
                    </View>
                </Animated.View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: SPACING.xl, paddingBottom: 140 },
    screenTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.xxl },

    // Period Selector
    periodSelector: { flexDirection: 'row', backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.md, padding: SPACING.xs, marginBottom: SPACING.xxl },
    periodBtn: { flex: 1, paddingVertical: SPACING.md, alignItems: 'center', borderRadius: BORDER_RADIUS.sm },
    periodBtnActive: { backgroundColor: COLORS.primary },
    periodText: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.textMuted },
    periodTextActive: { color: COLORS.background },

    // Summary Cards
    summaryRow: { flexDirection: 'row', marginBottom: SPACING.xxl },
    summaryCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.xl, padding: SPACING.xl, marginHorizontal: SPACING.sm, alignItems: 'center' },
    summaryLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, letterSpacing: 0.5, marginBottom: SPACING.sm },
    summaryValue: { fontSize: FONT_SIZE.xxl, fontWeight: '700' },

    // Section
    sectionTitle: { fontSize: FONT_SIZE.sm, fontWeight: '600', color: COLORS.textMuted, letterSpacing: 1, marginBottom: SPACING.lg, marginTop: SPACING.sm },

    // Category Row
    categoryRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg },
    categoryIcon: { width: 40, height: 40, borderRadius: BORDER_RADIUS.md, backgroundColor: COLORS.surfaceLight, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
    categoryContent: { flex: 1 },
    categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
    categoryName: { fontSize: FONT_SIZE.md, fontWeight: '500', color: COLORS.text },
    categoryAmount: { fontSize: FONT_SIZE.md, fontWeight: '600', color: COLORS.text },
    categoryBarBg: { height: 6, backgroundColor: COLORS.surfaceLight, borderRadius: 3, overflow: 'hidden' },
    categoryBar: { height: 6, backgroundColor: COLORS.primary, borderRadius: 3 },
});

export default StatsScreen;
