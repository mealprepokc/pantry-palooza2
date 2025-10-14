import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { isIngredientAllowed, type DietaryPrefs } from '@/lib/dietary';
import { useAuth } from '@/contexts/AuthContext';
import { GeneratedDish, GenerateDishesFunctionResponse } from '@/types/database';
import { DishScorecard } from '@/components/DishScorecard';
import type { DishSideSuggestion } from '@/types/generated';

type MealType = 'Breakfast' | 'Lunch' | 'Dinner';

const AGGREGATE = (dish: GeneratedDish) => {
  const parts: string[] = [];
  if (dish.title) parts.push(dish.title);
  if (Array.isArray(dish.instructions)) parts.push(dish.instructions.join(' '));
  else if (typeof dish.instructions === 'string') parts.push(dish.instructions);
  if (Array.isArray(dish.ingredients)) parts.push(dish.ingredients.join(' '));
  return parts.join(' ').toLowerCase();
};

const parseMinutes = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : null;
};

const MEAL_HEURISTICS: Record<MealType, { primary: string[]; bonus: string[]; avoid: string[]; }> = {
  Breakfast: {
    primary: ['breakfast', 'omelet', 'oatmeal', 'pancake', 'waffle', 'toast', 'scramble', 'smoothie', 'granola', 'parfait'],
    bonus: ['egg', 'yogurt', 'berry', 'fruit', 'hash', 'frittata', 'bagel', 'muffin', 'overnight oats'],
    avoid: ['steak', 'roast', 'pork chop', 'brisket', 'lasagna', 'curry', 'barbecue', 'bbq', 'ribs', 'meatloaf', 'burger', 'pizza'],
  },
  Lunch: {
    primary: ['salad', 'sandwich', 'wrap', 'bowl', 'grain bowl', 'taco', 'quesadilla', 'panini', 'soup', 'pasta', 'noodle'],
    bonus: ['lunch', 'quick', 'portable', 'flatbread', 'pita', 'rice bowl', 'poke', 'grain'],
    avoid: ['pancake', 'waffle', 'french toast', 'smoothie', 'oatmeal', 'overnight oats', 'cereal', 'parfait'],
  },
  Dinner: {
    primary: ['dinner', 'roast', 'stew', 'casserole', 'pasta', 'braised', 'grilled', 'sheet pan', 'skillet', 'slow cooker', 'baked', 'stir fry'],
    bonus: ['hearty', 'comfort', 'family', 'weeknight', 'garlic', 'herb', 'pan-seared', 'glazed'],
    avoid: ['pancake', 'waffle', 'smoothie', 'oatmeal', 'breakfast', 'parfait', 'cereal', 'toast'],
  },
};

const scoreMealFit = (dish: GeneratedDish, mealType: MealType): number => {
  const heuristics = MEAL_HEURISTICS[mealType];
  if (!heuristics) return 0;
  const text = AGGREGATE(dish);
  let score = 0;

  heuristics.primary.forEach((term) => {
    if (text.includes(term)) score += 3;
  });

  heuristics.bonus.forEach((term) => {
    if (text.includes(term)) score += 1.5;
  });

  heuristics.avoid.forEach((term) => {
    if (text.includes(term)) score -= 4;
  });

  const minutes = parseMinutes(dish.cooking_time);
  if (minutes != null) {
    if (mealType === 'Breakfast') {
      if (minutes <= 25) score += 1.5;
      if (minutes >= 50) score -= 1;
    } else if (mealType === 'Dinner') {
      if (minutes >= 30) score += 1;
      if (minutes <= 15) score -= 1;
    }
  }

  if (Array.isArray(dish.ingredients)) {
    const ingredientsText = dish.ingredients.join(' ').toLowerCase();
    if (mealType === 'Breakfast' && ingredientsText.includes('maple')) score += 1;
    if (mealType === 'Dinner' && ingredientsText.includes('slow cooker')) score += 1.5;
  }

  return score;
};

const applyMealTypeHeuristics = (dishes: GeneratedDish[], mealType: MealType): GeneratedDish[] => {
  if (!Array.isArray(dishes) || dishes.length === 0) return dishes;
  const scored = dishes.map((dish, index) => ({ dish, index, score: scoreMealFit(dish, mealType) }));
  const hasVariance = scored.some((entry) => entry.score !== scored[0]?.score);
  if (!hasVariance) return dishes;

  const sorted = [...scored].sort((a, b) => {
    const diff = b.score - a.score;
    if (Math.abs(diff) > 0.0001) return diff;
    return a.index - b.index;
  });

  const culled = sorted.filter((entry, idx) => entry.score > -3 || idx < 8);
  const prioritized = (culled.length > 0 ? culled : sorted).map((entry) => entry.dish);
  return prioritized;
};

export default function HomeScreen() {
  const { user } = useAuth();
  const defaultSideSuggestions: DishSideSuggestion[] = [
    {
      name: 'Mixed Greens Salad',
      why_it_works: 'Provides a fresh, crisp counterpoint to the main dish.',
      estimated_ingredients: ['mixed greens', 'olive oil', 'lemon', 'salt', 'pepper'],
      prep_style: 'cold',
      profile: ['fresh', 'light'],
      feasibility_rate: 0.8,
      meal_type_fit: 0.7,
      semantic_fit: 0.7,
      dishSideScore: 0.75,
    },
    {
      name: 'Garlic Bread',
      why_it_works: 'Adds a warm, savory side that pairs with most hearty mains.',
      estimated_ingredients: ['bread', 'garlic', 'butter', 'parsley'],
      prep_style: 'hot',
      profile: ['comfort', 'savory'],
      feasibility_rate: 0.75,
      meal_type_fit: 0.8,
      semantic_fit: 0.65,
      dishSideScore: 0.72,
    },
    {
      name: 'Roasted Vegetables',
      why_it_works: 'Adds color and balanced nutrition with minimal prep.',
      estimated_ingredients: ['carrots', 'broccoli', 'olive oil', 'seasoning'],
      prep_style: 'hot',
      profile: ['healthy', 'savory'],
      feasibility_rate: 0.78,
      meal_type_fit: 0.82,
      semantic_fit: 0.7,
      dishSideScore: 0.76,
    },
    {
      name: 'Herbed Rice',
      why_it_works: 'Adds a hearty, fragrant side that soaks up sauces.',
      estimated_ingredients: ['rice', 'butter', 'parsley', 'garlic'],
      prep_style: 'hot',
      profile: ['comfort', 'savory'],
      feasibility_rate: 0.7,
      meal_type_fit: 0.75,
      semantic_fit: 0.68,
      dishSideScore: 0.7,
    },
  ];
  // Library-backed selections
  const [seasonings, setSeasonings] = useState<string[]>([]);
  const [produce, setProduce] = useState<string[]>([]);
  const [proteins, setProteins] = useState<string[]>([]);
  const [pastas, setPastas] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [libraryAny, setLibraryAny] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [generatedDishes, setGeneratedDishes] = useState<GeneratedDish[]>([]);
  const [error, setError] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const [dishesOffsetY, setDishesOffsetY] = useState<number | null>(null);
  const [shareMsg, setShareMsg] = useState('');
  const qs = useLocalSearchParams();
  // Generate controls
  const [mealType, setMealType] = useState<MealType>('Dinner');
  const [servings, setServings] = useState<number>(2);
  // Removed Max Prep Time control from UI; backend still supports it but we no longer send it.
  const [strictMode, setStrictMode] = useState<boolean>(false);
  const [dietary, setDietary] = useState<DietaryPrefs>({});

  useEffect(() => {
    loadUserLibrary();
  }, []);

  // Fallback: derive libraryAny from current arrays to handle any timing edges
  useEffect(() => {
    const any =
      seasonings.length > 0 ||
      produce.length > 0 ||
      proteins.length > 0 ||
      pastas.length > 0 ||
      equipment.length > 0;
    if (any !== libraryAny) setLibraryAny(any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seasonings.length, produce.length, proteins.length, pastas.length, equipment.length]);

  // Load when auth state resolves (user becomes available)
  useEffect(() => {
    if (user?.id) {
      loadUserLibrary();
      // Load account prefs for strict/loose
      (async () => {
        const { data } = await supabase
          .from('account_prefs')
          .select('strict_mode, dietary')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data && typeof data.strict_mode === 'boolean') setStrictMode(!!data.strict_mode);
        if (data && data.dietary) setDietary(data.dietary as DietaryPrefs);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Ensure library is refreshed when returning to this tab
  useFocusEffect(
    useCallback(() => {
      loadUserLibrary();
    }, [user?.id])
  );

  // Prefill from querystring (optional, web share links) - maps to library-backed state when present
  useEffect(() => {
    const parseParam = (key: string) => {
      const v = qs[key];
      if (!v) return [] as string[];
      const raw = Array.isArray(v) ? v[0] : v;
      return raw.split(',').map((s) => decodeURIComponent(s.trim())).filter(Boolean);
    };
    const s = parseParam('seasonings');
    const v = parseParam('vegetables');
    const e = parseParam('entrees');
    const p = parseParam('pastas');
    const eq = parseParam('equipment');
    if (s.length) setSeasonings(s);
    if (v.length) setProduce(v);
    if (e.length) setProteins(e);
    if (p.length) setPastas(p);
    if (eq.length) setEquipment(eq);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserLibrary = async () => {
    if (!user) return;
    // Prefer user_library, fallback to legacy user_selections
    const { data: lib } = await supabase
      .from('user_library')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (lib) {
      setSeasonings(lib.seasonings || []);
      setProduce(lib.produce || lib.vegetables || []);
      setProteins(lib.proteins || lib.entrees || []);
      setPastas(lib.pastas || []);
      setEquipment(lib.equipment || []);
      const any =
        (lib.seasonings?.length || 0) +
        (lib.produce?.length || lib.vegetables?.length || 0) +
        (lib.proteins?.length || lib.entrees?.length || 0) +
        (lib.pastas?.length || 0) +
        (lib.grains?.length || 0) +
        (lib.breads?.length || 0) +
        (lib.sauces_condiments?.length || 0) +
        (lib.dairy?.length || 0) +
        (lib.non_perishables?.length || 0) > 0;
      setLibraryAny(any);
      return;
    }
    const { data } = await supabase
      .from('user_selections')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      setSeasonings(data.seasonings || []);
      setProduce(data.vegetables || []);
      setProteins(data.entrees || []);
      setPastas(data.pastas || []);
      setEquipment(data.equipment || []);
      const any =
        (data.seasonings?.length || 0) +
        (data.vegetables?.length || 0) +
        (data.entrees?.length || 0) +
        (data.pastas?.length || 0) +
        (data.equipment?.length || 0) > 0;
      setLibraryAny(any);
    }
  };

  // No autosave here; Library screen manages persistence.

  // UI is filter-only now; no inline ingredient toggles.

  const generateDishes = async () => {
    if (!libraryAny) {
      setError('Your Library is empty. Add items in Library first.');
      return;
    }
    // Equipment optional but recommended; do not block if empty.

    setLoading(true);
    setError('');
    setGeneratedDishes([]);

    try {
      const { data, error } = await supabase.functions.invoke('generate-dishes', {
        body: {
          // Use user_library items
          seasonings,
          vegetables: produce,
          entrees: proteins,
          pastas,
          equipment,
          // New filters
          filters: {
            mealType,
            servings,
            // maxTimeMinutes removed from UI; not sent
            mode: strictMode ? 'strict' : 'loose',
            dietary,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('No data returned');
      }

      const payload = data as GenerateDishesFunctionResponse;

      if (payload.error) {
        throw new Error(payload.error);
      }

      const dishesFromEdge = Array.isArray(payload.dishes) ? payload.dishes : [];

      const normalized: GeneratedDish[] = dishesFromEdge.map((item) => {
        const ingredients = Array.isArray(item.ingredients)
          ? item.ingredients.map((entry) => String(entry).trim()).filter(Boolean)
          : [];
        const instructions = Array.isArray(item.instructions)
          ? item.instructions.map((entry) => String(entry).trim()).filter(Boolean)
          : [];

        const servingsValue = typeof item.servings === 'number' && item.servings > 0 ? item.servings : null;

        return {
          title: String(item.title || 'Untitled Dish'),
          cuisine_type: String(item.cuisine_type || ''),
          cooking_time: String(item.cooking_time || ''),
          ingredients,
          instructions,
          servings: servingsValue,
          baseServings: servingsValue,
          mealType,
          calories: typeof item.calories_per_serving === 'number' ? item.calories_per_serving : null,
          caloriesPerServing: typeof item.calories_per_serving === 'number' ? item.calories_per_serving : null,
          totalCostUsd: typeof item.total_cost_usd === 'number' ? item.total_cost_usd : null,
          costPerServingUsd: typeof item.cost_per_serving_usd === 'number' ? item.cost_per_serving_usd : null,
        };
      });

      const filtered = normalized.filter((dish) =>
        dish.ingredients.every((ing) => isIngredientAllowed(String(ing), dietary))
      );

      const adjusted = applyMealTypeHeuristics(filtered, mealType);
      setGeneratedDishes(adjusted);
    } catch (err) {
      setError('Failed to generate dishes. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const hasLibrary = libraryAny;

  const buildShareUrl = () => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return '';
    const params = new URLSearchParams();
    if (seasonings.length) params.set('seasonings', seasonings.map(encodeURIComponent).join(','));
    // Keep legacy keys for compatibility, use current state variables
    if (produce.length) params.set('vegetables', produce.map(encodeURIComponent).join(','));
    if (proteins.length) params.set('entrees', proteins.map(encodeURIComponent).join(','));
    if (pastas.length) params.set('pastas', pastas.map(encodeURIComponent).join(','));
    if (equipment.length) params.set('equipment', equipment.map(encodeURIComponent).join(','));
    const qs = params.toString();
    return `${window.location.origin}${window.location.pathname}${qs ? `?${qs}` : ''}`;
  };

  const onShare = async () => {
    if (Platform.OS !== 'web') return;
    try {
      const url = buildShareUrl();
      await navigator.clipboard.writeText(url);
      setShareMsg('Share link copied to clipboard');
      setTimeout(() => setShareMsg(''), 2000);
    } catch (e) {
      setShareMsg('Unable to copy link');
      setTimeout(() => setShareMsg(''), 2000);
    }
  };

  const onPrint = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.print) {
      window.print();
    }
  };

  // After results render and layout reports the Y offset, perform the scroll.
  useEffect(() => {
    if (generatedDishes.length > 0 && dishesOffsetY != null) {
      // Defer to next frame to ensure layout is committed on mobile Safari
      const id = requestAnimationFrame(() => {
        if (scrollRef.current) {
          try {
            scrollRef.current.scrollTo({ y: Math.max(0, dishesOffsetY - 12), animated: true });
          } catch (_) {
            // Fallback
            scrollRef.current.scrollToEnd({ animated: true });
          }
        }
      });
      return () => cancelAnimationFrame(id);
    }
  }, [generatedDishes.length, dishesOffsetY]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Pantry Palooza</Text>
          <Text style={styles.headerSubtitle}>Choose meal type and servings (uses your Library)</Text>
        </View>
      </View>

      <ScrollView ref={scrollRef} style={styles.scrollView} contentContainerStyle={styles.content}>
        {!hasLibrary && (
          <View style={styles.emptyLibrary}>
            <Text style={styles.helper}>Your Library is empty. Add items to Generate dishes.</Text>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/(tabs)/library' as any)}>
              <Text style={styles.secondaryButtonText}>Go to Library</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.controlGroup}>
          <Text style={styles.controlLabel}>Meal Type</Text>
          <View style={styles.segmentRow}>
            {(['Breakfast','Lunch','Dinner'] as const).map((m) => (
              <TouchableOpacity key={m} style={[styles.segment, mealType===m && styles.segmentActive]} onPress={() => setMealType(m)}>
                <Text style={[styles.segmentText, mealType===m && styles.segmentTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Max Prep Time control removed per request; times remain on cards */}

        {/* Dish Creation Mode moved to Account preferences */}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {shareMsg ? <Text style={styles.helper}>{shareMsg}</Text> : null}

        {/* Share/Print temporarily hidden for Phase 1 polish */}

        <TouchableOpacity
          style={[styles.generateButton, !hasLibrary && styles.generateButtonDisabled]}
          onPress={generateDishes}
          disabled={loading || !hasLibrary}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.generateButtonText}>Generate Dishes!</Text>
          )}
        </TouchableOpacity>

        <View style={[styles.controlGroup, styles.servingsControl]}
        >
          <Text style={styles.controlLabel}>Serving Size</Text>
          <View style={styles.segmentRow}>
            {[1, 2, 3, 4].map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.segment, servings === n && styles.segmentActive]}
                onPress={() => setServings(n)}
              >
                <Text style={[styles.segmentText, servings === n && styles.segmentTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.helper}>Adjust servings to scale the generated ingredients and instructions. Tap Generate again if you want a new set of dishes.</Text>
        </View>

        {generatedDishes.length > 0 && (
          <View
            style={styles.dishesContainer}
            onLayout={(e) => setDishesOffsetY(e.nativeEvent.layout.y)}
          >
            <Text style={styles.dishesTitle}>Your Personalized Dishes</Text>
            {generatedDishes.map((dish, index) => (
              <DishScorecard key={index} dish={dish} servings={servings} suggestedSides={defaultSideSuggestions} />
            ))}
          </View>
        )}
        {loading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingCard}>
              <ActivityIndicator size="large" color="#4ECDC4" />
              <Text style={styles.loadingText}>Hang tight while we prepare your dish recommendations.</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FB',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2C3E50',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#5A6C7D',
    marginTop: 2,
    fontWeight: '500',
  },
  logoutButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
  },
  emptyLibrary: {
    alignItems: 'center',
    marginBottom: 16,
  },
  controlGroup: {
    marginBottom: 16,
  },
  servingsControl: {
    marginTop: 12,
  },
  controlLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 8,
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  segment: {
    borderWidth: 2,
    borderColor: '#E1E8ED',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: '#FFF',
  },
  segmentActive: {
    borderColor: '#4ECDC4',
    backgroundColor: '#EFFFFD',
  },
  segmentText: {
    color: '#2C3E50',
    fontWeight: '700',
  },
  segmentTextActive: {
    color: '#0B6B64',
  },
  generateButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginTop: 16,
    shadowColor: '#4ECDC4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  generateButtonDisabled: {
    backgroundColor: '#CCC',
  },
  generateButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#E1E8ED',
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 100,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#2C3E50',
    fontSize: 15,
    fontWeight: '700',
  },
  shareRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
  },
  helper: {
    color: '#5A6C7D',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 8,
  },
  error: {
    color: '#E53E3E',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 16,
  },
  dishesContainer: {
    marginTop: 32,
  },
  dishesTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#E1E8ED',
    alignItems: 'center',
    gap: 12,
    maxWidth: 360,
  },
  loadingText: {
    color: '#2C3E50',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '700',
  },
});
