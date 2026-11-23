/**
 * The Sikka coin mark (design-system/assets/Logos/sikka-mark.svg).
 * `appIcon` draws the launcher version: the coin on a night rounded square.
 * Never recolour the coin; on dark grounds the ink outline stays.
 */
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { SIKKA } from '../../constants/theme';

export function SikkaMark({ size = 96, appIcon = false }: { size?: number; appIcon?: boolean }) {
    if (appIcon) {
        return (
            <Svg width={size} height={size} viewBox="0 0 512 512" accessibilityRole="image" accessibilityLabel="Sikka">
                <Rect width={512} height={512} rx={112} fill={SIKKA.night} />
                <Circle cx={256} cy={256} r={170} fill={SIKKA.lime} />
                <Circle cx={256} cy={256} r={134} fill="none" stroke={SIKKA.night} strokeWidth={6} strokeDasharray="12 18" />
                <Path
                    d="M206 196h100M206 234h100M244 196c44 0 44 76 0 76h-38l82 70"
                    fill="none"
                    stroke={SIKKA.night}
                    strokeWidth={20}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </Svg>
        );
    }
    return (
        <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityRole="image" accessibilityLabel="Sikka">
            <Circle cx={60} cy={60} r={56} fill={SIKKA.lime} stroke={SIKKA.ink} strokeWidth={4} />
            <Circle cx={60} cy={60} r={44} fill="none" stroke={SIKKA.ink} strokeWidth={2} strokeDasharray="4 6" />
            <Path
                d="M44 40h32M44 52h32M56 40c14 0 14 24 0 24h-12l26 22"
                fill="none"
                stroke={SIKKA.ink}
                strokeWidth={6}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </Svg>
    );
}
