import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ChevronDown, ChevronRight, Clock } from 'lucide-react-native';
import { router } from 'expo-router';

interface CookedDish {
  id: string;
  title: string;
  cuisine_type: string | null;
  cooking_time: string | null;
  ingredients: string[] | null;
  instructions: string | null;
  cooked_at: string;
  calories_est: number | null;
  cost_est: number | null;
  restaurant_cost_est: number | null;
  savings_est: number | null;
}

export default function CookedScreen() {
  const { user } = useAuth();
  const [items, setItems] = useState<CookedDish[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('cooked_dishes')
      .select('*')
      .eq('user_id', user.id)
      .order('cooked_at', { ascending: false });
    setItems((data as CookedDish[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const weekAgo = useMemo(() => new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), []);
  const monthAgo = useMemo(() => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), []);

  const within = (d: CookedDish, since: Date) => new Date(d.cooked_at) >= since;

  const week = useMemo(() => items.filter((d) => within(d, weekAgo)), [items, weekAgo]);
  const month = useMemo(() => items.filter((d) => within(d, monthAgo)), [items, monthAgo]);

  const numeric = (value: number | null | undefined) =>
    typeof value === 'number' && !Number.isNaN(value) ? value : null;

  const restaurantFor = (dish: CookedDish) => {
    const stored = numeric(dish.restaurant_cost_est);
    if (stored != null) return stored;
    const cost = numeric(dish.cost_est);
    if (cost == null) return null;
    const baseline = Math.max(cost * 2.6, cost + 14);
    return Math.round(baseline * 2) / 2;
  };

  const savingsFor = (dish: CookedDish) => {
    const stored = numeric(dish.savings_est);
    if (stored != null) return stored;
    const restaurant = restaurantFor(dish);
    const cost = numeric(dish.cost_est);
    if (restaurant == null || cost == null) return null;
    return Math.max(0, Math.round((restaurant - cost) * 100) / 100);
  };

  const sumBy = (arr: CookedDish[], getter: (dish: CookedDish) => number | null) =>
    arr.reduce((acc, dish) => {
      const v = getter(dish);
      return acc + (v != null ? v : 0);
    }, 0);

  const weekCost = sumBy(week, (d) => numeric(d.cost_est));
  const weekRestaurant = sumBy(week, restaurantFor);
  const weekSavings = sumBy(week, savingsFor);

  const monthCost = sumBy(month, (d) => numeric(d.cost_est));
  const monthRestaurant = sumBy(month, restaurantFor);
  const monthSavings = sumBy(month, savingsFor);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cooked Dishes</Text>
        <Text style={styles.headerSubtitle}>Your recent meals and quick stats</Text>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>This Week</Text>
            <Text style={styles.summaryValue}>{week.length} dishes</Text>
            <Text style={styles.summaryMeta}>At home ${weekCost.toFixed(2)} vs out ${weekRestaurant.toFixed(2)}</Text>
            <Text style={styles.summaryMeta}>Saved ${weekSavings.toFixed(2)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>This Month</Text>
            <Text style={styles.summaryValue}>{month.length} dishes</Text>
            <Text style={styles.summaryMeta}>At home ${monthCost.toFixed(2)} vs out ${monthRestaurant.toFixed(2)}</Text>
            <Text style={styles.summaryMeta}>Saved ${monthSavings.toFixed(2)}</Text>
          </View>
        </View>

        {items.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No cooked dishes yet</Text>
            <Text style={styles.emptyText}>Mark dishes as cooked to track your progress.</Text>
          </View>
        ) : (
          <View style={{ marginTop: 16 }}>
            {items.map((dish) => {
              const isOpen = !!expanded[dish.id];
              const toggle = () => setExpanded((e) => ({ ...e, [dish.id]: !e[dish.id] }));
              const ings = Array.isArray(dish.ingredients) ? dish.ingredients : [];
              return (
                <View key={dish.id} style={styles.item}>
                  <TouchableOpacity onPress={toggle} style={styles.itemHeader}>
                    <View style={styles.itemTitleRow}>
                      {isOpen ? (
                        <ChevronDown size={20} color="#2C3E50" />
                      ) : (
                        <ChevronRight size={20} color="#2C3E50" />
                      )}
                      <Text style={styles.itemTitle} numberOfLines={1}>{dish.title}</Text>
                    </View>
                    <View style={styles.itemMetaRow}>
                      {!!dish.cuisine_type && (
                        <Text style={styles.itemMeta}>{dish.cuisine_type}</Text>
                      )}
                      {!!dish.cooking_time && (
                        <View style={styles.itemTime}>
                          <Clock size={12} color="#4ECDC4" />
                          <Text style={styles.itemMeta}>{dish.cooking_time}</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                  {isOpen && (
                    <View style={styles.itemBody}>
                      <View style={styles.itemStats}>
                        <Text style={styles.statBadge}>Cost ${numeric(dish.cost_est)?.toFixed(2) ?? '—'}</Text>
                        <Text style={styles.statBadge}>Out ${restaurantFor(dish)?.toFixed(2) ?? '—'}</Text>
                        <Text style={styles.statBadge}>Saved ${savingsFor(dish)?.toFixed(2) ?? '—'}</Text>
                      </View>
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
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  content: { padding: 20 },
  backBtn: { alignSelf: 'flex-start', borderWidth: 2, borderColor: '#E1E8ED', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginBottom: 10, backgroundColor: '#FFF' },
  backText: { color: '#2C3E50', fontWeight: '700' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#2C3E50' },
  headerSubtitle: { fontSize: 14, color: '#5A6C7D', marginTop: 2 },
  summaryRow: { flexDirection: 'row', gap: 12, marginTop: 12, flexWrap: 'wrap' },
  summaryCard: { flexGrow: 1, minWidth: 160, borderWidth: 2, borderColor: '#E1E8ED', borderRadius: 14, padding: 12 },
  summaryLabel: { color: '#5A6C7D', fontWeight: '800', marginBottom: 6 },
  summaryValue: { color: '#2C3E50', fontWeight: '800', fontSize: 20 },
  summaryMeta: { color: '#4ECDC4', fontWeight: '700', marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 28 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2C3E50' },
  emptyText: { color: '#5A6C7D', marginTop: 8 },
  item: { borderWidth: 2, borderColor: '#E1E8ED', borderRadius: 14, backgroundColor: '#FFF', marginTop: 12, overflow: 'hidden' },
  itemHeader: { paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, paddingRight: 8 },
  itemTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#2C3E50' },
  itemMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  itemMeta: { fontSize: 12, color: '#4ECDC4', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  itemTime: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  itemBody: { paddingHorizontal: 16, paddingBottom: 14 },
  itemStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
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
