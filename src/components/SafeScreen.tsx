/**
 * Sikka - Safe Screen Wrapper
 * Provides consistent safe area padding across all screens
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../constants/theme';

interface SafeScreenProps {
    children: React.ReactNode;
    style?: ViewStyle;
    edges?: ('top' | 'bottom' | 'left' | 'right')[];
}

/**
 * A wrapper component that adds proper safe area padding
 * Use this instead of hardcoded paddingTop values
 */
export function SafeScreen({ children, style, edges = ['top'] }: SafeScreenProps) {
    const insets = useSafeAreaInsets();

    const paddingStyle: ViewStyle = {};

    if (edges.includes('top')) {
        paddingStyle.paddingTop = insets.top;
    }
    if (edges.includes('bottom')) {
        paddingStyle.paddingBottom = insets.bottom;
    }
    if (edges.includes('left')) {
        paddingStyle.paddingLeft = insets.left;
    }
    if (edges.includes('right')) {
        paddingStyle.paddingRight = insets.right;
    }

    return (
        <View style={[styles.container, paddingStyle, style]}>
            <StatusBar
                barStyle="light-content"
                backgroundColor={COLORS.background}
                translucent={Platform.OS === 'android'}
            />
            {children}
        </View>
    );
}

/**
 * Hook to get safe area top padding value
 * Useful for screens that need the raw value
 */
export function useSafeTop(): number {
    const insets = useSafeAreaInsets();
    // Add extra padding for visual comfort
    return insets.top + 10;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
});
