import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { isIngredientAllowed, type DietaryPrefs } from '@/lib/dietary';
import { useAuth } from '@/contexts/AuthContext';
import { GeneratedDish, GenerateDishesFunctionResponse } from '@/types/database';
import { DishScorecard } from '@/components/DishScorecard';
import type { DishSideSuggestion } from '@/types/generated';
import { useAnalytics } from '@/contexts/AnalyticsContext';

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

const cloneDishes = (dishes: GeneratedDish[]): GeneratedDish[] =>
  dishes.map((dish) => ({
    ...dish,
    ingredients: Array.isArray(dish.ingredients) ? [...dish.ingredients] : [],
    instructions: Array.isArray(dish.instructions) ? [...dish.instructions] : [],
  }));

const normalizeList = (...lists: (string[] | null | undefined)[]): string[] => {
  const result: string[] = [];
  const seen = new Set<string>();

  lists.forEach((list) => {
    (list ?? []).forEach((value) => {
      const trimmed = String(value ?? '').trim();
      if (!trimmed) return;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      result.push(trimmed);
    });
  });

  return result;
};

const normalizeTitleKey = (value: string | null | undefined): string =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

export default function HomeScreen() {
  const { user } = useAuth();
  const { track } = useAnalytics();
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
  const cacheRef = useRef<Map<string, GeneratedDish[]>>(new Map());
  const lastRequestKeyRef = useRef<string | null>(null);
  const recentTitlesRef = useRef<Map<string, Set<string>>>(new Map());
  const refreshCountRef = useRef<Map<string, number>>(new Map());
  const qs = useLocalSearchParams();
  const seededFromQueryRef = useRef(false);
  // Generate controls
  const [mealType, setMealType] = useState<MealType>('Dinner');
  const [servings, setServings] = useState<number>(2);
  // Removed Max Prep Time control from UI; backend still supports it but we no longer send it.
  const [strictMode, setStrictMode] = useState<boolean>(false);
  const [dietary, setDietary] = useState<DietaryPrefs>({});

  const loadUserLibrary = useCallback(async () => {
    if (!user) return;
    // Prefer user_library, fallback to legacy user_selections
    const { data: lib } = await supabase
      .from('user_library')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (lib) {
      const normalizedSeasonings = normalizeList(lib.seasonings);
      const normalizedProduce = normalizeList(lib.produce, lib.vegetables);
      const normalizedProteins = normalizeList(lib.proteins, lib.entrees);
      const normalizedPastas = normalizeList(lib.pastas, lib.grains, lib.breads);
      const normalizedEquipment = normalizeList(lib.equipment, lib.appliances, lib.tools);
      setSeasonings(normalizedSeasonings);
      setProduce(normalizedProduce);
      setProteins(normalizedProteins);
      setPastas(normalizedPastas);
      setEquipment(normalizedEquipment);
      const any =
        normalizedSeasonings.length +
        normalizedProduce.length +
        normalizedProteins.length +
        normalizedPastas.length +
        normalizeList(lib.sauces_condiments, lib.dairy, lib.non_perishables).length > 0;
      setLibraryAny(any);
      return;
    }
    const { data } = await supabase
      .from('user_selections')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data) {
      const normalizedSeasonings = normalizeList(data.seasonings);
      const normalizedProduce = normalizeList(data.vegetables);
      const normalizedProteins = normalizeList(data.entrees);
      const normalizedPastas = normalizeList(data.pastas);
      const normalizedEquipment = normalizeList(data.equipment);
      setSeasonings(normalizedSeasonings);
      setProduce(normalizedProduce);
      setProteins(normalizedProteins);
      setPastas(normalizedPastas);
      setEquipment(normalizedEquipment);
      const any =
        normalizedSeasonings.length +
        normalizedProduce.length +
        normalizedProteins.length +
        normalizedPastas.length +
        normalizedEquipment.length > 0;
      setLibraryAny(any);
    }
  }, [user]);

  useEffect(() => {
    loadUserLibrary();
  }, [loadUserLibrary]);

  // Fallback: derive libraryAny from current arrays to handle any timing edges
  useEffect(() => {
    const any =
      seasonings.length > 0 ||
      produce.length > 0 ||
      proteins.length > 0 ||
      pastas.length > 0 ||
      equipment.length > 0;
    if (any !== libraryAny) setLibraryAny(any);
  }, [seasonings.length, produce.length, proteins.length, pastas.length, equipment.length, libraryAny]);

  // Load when auth state resolves (user becomes available)
  useEffect(() => {
    if (user?.id) {
      loadUserLibrary();
      // Load account prefs for strict/loose
      (async () => {
        const { data } = await supabase
          .from('account_prefs')
          .select('dietary, strict_mode')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data && typeof data.strict_mode === 'boolean') setStrictMode(!!data.strict_mode);
        if (data && data.dietary) setDietary(data.dietary as DietaryPrefs);
      })();
    }
  }, [user?.id, loadUserLibrary]);

  // Ensure library is refreshed when returning to this tab
  useFocusEffect(
    useCallback(() => {
      loadUserLibrary();
    }, [loadUserLibrary])
  );

  // Prefill from querystring (optional, web share links) - maps to library-backed state when present
  useEffect(() => {
    if (seededFromQueryRef.current) return;
    seededFromQueryRef.current = true;
    const parseParam = (key: string) => {
      const v = qs[key];
      if (!v) return [] as string[];
      const raw = Array.isArray(v) ? v[0] : v;
      return raw.split(',').map((s) => decodeURIComponent(s.trim())).filter(Boolean);
    };
    const s = normalizeList(parseParam('seasonings'));
    const v = normalizeList(parseParam('vegetables'));
    const e = normalizeList(parseParam('entrees'));
    const p = normalizeList(parseParam('pastas'));
    const eq = normalizeList(parseParam('equipment'));
    if (s.length) setSeasonings(s);
    if (v.length) setProduce(v);
    if (e.length) setProteins(e);
    if (p.length) setPastas(p);
    if (eq.length) setEquipment(eq);
  }, [qs]);

  // No autosave here; Library screen manages persistence.

  // UI is filter-only now; no inline ingredient toggles.

  const generateDishes = async () => {
    if (!libraryAny) {
      setError('Your Library is empty. Add items in Library first.');
      void track('generate_failure', {
        reason: 'library_empty',
        mealType,
        servings,
        strict: strictMode,
      });
      return;
    }
    // Equipment optional but recommended; do not block if empty.

    const baseRequest = {
      seasonings,
      vegetables: produce,
      entrees: proteins,
      pastas,
      equipment,
      userId: user?.id ?? null,
      filters: {
        mealType,
        servings,
        mode: strictMode ? 'strict' : 'loose',
        dietary,
      },
    };

    const cacheKey = JSON.stringify(baseRequest);
    const previousKey = lastRequestKeyRef.current;
    lastRequestKeyRef.current = cacheKey;

    const cached = cacheRef.current.get(cacheKey);
    const recentTitlesSet = recentTitlesRef.current.get(cacheKey);
    let shouldForceRefresh = Boolean(cached && previousKey === cacheKey);
    if (!shouldForceRefresh && !cached && !recentTitlesSet) {
      // initialize tracking for new key
      recentTitlesRef.current.set(cacheKey, new Set());
    }

    const previousTitles = Array.from(recentTitlesRef.current.get(cacheKey) ?? new Set<string>());

    const requestBody = {
      ...baseRequest,
      recentTitles: previousTitles,
    };

    const refreshCountMap = refreshCountRef.current;
    const currentCount = refreshCountMap.get(cacheKey) ?? 0;
    if (!shouldForceRefresh) {
      refreshCountMap.set(cacheKey, 0);
    } else {
      if (currentCount >= 3) {
        const limitMessage = 'Refresh limit reached. Add more pantry items or adjust meal type to see new dishes.';
        setError(limitMessage);
        void track('generate_failure', {
          reason: 'refresh_limit',
          mealType,
          servings,
          strict: strictMode,
        });
        return;
      }
      refreshCountMap.set(cacheKey, currentCount + 1);
    }

    if (cached && !shouldForceRefresh) {
      setError('');
      setGeneratedDishes(cloneDishes(cached));
      void track('generate_result', {
        source: 'cache',
        dishCount: cached.length,
        mealType,
        servings,
        strict: strictMode,
      });
      return;
    }

    setLoading(true);
    setError('');
    setGeneratedDishes([]);

    try {
      void track('generate_request', {
        hasCache: Boolean(cached),
        forceRefresh: shouldForceRefresh,
        seasonings: seasonings.length,
        produce: produce.length,
        proteins: proteins.length,
        pastas: pastas.length,
        equipment: equipment.length,
        mealType,
        servings,
        strict: strictMode,
      });
      const { data, error } = await supabase.functions.invoke('generate-dishes', {
        body: { ...requestBody, forceRefresh: shouldForceRefresh },
      });

      if (error) {
        if (error.message?.toLowerCase().includes('rate_limit')) {
          throw new Error('Generation limit reached. Please try again in a bit.');
        }
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
      const prioritized = cloneDishes(adjusted);
      const titleSet = recentTitlesRef.current.get(cacheKey) ?? new Set<string>();
      const seenKeys = new Set(Array.from(titleSet));
      const filteredFresh = prioritized.filter((dish) => {
        const key = normalizeTitleKey(dish.title);
        if (!key) return true;
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
      });

      // If filtering removed too many dishes (e.g., duplicates), fall back to original list.
      const baseDishes = filteredFresh.length >= Math.min(3, prioritized.length) ? filteredFresh : prioritized;
      const limitedDishes = baseDishes.slice(0, 5);

      const titlesForTracking = recentTitlesRef.current.get(cacheKey) ?? new Set<string>();
      limitedDishes.forEach((dish) => {
        const key = normalizeTitleKey(dish.title);
        if (key) titlesForTracking.add(key);
      });
      recentTitlesRef.current.set(cacheKey, titlesForTracking);
      const combineWithExisting = (current: GeneratedDish[]): GeneratedDish[] => {
        if (!shouldForceRefresh || current.length === 0) {
          return limitedDishes;
        }
        const seen = new Set(limitedDishes.map((dish) => normalizeTitleKey(dish.title)));
        const preserved = current.filter((dish) => {
          const key = normalizeTitleKey(dish.title);
          if (!key) return false;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return [...limitedDishes, ...preserved].slice(0, 5);
      };

      const nextDishes = combineWithExisting(generatedDishes);
      cacheRef.current.set(cacheKey, cloneDishes(nextDishes));
      setGeneratedDishes(nextDishes);
      void track('generate_result', {
        source: 'network',
        dishCount: nextDishes.length,
        filteredOut: Math.max(0, prioritized.length - limitedDishes.length),
        mealType,
        servings,
        strict: strictMode,
        forceRefresh: shouldForceRefresh,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate dishes. Please try again.';
      setError(message || 'Failed to generate dishes. Please try again.');
      console.error(err);
      void track('generate_failure', {
        reason: 'error',
        message: err instanceof Error ? err.message : String(err),
        mealType,
        servings,
        strict: strictMode,
        forceRefresh: shouldForceRefresh,
      });
    } finally {
      setLoading(false);
    }
  };

  const hasLibrary = libraryAny;

  // After results render and layout reports the Y offset, perform the scroll.
  useEffect(() => {
    if (generatedDishes.length > 0 && dishesOffsetY != null) {
      // Defer to next frame to ensure layout is committed on mobile Safari
      const id = requestAnimationFrame(() => {
        if (scrollRef.current) {
          try {
            scrollRef.current.scrollTo({ y: Math.max(0, dishesOffsetY - 12), animated: true });
          } catch {
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
              <DishScorecard key={index} dish={dish} servings={servings} />
            ))}
          </View>
        )}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Need details on how we handle your data?</Text>
          <TouchableOpacity onPress={() => router.push('/policy')} accessibilityRole="link">
            <Text style={styles.footerLink}>View our Privacy Policy</Text>
          </TouchableOpacity>
        </View>
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
  footer: {
    marginTop: 40,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 14,
    color: '#5A6C7D',
    textAlign: 'center',
  },
  footerLink: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF6B35',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
