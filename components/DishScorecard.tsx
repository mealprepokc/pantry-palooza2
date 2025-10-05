import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Pressable } from 'react-native';
import { GeneratedDish } from '@/types/database';
import { BookmarkPlus, BookmarkCheck, Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface DishScorecardProps {
  dish: GeneratedDish;
  isSaved?: boolean;
  onSaveToggle?: () => void;
  servings?: number;
}

export function DishScorecard({ dish, isSaved = false, onSaveToggle, servings = 2 }: DishScorecardProps) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(isSaved);
  const [saving, setSaving] = useState(false);
  const [pressed, setPressed] = useState(false);

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
      // try exact match first
      if (baseMap[ing]) {
        total += baseMap[ing];
        continue;
      }
      // fuzzy contains for common buckets
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
    total += unknowns * 20; // 20 kcal per unknown ingredient as a mild estimate

    // Clamp to reasonable range for a single-serving dish
    total = Math.max(150, Math.min(total, 900));
    return Math.round(total / 10) * 10; // round to nearest 10
  }, [dish.ingredients]);

  // Rough cost estimator ($) using common ingredient buckets.
  const costEstimate = useMemo(() => {
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
    // Clamp and round to nearest $0.5
    total = Math.max(2, Math.min(total, 30));
    return Math.round(total * 2) / 2;
  }, [dish.ingredients, servings]);

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
    if (!user) return;

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
          await supabase
            .from('saved_dishes')
            .delete()
            .eq('id', existingDish.id);
        }
        setSaved(false);
      } else {
        await supabase.from('saved_dishes').insert({
          user_id: user.id,
          title: dish.title,
          cuisine_type: dish.cuisine_type,
          cooking_time: dish.cooking_time,
          ingredients: dish.ingredients,
          instructions: dish.instructions,
        });
        setSaved(true);
      }

      if (onSaveToggle) {
        onSaveToggle();
      }
    } catch (error) {
      console.error('Error saving dish:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Pressable
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.card,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{dish.title}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.cuisine} numberOfLines={1} ellipsizeMode="tail">{cuisineAbbrev}</Text>
              <View style={styles.timeContainer}>
                <Clock size={14} color="#4ECDC4" />
                <Text style={styles.time} numberOfLines={1} ellipsizeMode="clip">{dish.cooking_time || '—'}</Text>
              </View>
              <Text style={styles.calories} numberOfLines={1} ellipsizeMode="clip">~{caloriesEstimate} kcal</Text>
              <Text style={styles.cost} numberOfLines={1} ellipsizeMode="clip">~${costEstimate.toFixed(2)}</Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            style={styles.saveButton}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#4ECDC4" />
            ) : saved ? (
              <BookmarkCheck size={28} color="#4ECDC4" fill="#4ECDC4" />
            ) : (
              <BookmarkPlus size={28} color="#4ECDC4" />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          <View style={styles.ingredientsList}>
            {dish.ingredients.map((ingredient, index) => (
              <Text key={index} style={styles.ingredient}>
                • {ingredient}
              </Text>
            ))}
          </View>
        </View>

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
    gap: 16,
    flexWrap: 'nowrap',
  },
  calories: {
    marginLeft: 8,
    fontSize: 13,
    color: '#4ECDC4',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cuisine: {
    fontSize: 14,
    color: '#4ECDC4',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  time: {
    fontSize: 14,
    color: '#4ECDC4',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cost: {
    marginLeft: 8,
    fontSize: 13,
    color: '#4ECDC4',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  saveButton: {
    padding: 4,
    marginLeft: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 12,
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
