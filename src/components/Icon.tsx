import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

export type IconName = keyof typeof MaterialIcons.glyphMap;

interface IconProps {
    name: IconName;
    size?: number;
    color?: string;
    style?: any;
}

export function Icon({ name, size = 24, color = COLORS.primary, style }: IconProps) {
    return <MaterialIcons name={name} size={size} color={color} style={style} />;
}
