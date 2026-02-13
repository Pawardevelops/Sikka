/**
 * Sikka - Floating Action Button (WhatsApp-style)
 * Expandable FAB with animated sub-buttons
 */

import React, { useState, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Animated,
    Pressable,
} from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, FONT_SIZE } from '../constants/theme';
import { Icon } from './Icon';


interface FABItem {
    id: string;
    icon: any;
    label: string;
    onPress: () => void;
}

interface FloatingActionButtonProps {
    items: FABItem[];
}

export function FloatingActionButton({ items }: FloatingActionButtonProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showTooltip, setShowTooltip] = useState<string | null>(null);

    const rotateAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const backdropAnim = useRef(new Animated.Value(0)).current;
    const itemAnims = useRef(items.map(() => new Animated.Value(0))).current;

    const toggleMenu = () => {
        const toValue = isExpanded ? 0 : 1;

        // Rotate main button
        Animated.spring(rotateAnim, {
            toValue,
            friction: 5,
            tension: 40,
            useNativeDriver: true,
        }).start();

        // Scale animation
        Animated.spring(scaleAnim, {
            toValue,
            friction: 6,
            tension: 50,
            useNativeDriver: true,
        }).start();

        // Backdrop
        Animated.timing(backdropAnim, {
            toValue,
            duration: 200,
            useNativeDriver: true,
        }).start();

        // Stagger item animations
        if (!isExpanded) {
            Animated.stagger(50, itemAnims.map(anim =>
                Animated.spring(anim, {
                    toValue: 1,
                    friction: 6,
                    tension: 50,
                    useNativeDriver: true,
                })
            )).start();
        } else {
            Animated.stagger(30, [...itemAnims].reverse().map(anim =>
                Animated.timing(anim, {
                    toValue: 0,
                    duration: 150,
                    useNativeDriver: true,
                })
            )).start();
        }

        setIsExpanded(!isExpanded);
        setShowTooltip(null);
    };

    const handleItemPress = (item: FABItem) => {
        // Execute action immediately if it exists
        if (item.onPress) {
            item.onPress();
        }
        // Then close the menu
        toggleMenu();
    };

    const handleLongPress = (itemId: string) => {
        setShowTooltip(itemId);
    };

    const handlePressOut = () => {
        setShowTooltip(null);
    };

    const rotation = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '45deg'],
    });

    return (
        <>
            {/* Backdrop */}
            {isExpanded && (
                <Animated.View
                    style={[
                        styles.backdrop,
                        { opacity: backdropAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.5] }) }
                    ]}
                >
                    <Pressable style={styles.backdropPress} onPress={toggleMenu} />
                </Animated.View>
            )}

            <View style={styles.container}>
                {/* FAB Items */}
                {items.map((item, index) => {
                    const translateY = itemAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, -70 * (index + 1)],
                    });

                    const itemScale = itemAnims[index].interpolate({
                        inputRange: [0, 0.5, 1],
                        outputRange: [0, 0.5, 1],
                    });

                    const opacity = itemAnims[index];

                    return (
                        <Animated.View
                            key={item.id}
                            style={[
                                styles.fabItemContainer,
                                {
                                    transform: [{ translateY }, { scale: itemScale }],
                                    opacity,
                                },
                            ]}
                        >
                            {/* Tooltip */}
                            {showTooltip === item.id && (
                                <View style={styles.tooltip}>
                                    <Text style={styles.tooltipText}>{item.label}</Text>
                                </View>
                            )}
                            <Pressable
                                style={styles.fabItem}
                                onPress={() => handleItemPress(item)}
                                onLongPress={() => handleLongPress(item.id)}
                                onPressOut={handlePressOut}
                                delayLongPress={300}
                            >
                                <Icon name={item.icon} size={24} color={COLORS.text} />
                            </Pressable>
                        </Animated.View>
                    );
                })}

                {/* Main FAB */}
                <Animated.View style={[styles.mainFab, { transform: [{ rotate: rotation }] }]}>
                    <TouchableOpacity
                        style={styles.mainFabButton}
                        onPress={toggleMenu}
                        activeOpacity={0.85}
                    >
                        <Icon name="add" size={32} color={COLORS.background} />
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
        zIndex: 998,
    },
    backdropPress: {
        flex: 1,
    },
    container: {
        position: 'absolute',
        bottom: 100,
        right: 20,
        alignItems: 'center',
        justifyContent: 'flex-end',
        zIndex: 999,
        // Ensure container has height to catch touches on expanded items
        minHeight: 500,
        // Ensure container doesn't block touches when closed, but items do when open
        pointerEvents: 'box-none',
    },
    mainFab: {
        ...SHADOWS.lg,
        zIndex: 2, // Ensure main FAB is on top
    },
    mainFabButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.glow,
    },
    mainFabIcon: {
        fontSize: 32,
        fontWeight: '300',
        color: COLORS.background,
        marginTop: -2,
    },
    fabItemContainer: {
        position: 'absolute',
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        width: 60, // Give it width to be hittable
        height: 60, // Give it height
        marginBottom: 10,
        zIndex: 1,
    },
    fabItem: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.md,
    },
    fabItemIcon: {
        fontSize: 22,
    },
    tooltip: {
        position: 'absolute',
        right: 60,
        backgroundColor: COLORS.surface,
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.sm,
        borderRadius: BORDER_RADIUS.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.sm,
        minWidth: 100, // Ensure tooltip text doesn't wrap weirdly
    },
    tooltipText: {
        fontSize: FONT_SIZE.sm,
        color: COLORS.text,
        fontWeight: '500',
        textAlign: 'center',
    },
});

export default FloatingActionButton;
