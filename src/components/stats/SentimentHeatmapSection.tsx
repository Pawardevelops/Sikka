import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTransactions } from '../../context/TransactionsContext';
import { TransactionHeatmap } from './TransactionHeatmap';
import { COLORS, SPACING, FONT_SIZE, BORDER_RADIUS } from '../../constants/theme';
import { useCurrency } from '../../context/CurrencyContext';
import { Icon } from '../Icon';
import { SENTIMENT_LIST, SENTIMENTS } from '../../constants/sentiments';

export function SentimentHeatmapSection() {
    const { activeTransactions } = useTransactions();
    const { formatAmount } = useCurrency();

    // Default to 'regret' as it's the most actionable insight, or 'impulse' for familiarity
    const [activeSentimentId, setActiveSentimentId] = useState<string>('regret');
    const [selectedDate, setSelectedDate] = useState<string | null>(null);

    // Get current sentiment details
    const activeSentiment = SENTIMENTS[activeSentimentId] || SENTIMENTS.regret;

    // Filter Transactions by selected Sentiment
    const filteredTransactions = useMemo(() => {
        return activeTransactions.filter(tx => {
            // New mechanism: check sentimentIds array
            if (tx.sentimentIds?.includes(activeSentimentId)) return true;

            // Legacy/Compat: if viewing 'impulse', also include old isImpulse flag
            if (activeSentimentId === 'impulse' && tx.isImpulse) return true;

            return false;
        });
    }, [activeTransactions, activeSentimentId]);

    // Aggregate by date for Heatmap
    const heatmapData = useMemo(() => {
        const data: Record<string, number> = {};
        filteredTransactions.forEach(tx => {
            const dateStr = new Date(tx.timestamp).toISOString().split('T')[0];
            data[dateStr] = (data[dateStr] || 0) + Math.abs(tx.amount);
        });
        return data;
    }, [filteredTransactions]);

    // Get transactions for the selected date
    const selectedDayTransactions = useMemo(() => {
        if (!selectedDate) return [];
        return filteredTransactions.filter(tx => {
            const dateStr = new Date(tx.timestamp).toISOString().split('T')[0];
            return dateStr === selectedDate;
        });
    }, [selectedDate, filteredTransactions]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Spend Sentiments</Text>
            </View>

            {/* Sentiment Selector */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sentimentList}
                style={styles.sentimentScroll}
            >
                {SENTIMENT_LIST.map((sentiment) => {
                    const isActive = activeSentimentId === sentiment.id;
                    return (
                        <TouchableOpacity
                            key={sentiment.id}
                            style={[
                                styles.sentimentChip,
                                isActive && { backgroundColor: sentiment.color + '20', borderColor: sentiment.color }
                            ]}
                            onPress={() => {
                                setActiveSentimentId(sentiment.id);
                                setSelectedDate(null); // Clear selection on switch
                            }}
                        >
                            <Text style={[
                                styles.sentimentLabel,
                                isActive && { color: sentiment.color, fontWeight: '700' }
                            ]}>
                                {sentiment.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            <Text style={styles.subtitle}>
                {activeSentiment.description}. Darker color means more spending.
            </Text>

            <View style={styles.heatmapWrapper}>
                <TransactionHeatmap
                    data={heatmapData}
                    onDayPress={(date) => setSelectedDate(date)}
                    colorScale={activeSentiment.color} // Dynamic color!
                />
            </View>

            {/* Selected Date Details */}
            {selectedDate && (
                <View style={[styles.detailsContainer, { borderColor: activeSentiment.color + '40' }]}>
                    <View style={styles.detailsHeader}>
                        <Text style={[styles.detailsTitle, { color: activeSentiment.color }]}>
                            {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </Text>
                        <TouchableOpacity onPress={() => setSelectedDate(null)}>
                            <Icon name="close" size={20} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    </View>

                    {selectedDayTransactions.length === 0 ? (
                        <Text style={{ color: COLORS.textMuted }}>No transactions found.</Text>
                    ) : (
                        selectedDayTransactions.map(tx => (
                            <View key={tx.id} style={styles.txRow}>
                                <View style={[styles.catIcon, { backgroundColor: COLORS.surfaceLight }]}>
                                    <Icon name="shopping-bag" size={16} color={COLORS.text} />
                                </View>
                                <View style={styles.txContent}>
                                    <Text style={styles.txMerchant}>{tx.merchant}</Text>
                                    <Text style={styles.txCategory}>{tx.category}</Text>
                                </View>
                                <Text style={[styles.txAmount, { color: activeSentiment.color }]}>
                                    {formatAmount(tx.amount, true)}
                                </Text>
                            </View>
                        ))
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: SPACING.xl,
        paddingTop: SPACING.xl,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
    },
    header: {
        marginBottom: SPACING.md,
    },
    title: {
        fontSize: FONT_SIZE.lg,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: SPACING.sm,
    },
    sentimentScroll: {
        marginBottom: SPACING.md,
    },
    sentimentList: {
        paddingRight: SPACING.xl,
        gap: SPACING.sm,
    },
    sentimentChip: {
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs + 4,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sentimentLabel: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '500',
        color: COLORS.textSecondary,
    },
    subtitle: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.textMuted,
        marginBottom: SPACING.md,
        fontStyle: 'italic',
    },
    heatmapWrapper: {
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
    },

    // Details
    detailsContainer: {
        marginTop: SPACING.md,
        backgroundColor: COLORS.surface,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        borderWidth: 1,
    },
    detailsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    detailsTitle: {
        fontSize: FONT_SIZE.md,
        fontWeight: '600',
    },
    txRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    catIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: SPACING.sm,
    },
    txContent: {
        flex: 1,
    },
    txMerchant: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '500',
        color: COLORS.text,
    },
    txCategory: {
        fontSize: 10,
        color: COLORS.textMuted,
        textTransform: 'capitalize',
    },
    txAmount: {
        fontSize: FONT_SIZE.sm,
        fontWeight: '600',
    },
});
