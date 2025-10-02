import React from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
import Svg, { Path, Circle, Rect, Ellipse, Polygon, Line, G } from 'react-native-svg';

export function LogoVariants() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.logoItem}>
        <Text style={styles.logoLabel}>Option 2 - Open Fridge with Recipe Coming Out</Text>
        <View style={styles.logoContainer}>
          <Svg width={120} height={120} viewBox="0 0 120 120">
            <Circle cx="60" cy="60" r="56" fill="#4ECDC4" />
            <Rect x="35" y="35" width="30" height="50" rx="2" fill="#FFF" />
            <Rect x="37" y="40" width="26" height="20" fill="#FFD93D" opacity="0.3" />
            <Rect x="37" y="63" width="26" height="18" fill="#FF8C42" opacity="0.3" />
            <Rect x="40" y="50" width="4" height="8" rx="2" fill="#2C3E50" />
            <Path d="M65 45 L85 45 L85 75 L75 75" fill="#FFF" stroke="#FF8C42" strokeWidth="2" />
            <Line x1="70" y1="52" x2="80" y2="52" stroke="#FF8C42" strokeWidth="2" strokeLinecap="round" />
            <Line x1="70" y1="58" x2="80" y2="58" stroke="#4ECDC4" strokeWidth="1.5" strokeLinecap="round" />
            <Line x1="70" y1="63" x2="80" y2="63" stroke="#4ECDC4" strokeWidth="1.5" strokeLinecap="round" />
            <Line x1="70" y1="68" x2="78" y2="68" stroke="#4ECDC4" strokeWidth="1.5" strokeLinecap="round" />
            <Circle cx="82" cy="48" r="3" fill="#FFD93D" />
          </Svg>
        </View>
      </View>

      <View style={styles.logoItem}>
        <Text style={styles.logoLabel}>Option 9 - Fridge with Thought Bubble Recipe</Text>
        <View style={styles.logoContainer}>
          <Svg width={120} height={120} viewBox="0 0 120 120">
            <Circle cx="60" cy="60" r="56" fill="#4ECDC4" />
            <Rect x="42" y="40" width="32" height="50" rx="2" fill="#FFF" />
            <Rect x="44" y="45" width="28" height="19" fill="#FFD93D" opacity="0.2" />
            <Rect x="44" y="67" width="28" height="20" fill="#FF8C42" opacity="0.2" />
            <Rect x="48" y="60" width="4" height="8" rx="2" fill="#2C3E50" />
            <Circle cx="82" cy="42" r="12" fill="#FFF" />
            <Circle cx="76" cy="50" r="5" fill="#FFF" />
            <Circle cx="78" cy="56" r="3" fill="#FFF" />
            <Line x1="78" y1="36" x2="86" y2="36" stroke="#FF8C42" strokeWidth="2" strokeLinecap="round" />
            <Line x1="78" y1="41" x2="86" y2="41" stroke="#4ECDC4" strokeWidth="1.5" strokeLinecap="round" />
            <Line x1="78" y1="46" x2="84" y2="46" stroke="#4ECDC4" strokeWidth="1.5" strokeLinecap="round" />
          </Svg>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    gap: 32,
  },
  logoItem: {
    alignItems: 'center',
    gap: 12,
  },
  logoLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
  },
  logoContainer: {
    padding: 10,
    backgroundColor: '#F7F9FB',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E1E8ED',
  },
});
