import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { DietaryKey, DietaryPrefs } from '@/lib/dietary';
import {
  DIETARY_FEATURE_ENABLED,
  DIETARY_KEYS,
  DIETARY_LIBRARY_RECOMMENDATIONS,
  DIETARY_OPTIONS,
  sanitizeDietaryPrefs,
} from '@/lib/dietary';
import { router } from 'expo-router';
import { useAlerts } from '@/contexts/AlertContext';

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

const norm = (value: string) => String(value || '').trim().toLowerCase();

const simpleMatch = (a: string, b: string) => {
  const aa = norm(a).replace(/s\b/, '');
  const bb = norm(b).replace(/s\b/, '');
  return aa === bb || aa.includes(bb) || bb.includes(aa);
};

const stripMeasurement = (ing: string): string => {
  if (!ing) return '';
  const withoutBullet = ing.replace(/^[•\-\*\s]+/, '').trim();
  const withoutMeasure = withoutBullet
    .replace(/^[\d\s\/,.-]+(cups?|cup|tablespoons?|tbsp|teaspoons?|tsp|oz|ounce|ounces?|grams?|g|ml|milliliters?|l|liters?|lbs?|pounds?|kg|kilograms?|pinch|cloves?|cans?|pieces?|slices?|heads?|bunch(?:es)?|sticks?|dash|sprigs?|ears?|fillets?|filets?|packages?|pkgs?|bags?|handfuls?|bunches?|links?|strips?|stalks?|leaves?)?\.?\s*/i, '')
    .trim();
  const noParens = withoutMeasure.replace(/\([^)]*\)/g, '').trim();
  const primary = noParens.split(/[;,]/)[0]?.trim() || '';
  if (!primary) return withoutMeasure || withoutBullet || ing;

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

export default function AccountScreen() {
  const { user, signOut } = useAuth();
  const userId = user?.id ?? null;
  const [dietary, setDietary] = useState<DietaryPrefs>(DIETARY_FEATURE_ENABLED ? sanitizeDietaryPrefs({}) : {});
  const [shoppingMissingCount, setShoppingMissingCount] = useState(0);
  const {
    shoppingBadge,
    shoppingDelta,
    cookedDelta,
    pendingShopping,
    pendingCooked,
    markShoppingSeen,
    markCookedSeen,
  } = useAlerts();
  const noneSelected = DIETARY_KEYS.every((key) => !dietary[key]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await supabase
        .from('account_prefs')
        .select('dietary')
        .eq('user_id', userId)
        .maybeSingle();
      if (data) {
        if (DIETARY_FEATURE_ENABLED) setDietary(sanitizeDietaryPrefs(data.dietary));
      }
    })();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    (async () => {
      const [{ data: saved }, { data: lib }] = await Promise.all([
        supabase.from('saved_dishes').select('ingredients,suggested_sides').eq('user_id', userId),
        supabase.from('user_library').select('*').eq('user_id', userId).maybeSingle(),
      ]);

      if (cancelled) return;

      const libraryPayload = buildLibraryPayload(lib as LibraryRow | null | undefined);
      const libraryItems: string[] = [];
      const libraryLookup = new Set<string>();
      Object.values(libraryPayload).forEach((list) => {
        list.forEach((item) => {
          libraryItems.push(item);
          libraryLookup.add(norm(item));
        });
      });

      const needed = new Set<string>();
      const appendIfNeeded = (rawIng?: string | null) => {
        if (!rawIng) return;
        const baseName = stripMeasurement(rawIng);
        const candidate = baseName || rawIng;
        const formatted = formatItem(candidate);
        if (!formatted) return;

        if (libraryItems.length === 0) {
          needed.add(formatted);
          return;
        }

        const candidateKey = norm(candidate);
        if (libraryLookup.has(candidateKey)) return;

        const exists = libraryItems.some((stored) => simpleMatch(candidate, stored));
        if (!exists) needed.add(formatted);
      };

      (saved as { ingredients?: string[]; suggested_sides?: string[] }[] | null | undefined)?.forEach((row) => {
        row?.ingredients?.forEach((item) => appendIfNeeded(item));
        row?.suggested_sides?.forEach((item) => appendIfNeeded(item));
      });

      if (!cancelled) {
        setShoppingMissingCount(needed.size);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const toggleDietary = (key: DietaryKey) => {
    setDietary((current) => {
      const next = { ...current, [key]: !current[key] } as DietaryPrefs;
      if (!next[key]) {
        delete next[key];
      }
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Account</Text>

        {DIETARY_FEATURE_ENABLED ? (
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
            <Text style={styles.helper}>Leave “None” selected to keep your full Library available.</Text>
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
        ) : null}

        <TouchableOpacity
          style={styles.secondary}
          onPress={() => {
            markCookedSeen();
            router.push('/cooked' as any);
          }}
        >
          <View style={styles.secondaryContent}>
            <Text style={styles.secondaryText}>View Cooked Dishes</Text>
            {pendingCooked ? (
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>{Math.min(cookedDelta || 1, 99)}</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondary}
          onPress={() => {
            markShoppingSeen();
            router.push('/shopping-list' as any);
          }}
        >
          <View style={styles.secondaryContent}>
            <Text style={styles.secondaryText}>
              View Shopping List
              {shoppingMissingCount > 0 ? ` (${shoppingMissingCount})` : ''}
            </Text>
            {pendingShopping ? (
              <View style={styles.alertBadge}>
                <Text style={styles.alertBadgeText}>{Math.min(shoppingDelta || shoppingBadge || 1, 99)}</Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondary} onPress={() => router.push('/faq' as any)}>
          <Text style={styles.secondaryText}>FAQ</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondary} onPress={() => router.push('/privacy-policy' as any)}>
          <Text style={styles.secondaryText}>Privacy Policy</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.secondary, styles.logout]} onPress={signOut}>
          <Text style={[styles.secondaryText, styles.logoutText]}>Log Out</Text>
        </TouchableOpacity>

        <View style={styles.supportCard}>
          <Text style={styles.supportTitle}>Need help?</Text>
          <Text style={styles.supportCopy}>Questions or issues? Reach our team anytime.</Text>
          <TouchableOpacity
            style={styles.supportButton}
            onPress={() => Linking.openURL('mailto:pantrypalooza45@gmail.com')}
          >
            <Text style={styles.supportButtonText}>Email Support</Text>
          </TouchableOpacity>
        </View>
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
  secondaryContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logout: { borderColor: '#FFE1D6', backgroundColor: '#FFF4ED' },
  logoutText: { color: '#FF6B35' },
  alertBadge: {
    backgroundColor: '#FF6B35',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: 'center',
  },
  alertBadgeText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
    textAlign: 'center',
  },
  supportCard: {
    marginTop: 20,
    borderWidth: 2,
    borderColor: '#E1E8ED',
    borderRadius: 14,
    backgroundColor: '#FFF',
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  supportTitle: { fontSize: 16, fontWeight: '800', color: '#2C3E50' },
  supportCopy: { color: '#5A6C7D', fontSize: 13 },
  supportButton: {
    marginTop: 4,
    backgroundColor: '#4ECDC4',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignSelf: 'center',
  },
  supportButtonText: { color: '#FFF', fontWeight: '800' },
});
