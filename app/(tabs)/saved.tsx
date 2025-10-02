import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { SavedDish } from '@/types/database';
import { DishScorecard } from '@/components/DishScorecard';
import { BookMarked } from 'lucide-react-native';

export default function SavedScreen() {
  const { user } = useAuth();
  const [savedDishes, setSavedDishes] = useState<SavedDish[]>([]);
  const [loading, setLoading] = useState(true);

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
          {savedDishes.map((dish) => (
            <DishScorecard
              key={dish.id}
              dish={{
                title: dish.title,
                cuisine_type: dish.cuisine_type,
                image_url: dish.image_url,
                ingredients: dish.ingredients as string[],
                instructions: dish.instructions,
              }}
              isSaved={true}
              onSaveToggle={loadSavedDishes}
            />
          ))}
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
});
