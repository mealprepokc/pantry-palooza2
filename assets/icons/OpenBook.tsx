import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface Props {
  size?: number;
  color?: string;
}

// Simple, brand-friendly open-book icon. Inherits size/color from tab bar.
export default function OpenBook({ size = 24, color = '#4ECDC4' }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Left cover */}
      <Path
        d="M11 5.5c-2.2-1.4-5-.9-7 .5v11c2-1.4 4.8-1.9 7-.5V5.5Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Right cover */}
      <Path
        d="M13 5.5c2.2-1.4 5-.9 7 .5v11c-2-1.4-4.8-1.9-7-.5V5.5Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Spine */}
      <Path d="M12 6v11" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}
