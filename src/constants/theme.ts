/**
 * Sikka - Theme Constants
 *
 * Built on the Sikka design system (v2 look): warm cream ground, white cards,
 * one lime brand colour, pastel category pairs, chunky rounded shapes.
 * Source of truth: /design-system/tokens.json and /design-system/README.md.
 *
 * `SIKKA` mirrors the design tokens 1:1. `COLORS` and the other legacy exports
 * are kept so existing screens keep working; their values now map onto the
 * design-system tokens.
 */

// ==================== DESIGN TOKENS (1:1 with tokens.json, light theme) ====================

export const SIKKA = {
    ground: '#F6F2EA',
    surface: '#FFFFFF',
    surfaceSunk: '#F1ECE1',
    ink: '#1D1B16',
    inkMuted: '#5F5A50',
    line: '#E5DFD3',
    night: '#1D1B16',
    onNight: '#FFFFFF',
    lime: '#C6E26B',
    limeDeep: '#3D5E0B',
    signal: '#FF7A3D',
    danger: '#B42318',
    onPastel: '#1D1B16',
} as const;

/** Category colour pairs: fill (`bg`) + icon/label (`fg`). Every pair is 7:1 or better. */
export const CATEGORY_PALETTE = {
    dining: { bg: '#FFD7BF', fg: '#7A2F06' },
    groceries: { bg: '#DCF29B', fg: '#2F4A08' },
    transport: { bg: '#CFE2FF', fg: '#163B78' },
    shopping: { bg: '#FFD2E2', fg: '#80103E' },
    fun: { bg: '#E3D9FF', fg: '#432794' },
    bills: { bg: '#FFE89A', fg: '#5C4100' },
    health: { bg: '#C8F1E2', fg: '#0A5038' },
} as const;

export type PaletteKey = keyof typeof CATEGORY_PALETTE;

/** Which pastel pair a transaction category / account type wears. */
export const CATEGORY_TO_PALETTE: Record<string, PaletteKey> = {
    dining: 'dining',
    food: 'dining',
    groceries: 'groceries',
    income: 'groceries',
    transport: 'transport',
    bank: 'transport',
    savings: 'transport',
    cash: 'groceries',
    wallet: 'groceries',
    shopping: 'shopping',
    credit: 'shopping',
    entertainment: 'fun',
    fun: 'fun',
    bitcoin: 'bills',
    investment: 'bills',
    utilities: 'bills',
    bills: 'bills',
    health: 'health',
    transfer: 'transport',
    other: 'bills',
};

export function getPaletteKey(key?: string | null): PaletteKey {
    return CATEGORY_TO_PALETTE[(key || '').toLowerCase()] ?? 'bills';
}

export function getCategoryColors(key?: string | null) {
    return CATEGORY_PALETTE[getPaletteKey(key)];
}

/** Ordered list for charts and colour pickers (fills). */
export const CHART_COLORS = [
    SIKKA.lime,
    CATEGORY_PALETTE.transport.bg,
    CATEGORY_PALETTE.dining.bg,
    CATEGORY_PALETTE.fun.bg,
    CATEGORY_PALETTE.bills.bg,
    CATEGORY_PALETTE.shopping.bg,
    CATEGORY_PALETTE.health.bg,
    CATEGORY_PALETTE.groceries.bg,
] as const;

/** Stronger chart colours (the `-fg` tones) for lines and small marks. */
export const CHART_COLORS_STRONG = [
    SIKKA.limeDeep,
    CATEGORY_PALETTE.transport.fg,
    CATEGORY_PALETTE.dining.fg,
    CATEGORY_PALETTE.fun.fg,
    CATEGORY_PALETTE.bills.fg,
    CATEGORY_PALETTE.shopping.fg,
    CATEGORY_PALETTE.health.fg,
    CATEGORY_PALETTE.groceries.fg,
] as const;

// ==================== SEMANTIC COLOURS (used across the app) ====================

export const COLORS = {
    // Backgrounds
    background: SIKKA.ground,
    surface: SIKKA.surface,
    surfaceLight: SIKKA.surfaceSunk,
    surfaceSunk: SIKKA.surfaceSunk,
    cardDark: SIKKA.night,

    // Brand
    brand: SIKKA.lime,                     // fills: hero, active tab, approve actions
    onBrand: SIKKA.ink,                    // text/icons on lime — always ink
    brandMuted: 'rgba(198, 226, 107, 0.35)',
    night: SIKKA.night,                    // primary button, dark heroes
    onNight: SIKKA.onNight,
    signal: SIKKA.signal,                  // "look here now" — never text

    // Accent text / icons (lime itself is too light for text on cream)
    primary: SIKKA.limeDeep,
    primaryDark: '#2F4A08',
    primaryLight: SIKKA.lime,
    primaryMuted: 'rgba(198, 226, 107, 0.35)',

    // Secondary accents
    secondary: CATEGORY_PALETTE.transport.fg,
    accent: CATEGORY_PALETTE.fun.fg,

    // Text
    text: SIKKA.ink,
    textSecondary: SIKKA.inkMuted,
    textMuted: SIKKA.inkMuted,

    // Status
    success: SIKKA.limeDeep,
    error: SIKKA.danger,
    errorMuted: 'rgba(180, 35, 24, 0.10)',
    warning: '#B54708',                    // readable amber for text (5:1 on white)
    warningMuted: 'rgba(255, 122, 61, 0.15)',
    info: CATEGORY_PALETTE.transport.fg,

    // Borders
    border: SIKKA.line,
    borderLight: SIKKA.line,

    // Overlays
    overlay: 'rgba(29, 27, 22, 0.45)',

    // Special
    offline: SIKKA.danger,
    autoBadge: SIKKA.limeDeep,
    white: '#FFFFFF',
    black: SIKKA.ink,
    gray: SIKKA.inkMuted,
    lightGray: SIKKA.line,
    darkGray: SIKKA.inkMuted,

    // Financial semantics — money in = lime-deep, money out stays ink
    netWorth: SIKKA.lime,
    investGrowth: SIKKA.limeDeep,
    investLoss: SIKKA.danger,
    creditWarning: '#B54708',
    creditSafe: SIKKA.limeDeep,
    creditDanger: SIKKA.danger,
} as const;

// ==================== SPACE ====================

export const SPACING = {
    xs: 4,     // space-1
    sm: 8,     // space-2
    md: 12,    // space-3
    lg: 16,    // space-4 — screen gutter, card padding
    xl: 20,    // space-5 — hero padding
    xxl: 24,   // space-6
    xxxl: 32,  // space-8
} as const;

// ==================== TYPE ====================

/** Font family names, as registered with expo-font in App.tsx. */
export const FONT_FAMILY = {
    display: {
        '400': 'BricolageGrotesque_500Medium',
        '500': 'BricolageGrotesque_500Medium',
        '600': 'BricolageGrotesque_600SemiBold',
        '700': 'BricolageGrotesque_700Bold',
        '800': 'BricolageGrotesque_800ExtraBold',
    },
    sans: {
        '400': 'Urbanist_400Regular',
        '500': 'Urbanist_500Medium',
        '600': 'Urbanist_600SemiBold',
        '700': 'Urbanist_700Bold',
        '800': 'Urbanist_800ExtraBold',
    },
} as const;

export const FONT_SIZE = {
    xs: 11,
    sm: 13,    // caption
    md: 15,
    lg: 16,    // body / label
    xl: 20,    // title-md
    xxl: 22,   // amount-md
    xxxl: 32,  // title-xl
    display: 44, // amount-xl
} as const;

export const FONT_WEIGHT = {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
};

/** Named text styles from the design system. Use with the app's <Text>. */
export const TYPE = {
    amountXl: { fontFamily: FONT_FAMILY.display['800'], fontSize: 44, lineHeight: 44, letterSpacing: -1.5 },
    amountMd: { fontFamily: FONT_FAMILY.display['800'], fontSize: 22, lineHeight: 24 },
    titleXl: { fontFamily: FONT_FAMILY.display['800'], fontSize: 32, lineHeight: 34, letterSpacing: -0.8 },
    titleMd: { fontFamily: FONT_FAMILY.display['800'], fontSize: 20, lineHeight: 23 },
    body: { fontFamily: FONT_FAMILY.sans['500'], fontSize: 16, lineHeight: 23 },
    label: { fontFamily: FONT_FAMILY.sans['800'], fontSize: 16, lineHeight: 20 },
    caption: { fontFamily: FONT_FAMILY.sans['600'], fontSize: 13, lineHeight: 18 },
    overline: { fontFamily: FONT_FAMILY.sans['800'], fontSize: 12, lineHeight: 14, letterSpacing: 0.8, textTransform: 'uppercase' as const },
} as const;

// ==================== SHAPE ====================

export const BORDER_RADIUS = {
    sm: 8,
    md: 12,    // radius-sm — icon tiles, small buttons
    lg: 20,    // radius-md — tiles, segmented options
    xl: 26,    // radius-lg — cards, list groups
    xxl: 34,   // radius-xl — heroes, sheets
    full: 9999, // radius-pill — buttons, chips, toggles
} as const;

export const SIZES = {
    base: 8,
    font: 15,
    radius: 20,
    padding: 16,
    largeTitle: 44,
    h1: 32,
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
    largeTitle: { ...TYPE.amountXl },
    h1: { ...TYPE.titleXl },
    h2: { fontFamily: FONT_FAMILY.display['800'], fontSize: SIZES.h2, lineHeight: 26 },
    h3: { fontFamily: FONT_FAMILY.sans['800'], fontSize: SIZES.h3, lineHeight: 22 },
    h4: { fontFamily: FONT_FAMILY.sans['800'], fontSize: SIZES.h4, lineHeight: 20 },
    body1: { fontFamily: FONT_FAMILY.sans['500'], fontSize: SIZES.body1, lineHeight: 36 },
    body2: { fontFamily: FONT_FAMILY.sans['500'], fontSize: SIZES.body2, lineHeight: 28 },
    body3: { fontFamily: FONT_FAMILY.sans['500'], fontSize: SIZES.body3, lineHeight: 23 },
    body4: { fontFamily: FONT_FAMILY.sans['500'], fontSize: SIZES.body4, lineHeight: 20 },
    body5: { fontFamily: FONT_FAMILY.sans['600'], fontSize: SIZES.body5, lineHeight: 16 },
};

// Warm shadows: shadow-card on white cards, shadow-float on the tab bar / deck.
export const SHADOWS = {
    sm: {
        shadowColor: '#4C3C1E',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 2,
    },
    md: {
        shadowColor: '#4C3C1E',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.08,
        shadowRadius: 28,
        elevation: 4,
    },
    lg: {
        shadowColor: '#4C3C1E',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.16,
        shadowRadius: 32,
        elevation: 8,
    },
    glow: {
        shadowColor: SIKKA.lime,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 14,
        elevation: 6,
    },
} as const;

// ==================== MOTION ====================

export const MOTION = {
    durFast: 140,
    durBase: 240,
    durSlow: 420,
    durCelebrate: 900,
    // cubic-bezier control points, for Easing.bezier(...)
    easeOut: [0.22, 1, 0.36, 1] as const,
    easeSpring: [0.34, 1.56, 0.64, 1] as const,
    easeIn: [0.55, 0, 1, 0.45] as const,
} as const;


// Icon mapping for account types
export const ACCOUNT_ICONS: Record<string, string> = {
    bank: 'account-balance',
    cash: 'payments',
    wallet: 'account-balance-wallet',
    savings: 'savings',
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
