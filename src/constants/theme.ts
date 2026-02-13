/**
 * Sikka - Theme Constants
 * Dark theme matching the dashboard design
 */

export const COLORS = {
    // Background colors
    background: '#0D1117',
    surface: '#161B22',
    surfaceLight: '#1C2128',
    cardDark: '#0F1419',

    // Primary accent (Green)
    primary: '#22C55E',
    primaryDark: '#16A34A',
    primaryLight: '#4ADE80',
    primaryMuted: 'rgba(34, 197, 94, 0.15)',

    // Secondary accents
    secondary: '#3B82F6',
    accent: '#8B5CF6',

    // Text colors
    text: '#FFFFFF',
    textSecondary: '#8B949E',
    textMuted: '#6E7681',

    // Status colors
    success: '#22C55E',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',

    // Borders
    border: '#30363D',
    borderLight: '#21262D',

    // Special
    offline: '#EF4444',
    autoBadge: '#22C55E',
    white: '#FFFFFF',
    black: '#000000',
    gray: '#6E7681',
    lightGray: '#30363D',
    darkGray: '#8B949E',
} as const;

export const SPACING = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
} as const;

export const FONT_SIZE = {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 24,
    xxxl: 32,
    display: 40,
} as const;

export const FONT_WEIGHT = {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
};

export const BORDER_RADIUS = {
    sm: 6,
    md: 10,
    lg: 14,
    xl: 18,
    xxl: 24,
    full: 9999,
} as const;

export const SIZES = {
    base: 8,
    font: 14,
    radius: 12,
    padding: 24,
    largeTitle: 50,
    h1: 30,
    h2: 22,
    h3: 16,
    h4: 14,
    body1: 30,
    body2: 20,
    body3: 16,
    body4: 14,
    body5: 12,
};

export const FONTS = {
    largeTitle: { fontFamily: 'System', fontSize: SIZES.largeTitle, lineHeight: 55 },
    h1: { fontFamily: 'System', fontSize: SIZES.h1, lineHeight: 36, fontWeight: '700' as const },
    h2: { fontFamily: 'System', fontSize: SIZES.h2, lineHeight: 30, fontWeight: '700' as const },
    h3: { fontFamily: 'System', fontSize: SIZES.h3, lineHeight: 22, fontWeight: '700' as const },
    h4: { fontFamily: 'System', fontSize: SIZES.h4, lineHeight: 22, fontWeight: '700' as const },
    body1: { fontFamily: 'System', fontSize: SIZES.body1, lineHeight: 36 },
    body2: { fontFamily: 'System', fontSize: SIZES.body2, lineHeight: 30 },
    body3: { fontFamily: 'System', fontSize: SIZES.body3, lineHeight: 22 },
    body4: { fontFamily: 'System', fontSize: SIZES.body4, lineHeight: 22 },
    body5: { fontFamily: 'System', fontSize: SIZES.body5, lineHeight: 22 },
};

export const SHADOWS = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
    glow: {
        shadowColor: '#22C55E',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
} as const;

// Icon mapping for account types
export const ACCOUNT_ICONS: Record<string, string> = {
    bank: 'account-balance',
    cash: 'payments',
    bitcoin: 'currency-bitcoin',
    credit: 'credit-card',
    investment: 'trending-up',
};

// Category icons for transactions
export const CATEGORY_ICONS: Record<string, string> = {
    groceries: 'local-grocery-store',
    dining: 'restaurant',
    transport: 'directions-car',
    shopping: 'shopping-bag',
    entertainment: 'movie',
    utilities: 'lightbulb',
    health: 'medical-services',
    income: 'attach-money',
    transfer: 'swap-horiz',
    other: 'receipt-long',
};
