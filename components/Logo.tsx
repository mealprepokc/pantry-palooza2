import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

interface LogoProps {
  size?: number;
}

export function Logo({ size = 80 }: LogoProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Circle cx="60" cy="60" r="56" fill="#4ECDC4" />
        <Rect x="42" y="40" width="32" height="50" rx="2" fill="#FFF" />
        <Rect x="44" y="45" width="28" height="19" fill="#FFD93D" opacity="0.2" />
        <Rect x="44" y="67" width="28" height="20" fill="#FF8C42" opacity="0.2" />
        <Rect x="48" y="60" width="4" height="8" rx="2" fill="#2C3E50" />
        <Circle cx="82" cy="42" r="12" fill="#FFF" />
        <Circle cx="76" cy="50" r="5" fill="#FFF" />
        <Circle cx="78" cy="56" r="3" fill="#FFF" />
        <Path d="M78 36 L86 36" stroke="#FF8C42" strokeWidth="2" strokeLinecap="round" />
        <Path d="M78 41 L86 41" stroke="#4ECDC4" strokeWidth="1.5" strokeLinecap="round" />
        <Path d="M78 46 L84 46" stroke="#4ECDC4" strokeWidth="1.5" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
