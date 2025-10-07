import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { DietaryPrefs } from '@/lib/dietary';
import { router } from 'expo-router';

const ALL_FLAGS: Array<{ key: keyof DietaryPrefs; label: string }> = [
  { key: 'vegan', label: 'Vegan' },
  { key: 'vegetarian', label: 'Vegetarian' },
  { key: 'pescatarian', label: 'Pescatarian' },
  { key: 'gluten_free', label: 'Gluten-free' },
  { key: 'dairy_free', label: 'Dairy-free' },
  { key: 'nut_free', label: 'Nut-free' },
  { key: 'egg_free', label: 'Egg-free' },
  { key: 'shellfish_free', label: 'Shellfish-free' },
  { key: 'soy_free', label: 'Soy-free' },
  { key: 'pork_free', label: 'Pork-free' },
  { key: 'beef_free', label: 'Beef-free' },
  { key: 'halal_friendly', label: 'Halal-friendly' },
  { key: 'kosher_friendly', label: 'Kosher-friendly' },
  { key: 'low_sodium', label: 'Low sodium' },
];

export default function AccountScreen() {
  const { user } = useAuth();
  const [strictMode, setStrictMode] = useState(false);
  const [dietary, setDietary] = useState<DietaryPrefs>({});
  const [saving, setSaving] = useState(false);
  const [shoppingMissingCount, setShoppingMissingCount] = useState(0);

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
        setDietary((data.dietary as DietaryPrefs) || {});
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

  const toggleDietary = (key: keyof DietaryPrefs) => {
    setDietary((d) => ({ ...d, [key]: !d[key] }));
  };

  const save = async () => {
    if (!user) return;
    try {
      setSaving(true);
      await supabase.from('account_prefs').upsert({
        user_id: user.id,
        strict_mode: strictMode,
        dietary,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
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
          {ALL_FLAGS.map(({ key, label }) => (
            <View key={String(key)} style={styles.rowBetween}>
              <Text style={styles.label}>{label}</Text>
              <Switch value={!!dietary[key]} onValueChange={() => toggleDietary(key)} />
            </View>
          ))}
          <Text style={styles.helper}>These settings filter your Library and guide dish generation.</Text>
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
  primary: { backgroundColor: '#4ECDC4', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 6 },
  primaryText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  secondary: { borderWidth: 2, borderColor: '#E1E8ED', backgroundColor: '#FFF', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  secondaryText: { color: '#2C3E50', fontSize: 15, fontWeight: '700' },
});
