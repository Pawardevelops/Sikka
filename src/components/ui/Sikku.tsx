/**
 * Sikku — the Sikka coin mascot (design-system/assets/Mascot).
 * Lime coin, ink outline, dashed inner ring, two dot eyes, smile, peach cheeks.
 * Use for welcome, unlock, empty states, tips and celebrations — never on lists,
 * forms or money values. At most one per screen, min 26px.
 */

import React from 'react';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { SIKKA } from '../../constants/theme';

export type SikkuMood = 'happy' | 'wink' | 'celebrate' | 'thinking' | 'sleepy';

interface SikkuProps {
    size?: number;
    mood?: SikkuMood;
    /** Outline colour — use the ground colour on dark backgrounds. */
    outline?: string;
    /** Simplified face without ring/cheeks for small sizes (< 40px). */
    simple?: boolean;
}

const INK = SIKKA.ink;
const CHEEK = '#FF9F7A';

export function Sikku({ size = 120, mood = 'happy', outline = INK, simple }: SikkuProps) {
    const isSimple = simple ?? size < 40;
    const stroke = isSimple ? 6 : 4;

    const eyes = (() => {
        switch (mood) {
            case 'sleepy':
                return <Path d="M40 56q6 5 12 0M68 56q6 5 12 0" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />;
            case 'wink':
                return (
                    <>
                        <Circle cx={46} cy={54} r={6} fill={INK} />
                        <Path d="M68 55q6 -5 12 0" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
                    </>
                );
            case 'celebrate':
                return <Path d="M40 57q6 -8 12 0M68 57q6 -8 12 0" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />;
            default:
                return (
                    <>
                        <Circle cx={46} cy={54} r={isSimple ? 7 : 6} fill={INK} />
                        <Circle cx={74} cy={54} r={isSimple ? 7 : 6} fill={INK} />
                        {!isSimple && <Circle cx={48} cy={52} r={2} fill="#FFFFFF" />}
                        {!isSimple && <Circle cx={76} cy={52} r={2} fill="#FFFFFF" />}
                    </>
                );
        }
    })();

    const mouth = (() => {
        switch (mood) {
            case 'sleepy':
                return <Path d="M50 72q10 6 20 0" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />;
            case 'thinking':
                return <Path d="M50 74h20" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />;
            case 'celebrate':
                return <Path d="M46 68q14 18 28 0z" fill={INK} stroke={INK} strokeWidth={3} strokeLinejoin="round" />;
            default:
                return <Path d={isSimple ? 'M47 72q13 11 26 0' : 'M47 71q13 11 26 0'} fill="none" stroke={INK} strokeWidth={isSimple ? 5 : 4} strokeLinecap="round" />;
        }
    })();

    return (
        <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityLabel="Sikku, the Sikka coin">
            <Circle cx={60} cy={60} r={56} fill={SIKKA.lime} stroke={outline} strokeWidth={stroke} />
            {!isSimple && <Circle cx={60} cy={60} r={44} fill="none" stroke={INK} strokeWidth={2} strokeDasharray="4 6" />}
            {eyes}
            {mouth}
            {!isSimple && mood !== 'thinking' && (
                <>
                    <Ellipse cx={35} cy={69} rx={6} ry={4} fill={CHEEK} />
                    <Ellipse cx={85} cy={69} rx={6} ry={4} fill={CHEEK} />
                </>
            )}
        </Svg>
    );
}
