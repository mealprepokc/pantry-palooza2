import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { useAlerts } from '@/contexts/AlertContext';

interface SavedDishRow {
  id: string;
  title: string;
  ingredients: string[] | null;
  suggested_sides: string[] | null;
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

const INGREDIENT_KEYS = ['name', 'title', 'text', 'label', 'ingredient', 'value'] as const;

function toIngredientString(raw: unknown): string {
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      const str = toIngredientString(entry);
      if (str) return str;
    }
    return '';
  }
  if (typeof raw === 'object') {
    for (const key of INGREDIENT_KEYS) {
      const candidate = (raw as Record<string, unknown>)[key];
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate;
      }
    }
    return '';
  }
  return String(raw);
}

function stripMeasurement(rawIng: unknown): string {
  const ing = toIngredientString(rawIng);
  if (!ing) return '';
  const withoutBullet = ing.replace(/^[•\-\*\s]+/, '').trim();
  const withoutMeasure = withoutBullet
    .replace(/^[\d\s\/,.-]+(cups?|cup|tablespoons?|tbsp|teaspoons?|tsp|oz|ounce|ounces?|grams?|g|ml|milliliters?|l|liters?|lbs?|pounds?|kg|kilograms?|pinch|cloves?|cans?|pieces?|slices?|heads?|bunch(?:es)?|sticks?|dash|sprigs?|ears?|fillets?|filets?|packages?|pkgs?|bags?|handfuls?|bunches?|links?|strips?|stalks?|leaves?)?\.?\s*/i, '')
    .trim();
  const noParens = withoutMeasure.replace(/\([^)]*\)/g, '').trim();
  const primary = noParens.split(/[;,]/)[0]?.trim() || '';
  const descriptorSet = new Set([
    'chopped',
    'fresh',
    'finely',
    'coarsely',
    'roughly',
    'diced',
    'minced',
    'sliced',
    'shredded',
    'grated',
    'optional',
    'softened',
    'peeled',
    'seeded',
    'halved',
    'quartered',
    'divided',
    'plus',
    'more',
    'serving',
    'servings',
    'taste',
    'room',
    'temperature',
    'warm',
    'cold',
    'extra',
    'virgin',
    'drained',
    'rinsed',
    'patted',
    'dry',
    'small',
    'medium',
  ]);

  const words = primary.split(/\s+/).filter(Boolean);
  const filtered: string[] = [];
  words.forEach((word) => {
    const lower = word.toLowerCase();
    if (descriptorSet.has(lower)) {
      return;
    }
    filtered.push(word);
  });

  const cleaned = filtered.join(' ').trim();
  if (cleaned) return cleaned;

  const fallback = words.length > 0 ? words[words.length - 1] : '';
  return fallback || primary || withoutMeasure || withoutBullet || ing;
}

function formatIngredientName(ing: string): string {
  const clean = String(ing || '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!clean) return '';
  return clean
    .split(' ')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part))
    .join(' ');
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
  const { pendingShopping, markShoppingSeen } = useAlerts();
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const [{ data: saved }, { data: lib }] = await Promise.all([
        supabase
          .from('saved_dishes')
          .select('id,title,ingredients,suggested_sides')
          .eq('user_id', user.id),
        supabase.from('user_library').select('*').eq('user_id', user.id).maybeSingle(),
      ]);
      const library = (lib as UserLibraryRow) || {};
      const libSet = new Set<string>();
      Object.values(library).forEach((arr) => {
        if (Array.isArray(arr)) arr.forEach((x) => libSet.add(norm(x)));
      });
      const needed = new Map<string, string>();
      const appendIfNeeded = (rawIng: unknown) => {
        const baseName = stripMeasurement(rawIng);
        const normalizedKey = norm(baseName);
        if (!normalizedKey) return;
        const pretty = formatIngredientName(baseName);
        if (!pretty) return;
        const inLib = Array.from(libSet).some((l) => simpleMatch(baseName, l));
        if (inLib) return;
        const alreadyTracked = Array.from(needed.keys()).some((key) => simpleMatch(baseName, key));
        if (alreadyTracked) return;
        needed.set(normalizedKey, pretty);
      };

      ((saved as SavedDishRow[]) || []).forEach((row) => {
        (row.ingredients || []).forEach(appendIfNeeded);
        (row.suggested_sides || []).forEach(appendIfNeeded);
      });
      const grouped: Record<string, string[]> = {};
      Array.from(needed.values()).forEach((ing) => {
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

  useEffect(() => {
    if (pendingShopping) {
      markShoppingSeen();
    }
  }, [pendingShopping, markShoppingSeen]);

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
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
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
  backBtn: { alignSelf: 'flex-start', borderWidth: 2, borderColor: '#E1E8ED', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginBottom: 10, backgroundColor: '#FFF' },
  backText: { color: '#2C3E50', fontWeight: '700' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#2C3E50' },
  headerSubtitle: { fontSize: 14, color: '#5A6C7D', marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 28 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2C3E50' },
  emptyText: { color: '#5A6C7D', marginTop: 8 },
  section: { marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#2C3E50', marginBottom: 8 },
  row: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EEE' },
  ing: { color: '#2C3E50', fontSize: 15, fontWeight: '600' },
});
