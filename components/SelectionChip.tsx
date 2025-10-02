import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

interface SelectionChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

export function SelectionChip({ label, selected, onPress }: SelectionChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 8,
    marginBottom: 8,
  },
  chipSelected: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  chipText: {
    fontSize: 14,
    color: '#1A1A1A',
  },
  chipTextSelected: {
    color: '#FFF',
    fontWeight: '600',
  },
});
