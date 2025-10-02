import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Pressable } from 'react-native';
import { ChevronDown, X } from 'lucide-react-native';

interface DropdownSelectorProps {
  title: string;
  items: string[];
  selectedItems: string[];
  onToggle: (item: string) => void;
  maxSelections?: number;
}

export function DropdownSelector({
  title,
  items,
  selectedItems,
  onToggle,
  maxSelections = 10,
}: DropdownSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const removeItem = (item: string) => {
    onToggle(item);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.count}>
          {selectedItems.length} selected
        </Text>
      </View>

      {selectedItems.length > 0 && (
        <View style={styles.selectedContainer}>
          {selectedItems.map((item) => (
            <View key={item} style={styles.selectedChip}>
              <Text style={styles.selectedChipText}>{item}</Text>
              <TouchableOpacity onPress={() => removeItem(item)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <X size={16} color="#2C3E50" />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.dropdownButton}
        onPress={() => setIsOpen(true)}
      >
        <Text style={styles.dropdownButtonText}>
          {selectedItems.length === 0 ? `Select ${title}` : `Add more ${title.toLowerCase()}`}
        </Text>
        <ChevronDown size={20} color="#5A6C7D" />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsOpen(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <X size={24} color="#2C3E50" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.itemList}>
              {items.map((item) => {
                const isSelected = selectedItems.includes(item);
                const canSelect = selectedItems.length < maxSelections;

                return (
                  <TouchableOpacity
                    key={item}
                    style={[
                      styles.item,
                      isSelected && styles.itemSelected,
                      !isSelected && !canSelect && styles.itemDisabled,
                    ]}
                    onPress={() => {
                      if (isSelected || canSelect) {
                        onToggle(item);
                      }
                    }}
                    disabled={!isSelected && !canSelect}
                  >
                    <Text style={[
                      styles.itemText,
                      isSelected && styles.itemTextSelected,
                      !isSelected && !canSelect && styles.itemTextDisabled,
                    ]}>
                      {item}
                    </Text>
                    {isSelected && (
                      <View style={styles.checkmark}>
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setIsOpen(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
    fontWeight: '700',
    color: '#2C3E50',
  },
  count: {
    fontSize: 14,
    color: '#5A6C7D',
    fontWeight: '500',
  },
  selectedContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  selectedChipText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderColor: '#E1E8ED',
    borderRadius: 14,
    padding: 16,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: '#5A6C7D',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E1E8ED',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C3E50',
  },
  itemList: {
    maxHeight: 400,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemSelected: {
    backgroundColor: '#F0FFFE',
  },
  itemDisabled: {
    opacity: 0.4,
  },
  itemText: {
    fontSize: 16,
    color: '#2C3E50',
    fontWeight: '500',
  },
  itemTextSelected: {
    color: '#4ECDC4',
    fontWeight: '700',
  },
  itemTextDisabled: {
    color: '#999',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4ECDC4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
  },
  doneButton: {
    backgroundColor: '#4ECDC4',
    marginHorizontal: 20,
    marginVertical: 20,
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  doneButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
