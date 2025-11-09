import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Pressable,
  Alert,
  Platform,
  ToastAndroid,
} from 'react-native';
import { BookmarkPlus, BookmarkCheck, Clock, ChefHat, ThumbsDown } from 'lucide-react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { GeneratedDish } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { useAnalytics } from '@/contexts/AnalyticsContext';

type MealType = 'Breakfast' | 'Lunch' | 'Dinner';

interface ParsedIngredient {
  original: string;
  baseText: string;
  quantity: number | null;
  unit: string | null;
  descriptor: string;
  normalized: string;
}

const CANDIDATE_KEYS = ['name', 'ingredient', 'label', 'text', 'title', 'value', 'content'] as const;
const UNIT_REGEX =
  /^(cups?|cup|tablespoons?|tbsp|teaspoons?|tsp|oz|ounce|ounces?|grams?|g|ml|milliliters?|l|liters?|lbs?|pounds?|kg|kilograms?|cloves?|cans?|pieces?|slices?|heads?|bunch(?:es)?|sticks?|pinch|dash|sprigs?|ears?|fillets?|filets?|packages?|pkgs?|bags?|handfuls?|links?|strips?|stalks?|leaves?)/i;
const SIZE_DESCRIPTOR_REGEX =
  /\b(extra[-\s]?large|extra[-\s]?small|large|small|medium|jumbo|mini|miniature|medium[-\s]?large|medium[-\s]?small|tiny)\b/gi;
const QUANTITY_LOOKAHEAD_REGEX =
  /(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.\d+|\d+)(?=\s*(?:cups?|cup|tablespoons?|tbsp|teaspoons?|tsp|oz|ounce|ounces?|grams?|g|ml|milliliters?|l|liters?|lbs?|pounds?|kg|kilograms?|cloves?|cans?|pieces?|slices?|heads?|bunch(?:es)?|sticks?|pinch|dash|sprigs?|ears?|fillets?|filets?|packages?|pkgs?|bags?|handfuls?|links?|strips?|stalks?|leaves?))/gi;

function stringifyIngredient(raw: any): string {
  if (raw == null) return '';
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') {
    for (const key of CANDIDATE_KEYS) {
      if (typeof raw[key] === 'string') return String(raw[key]);
    }
    try {
      return JSON.stringify(raw);
    } catch {
      return '';
    }
  }
  return String(raw ?? '');
}

function parseQuantity(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/\s+/);
  let total = 0;
  let parsed = false;

  for (const part of parts) {
    if (!part) continue;
    if (part.includes('/')) {
      const [num, den] = part.split('/').map((x) => Number(x));
      if (!Number.isNaN(num) && !Number.isNaN(den) && den !== 0) {
        total += num / den;
        parsed = true;
      }
    } else if (!Number.isNaN(Number(part))) {
      total += Number(part);
      parsed = true;
    }
  }

  return parsed ? total : null;
}

function normalizeIngredientName(value: string): string {
  const withoutBullet = value.replace(/^[•\-\*\s]+/, '').trim();
  const withoutQty = withoutBullet
    .replace(
      /^[\d\s\/.,-]+(cups?|cup|tablespoons?|tbsp|teaspoons?|tsp|oz|ounce|ounces?|grams?|g|ml|milliliters?|l|liters?|lbs?|pounds?|kg|kilograms?|pinch|cloves?)?\.?\s*/i,
      ''
    )
    .trim();
  return withoutQty;
}

const normalizeTitleKey = (value: string | null | undefined): string =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

function parseIngredientLine(raw: any): ParsedIngredient {
  const original = stringifyIngredient(raw).trim();
  const baseText = original.replace(/^[•\-*\s]+/, '').trim();
  const quantityMatch = baseText.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.\d+|\d+)/);
  let quantity: number | null = null;
  let cursor = 0;

  if (quantityMatch) {
    quantity = parseQuantity(quantityMatch[0]);
    cursor = quantityMatch[0].length;
  }

  let remainder = baseText.slice(cursor).trim();
  let unit: string | null = null;
  if (remainder) {
    const unitMatch = remainder.match(UNIT_REGEX);
    if (unitMatch) {
      unit = unitMatch[0];
      remainder = remainder.slice(unitMatch[0].length).trim();
    }
  }

  const descriptor = remainder;
  const normalized = normalizeIngredientName(baseText);
  return { original, baseText, quantity, unit, descriptor, normalized };
}

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }
  return x || 1;
}

function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return '';
  const abs = Math.abs(value);
  if (abs < 0.01) return '0';

  const whole = Math.floor(abs);
  const fraction = abs - whole;
  let fractionStr = '';
  const denominators = [8, 6, 4, 3, 2];
  for (const denom of denominators) {
    const numerator = Math.round(fraction * denom);
    if (numerator === 0) continue;
    const approx = numerator / denom;
    if (Math.abs(fraction - approx) <= 0.015) {
      const divisor = gcd(numerator, denom);
      const simpleNum = numerator / divisor;
      const simpleDen = denom / divisor;
      fractionStr = `${simpleNum}/${simpleDen}`;
      break;
    }
  }

  const sign = value < 0 ? '-' : '';
  let result = '';
  if (whole > 0) result = `${whole}`;
  if (fractionStr) result = result ? `${result} ${fractionStr}` : fractionStr;
  if (!result) {
    const decimals = abs >= 10 ? 0 : abs >= 3 ? 1 : 2;
    result = (Math.round(abs * 10 ** decimals) / 10 ** decimals).toString();
  }
  return sign + result;
}

function formatScaledIngredient(item: ParsedIngredient, scale: number): string {
  if (!item.baseText) return '';
  if (item.quantity == null || !Number.isFinite(item.quantity)) return item.baseText;
  if (Math.abs(scale - 1) < 0.01) return item.baseText;

  const scaledQuantity = item.quantity * scale;
  if (!Number.isFinite(scaledQuantity) || scaledQuantity <= 0) return item.baseText;

  const quantityText = formatQuantity(scaledQuantity);
  if (!quantityText) return item.baseText;
  const unitText = item.unit ? ` ${item.unit}` : '';
  const cleanedDescriptor = item.descriptor
    .replace(SIZE_DESCRIPTOR_REGEX, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const descriptorText = cleanedDescriptor ? ` ${cleanedDescriptor}` : '';
  const combined = `${quantityText}${unitText}${descriptorText}`.trim();
  return combined || item.baseText;
}

function scaleInstructionLine(line: string, ratio: number): string {
  if (Math.abs(ratio - 1) < 0.01) return line;

  return line.replace(QUANTITY_LOOKAHEAD_REGEX, (match) => {
    const value = parseQuantity(match);
    if (value == null) return match;

    const scaled = value * ratio;
    if (!Number.isFinite(scaled) || scaled <= 0) return match;

    return formatQuantity(scaled);
  });
}

interface DishScorecardProps {
  dish: GeneratedDish;
  servings?: number;
  mealType?: MealType;
  onDislike?: (dish: GeneratedDish) => void;
}

export function DishScorecard({ dish, servings = 2, mealType, onDislike }: DishScorecardProps) {
  const { user } = useAuth();
  const { track } = useAnalytics();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cooking, setCooking] = useState(false);
  const [cookedState, setCookedState] = useState(false);
  const [pressed, setPressed] = useState(false);
  const [disliked, setDisliked] = useState(false);
  const [disliking, setDisliking] = useState(false);

  const titleKey = useMemo(() => normalizeTitleKey(String(dish.title ?? '')), [dish.title]);

  useEffect(() => {
    let isMounted = true;
    const title = String(dish.title ?? '').trim();

    if (!user || !title) {
      setSaved(false);
      setCookedState(false);
      setDisliked(false);
      return () => {
        isMounted = false;
      };
    }

    (async () => {
      try {
        const [
          { data: savedRow, error: savedError },
          { data: cookedRow, error: cookedError },
          { data: dislikedRow, error: dislikedError },
        ] = await Promise.all([
          supabase
            .from('saved_dishes')
            .select('id')
            .eq('user_id', user.id)
            .eq('title', title)
            .maybeSingle(),
          supabase
            .from('cooked_dishes')
            .select('id')
            .eq('user_id', user.id)
            .eq('title', title)
            .maybeSingle(),
          supabase
            .from('disliked_dishes')
            .select('id')
            .eq('user_id', user.id)
            .eq('title_key', titleKey)
            .maybeSingle(),
        ]);

        if (!isMounted) return;

        if (savedError && savedError.code !== 'PGRST116') {
          console.warn('Failed to fetch saved status', savedError);
        }
        if (cookedError && cookedError.code !== 'PGRST116') {
          console.warn('Failed to fetch cooked status', cookedError);
        }
        if (dislikedError && dislikedError.code !== 'PGRST116') {
          console.warn('Failed to fetch disliked status', dislikedError);
        }

        setSaved(Boolean(savedRow));
        setCookedState(Boolean(cookedRow));
        setDisliked(Boolean(dislikedRow));
      } catch (error) {
        console.warn('Failed to hydrate dish states', error);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [user?.id, dish.title, titleKey]);

  const parsedIngredients = useMemo<ParsedIngredient[]>(() => {
    const source = Array.isArray(dish.ingredients) ? dish.ingredients : [];
    return source.map((item) => parseIngredientLine(item)).filter((parsed) => parsed.original.length > 0);
  }, [dish.ingredients]);

  const baseDishServings = useMemo(() => {
    const fromDish = typeof dish.servings === 'number' && Number.isFinite(dish.servings) ? dish.servings : null;
    const fromEdge = typeof dish.baseServings === 'number' && Number.isFinite(dish.baseServings) ? dish.baseServings : null;
    const positive = [fromDish, fromEdge].find((value) => value && value > 0);
    return positive ?? 2;
  }, [dish.servings, dish.baseServings]);

  const servingScale = useMemo(() => {
    if (!baseDishServings || baseDishServings <= 0) return 1;
    return Math.max(0.25, servings / baseDishServings);
  }, [servings, baseDishServings]);

  const ingredientLines = useMemo<string[]>(() => {
    if (!parsedIngredients.length) return [];
    return parsedIngredients.map((item) => formatScaledIngredient(item, servingScale));
  }, [parsedIngredients, servingScale]);

  const normalizedIngredients = useMemo<string[]>(() => {
    const seen = new Set<string>();
    return parsedIngredients
      .map((item) => item.normalized.replace(/^[•\-*\s]+/, '').trim())
      .filter((ingredient) => {
        if (!ingredient) return false;
        const lower = ingredient.toLowerCase();
        if (seen.has(lower)) return false;
        seen.add(lower);
        return true;
      });
  }, [parsedIngredients]);

  const instructionsLines = useMemo<string[]>(() => {
    const raw = dish.instructions;
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw
        .map((line) => String(line).trim())
        .filter(Boolean)
        .map((line) => scaleInstructionLine(line, servingScale));
    }
    if (typeof raw === 'string') {
      return raw
        .split(/\r?\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => scaleInstructionLine(line, servingScale));
    }
    return [];
  }, [dish.instructions, servingScale]);

  const instructionsText = useMemo(() => instructionsLines.join('\n'), [instructionsLines]);

  const instructionsForStorage = useMemo(() => instructionsText, [instructionsText]);

  const providedCookCost = useMemo(() => {
    if (typeof dish.cookAtHomeCost === 'number' && Number.isFinite(dish.cookAtHomeCost)) {
      return Math.max(0, Math.round(dish.cookAtHomeCost * 100) / 100);
    }
    return null;
  }, [dish.cookAtHomeCost]);

  const providedOrderCost = useMemo(() => {
    if (typeof dish.orderOutCost === 'number' && Number.isFinite(dish.orderOutCost)) {
      return Math.max(0, Math.round(dish.orderOutCost * 100) / 100);
    }
    return null;
  }, [dish.orderOutCost]);

  const analysisSummary = useMemo(() => {
    const summary = typeof dish.analysisSummary === 'string' ? dish.analysisSummary.trim() : '';
    return summary.length ? summary : null;
  }, [dish.analysisSummary]);

  const costEstimate = useMemo(() => {
    if (providedCookCost != null) return providedCookCost;
    const priceMap: Record<string, number> = {
      Chicken: 2.25,
      Beef: 2.7,
      Turkey: 2.2,
      Pork: 2.5,
      Steak: 3.5,
      Lamb: 3.8,
      Salmon: 3.2,
      Shrimp: 2.8,
      Tilapia: 2.0,
      Tuna: 2.2,
      Tofu: 1.2,
      Eggs: 0.6,
      Bacon: 1.2,
      Sausage: 1.4,
      Rice: 0.3,
      Pasta: 0.4,
      Potato: 0.5,
      Bread: 0.6,
      'Olive Oil': 0.2,
      Butter: 0.15,
      Cheese: 0.6,
      Milk: 0.4,
    };

    let total = 0;
    let unknowns = 0;
    for (const ing of normalizedIngredients) {
      let matched = false;
      Object.entries(priceMap).forEach(([key, cost]) => {
        if (ing.toLowerCase().includes(key.toLowerCase())) {
          total += cost;
          matched = true;
        }
      });
      if (!matched) unknowns += 1;
    }

    total += unknowns * 0.35;
    const servingsMultiplier = Math.max(1, servings / 2.5);
    total *= servingsMultiplier;
    total += Math.min(6, 0.85 * servings);
    total *= 1.24;
    total = Math.max(5, Math.min(total, 72));
    return Math.round(total * 2) / 2;
  }, [normalizedIngredients, servings, providedCookCost]);

  const restaurantCostEstimate = useMemo(() => {
    if (providedOrderCost != null) return providedOrderCost;
    if (!costEstimate) return null;
    const baseline = Math.max(costEstimate * 3.1, costEstimate + 18);
    return Math.round(baseline * 2) / 2;
  }, [costEstimate, providedOrderCost]);

  const savingsEstimate = useMemo(() => {
    if (providedCookCost != null && providedOrderCost != null) {
      return Math.max(0, providedOrderCost - providedCookCost);
    }
    if (!restaurantCostEstimate) return null;
    return Math.max(0, restaurantCostEstimate - costEstimate);
  }, [restaurantCostEstimate, costEstimate, providedCookCost, providedOrderCost]);

  const handleDislike = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to dislike dishes.');
      return;
    }

    if (!titleKey) {
      Alert.alert('Unavailable', 'Unable to dislike this dish right now.');
      return;
    }

    try {
      setDisliking(true);
      const payload = {
        user_id: user.id,
        title: String(dish.title ?? '').trim(),
        title_key: titleKey,
        dish: {
          title: dish.title,
          cuisine_type: dish.cuisine_type,
          cooking_time: dish.cooking_time,
          ingredients: dish.ingredients,
          instructions: instructionsForStorage,
          calories_per_serving: dish.caloriesPerServing ?? dish.calories ?? null,
          servings: dish.servings ?? null,
        },
      };

      const { error } = await supabase
        .from('disliked_dishes')
        .upsert(payload, { onConflict: 'user_id,title_key' });

      if (error && error.code !== '23505') {
        throw error;
      }

      setDisliked(true);
      void track('dislike_dish', {
        title: dish.title,
        mealType,
      });

      if (Platform.OS === 'android') ToastAndroid.show('We will swap in something new.', ToastAndroid.SHORT);
      else Alert.alert('Noted', 'We will avoid this dish going forward.');

      onDislike?.(dish);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to record dislike.');
    } finally {
      setDisliking(false);
    }
  };

  const handleCooked = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to mark dishes as cooked.');
      return;
    }

    try {
      setCooking(true);
      const payload: Record<string, any> = {
        user_id: user.id,
        title: String(dish.title ?? '').trim(),
        cuisine_type: String(dish.cuisine_type ?? ''),
        cooking_time: String(dish.cooking_time ?? ''),
        ingredients: dish.ingredients,
        instructions: instructionsForStorage,
        cost_est: Number(costEstimate.toFixed(2)),
      };

      if (restaurantCostEstimate != null) payload.restaurant_cost_est = Number(restaurantCostEstimate.toFixed(2));
      if (savingsEstimate != null) payload.savings_est = Number(savingsEstimate.toFixed(2));
      payload.cooked_at = new Date().toISOString();

      const { error } = await supabase.from('cooked_dishes').upsert(payload, {
        onConflict: 'user_id,title',
        ignoreDuplicates: false,
      });
      if (error) {
        if (error.code === '23505') {
          setCookedState(true);
          void track('cooked_marked', {
            title: dish.title,
            duplicate: true,
          });
          if (Platform.OS === 'android') ToastAndroid.show('Already marked as cooked', ToastAndroid.SHORT);
          else Alert.alert('Already cooked', 'This dish is already in your cooked list.');
        } else {
          throw error;
        }
      } else {
        setCookedState(true);
        void track('cooked_marked', {
          title: dish.title,
          mealType,
          cookingTime: dish.cooking_time,
        });
        if (Platform.OS === 'android') ToastAndroid.show('Marked as cooked', ToastAndroid.SHORT);
        else Alert.alert('Cooked', 'Dish marked as cooked.');
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to mark as cooked.');
    } finally {
      setCooking(false);
    }
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to save dishes.');
      return;
    }

    setSaving(true);

    try {
      const resolvedMealType: MealType | null = (mealType ?? (dish.mealType as MealType) ?? null) as MealType | null;
      if (saved) {
        const { error } = await supabase
          .from('saved_dishes')
          .delete()
          .eq('user_id', user.id)
          .eq('title', dish.title);
        if (error) throw error;
        setSaved(false);
        void track('unsave_dish', {
          title: dish.title,
          mealType: resolvedMealType,
        });
        if (Platform.OS === 'android') ToastAndroid.show('Removed from Saved', ToastAndroid.SHORT);
        else Alert.alert('Removed', 'This dish was removed from your Saved list.');
      } else {
        const payload: Record<string, any> = {
          user_id: user.id,
          title: String(dish.title ?? '').trim(),
          cuisine_type: String(dish.cuisine_type ?? ''),
          cooking_time: String(dish.cooking_time ?? '30 mins'),
          ingredients: dish.ingredients,
          instructions: instructionsForStorage,
          cost_est: Number(costEstimate.toFixed(2)),
          restaurant_cost_est: restaurantCostEstimate != null ? Number(restaurantCostEstimate.toFixed(2)) : null,
          savings_est: savingsEstimate != null ? Number(savingsEstimate.toFixed(2)) : null,
          meal_type: resolvedMealType,
        };

        const { error } = await supabase.from('saved_dishes').insert(payload);
        if (error) throw error;

        setSaved(true);
        void track('save_dish', {
          title: dish.title,
          mealType: resolvedMealType,
          servings,
        });
        if (Platform.OS === 'android') ToastAndroid.show('Saved', ToastAndroid.SHORT);
        else Alert.alert('Saved', 'This dish was added to your Saved list.');
      }
    } catch (error: any) {
      void track('generate_failure', {
        reason: 'save_error',
        title: dish.title,
        message: error?.message,
      });
      Alert.alert('Save failed', error?.message || 'Unexpected error while saving.');
    } finally {
      setSaving(false);
    }
  };

  const cuisineLabel = useMemo(() => {
    const raw = (dish.cuisine_type ?? '').trim();
    if (!raw) return 'Cuisine';
    const tokens = raw.split(/[\s/]+/).filter(Boolean);
    if (tokens.length === 0) return raw.slice(0, 12);
    if (tokens.length === 1) return tokens[0].slice(0, 14);
    const initials = tokens.map((token) => token[0]?.toUpperCase() || '').join('');
    return initials.length <= 4 ? initials : raw.slice(0, 14);
  }, [dish.cuisine_type]);

  return (
    <Pressable
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={({ pressed: isPressed }) => [styles.card, (isPressed || pressed) && styles.cardPressed]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>{dish.title ?? 'Untitled Dish'}</Text>
            </View>
            <View style={styles.metaSummary}>
              <Text style={styles.cuisine}>{dish.cuisine_type ?? cuisineLabel}</Text>
            </View>
            <View style={styles.metaRow}>
              {mealType ? <Text style={styles.mealLabel}>{mealType}</Text> : null}
              {dish.cooking_time ? (
                <View style={styles.timeContainer}>
                  <Clock size={12} color="#4ECDC4" />
                  <Text style={styles.time}>{dish.cooking_time}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={styles.actionsCol}>
            {cookedState ? (
              <TouchableOpacity style={[styles.actionBtn, styles.viewCookedBtn]} onPress={() => router.push('/cooked' as never)}>
                <Text style={styles.viewCookedText}>View cooked dishes</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleCooked} disabled={cooking} style={[styles.actionBtn, styles.cookedBtn]}>
                <View style={styles.actionBtnInner}>
                  {cooking ? <ActivityIndicator size="small" color="#4ECDC4" /> : <ChefHat size={22} color="#4ECDC4" />}
                  <Text style={styles.actionLabel}>Cooked</Text>
                </View>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleSave} disabled={saving} style={[styles.actionBtn, saved && styles.actionBtnActive]}>
              <View style={styles.actionBtnInner}>
                {saving ? (
                  <ActivityIndicator size="small" color="#4ECDC4" />
                ) : saved ? (
                  <BookmarkCheck size={24} color="#4ECDC4" fill="#4ECDC4" />
                ) : (
                  <BookmarkPlus size={24} color="#4ECDC4" />
                )}
                <Text style={[styles.actionLabel, saved && styles.actionLabelActive]}>{saved ? 'Saved' : 'Save'}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDislike}
              disabled={disliking || disliked}
              style={[styles.actionBtn, styles.dislikeBtn, (disliked || disliking) && styles.dislikeBtnActive]}
            >
              <View style={styles.actionBtnInner}>
                {disliking ? (
                  <ActivityIndicator size="small" color={disliked ? '#FFFFFF' : '#FF6B6B'} />
                ) : (
                  <ThumbsDown size={22} color={disliked ? '#FFFFFF' : '#FF6B6B'} />
                )}
                <Text
                  style={[
                    styles.actionLabel,
                    styles.dislikeLabel,
                    disliked && styles.dislikeLabelActive,
                  ]}
                >
                  {disliked ? 'Disliked' : 'Dislike'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.costRow}>
          <View style={styles.costBlock}>
            <Text style={styles.costLabel}>COOK AT HOME</Text>
            <Text style={styles.costValue}>${costEstimate.toFixed(2)}</Text>
          </View>
          {typeof dish.caloriesPerServing === 'number' && dish.caloriesPerServing > 0 ? (
            <View style={styles.costBlock}>
              <Text style={[styles.costLabel, styles.costLabelAlt]}>CALORIES</Text>
              <Text style={styles.costValue}>{Math.round(dish.caloriesPerServing)} kcal</Text>
            </View>
          ) : null}
          {restaurantCostEstimate ? (
            <View style={styles.costBlock}>
              <Text style={[styles.costLabel, styles.costLabelAlt]}>ORDER OUT</Text>
              <Text style={styles.costValue}>${restaurantCostEstimate.toFixed(2)}</Text>
            </View>
          ) : null}
          {savingsEstimate && savingsEstimate > 0 ? (
            <View style={styles.savingsPill}>
              <Text style={styles.savingsPillText}>SAVE ${savingsEstimate.toFixed(2)}</Text>
            </View>
          ) : null}
        </View>

        {analysisSummary ? (
          <View style={styles.analysisBox}>
            <Text style={styles.analysisLabel}>Summary</Text>
            <Text style={styles.analysisText}>{analysisSummary}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            <Text style={styles.sectionSubtitle}>
              Serves {dish.servings ?? servings}{' '}
              {(dish.servings ?? servings) === 1 ? 'person' : 'people'}
            </Text>
          </View>
          <View style={styles.ingredientsList}>
            {ingredientLines.map((ingredient, index) => (
              <Text key={`${ingredient}-${index}`} style={styles.ingredient}>
                - {ingredient}
              </Text>
            ))}
          </View>
        </View>

        {!!instructionsLines.length && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Instructions</Text>
              <Text style={styles.sectionSubtitle}>Follow steps in order</Text>
            </View>
            <View style={styles.instructionsList}>
              {instructionsLines.map((line, index) => (
                <Text key={`${index}-${line}`} style={styles.instructions}>
                  {index + 1}. {line}
                </Text>
              ))}
            </View>
          </View>
        )}

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
    gap: 12,
    marginBottom: 16,
  },
  titleContainer: {
    flex: 1,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaSummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2C3E50',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  costRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flexWrap: 'wrap',
    marginBottom: 4,
  },
  costBlock: {
    backgroundColor: '#F7F9FB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#E1E8ED',
  },
  costLabel: {
    fontSize: 11,
    color: '#4ECDC4',
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  costLabelAlt: {
    color: '#FF6B35',
  },
  costValue: {
    fontSize: 13,
    color: '#2C3E50',
    fontWeight: '800',
  },
  savingsPill: {
    backgroundColor: '#FFEEE2',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  savingsPillText: {
    color: '#FF6B35',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.4,
  },
  analysisBox: {
    backgroundColor: '#F7FFFE',
    borderRadius: 12,
    padding: 14,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#D5F2EF',
  },
  analysisLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0B6B64',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  analysisText: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  cuisine: {
    fontSize: 12,
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
    fontSize: 12,
    color: '#4ECDC4',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  mealLabel: {
    fontSize: 12,
    color: '#0B6B64',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  actionsCol: {
    alignItems: 'flex-end',
    gap: 10,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderWidth: 2,
    borderColor: '#E1E8ED',
    borderRadius: 14,
    backgroundColor: '#FFF',
  },
  actionBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cookedBtn: {
    borderColor: '#4ECDC4',
    backgroundColor: '#F2FFFD',
  },
  actionBtnActive: {
    borderColor: '#4ECDC4',
    backgroundColor: '#F2FFFD',
  },
  dislikeBtn: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  dislikeBtnActive: {
    backgroundColor: '#FF6B6B',
    borderColor: '#FF6B6B',
  },
  viewCookedBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#4ECDC4',
    borderWidth: 2,
    borderColor: '#4ECDC4',
  },
  viewCookedText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2C3E50',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  actionLabelActive: {
    color: '#0B6B64',
  },
  dislikeLabel: {
    color: '#FF6B6B',
  },
  dislikeLabelActive: {
    color: '#FFFFFF',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#4ECDC4',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  ingredientsList: {
    gap: 6,
  },
  ingredient: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 20,
  },
  instructionsList: {
    gap: 8,
  },
  instructions: {
    fontSize: 14,
    color: '#2C3E50',
    lineHeight: 22,
  },
});