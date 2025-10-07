import React, { useState, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Pressable, Alert, Platform, ToastAndroid } from 'react-native';
import { GeneratedDish } from '@/types/database';
import { BookmarkPlus, BookmarkCheck, Clock, Utensils, Download } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { captureRef } from 'react-native-view-shot';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

interface DishScorecardProps {
  dish: GeneratedDish;
  isSaved?: boolean;
  onSaveToggle?: () => void;
  servings?: number;
  suggestedSides?: string[];
}

export function DishScorecard({ dish, isSaved = false, onSaveToggle, servings = 2, suggestedSides = [] }: DishScorecardProps) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(isSaved);
  const [saving, setSaving] = useState(false);
  const [cooking, setCooking] = useState(false);
  const [pressed, setPressed] = useState(false);
  const cardRef = useRef<View>(null);

  // Very lightweight calorie estimator. This is intentionally simple and conservative.
  const caloriesEstimate = useMemo(() => {
    const baseMap: Record<string, number> = {
      // proteins (per serving rough averages)
      'Chicken Breast': 220,
      'Chicken Thighs': 260,
      'Ground Beef': 300,
      'Ground Turkey': 240,
      'Pork Chops': 290,
      'Steak': 350,
      'Lamb': 360,
      'Salmon': 330,
      'Shrimp': 170,
      'Tilapia': 180,
      'Tuna': 200,
      'Tofu': 180,
      'Eggs': 150,
      'Bacon': 200,
      'Sausage': 320,

      // carbs / grains (per serving)
      'Rice': 200,
      'Pasta': 220,
      'Potatoes': 160,
      'Bread': 150,

      // fats / extras
      'Olive Oil': 120,
      'Butter': 100,
      'Cheese': 110,
    };

    // Tally known ingredients and lightly account for unknowns
    let total = 0;
    let unknowns = 0;
    for (const ing of dish.ingredients) {
      if (baseMap[ing]) { total += baseMap[ing]; continue; }
      const key = ing.toLowerCase();
      if (key.includes('chicken')) total += baseMap['Chicken Breast'];
      else if (key.includes('beef')) total += baseMap['Ground Beef'];
      else if (key.includes('turkey')) total += baseMap['Ground Turkey'];
      else if (key.includes('pork')) total += baseMap['Pork Chops'];
      else if (key.includes('salmon')) total += baseMap['Salmon'];
      else if (key.includes('shrimp')) total += baseMap['Shrimp'];
      else if (key.includes('tofu')) total += baseMap['Tofu'];
      else if (key.includes('egg')) total += baseMap['Eggs'];
      else if (key.includes('sausage')) total += baseMap['Sausage'];
      else if (key.includes('bacon')) total += baseMap['Bacon'];
      else if (key.includes('pasta') || key.includes('spaghetti') || key.includes('penne') || key.includes('noodle')) total += baseMap['Pasta'];
      else if (key.includes('rice')) total += baseMap['Rice'];
      else if (key.includes('potato')) total += baseMap['Potatoes'];
      else if (key.includes('cheese')) total += baseMap['Cheese'];
      else if (key.includes('olive oil') || key.includes('oil')) total += baseMap['Olive Oil'];
      else if (key.includes('butter')) total += baseMap['Butter'];
      else if (key.includes('bread')) total += baseMap['Bread'];
      else unknowns += 1;
    }

    // Add a small buffer for unknowns
    total += unknowns * 20;

    // Clamp to reasonable range for a single-serving dish
    total = Math.max(150, Math.min(total, 900));
    return Math.round(total / 10) * 10;
  }, [dish.ingredients]);

  // Rough cost estimator ($) using common ingredient buckets.
  const costEstimate = useMemo(() => {
    const anyDish: any = dish as any;
    // Prefer API-provided numeric costs if present
    const apiTotal = typeof anyDish.total_cost_usd === 'number' ? anyDish.total_cost_usd : undefined;
    const apiPer = typeof anyDish.cost_per_serving_usd === 'number' ? anyDish.cost_per_serving_usd : undefined;
    if (apiTotal != null) return apiTotal;
    if (apiPer != null) return Math.max(0, apiPer * Math.max(1, servings));

    const priceMap: Record<string, number> = {
      // proteins (per serving approx)
      'Chicken Breast': 2.25,
      'Chicken Thighs': 1.8,
      'Ground Beef': 2.7,
      'Ground Turkey': 2.2,
      'Pork Chops': 2.5,
      'Steak': 3.5,
      'Lamb': 3.8,
      'Salmon': 3.2,
      'Shrimp': 2.8,
      'Tilapia': 2.0,
      'Tuna': 2.2,
      'Tofu': 1.2,
      'Eggs': 0.6,
      'Bacon': 1.2,
      'Sausage': 1.4,

      // carbs / grains (per serving)
      'Rice': 0.3,
      'Pasta': 0.4,
      'Potatoes': 0.5,
      'Bread': 0.6,

      // fats / extras (per serving usage)
      'Olive Oil': 0.2,
      'Butter': 0.15,
      'Cheese': 0.6,
      'Milk': 0.4,
      'Yogurt': 0.7,
    };

    let total = 0;
    let unknowns = 0;
    for (const ing of dish.ingredients) {
      if (priceMap[ing]) {
        total += priceMap[ing];
        continue;
      }
      const key = ing.toLowerCase();
      if (key.includes('chicken')) total += priceMap['Chicken Breast'];
      else if (key.includes('beef')) total += priceMap['Ground Beef'];
      else if (key.includes('turkey')) total += priceMap['Ground Turkey'];
      else if (key.includes('pork')) total += priceMap['Pork Chops'];
      else if (key.includes('salmon')) total += priceMap['Salmon'];
      else if (key.includes('shrimp')) total += priceMap['Shrimp'];
      else if (key.includes('tofu')) total += priceMap['Tofu'];
      else if (key.includes('egg')) total += priceMap['Eggs'];
      else if (key.includes('sausage')) total += priceMap['Sausage'];
      else if (key.includes('bacon')) total += priceMap['Bacon'];
      else if (key.includes('pasta') || key.includes('spaghetti') || key.includes('penne') || key.includes('noodle')) total += priceMap['Pasta'];
      else if (key.includes('rice')) total += priceMap['Rice'];
      else if (key.includes('potato')) total += priceMap['Potatoes'];
      else if (key.includes('cheese')) total += priceMap['Cheese'];
      else if (key.includes('olive oil') || key.includes('oil')) total += priceMap['Olive Oil'];
      else if (key.includes('butter')) total += priceMap['Butter'];
      else if (key.includes('bread')) total += priceMap['Bread'];
      else if (key.includes('milk')) total += priceMap['Milk'];
      else if (key.includes('yogurt')) total += priceMap['Yogurt'];
      else unknowns += 1;
    }

    // Small buffer for unknowns
    total += unknowns * 0.15;
    // Scale by servings baseline (assumes 2-serving baseline from generator)
    const scale = Math.max(1, servings / 2);
    total *= scale;
    // Clamp and round to nearest $0.5; single-dish ceiling can be higher for protein-heavy
    total = Math.max(3, Math.min(total, 45));
    return Math.round(total * 2) / 2;
  }, [dish.ingredients, servings]);

  // Download PNG (native) or placeholder on web
  const handleDownload = async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert('Download', 'Web export coming soon. For now, use your browser print/share.');
        return;
      }
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 } as any);
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (perm.granted) {
        await MediaLibrary.saveToLibraryAsync(uri);
        if (Platform.OS === 'android') ToastAndroid.show('Saved to Photos', ToastAndroid.SHORT);
        else Alert.alert('Saved', 'Image saved to your Photos.');
      } else if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Saved', 'Image is ready at: ' + uri);
      }
    } catch (e: any) {
      Alert.alert('Download failed', e?.message || 'Unable to export image');
    }
  };

  // Mark as cooked and migrate from Saved to Cooked
  const handleCooked = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to mark dishes as cooked.');
      return;
    }
    try {
      setCooking(true);
      const payload: any = {
        user_id: user.id,
        title: String(dish.title || '').trim(),
        cuisine_type: String(dish.cuisine_type || ''),
        cooking_time: String(dish.cooking_time || ''),
        ingredients: Array.isArray(dish.ingredients) ? dish.ingredients : [],
        instructions: String(dish.instructions || ''),
        calories_est: caloriesEstimate,
        cost_est: Number(costEstimate.toFixed(2)),
      };
      const { error: cookErr } = await supabase.from('cooked_dishes').insert(payload);
      if (cookErr) { Alert.alert('Error', cookErr.message || 'Could not mark as cooked.'); return; }
      const { data: existingDish } = await supabase
        .from('saved_dishes')
        .select('id')
        .eq('user_id', user.id)
        .eq('title', dish.title)
        .maybeSingle();
      if (existingDish) { await supabase.from('saved_dishes').delete().eq('id', existingDish.id); setSaved(false); }
      if (Platform.OS === 'android') ToastAndroid.show('Marked as cooked', ToastAndroid.SHORT);
      else Alert.alert('Cooked', 'Dish marked as cooked.');
      if (onSaveToggle) onSaveToggle();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Failed to mark as cooked.');
    } finally {
      setCooking(false);
    }
  };

  // Abbreviate cuisine names to help keep the meta row to one line on mobile.
  const cuisineAbbrev = useMemo(() => {
    const raw = (dish.cuisine_type || '').trim();
    const map: Record<string, string> = {
      American: 'Amer',
      Mediterranean: 'Med',
      Italian: 'Ita',
    };
    if (map[raw as keyof typeof map]) return map[raw as keyof typeof map];
    // Fallback: take first 3 letters capitalized
    return raw.length > 3 ? raw.slice(0, 3) : raw;
  }, [dish.cuisine_type]);

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to save dishes.');
      return;
    }

    setSaving(true);

    try {
      if (saved) {
        const { data: existingDish } = await supabase
          .from('saved_dishes')
          .select('id')
          .eq('user_id', user.id)
          .eq('title', dish.title)
          .maybeSingle();

        if (existingDish) {
          const { error: delErr } = await supabase
            .from('saved_dishes')
            .delete()
            .eq('id', existingDish.id);
          if (delErr) {
            Alert.alert('Error', delErr.message || 'Could not remove saved dish.');
            return;
          }
        }
        setSaved(false);
        if (Platform.OS === 'android') {
          ToastAndroid.show('Removed from Saved', ToastAndroid.SHORT);
        } else {
          // keep it subtle on non-Android
          Alert.alert('Removed', 'This dish was removed from your Saved list.');
        }
      } else {
        const payload = {
          user_id: user.id,
          title: String(dish.title || '').trim(),
          cuisine_type: String(dish.cuisine_type || ''),
          cooking_time: String(dish.cooking_time || '30 mins'),
          ingredients: Array.isArray(dish.ingredients) ? dish.ingredients : [],
          instructions: String(dish.instructions || ''),
        } as any;
        const { error: insErr } = await supabase.from('saved_dishes').insert(payload);
        if (insErr) {
          Alert.alert('Save failed', insErr.message || 'Could not save this dish.');
          return;
        }
        setSaved(true);
        if (Platform.OS === 'android') {
          ToastAndroid.show('Saved', ToastAndroid.SHORT);
        } else {
          Alert.alert('Saved', 'This dish was added to your Saved list.');
        }
      }

      if (onSaveToggle) {
        onSaveToggle();
      }
    } catch (error) {
      const msg = (error as any)?.message || 'Unexpected error while saving.';
      Alert.alert('Save failed', msg);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Pressable
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={({ pressed: pr }) => [styles.card, (pr || pressed) && styles.cardPressed]}
    >
      <View style={styles.content} ref={cardRef as any}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{dish.title}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.cuisine} numberOfLines={1} ellipsizeMode="tail">{cuisineAbbrev}</Text>
              <View style={styles.timeContainer}>
                <Clock size={12} color="#4ECDC4" />
                <Text style={styles.time} numberOfLines={1} ellipsizeMode="clip">{dish.cooking_time || '—'}</Text>
              </View>
              <Text style={styles.calories} numberOfLines={1} ellipsizeMode="clip">~{caloriesEstimate} kcal</Text>
            </View>
            <View style={styles.costRow}>
              <Text style={styles.costLabel}>APPROX COST</Text>
              <Text style={styles.costValue}>${costEstimate.toFixed(2)}</Text>
            </View>
          </View>
          <View style={styles.actionsRow}>
            <TouchableOpacity onPress={handleCooked} disabled={cooking} style={styles.actionBtn}>
              {cooking ? <ActivityIndicator size="small" color="#4ECDC4" /> : <Utensils size={24} color="#4ECDC4" />}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDownload} style={styles.actionBtn}>
              <Download size={22} color="#4ECDC4" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.actionBtn}>
              {saving ? (
                <ActivityIndicator size="small" color="#4ECDC4" />
              ) : saved ? (
                <BookmarkCheck size={28} color="#4ECDC4" fill="#4ECDC4" />
              ) : (
                <BookmarkPlus size={28} color="#4ECDC4" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          <View style={styles.ingredientsList}>
            {dish.ingredients.map((ingredient, index) => (
              <Text key={index} style={styles.ingredient}>• {ingredient}</Text>
            ))}
          </View>
        </View>

        {suggestedSides.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sides</Text>
            <View style={styles.sidesRow}>
              {suggestedSides.slice(0, 5).map((side) => (
                <View key={side} style={styles.sideChip}>
                  <Text style={styles.sideChipText}>{side}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <Text style={styles.instructions}>{dish.instructions}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    marginBottom: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E1E8ED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPressed: {
    borderColor: '#4ECDC4',
    shadowColor: '#4ECDC4',
    shadowOpacity: 0.2,
    transform: [{ scale: 0.995 }],
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'nowrap',
    overflow: 'hidden',
  },
  costRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  costLabel: {
    fontSize: 11,
    color: '#4ECDC4',
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  costValue: {
    fontSize: 13,
    color: '#2C3E50',
    fontWeight: '800',
  },
  calories: {
    marginLeft: 6,
    fontSize: 12,
    color: '#4ECDC4',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  cuisine: {
    fontSize: 12,
    color: '#4ECDC4',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  time: {
    fontSize: 12,
    color: '#4ECDC4',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    flexShrink: 1,
  },
  actionsRow: { flexDirection: 'row', gap: 8, marginLeft: 8 },
  actionBtn: { padding: 4 },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 12,
  },
  sidesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sideChip: {
    borderWidth: 1,
    borderColor: '#E1E8ED',
    backgroundColor: '#FFF',
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  sideChipText: {
    color: '#2C3E50',
    fontSize: 13,
    fontWeight: '600',
  },
  ingredientsList: {
    gap: 6,
  },
  ingredient: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  instructions: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 22,
  },
});
