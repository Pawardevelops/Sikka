import React from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

interface IconProps {
    name: keyof typeof MaterialIcons.glyphMap;
    size?: number;
    color?: string;
    style?: any;
}

export function Icon({ name, size = 24, color = COLORS.primary, style }: IconProps) {
    return <MaterialIcons name={name} size={size} color={color} style={style} />;
}
