import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { SEASONINGS, VEGETABLES, ENTREES, PASTAS, EQUIPMENT } from '@/constants/ingredients';

// Library screen MVP: manage user's ingredient library with simple add/remove and type-ahead suggestions.

// Defaults for new sections
const DEFAULTS = {
  Produce: ['Tomatoes', 'Onions', 'Bell Peppers', 'Spinach', 'Garlic'],
  Grains: ['Rice', 'Quinoa', 'Oats', 'Barley', 'Farro'],
  Breads: ['Sandwich Bread', 'Tortillas', 'Pita', 'Baguette', 'Hamburger Buns'],
  'Sauces/Condiments': ['Ketchup', 'Mustard', 'Mayonnaise', 'Soy Sauce', 'Hot Sauce'],
  Dairy: ['Milk', 'Cheese', 'Butter', 'Yogurt', 'Cream'],
  'Non-Perishable Items': ['Canned Beans', 'Canned Tomatoes', 'Broth', 'Peanut Butter', 'Pasta Sauce'],
};

const KNOWN_MAP: Record<string, string[]> = {
  Seasonings: SEASONINGS,
  Produce: VEGETABLES, // rename of Vegetables
  Proteins: ENTREES,
  'Pasta & Grains': PASTAS,
  Equipment: EQUIPMENT,
  Grains: DEFAULTS.Grains,
  Breads: DEFAULTS.Breads,
  'Sauces/Condiments': DEFAULTS['Sauces/Condiments'],
  Dairy: DEFAULTS.Dairy,
  'Non-Perishable Items': DEFAULTS['Non-Perishable Items'],
};

const SECTION_KEYS = Object.keys(KNOWN_MAP) as (keyof typeof KNOWN_MAP)[];

export default function LibraryScreen() {
  const { user } = useAuth();

  const [data, setData] = useState<Record<string, string[]>>({
    Seasonings: [],
    Produce: [],
    Proteins: [],
    'Pasta & Grains': [],
    Equipment: [],
    Grains: [],
    Breads: [],
    'Sauces/Condiments': [],
    Dairy: [],
    'Non-Perishable Items': [],
  });

  const [inputs, setInputs] = useState<Record<string, string>>({
    Seasonings: '',
    Produce: '',
    Proteins: '',
    'Pasta & Grains': '',
    Equipment: '',
    Grains: '',
    Breads: '',
    'Sauces/Condiments': '',
    Dairy: '',
    'Non-Perishable Items': '',
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Load from user_library if exists; else try migrate from user_selections (one-time)
      const { data: lib } = await supabase
        .from('user_library')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (lib) {
        // Map old -> new; relocate items into new categories heuristically
        const mapped = normalizeAndRelocate({
          Seasonings: lib.seasonings || [],
          Produce: lib.produce || lib.vegetables || [],
          Proteins: lib.proteins || lib.entrees || [],
          'Pasta & Grains': lib.pastas || [],
          Equipment: lib.equipment || [],
          Grains: lib.grains || [],
          Breads: lib.breads || [],
          'Sauces/Condiments': lib.sauces_condiments || [],
          Dairy: lib.dairy || [],
          'Non-Perishable Items': lib.non_perishables || [],
        });
        setData(fillDefaults(mapped));
        return;
      }

      // Try migration
      const { data: oldSel } = await supabase
        .from('user_selections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      const migrated = normalizeAndRelocate({
        Seasonings: oldSel?.seasonings || [],
        Produce: oldSel?.vegetables || [],
        Proteins: oldSel?.entrees || [],
        'Pasta & Grains': oldSel?.pastas || [],
        Equipment: oldSel?.equipment || [],
        Grains: [],
        Breads: [],
        'Sauces/Condiments': [],
        Dairy: [],
        'Non-Perishable Items': [],
      });
      const withDefaults = fillDefaults(migrated);
      setData(withDefaults);

      // Persist new library row (guard if columns missing)
      await safeUpsertLibrary(user.id, withDefaults);
    })();
  }, [user]);

  const persist = async (updated: typeof data) => {
    setData(updated);
    if (!user) return;
    await safeUpsertLibrary(user.id, updated);
  };

  const addItem = (section: string) => {
    const value = (inputs[section] || '').trim();
    if (!value) return;
    // text-only validation
    const clean = value.replace(/\s+/g, ' ').replace(/[^\p{L}\p{N}\s&\-']/gu, '').trim();
    const current = new Set([...(data[section] || [])]);
    current.add(capitalize(clean));
    const updated = { ...data, [section]: Array.from(current).sort() };
    setInputs({ ...inputs, [section]: '' });
    persist(updated);
  };

  const removeItem = (section: string, item: string) => {
    const arr = (data[section] || []).filter((x) => x !== item);
    persist({ ...data, [section]: arr });
  };

  const suggestions = (section: string) => {
    const known = KNOWN_MAP[section] || [];
    const q = (inputs[section] || '').toLowerCase().trim();
    if (!q) return [] as string[];
    // include defaults for that section too
    const base = new Set([...(known || []), ...((DEFAULTS as any)[section] || [])]);
    return Array.from(base)
      .filter((k) => k.toLowerCase().includes(q))
      .slice(0, 6);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Library</Text>
        <Text style={styles.headerSubtitle}>Manage your ingredients. Add custom items any time.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {SECTION_KEYS.map((section) => (
          <View key={section} style={styles.section}>
            <Text style={styles.sectionTitle}>{section}</Text>
            <View style={styles.addRow}>
              <TextInput
                style={styles.input}
                placeholder={`Add to ${section}`}
                value={inputs[section]}
                onChangeText={(t) => setInputs({ ...inputs, [section]: t })}
                autoCapitalize="words"
                autoCorrect
              />
              <TouchableOpacity style={styles.addButton} onPress={() => addItem(section)}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            {suggestions(section).length > 0 && (
              <View style={styles.suggestions}>
                {suggestions(section).map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setInputs({ ...inputs, [section]: s })}
                    style={styles.suggestionChip}
                  >
                    <Text style={styles.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.itemsGrid}>
              {(data[section] || []).map((item) => (
                <View key={item} style={styles.itemChip}>
                  <Text style={styles.itemText}>{item}</Text>
                  <TouchableOpacity onPress={() => removeItem(section, item)}>
                    <Text style={styles.removeText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={{ height: 16 }} />
        <TouchableOpacity
          style={styles.primary}
          onPress={() => router.push('/(tabs)')}
        >
          <Text style={styles.primaryText}>Use My Library</Text>
        </TouchableOpacity>
        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function capitalize(s: string) {
  if (!s) return s;
  return s
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#2C3E50' },
  headerSubtitle: { fontSize: 14, color: '#5A6C7D', marginTop: 4 },
  content: { padding: 20 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#2C3E50', marginBottom: 8 },
  addRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { flex: 1, borderWidth: 2, borderColor: '#E1E8ED', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  addButton: { backgroundColor: '#FF6B35', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  addButtonText: { color: '#FFF', fontWeight: '800' },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  suggestionChip: { borderWidth: 1, borderColor: '#E1E8ED', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#FFF' },
  suggestionText: { color: '#2C3E50', fontSize: 14, fontWeight: '600' },
  itemsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  itemChip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E1E8ED', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#FFF' },
  itemText: { color: '#2C3E50', fontWeight: '600' },
  removeText: { color: '#E53E3E', fontWeight: '800', marginLeft: 2, fontSize: 16 },
  primary: { backgroundColor: '#4ECDC4', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
