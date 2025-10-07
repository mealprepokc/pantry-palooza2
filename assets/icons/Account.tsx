import React from 'react';
import { User } from 'lucide-react-native';
import { View } from 'react-native';

export default function AccountIcon({ size = 24, color = '#999' }: { size?: number; color?: string }) {
  return (
    <View>
      <User size={size} color={color} />
    </View>
  );
}
