import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Platform,
  ToastAndroid,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useAlerts } from '@/contexts/AlertContext';
import type { SavedDish } from '@/types/database';
import { BookMarked, ChevronDown, ChevronRight, BookmarkX, ChefHat, Clock } from 'lucide-react-native';

type RichSavedDish = SavedDish & {
  cost_est?: number | null;
  restaurant_cost_est?: number | null;
  savings_est?: number | null;
  meal_type?: 'Breakfast' | 'Lunch' | 'Dinner' | null;
};

type MealGroupKey = 'Breakfast' | 'Lunch' | 'Dinner' | 'Other';
const MEAL_ORDER: MealGroupKey[] = ['Breakfast', 'Lunch', 'Dinner', 'Other'];

const GROUP_LABELS: Record<MealGroupKey, string> = {
  Breakfast: 'Breakfast',
  Lunch: 'Lunch',
  Dinner: 'Dinner',
  Other: 'Other Favorites',
};

const mapToMealGroup = (value: unknown): MealGroupKey => {
  if (typeof value !== 'string') return 'Other';
  const normalized = value.trim().toLowerCase();
  if (normalized === 'breakfast') return 'Breakfast';
  if (normalized === 'lunch') return 'Lunch';
  if (normalized === 'dinner') return 'Dinner';
  return 'Other';
};

const parseIngredientList = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item ?? '').trim()).filter(Boolean);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed.map((item) => String(item ?? '').trim()).filter(Boolean);
      } catch {
        // ignore parse failure
      }
    }
    return trimmed
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [String(value).trim()].filter(Boolean);
};

const numeric = (value: number | null | undefined): number | null =>
  typeof value === 'number' && !Number.isNaN(value) ? value : null;

export default function SavedScreen() {
  const { user } = useAuth();
  const userId = user?.id;
  const { pendingCooked, markCookedSeen } = useAlerts();
  const [savedDishes, setSavedDishes] = useState<RichSavedDish[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<MealGroupKey, boolean>>({
    Breakfast: true,
    Lunch: true,
    Dinner: true,
    Other: true,
  });
  const [expandedDishes, setExpandedDishes] = useState<Record<string, boolean>>({});
  const [markingCooked, setMarkingCooked] = useState<Record<string, boolean>>({});

  const loadSavedDishes = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('saved_dishes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (data) {
      setSavedDishes(data as RichSavedDish[]);
    }
    setLoading(false);
  }, [userId]);

  const removeSaved = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_dishes')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setSavedDishes((prev) => prev.filter((d) => d.id !== id));
      if (Platform.OS === 'android') {
        ToastAndroid.show('Removed from Saved', ToastAndroid.SHORT);
      } else {
        Alert.alert('Removed', 'Dish removed from Saved.');
      }
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to remove from Saved.');
    }
  };

  const markAsCooked = async (dish: RichSavedDish) => {
    if (!user) return;
    setMarkingCooked((prev) => ({ ...prev, [dish.id]: true }));
    try {
      const ingredients = parseIngredientList(dish.ingredients);
      const knownCost = numeric(dish.cost_est);
      const knownRestaurant = numeric(dish.restaurant_cost_est);
      const restaurant = knownRestaurant ?? (knownCost != null ? Math.round(Math.max(knownCost * 3.6, knownCost + 24) * 2) / 2 : null);
      const savings =
        numeric(dish.savings_est) ??
        (restaurant != null && knownCost != null ? Math.max(0, Math.round((restaurant - knownCost) * 100) / 100) : null);

      const { error: insertErr } = await supabase.from('cooked_dishes').insert({
        user_id: user.id,
        title: dish.title,
        cuisine_type: dish.cuisine_type,
        cooking_time: dish.cooking_time,
        ingredients,
        instructions: dish.instructions,
        cost_est: knownCost,
        restaurant_cost_est: restaurant,
        savings_est: savings,
      });
      const duplicateCook = insertErr ? (insertErr as any)?.code === '23505' : false;
      if (insertErr && !duplicateCook) throw insertErr;

      const { error: removeErr } = await supabase.from('saved_dishes').delete().eq('id', dish.id);
      if (removeErr) throw removeErr;

      setSavedDishes((prev) => prev.filter((d) => d.id !== dish.id));
      const cookedMsg = duplicateCook ? 'Already marked as cooked' : 'Marked as cooked';
      if (Platform.OS === 'android') {
        ToastAndroid.show(cookedMsg, ToastAndroid.SHORT);
      } else {
        Alert.alert(duplicateCook ? 'Already cooked' : 'Cooked', duplicateCook ? 'This dish was already in your Cooked list.' : 'Dish moved to Cooked.');
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to mark as cooked.');
    } finally {
      setMarkingCooked((prev) => ({ ...prev, [dish.id]: false }));
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSavedDishes();
    }, [loadSavedDishes])
  );

  useEffect(() => {
    if (pendingCooked) {
      markCookedSeen();
    }
  }, [pendingCooked, markCookedSeen]);

  const groupedDishes = useMemo(() => {
    const groups: Record<MealGroupKey, RichSavedDish[]> = {
      Breakfast: [],
      Lunch: [],
      Dinner: [],
      Other: [],
    };

    savedDishes.forEach((dish) => {
      const key = mapToMealGroup(dish.meal_type);
      const group = groups[key] || groups.Other;
      group.push(dish);
    });

    return groups;
  }, [savedDishes]);

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
          <Text style={styles.emptyText}>Generate some dishes and save your favorites to see them here.</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {MEAL_ORDER.map((mealKey) => {
            const dishes = groupedDishes[mealKey];
            if (!dishes || dishes.length === 0) return null;
            const groupOpen = !!expandedGroups[mealKey];
            const toggleGroup = () =>
              setExpandedGroups((prev) => ({ ...prev, [mealKey]: !prev[mealKey] }));

            return (
              <View key={mealKey} style={styles.mealGroup}>
                <TouchableOpacity style={styles.mealHeader} onPress={toggleGroup}>
                  <View style={styles.mealHeaderTitle}>
                    {groupOpen ? <ChevronDown size={20} color="#2C3E50" /> : <ChevronRight size={20} color="#2C3E50" />}
                    <Text style={styles.mealTitle}>{GROUP_LABELS[mealKey]}</Text>
                  </View>
                  <Text style={styles.mealCount}>{dishes.length}</Text>
                </TouchableOpacity>

                {groupOpen
                  ? dishes.map((dish: RichSavedDish) => {
                      const isOpen = !!expandedDishes[dish.id];
                      const toggleDish = () =>
                        setExpandedDishes((prev) => ({ ...prev, [dish.id]: !prev[dish.id] }));
                      const ingredients = parseIngredientList(dish.ingredients);
                      const cost = numeric(dish.cost_est);
                      const restaurant =
                        numeric(dish.restaurant_cost_est) ??
                        (cost != null ? Math.round(Math.max(cost * 3.6, cost + 24) * 2) / 2 : null);
                      const savings =
                        numeric(dish.savings_est) ??
                        (restaurant != null && cost != null ? Math.max(0, Math.round((restaurant - cost) * 100) / 100) : null);
                      const instructions =
                        typeof dish.instructions === 'string' && dish.instructions.trim().length > 0
                          ? dish.instructions.trim()
                          : '';

                      return (
                        <View key={dish.id} style={styles.item}>
                          <TouchableOpacity onPress={toggleDish} style={styles.itemHeader}>
                            <View style={styles.itemTitleRow}>
                              {isOpen ? <ChevronDown size={20} color="#2C3E50" /> : <ChevronRight size={20} color="#2C3E50" />}
                              <Text style={styles.itemTitle} numberOfLines={1} ellipsizeMode="tail">
                                {dish.title}
                              </Text>
                            </View>
                            <View style={styles.itemActionCluster}>
                              <TouchableOpacity
                                onPress={() => markAsCooked(dish)}
                                disabled={markingCooked[dish.id]}
                                style={[styles.cookBtn, markingCooked[dish.id] && styles.cookBtnDisabled]}
                              >
                                {markingCooked[dish.id] ? (
                                  <ActivityIndicator size="small" color="#4ECDC4" />
                                ) : (
                                  <ChefHat size={18} color="#4ECDC4" />
                                )}
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => removeSaved(dish.id)} style={styles.unfavBtn}>
                                <BookmarkX size={18} color="#E05353" />
                              </TouchableOpacity>
                            </View>
                          </TouchableOpacity>

                          {isOpen && (
                            <View style={styles.itemBody}>
                              {(dish.cuisine_type || dish.cooking_time) && (
                                <View style={styles.metaExpanded}>
                                  {!!dish.cuisine_type && (
                                    <Text style={styles.metaTag} numberOfLines={1}>
                                      {dish.cuisine_type}
                                    </Text>
                                  )}
                                  {!!dish.cooking_time && (
                                    <View style={styles.metaTime}>
                                      <Clock size={12} color="#4ECDC4" />
                                      <Text style={styles.metaTag} numberOfLines={1}>
                                        {dish.cooking_time}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              )}

                              <View style={styles.itemStats}>
                                <Text style={styles.statBadge}>Cost ${cost != null ? cost.toFixed(2) : ''}</Text>
                                <Text style={styles.statBadge}>Out ${restaurant != null ? restaurant.toFixed(2) : ''}</Text>
                                <Text style={styles.statBadge}>Saved ${savings != null ? savings.toFixed(2) : ''}</Text>

                              </View>

                              {ingredients.length > 0 && (
                                <View style={styles.section}>
                                  <Text style={styles.sectionTitle}>Ingredients</Text>
                                  {ingredients.map((ingredient, index) => (
                                    <Text key={`${ingredient}-${index}`} style={styles.sectionText}>
                                      {ingredient}
                                    </Text>
                                  ))}
                                </View>
                              )}

                              {instructions && (
                                <View style={styles.section}>
                                  <Text style={styles.sectionTitle}>Instructions</Text>
                                  <Text style={styles.sectionText}>{instructions}</Text>
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })
                  : null}
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E0E0E0' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#1A1A1A' },
  headerSubtitle: { fontSize: 14, color: '#666', marginTop: 2 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 },
  mealGroup: { marginBottom: 20 },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: '#E1E8ED',
    borderRadius: 12,
    backgroundColor: '#F7F9FB',
    marginBottom: 8,
  },
  mealHeaderTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealTitle: { fontSize: 16, fontWeight: '700', color: '#2C3E50' },
  mealCount: { fontSize: 12, fontWeight: '700', color: '#4ECDC4' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40, marginTop: 80 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#1A1A1A', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  item: { borderWidth: 2, borderColor: '#E1E8ED', borderRadius: 14, backgroundColor: '#FFF', marginBottom: 14, overflow: 'hidden' },
  itemHeader: { paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 8 },
  itemTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#2C3E50' },
  itemActionCluster: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cookBtn: { padding: 6, borderWidth: 2, borderColor: '#B7EFE9', backgroundColor: '#F2FFFD', borderRadius: 10 },
  cookBtnDisabled: { opacity: 0.6 },
  unfavBtn: { padding: 6, borderWidth: 2, borderColor: '#F3B1B1', backgroundColor: '#FFF5F5', borderRadius: 10 },
  itemBody: { paddingHorizontal: 16, paddingBottom: 14 },
  metaExpanded: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  metaTag: { fontSize: 12, color: '#4ECDC4', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  metaTime: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  statBadge: {
    borderWidth: 1,
    borderColor: '#E1E8ED',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    color: '#2C3E50',
    fontWeight: '700',
    fontSize: 12,
    backgroundColor: '#F7F9FB',
  },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#2C3E50', marginBottom: 6 },
  sectionText: { fontSize: 14, color: '#2C3E50', lineHeight: 20 },
});
