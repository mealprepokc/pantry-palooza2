import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface SavedDishRow {
  id: string;
  title: string;
  ingredients: string[] | null;
}

interface UserLibraryRow {
  seasonings?: string[];
  produce?: string[];
  proteins?: string[];
  pastas?: string[];
  equipment?: string[];
  grains?: string[];
  breads?: string[];
  sauces_condiments?: string[];
  dairy?: string[];
  non_perishables?: string[];
}

function norm(s: string) {
  return (s || '').trim().toLowerCase();
}

function simpleMatch(a: string, b: string) {
  const aa = norm(a).replace(/s\b/, '');
  const bb = norm(b).replace(/s\b/, '');
  return aa === bb || aa.includes(bb) || bb.includes(aa);
}

function groupFor(ing: string): string {
  const t = norm(ing);
  if (/milk|cheese|butter|yogurt|cream/.test(t)) return 'Dairy';
  if (/bread|tortilla|pita|baguette|bun|roll|naan/.test(t)) return 'Breads';
  if (/rice|quinoa|oats|barley|farro|pasta|noodle/.test(t)) return 'Grains & Pasta';
  if (/chicken|beef|pork|turkey|fish|salmon|shrimp|tofu|egg|lamb/.test(t)) return 'Proteins';
  if (/ketchup|mustard|mayo|soy|sauce|bbq|vinegar|relish|dressing/.test(t)) return 'Sauces/Condiments';
  if (/canned|broth|stock|jar|peanut butter/.test(t)) return 'Non-Perishable';
  if (/tomato|onion|pepper|spinach|garlic|apple|banana|berry|grape|orange|lemon|lime|avocado|cucumber|carrot|broccoli|mushroom|zucchini|kale|lettuce|potato|bean|corn/.test(t)) return 'Produce';
  return 'Other';
}

export default function ShoppingListScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [{ data: saved }, { data: lib }] = await Promise.all([
        supabase.from('saved_dishes').select('id,title,ingredients').eq('user_id', user.id),
        supabase.from('user_library').select('*').eq('user_id', user.id).maybeSingle(),
      ]);
      const library = (lib as UserLibraryRow) || {};
      const libSet = new Set<string>();
      Object.values(library).forEach((arr) => {
        if (Array.isArray(arr)) arr.forEach((x) => libSet.add(norm(x)));
      });
      const needed = new Set<string>();
      (saved as SavedDishRow[] || []).forEach((row) => {
        (row.ingredients || []).forEach((ing) => {
          const inLib = Array.from(libSet).some((l) => simpleMatch(ing, l));
          if (!inLib) needed.add(ing);
        });
      });
      const grouped: Record<string, string[]> = {};
      Array.from(needed).forEach((ing) => {
        const g = groupFor(ing);
        grouped[g] = grouped[g] || [];
        if (!grouped[g].some((x) => simpleMatch(x, ing))) grouped[g].push(ing);
      });
      // sort lists
      Object.keys(grouped).forEach((k) => grouped[k].sort());
      setMissing(grouped);
      setLoading(false);
    })();
  }, [user?.id]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  const groups = Object.keys(missing);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.headerTitle}>Shopping List</Text>
        <Text style={styles.headerSubtitle}>Items required by your Saved dishes but not in your Library.</Text>
        {groups.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>You're all set!</Text>
            <Text style={styles.emptyText}>All ingredients for your Saved dishes are in your Library.</Text>
          </View>
        ) : (
          groups.map((g) => (
            <View key={g} style={styles.section}>
              <Text style={styles.sectionTitle}>{g}</Text>
              {missing[g].map((ing) => (
                <View key={ing} style={styles.row}>
                  <Text style={styles.ing}>{ing}</Text>
                  <TouchableOpacity style={styles.buyBtn} onPress={() => { /* placeholder for affiliate */ }}>
                    <Text style={styles.buyText}>Buy</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  centerContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF' },
  content: { padding: 20 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#2C3E50' },
  headerSubtitle: { fontSize: 14, color: '#5A6C7D', marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 28 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2C3E50' },
  emptyText: { color: '#5A6C7D', marginTop: 8 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#2C3E50', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  ing: { color: '#2C3E50', fontSize: 15, fontWeight: '600', flex: 1, paddingRight: 12 },
  buyBtn: { borderWidth: 2, borderColor: '#E1E8ED', borderRadius: 12, paddingVertical: 6, paddingHorizontal: 12 },
  buyText: { color: '#2C3E50', fontWeight: '700' },
});
