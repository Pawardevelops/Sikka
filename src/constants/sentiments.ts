/**
 * Sikka - Sentiment Constants
 * definitions for transaction sentiments/emotions
 */

import { COLORS } from './theme';

export interface Sentiment {
    id: string;
    label: string;
    color: string;
    description?: string;
}

export const SENTIMENTS: Record<string, Sentiment> = {
    joy: {
        id: 'joy',
        label: 'Joy',
        color: COLORS.success, // Green
        description: 'Worth it / Happy purchase',
    },
    regret: {
        id: 'regret',
        label: 'Regret',
        color: COLORS.error, // Red
        description: 'Waste / Should have avoided',
    },
    impulse: {
        id: 'impulse',
        label: 'Impulse',
        color: '#F59E0B', // Amber/Orange
        description: 'Rash decision / Unplanned',
    },
    essential: {
        id: 'essential',
        label: 'Essential',
        color: COLORS.primary, // App Primary (Teal/Blue-Green)
        description: 'Need / Utility',
    },
    growth: {
        id: 'growth',
        label: 'Growth',
        color: '#8B5CF6', // Purple
        description: 'Learning / Health / Self-improvement',
    },
};

export const SENTIMENT_LIST = Object.values(SENTIMENTS);
