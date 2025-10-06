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
  // Produce now includes common fruits
  Produce: [
    'Tomatoes', 'Onions', 'Bell Peppers', 'Spinach', 'Garlic',
    'Apples', 'Bananas', 'Strawberries', 'Blueberries', 'Grapes',
    'Oranges', 'Lemons', 'Limes', 'Avocado', 'Cucumbers',
    'Carrots', 'Broccoli', 'Mushrooms', 'Zucchini', 'Kale',
  ],
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
  Pasta: PASTAS,
  Equipment: EQUIPMENT,
  Grains: DEFAULTS.Grains,
  Breads: DEFAULTS.Breads,
  'Sauces/Condiments': DEFAULTS['Sauces/Condiments'],
  Dairy: DEFAULTS.Dairy,
  'Non-Perishable Items': DEFAULTS['Non-Perishable Items'],
};

const SECTION_KEYS = Object.keys(KNOWN_MAP) as (keyof typeof KNOWN_MAP)[];
// Render order for a more natural flow
const RENDER_KEYS: (keyof typeof KNOWN_MAP)[] = [
  'Produce',
  'Proteins',
  'Pasta',
  'Grains',
  'Breads',
  'Sauces/Condiments',
  'Dairy',
  'Seasonings',
  'Non-Perishable Items',
  'Equipment',
];

// Cross-section weighting for suggestions
const WEIGHTS: Record<string, string[]> = {
  Produce: ['Sauces/Condiments', 'Seasonings', 'Dairy', 'Breads', 'Grains', 'Pasta', 'Proteins'],
  Proteins: ['Sauces/Condiments', 'Seasonings', 'Dairy', 'Grains', 'Breads', 'Pasta', 'Produce'],
  Pasta: ['Sauces/Condiments', 'Seasonings', 'Dairy', 'Proteins', 'Produce', 'Breads', 'Grains'],
  Grains: ['Proteins', 'Sauces/Condiments', 'Seasonings', 'Produce', 'Breads', 'Pasta', 'Dairy'],
  Breads: ['Proteins', 'Sauces/Condiments', 'Dairy', 'Produce', 'Seasonings'],
  'Sauces/Condiments': ['Produce', 'Proteins', 'Seasonings', 'Dairy', 'Breads'],
  Dairy: ['Produce', 'Proteins', 'Breads', 'Pasta', 'Seasonings'],
  Seasonings: ['Produce', 'Proteins', 'Sauces/Condiments', 'Dairy', 'Pasta'],
  'Non-Perishable Items': ['Pasta', 'Grains', 'Sauces/Condiments', 'Seasonings'],
  Equipment: [],
};

export default function LibraryScreen() {
  const { user } = useAuth();

  const [data, setData] = useState<Record<string, string[]>>({
    Seasonings: [],
    Produce: [],
    Proteins: [],
    Pasta: [],
    Equipment: [],
    Grains: [],
    Breads: [],
    'Sauces/Condiments': [],
    Dairy: [],
    'Non-Perishable Items': [],
  });
  // Track items that should remain visible even if deselected (e.g., custom additions)
  const [extras, setExtras] = useState<Record<string, string[]>>({
    Seasonings: [],
    Produce: [],
    Proteins: [],
    Pasta: [],
    Equipment: [],
    Grains: [],
    Breads: [],
    'Sauces/Condiments': [],
    Dairy: [],
    'Non-Perishable Items': [],
  });

  // Track expanded/collapsed state for "Add more items" per section
  const [expandedMore, setExpandedMore] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const [inputs, setInputs] = useState<Record<string, string>>({
    Seasonings: '',
    Produce: '',
    Proteins: '',
    Pasta: '',
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
          Pasta: lib.pastas || [],
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
        Pasta: oldSel?.pastas || [],
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

  const toggleDefaultItem = (section: string, item: string) => {
    const has = (data[section] || []).includes(item);
    if (has) {
      removeItem(section, item);
    } else {
      const current = new Set([...(data[section] || [])]);
      current.add(item);
      persist({ ...data, [section]: Array.from(current).sort() });
    }
  };

  const defaultListFor = (section: string) => {
    const fromDefaults = (DEFAULTS as any)[section] as string[] | undefined;
    if (fromDefaults && fromDefaults.length) return fromDefaults;
    const known = KNOWN_MAP[section] || [];
    return known.slice(0, 5);
  };

  const addItem = (section: string) => {
    const value = (inputs[section] || '').trim();
    if (!value) return;
    // text-only validation
    const clean = value.replace(/\s+/g, ' ').replace(/[^\p{L}\p{N}\s&\-']/gu, '').trim();
    const toAdd = capitalize(clean);
    // mark as selected
    const current = new Set([...(data[section] || [])]);
    current.add(toAdd);
    // keep visible even if later deselected
    const ex = new Set([...(extras[section] || [])]);
    ex.add(toAdd);
    setExtras({ ...extras, [section]: uniqueSorted(Array.from(ex)) });
    const updated = { ...data, [section]: Array.from(current).sort() };
    setInputs({ ...inputs, [section]: '' });
    persist(updated);
  };

  const removeItem = (section: string, item: string) => {
    const arr = (data[section] || []).filter((x) => x !== item);
    persist({ ...data, [section]: arr });
  };

  const toggleSelectedChip = (section: string, item: string) => {
    const has = (data[section] || []).includes(item);
    // ensure item is tracked in extras so it remains visible
    const ex = new Set([...(extras[section] || [])]);
    ex.add(item);
    setExtras({ ...extras, [section]: uniqueSorted(Array.from(ex)) });
    if (has) {
      removeItem(section, item);
    } else {
      const current = new Set([...(data[section] || [])]);
      current.add(item);
      persist({ ...data, [section]: Array.from(current).sort() });
    }
  };

  const suggestions = (section: string) => {
    const known = KNOWN_MAP[section] || [];
    const q = (inputs[section] || '').toLowerCase().trim();
    if (!q) return [] as string[];
    // include defaults for that section too
    const base = new Set([...(known || []), ...((DEFAULTS as any)[section] || [])]);
    const norm = (s: string) => (s || '').trim();
    const selectedLower = new Set((data[section] || []).map((s) => norm(s).toLowerCase()));
    const seenLower = new Set<string>();
    const out: string[] = [];
    for (const k of Array.from(base)) {
      const lower = norm(k).toLowerCase();
      if (!lower.includes(q)) continue;
      if (selectedLower.has(lower)) continue; // hide if already selected
      if (seenLower.has(lower)) continue; // de-dup
      seenLower.add(lower);
      out.push(capitalize(norm(k)));
      if (out.length >= 6) break;
    }
    return out;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Library</Text>
        <Text style={styles.headerSubtitle}>Manage your ingredients. Add/Remove items at any time and remember to save your library when finished.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {RENDER_KEYS.map((section) => (
          <View key={section} style={styles.section}>
            <Text style={styles.sectionTitle}>{section}</Text>
            <View style={styles.itemsGrid}>
              {uniqueSorted([...
                (((DEFAULTS as any)[section] as string[]) || []),
                ...((extras[section] as string[]) || []),
                ...((data[section] as string[]) || []),
              ]).map((item) => {
                const selected = (data[section] || []).includes(item);
                return (
                  <TouchableOpacity key={item} style={[styles.itemChip, selected && styles.defaultChipSelected]} onPress={() => toggleSelectedChip(section, item)}>
                    <Text style={[styles.itemText, selected && styles.defaultChipTextSelected]}>{item}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Add more items */}
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownHeaderText}>Add more items</Text>
            </View>
            <View style={styles.defaultsGrid}>
              {moreListFor(section, data[section]).map((item) => {
                const selected = (data[section] || []).includes(item);
                return (
                  <TouchableOpacity
                    key={item}
                    onPress={() => toggleSelectedChip(section, item)}
                    style={[styles.defaultChip, selected && styles.defaultChipSelected]}
                  >
                    <Text style={[styles.defaultChipText, selected && styles.defaultChipTextSelected]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.addRow}>
              <TextInput
                style={styles.input}
                placeholder={`Type to add more to ${section}`}
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
                    onPress={() => {
                      const current = new Set([...(data[section] || [])]);
                      current.add(s);
                      const ex = new Set([...(extras[section] || [])]);
                      ex.add(s);
                      setExtras({ ...extras, [section]: uniqueSorted(Array.from(ex)) });
                      persist({ ...data, [section]: Array.from(current).sort() });
                      setInputs({ ...inputs, [section]: '' });
                    }}
                    style={styles.suggestionChip}
                  >
                    <Text style={styles.suggestionText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ))}

        <View style={{ height: 16 }} />
        <TouchableOpacity
          style={[styles.primary, saving && { opacity: 0.7 }]}
          disabled={saving}
          onPress={async () => {
            try {
              setSaving(true);
              // Persist exactly what the user selected (allow empty sections)
              if (user) {
                await safeUpsertLibrary(user.id, data);
              }
              Alert.alert('Saved', 'Your Library has been saved.');
            } catch (e) {
              console.error('Save library error', e);
              Alert.alert('Error', 'Could not save your Library. Please try again.');
            } finally {
              setSaving(false);
            }
          }}
        >
          <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Save My Library'}</Text>
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

function uniqueSorted(arr: string[]) {
  return Array.from(new Set(arr.map(capitalize))).sort();
}

// Heuristic relocation rules for new categories
function normalizeAndRelocate(src: Record<string, string[]>) {
  const out: Record<string, string[]> = {
    Seasonings: uniqueSorted(src.Seasonings || []),
    Produce: uniqueSorted(src.Produce || []),
    Proteins: uniqueSorted(src.Proteins || []),
    Pasta: uniqueSorted(src.Pasta || []),
    Equipment: uniqueSorted(src.Equipment || []),
    Grains: uniqueSorted(src.Grains || []),
    Breads: uniqueSorted(src.Breads || []),
    'Sauces/Condiments': uniqueSorted(src['Sauces/Condiments'] || []),
    Dairy: uniqueSorted(src.Dairy || []),
    'Non-Perishable Items': uniqueSorted(src['Non-Perishable Items'] || []),
  };

  // Move sauces/condiments from Seasonings if present
  const sauceKeywords = ['ketchup','mustard','mayo','mayonnaise','soy','sriracha','hot sauce','bbq','barbecue','teriyaki','vinegar','relish'];
  out['Sauces/Condiments'] = uniqueSorted([
    ...out['Sauces/Condiments'],
    ...out.Seasonings.filter((i) => includesAny(i, sauceKeywords)),
  ]);
  out.Seasonings = out.Seasonings.filter((i) => !includesAny(i, sauceKeywords));

  // Split some grains from Pasta & Grains if misfiled
  const grainKeywords = ['rice','quinoa','oats','barley','farro','millet','buckwheat'];
  out.Grains = uniqueSorted([...out.Grains, ...out.Pasta.filter((i) => includesAny(i, grainKeywords))]);
  out.Pasta = out.Pasta.filter((i) => !includesAny(i, grainKeywords));

  // Move breads if present in grains/pastas by mistake
  const breadKeywords = ['bread','tortilla','pita','baguette','bun','roll','naan'];
  out.Breads = uniqueSorted([...out.Breads, ...out.Pasta.filter((i) => includesAny(i, breadKeywords))]);
  out.Pasta = out.Pasta.filter((i) => !includesAny(i, breadKeywords));

  // Dairy from produce/seasonings if misfiled
  const dairyKeywords = ['milk','cheese','butter','yogurt','cream'];
  out.Dairy = uniqueSorted([...out.Dairy, ...out.Produce.filter((i) => includesAny(i, dairyKeywords))]);
  out.Produce = out.Produce.filter((i) => !includesAny(i, dairyKeywords));

  // Non-perishables: basic heuristic
  const nonPerishKeywords = ['canned','broth','stock','peanut butter','jar'];
  out['Non-Perishable Items'] = uniqueSorted([
    ...out['Non-Perishable Items'],
    ...out.Produce.filter((i) => includesAny(i, nonPerishKeywords)),
  ]);
  out.Produce = out.Produce.filter((i) => !includesAny(i, nonPerishKeywords));

  return out;
}

function includesAny(text: string, set: string[]) {
  const t = text.toLowerCase();
  return set.some((k) => t.includes(k));
}

function fillDefaults(current: Record<string, string[]>) {
  const next = { ...current };
  for (const [section, def] of Object.entries(DEFAULTS)) {
    if ((next as any)[section] && (next as any)[section].length === 0) {
      (next as any)[section] = def.slice();
    }
  }
  if (next.Produce.length === 0) next.Produce = DEFAULTS.Produce || KNOWN_MAP.Produce || [];
  return next;
}

// Build a list of additional ingredients to show in the "More ingredients" dropdown
function moreListFor(section: string, current: string[] = []) {
  // Only suggest items relevant to the current section
  const same = [
    ...(((KNOWN_MAP as any)[section] as string[]) || []),
    ...(((DEFAULTS as any)[section] as string[]) || []),
  ];
  const norm = (s: string) => capitalize((s || '').trim());
  const selectedLower = new Set((current || []).map((s) => norm(s).toLowerCase()));
  const seenLower = new Set<string>();
  const out: string[] = [];
  for (const it of same) {
    const c = norm(it);
    const cl = c.toLowerCase();
    if (selectedLower.has(cl)) continue; // hide if already selected
    if (seenLower.has(cl)) continue; // de-dup
    seenLower.add(cl);
    out.push(c);
  }
  return out.slice(0, 30);
}

// Ensure defaults are included for any empty section at save time
function ensureDefaultsOnSave(current: Record<string, string[]>) {
  const next: Record<string, string[]> = { ...current };
  for (const key of Object.keys(KNOWN_MAP)) {
    const k = key as keyof typeof KNOWN_MAP;
    const arr = (next as any)[k] as string[] | undefined;
    if (!arr || arr.length === 0) {
      (next as any)[k] = [
        ...((((DEFAULTS as any)[k] as string[]) || []) as string[]),
      ];
    }
  }
  return next;
}

async function safeUpsertLibrary(userId: string, updated: Record<string, string[]>) {
  const fullPayload: any = {
    user_id: userId,
    seasonings: updated.Seasonings,
    produce: updated.Produce,
    proteins: updated.Proteins,
    pastas: updated.Pasta,
    equipment: updated.Equipment,
    grains: updated.Grains,
    breads: updated.Breads,
    sauces_condiments: updated['Sauces/Condiments'],
    dairy: updated.Dairy,
    non_perishables: updated['Non-Perishable Items'],
    updated_at: new Date().toISOString(),
  };
  try {
    await supabase.from('user_library').upsert(fullPayload, { onConflict: 'user_id' });
    // Maintain legacy compatibility so older reads still see data
    await supabase.from('user_selections').upsert({
      user_id: userId,
      seasonings: updated.Seasonings,
      vegetables: updated.Produce,
      entrees: updated.Proteins,
      pastas: updated.Pasta,
      equipment: updated.Equipment,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  } catch (_) {
    await supabase.from('user_library').upsert({
      user_id: userId,
      seasonings: updated.Seasonings,
      vegetables: updated.Produce,
      proteins: updated.Proteins,
      pastas: updated.Pasta,
      equipment: updated.Equipment,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
  }
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
  dropdownHeader: { marginTop: 6, marginBottom: 6 },
  dropdownHeaderText: { color: '#2C3E50', fontSize: 14, fontWeight: '700' },
  defaultsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  defaultChip: { borderWidth: 1, borderColor: '#E1E8ED', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#FFF' },
  defaultChipSelected: { borderColor: '#4ECDC4', backgroundColor: '#EFFFFD' },
  defaultChipText: { color: '#2C3E50', fontWeight: '600' },
  defaultChipTextSelected: { color: '#0B6B64' },
  expandAll: { marginTop: 8, alignSelf: 'flex-start' },
  expandAllText: { color: '#4ECDC4', fontWeight: '800' },
  itemsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  itemChip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E1E8ED', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#FFF' },
  itemText: { color: '#2C3E50', fontWeight: '600' },
  removeText: { color: '#E53E3E', fontWeight: '800', marginLeft: 2, fontSize: 16 },
  primary: { backgroundColor: '#4ECDC4', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  primaryText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
});
