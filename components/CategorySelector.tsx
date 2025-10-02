import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SelectionChip } from './SelectionChip';

interface CategorySelectorProps {
  title: string;
  items: string[];
  selectedItems: string[];
  onToggle: (item: string) => void;
  maxSelections?: number;
}

export function CategorySelector({
  title,
  items,
  selectedItems,
  onToggle,
  maxSelections = 5,
}: CategorySelectorProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.count}>
          {selectedItems.length} / {maxSelections}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipContainer}
      >
        {items.map((item) => {
          const isSelected = selectedItems.includes(item);
          const canSelect = selectedItems.length < maxSelections;

          return (
            <SelectionChip
              key={item}
              label={item}
              selected={isSelected}
              onPress={() => {
                if (isSelected || canSelect) {
                  onToggle(item);
                }
              }}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  count: {
    fontSize: 14,
    color: '#666',
  },
  chipContainer: {
    flexDirection: 'row',
    paddingRight: 16,
  },
});
