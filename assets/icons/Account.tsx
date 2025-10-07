import React from 'react';
import { User } from 'lucide-react-native';
import { View, StyleSheet, Text } from 'react-native';

export default function AccountIcon({
  size = 24,
  color = '#999',
  active = false,
  badgeCount = 0,
}: { size?: number; color?: string; active?: boolean; badgeCount?: number }) {
  return (
    <View style={[styles.wrapper, active && styles.wrapperActive]}>
      <User size={size} color={color} />
      {badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText} numberOfLines={1}>
            {badgeCount > 9 ? '9+' : String(badgeCount)}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    padding: 6,
    borderRadius: 14,
  },
  wrapperActive: {
    backgroundColor: '#FFF4ED',
  },
  badge: {
    position: 'absolute',
    right: -2,
    top: -2,
    backgroundColor: '#E05353',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
});
