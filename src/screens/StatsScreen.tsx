/**
 * Sikka - Stats Screen
 * Financial statistics with modular components
 */

import React from 'react';
import { StyleSheet, ScrollView, Text, View } from 'react-native';
import { CategorySpends } from '../components/stats/CategorySpends';
import { SentimentHeatmapSection } from '../components/stats/SentimentHeatmapSection';
import { useSafeTop } from '../components/SafeScreen';
import { COLORS, SPACING } from '../constants/theme';

export function StatsScreen() {
    const safeTop = useSafeTop();

    return (
        <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingTop: safeTop }]}
            showsVerticalScrollIndicator={false}
        >
            <Text style={styles.screenTitle}>Statistics</Text>
            <CategorySpends />
            <SentimentHeatmapSection />
            {/* Bottom padding */}
            <View style={{ height: SPACING.xl }} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: SPACING.xl, paddingBottom: 140 },
    screenTitle: { fontSize: 28, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.xxl },
});

export default StatsScreen;
