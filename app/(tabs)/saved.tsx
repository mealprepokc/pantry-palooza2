import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { SavedDish } from '@/types/database';
import { BookMarked, ChevronDown, ChevronRight, Clock } from 'lucide-react-native';

export default function SavedScreen() {
  const { user } = useAuth();
  const [savedDishes, setSavedDishes] = useState<SavedDish[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const loadSavedDishes = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('saved_dishes')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setSavedDishes(data);
    }

    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadSavedDishes();
    }, [user])
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved Dishes</Text>
        <Text style={styles.headerSubtitle}>
          {savedDishes.length} {savedDishes.length === 1 ? 'recipe' : 'recipes'} saved
        </Text>
      </View>

      {savedDishes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <BookMarked size={64} color="#CCC" />
          <Text style={styles.emptyTitle}>No Saved Dishes Yet</Text>
          <Text style={styles.emptyText}>
            Generate some dishes and save your favorites to see them here
          </Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {savedDishes.map((dish) => {
            const isOpen = !!expanded[dish.id];
            const toggle = () => setExpanded((e) => ({ ...e, [dish.id]: !e[dish.id] }));
            const ings = Array.isArray(dish.ingredients) ? (dish.ingredients as string[]) : [];
            return (
              <View key={dish.id} style={styles.item}>
                <TouchableOpacity onPress={toggle} style={styles.itemHeader}>
                  <View style={styles.itemTitleRow}>
                    {isOpen ? (
                      <ChevronDown size={20} color="#2C3E50" />
                    ) : (
                      <ChevronRight size={20} color="#2C3E50" />
                    )}
                    <Text style={styles.itemTitle} numberOfLines={1} ellipsizeMode="tail">{dish.title}</Text>
                  </View>
                  <View style={styles.itemMetaRow}>
                    {!!dish.cuisine_type && (
                      <Text style={styles.itemMeta} numberOfLines={1}>{dish.cuisine_type}</Text>
                    )}
                    {!!dish.cooking_time && (
                      <View style={styles.itemTime}>
                        <Clock size={12} color="#4ECDC4" />
                        <Text style={styles.itemMeta} numberOfLines={1}>{dish.cooking_time}</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
                {isOpen && (
                  <View style={styles.itemBody}>
                    {ings.length > 0 && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Ingredients</Text>
                        {ings.map((ing, idx) => (
                          <Text key={idx} style={styles.sectionText}>• {ing}</Text>
                        ))}
                      </View>
                    )}
                    {!!dish.instructions && (
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Instructions</Text>
                        <Text style={styles.sectionText}>{dish.instructions}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1A1A1A',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  item: {
    borderWidth: 2,
    borderColor: '#E1E8ED',
    borderRadius: 14,
    backgroundColor: '#FFF',
    marginBottom: 14,
    overflow: 'hidden',
  },
  itemHeader: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  itemTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemMeta: {
    fontSize: 12,
    color: '#4ECDC4',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  itemTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemBody: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 6,
  },
  sectionText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
});
