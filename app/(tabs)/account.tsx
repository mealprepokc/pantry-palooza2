import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { DietaryKey, DietaryPrefs } from '@/lib/dietary';
import { DIETARY_KEYS, DIETARY_LIBRARY_RECOMMENDATIONS, DIETARY_OPTIONS, sanitizeDietaryPrefs } from '@/lib/dietary';
import { router } from 'expo-router';

type LibraryRow = {
  seasonings?: string[] | null;
  produce?: string[] | null;
  vegetables?: string[] | null;
  proteins?: string[] | null;
  entrees?: string[] | null;
  pastas?: string[] | null;
  equipment?: string[] | null;
  grains?: string[] | null;
  breads?: string[] | null;
  sauces_condiments?: string[] | null;
  dairy?: string[] | null;
  non_perishables?: string[] | null;
};

type NormalizedLibrary = {
  seasonings: string[];
  produce: string[];
  proteins: string[];
  pastas: string[];
  equipment: string[];
  grains: string[];
  breads: string[];
  sauces_condiments: string[];
  dairy: string[];
  non_perishables: string[];
};

const SECTION_COLUMN_MAP: Record<string, keyof NormalizedLibrary> = {
  Seasonings: 'seasonings',
  Produce: 'produce',
  Proteins: 'proteins',
  Pasta: 'pastas',
  Grains: 'grains',
  Breads: 'breads',
  'Sauces/Condiments': 'sauces_condiments',
  Dairy: 'dairy',
  'Non-Perishable Items': 'non_perishables',
};

const formatItem = (value: string): string => {
  const clean = String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!clean) return '';
  return clean
    .split(' ')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : part))
    .join(' ');
};

const uniqueSorted = (items: string[]): string[] => {
  return Array.from(new Set(items.map(formatItem))).filter(Boolean).sort((a, b) => a.localeCompare(b));
};

const buildLibraryPayload = (row: LibraryRow | null | undefined): NormalizedLibrary => {
  const base = row ?? {};
  return {
    seasonings: uniqueSorted([...(base.seasonings ?? [])]),
    produce: uniqueSorted([...(base.produce ?? base.vegetables ?? [])]),
    proteins: uniqueSorted([...(base.proteins ?? base.entrees ?? [])]),
    pastas: uniqueSorted([...(base.pastas ?? [])]),
    equipment: uniqueSorted([...(base.equipment ?? [])]),
    grains: uniqueSorted([...(base.grains ?? [])]),
    breads: uniqueSorted([...(base.breads ?? [])]),
    sauces_condiments: uniqueSorted([...(base.sauces_condiments ?? [])]),
    dairy: uniqueSorted([...(base.dairy ?? [])]),
    non_perishables: uniqueSorted([...(base.non_perishables ?? [])]),
  };
};

const ensureLibraryCoverage = async (userId: string, prefs: DietaryPrefs) => {
  const active = DIETARY_KEYS.filter((key) => prefs[key]);
  if (active.length === 0) return;

  try {
    const { data } = await supabase
      .from('user_library')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const payload = buildLibraryPayload(data as LibraryRow | null | undefined);

    active.forEach((key) => {
      const recommendations = DIETARY_LIBRARY_RECOMMENDATIONS[key];
      if (!recommendations) return;
      Object.entries(recommendations).forEach(([section, items]) => {
        if (!items || items.length === 0) return;
        const column = SECTION_COLUMN_MAP[section];
        if (!column) return;
        const current = payload[column];
        payload[column] = uniqueSorted([...current, ...items.map(formatItem)]);
      });
    });

    const nowIso = new Date().toISOString();
    const upsertPayload = {
      user_id: userId,
      seasonings: payload.seasonings,
      produce: payload.produce,
      proteins: payload.proteins,
      pastas: payload.pastas,
      equipment: payload.equipment,
      grains: payload.grains,
      breads: payload.breads,
      sauces_condiments: payload.sauces_condiments,
      dairy: payload.dairy,
      non_perishables: payload.non_perishables,
      updated_at: nowIso,
    } as const;

    await supabase.from('user_library').upsert(upsertPayload, { onConflict: 'user_id' });

    await supabase.from('user_selections').upsert({
      user_id: userId,
      seasonings: upsertPayload.seasonings,
      vegetables: upsertPayload.produce,
      entrees: upsertPayload.proteins,
      pastas: upsertPayload.pastas,
      equipment: upsertPayload.equipment,
      updated_at: nowIso,
    }, { onConflict: 'user_id' });
  } catch (error) {
    console.warn('Failed to ensure dietary library coverage', error);
  }
};

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const [strictMode, setStrictMode] = useState(false);
  const [dietary, setDietary] = useState<DietaryPrefs>(sanitizeDietaryPrefs({}));
  const [saving, setSaving] = useState(false);
  const [shoppingMissingCount, setShoppingMissingCount] = useState(0);
  const noneSelected = DIETARY_KEYS.every((key) => !dietary[key]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('account_prefs')
        .select('strict_mode, dietary')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setStrictMode(!!data.strict_mode);
        setDietary(sanitizeDietaryPrefs(data.dietary));
      }
    })();
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: saved }, { data: lib }] = await Promise.all([
        supabase.from('saved_dishes').select('ingredients').eq('user_id', user.id),
        supabase.from('user_library').select('*').eq('user_id', user.id).maybeSingle(),
      ]);
      const library = (lib as any) || {};
      const libSet = new Set<string>();
      Object.values(library).forEach((arr: any) => {
        if (Array.isArray(arr)) arr.forEach((x: string) => libSet.add(String(x || '').trim().toLowerCase()));
      });
      const norm = (s: string) => String(s || '').trim().toLowerCase();
      const simpleMatch = (a: string, b: string) => {
        const aa = norm(a).replace(/s\b/, '');
        const bb = norm(b).replace(/s\b/, '');
        return aa === bb || aa.includes(bb) || bb.includes(aa);
      };
      const needed = new Set<string>();
      (saved as any[] || []).forEach((row) => {
        (row.ingredients || []).forEach((ing: string) => {
          const inLib = Array.from(libSet).some((l) => simpleMatch(ing, l));
          if (!inLib) needed.add(ing);
        });
      });
      setShoppingMissingCount(needed.size);
    })();
  }, [user?.id]);

  const toggleDietary = (key: DietaryKey) => {
    setDietary((current) => {
      const next = { ...current, [key]: !current[key] } as DietaryPrefs;
      if (!next[key]) {
        delete next[key];
      }
      return next;
    });
  };

  const save = async () => {
    if (!user) return;
    try {
      setSaving(true);
      const clean = sanitizeDietaryPrefs(dietary);
      await supabase.from('account_prefs').upsert({
        user_id: user.id,
        strict_mode: strictMode,
        dietary: clean,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
      await ensureLibraryCoverage(user.id, clean);
      Alert.alert('Saved', 'Your preferences have been saved.');
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Account</Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dish Creation Mode</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Strict mode</Text>
            <Switch value={strictMode} onValueChange={setStrictMode} />
          </View>
          <Text style={styles.helper}>
            Strict uses only your Library items plus pantry staples. Loose prefers your Library but allows reasonable additions.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dietary Restrictions</Text>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>None (default)</Text>
            <Switch
              value={noneSelected}
              onValueChange={(value) => {
                if (value) {
                  setDietary({});
                }
              }}
            />
          </View>
          <Text style={styles.helper}>Leave "None" selected to keep your full Library available.</Text>
          {DIETARY_OPTIONS.map(({ key, label, helper }) => (
            <View key={key} style={styles.prefRow}>
              <View style={styles.prefTextGroup}>
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.prefHelper}>{helper}</Text>
              </View>
              <Switch value={!!dietary[key]} onValueChange={() => toggleDietary(key)} />
            </View>
          ))}
          <Text style={styles.helper}>Selected preferences hide conflicting library items and add a few starter staples automatically.</Text>
        </View>

        <TouchableOpacity style={[styles.primary, saving && { opacity: 0.7 }]} disabled={saving} onPress={save}>
          <Text style={styles.primaryText}>{saving ? 'Saving…' : 'Save Preferences'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondary} onPress={() => router.push('/cooked' as any)}>
          <Text style={styles.secondaryText}>View Cooked Dishes</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondary} onPress={() => router.push('/shopping-list' as any)}>
          <Text style={styles.secondaryText}>View Shopping List{shoppingMissingCount > 0 ? ` (${shoppingMissingCount})` : ''}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondary} onPress={() => router.push('/subscriptions' as any)}>
          <Text style={styles.secondaryText}>Subscriptions</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondary} onPress={() => router.push('/faq' as any)}>
          <Text style={styles.secondaryText}>FAQ</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.secondary, styles.logout]} onPress={signOut}>
          <Text style={[styles.secondaryText, styles.logoutText]}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#2C3E50', marginBottom: 12 },
  card: { borderWidth: 2, borderColor: '#E1E8ED', borderRadius: 14, backgroundColor: '#FFF', padding: 16, marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#2C3E50', marginBottom: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  label: { color: '#2C3E50', fontSize: 15, fontWeight: '600' },
  helper: { color: '#5A6C7D', fontSize: 12, marginTop: 6 },
  prefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F4F6' },
  prefTextGroup: { flex: 1, paddingRight: 16 },
  prefHelper: { color: '#5A6C7D', fontSize: 12, marginTop: 4 },
  primary: { backgroundColor: '#4ECDC4', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  primaryText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  secondary: { borderWidth: 2, borderColor: '#E1E8ED', backgroundColor: '#FFF', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  secondaryText: { color: '#2C3E50', fontSize: 15, fontWeight: '700' },
  logout: { borderColor: '#FFE1D6', backgroundColor: '#FFF4ED' },
  logoutText: { color: '#FF6B35' },
});
