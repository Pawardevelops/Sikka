import React, { useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Text, TouchableOpacity } from 'react-native';
import { COLORS, SPACING } from '../../constants/theme';

interface TransactionHeatmapProps {
    data: Record<string, number>; // date "YYYY-MM-DD" -> value
    onDayPress?: (date: string, value: number) => void;
}

export function TransactionHeatmap({
    data,
    onDayPress
}: TransactionHeatmapProps) {
    const scrollViewRef = useRef<ScrollView>(null);

    // Auto-scroll to end on mount
    useEffect(() => {
        // Simple timeout to ensure layout is done
        const timer = setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: false });
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    // Generate array of days
    const weeks = useMemo(() => {
        const today = new Date();

        // End Date: Last day of the current month
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        // Start Date: 1st day of the month, 11 months ago (total 12 months including current)
        const start = new Date(today.getFullYear(), today.getMonth() - 11, 1);

        const daysArray = [];
        const loopDate = new Date(start);

        // Generate all days
        while (loopDate <= end) {
            const dateStr = loopDate.toISOString().split('T')[0];
            daysArray.push({
                date: dateStr,
                value: data[dateStr] || 0,
                obj: new Date(loopDate)
            });
            loopDate.setDate(loopDate.getDate() + 1);
        }

        interface WeekColumn {
            days: any[];
            id: string;
            isMonthEnd: boolean; // Add margin after this column
            monthLabel?: string;
        }

        const weeksArr: WeekColumn[] = [];
        let currentWeek: any[] = new Array(7).fill(null);
        let lastMonth: number | null = null;

        daysArray.forEach((day, index) => {
            const dayOfWeek = day.obj.getDay(); // 0-6
            const currentMonth = day.obj.getMonth();

            // Check for Month Change
            if (lastMonth !== null && currentMonth !== lastMonth) {
                // If we have data in currentWeek (meaning the previous month ended mid-week)
                // We MUST push this partial week to finish the previous month visually.
                if (currentWeek.some(d => d !== null)) {
                    weeksArr.push({
                        days: [...currentWeek],
                        id: `week-end-${index}`,
                        isMonthEnd: true // Force gap after the month ends
                    });
                    currentWeek = new Array(7).fill(null); // Reset for new month
                } else {
                    // If currentWeek is empty, it means the previous day was Saturday (end of week).
                    // So the PREVIOUS pushed week was the end of the month.
                    // We need to go back and add the margin to it.
                    if (weeksArr.length > 0) {
                        weeksArr[weeksArr.length - 1].isMonthEnd = true;
                    }
                }
            }

            // Assign day
            currentWeek[dayOfWeek] = day;

            // Month Labels
            // We identify the month label at the 1st of the month
            let weekLabel = undefined;
            if (day.obj.getDate() === 1) {
                weekLabel = day.obj.toLocaleString('default', { month: 'short' });
                // We store it to attach to the next pushed week.
                // Actually, the label belongs to the COLUMN that contains the 1st.
                // The currentWeek contains it.
                // We can just attach it to the week object when we push it.
                // BUT, if we split mid-week, the "new" week (start of month) gets it.
            }

            // Push Week Logic:
            // 1. It's Saturday (day 6)
            // 2. It's the very last day of the entire array
            if (dayOfWeek === 6 || index === daysArray.length - 1) {
                // Check if this week represents the start of a month for labeling
                // Or just check if any day in it is the 1st.
                const hasFirst = currentWeek.find(d => d && d.obj.getDate() === 1);
                const label = hasFirst ? hasFirst.obj.toLocaleString('default', { month: 'short' }) : undefined;

                weeksArr.push({
                    days: [...currentWeek],
                    id: `week-${index}`,
                    isMonthEnd: false,
                    monthLabel: label
                });
                currentWeek = new Array(7).fill(null);
            }

            lastMonth = currentMonth;
        });

        return weeksArr;
    }, [data]);

    // Determine basic color scale based on max value
    const maxValue = useMemo(() => {
        const vals = Object.values(data);
        return vals.length > 0 ? Math.max(...vals) : 1;
    }, [data]);

    const getColor = (value: number) => {
        if (value === 0) return COLORS.surfaceLight;

        const ratio = value / maxValue;
        if (ratio < 0.25) return '#86EFAC';
        if (ratio < 0.50) return '#4ADE80';
        if (ratio < 0.75) return '#22C55E';
        return '#15803D';
    };

    return (
        <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.container}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
            <View style={styles.grid}>
                {weeks.map((week) => (
                    <View
                        key={week.id}
                        style={[
                            styles.column,
                            {
                                marginRight: week.isMonthEnd ? SPACING.lg : 3 // Large gap if month ends
                            }
                        ]}
                    >
                        {/* Month Label Header */}
                        <View style={styles.labelContainer}>
                            {week.monthLabel ? (
                                <Text style={styles.monthLabel}>{week.monthLabel}</Text>
                            ) : null}
                        </View>

                        {/* Cells */}
                        {week.days.map((day, dIndex) => (
                            <TouchableOpacity
                                key={day ? day.date : `empty-${week.id}-${dIndex}`}
                                style={[
                                    styles.cell,
                                    { backgroundColor: day ? getColor(day.value) : 'transparent' }
                                ]}
                                onPress={() => day && onDayPress?.(day.date, day.value)}
                                disabled={!day || day.value === 0}
                            />
                        ))}
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: SPACING.md,
    },
    grid: {
        flexDirection: 'row',
        alignItems: 'flex-start', // Top align
    },
    column: {
        flexDirection: 'column',
        gap: 4, // Increased vertical gap
    },
    labelContainer: {
        height: 24,
        justifyContent: 'flex-end',
        marginBottom: 8,
        width: 20, // Match new cell width (approx)
        overflow: 'visible',
    },
    monthLabel: {
        fontSize: 12, // Larger font
        color: COLORS.textMuted,
        fontWeight: '600',
        width: 60,
    },
    cell: {
        width: 18, // Increased size
        height: 18,
        borderRadius: 4, // Softer corners
    }
});
