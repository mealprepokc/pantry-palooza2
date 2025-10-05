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
import { useAuth } from '@/contexts/AuthContext';
import { GeneratedDish } from '@/types/database';
import { DishScorecard } from '@/components/DishScorecard';
import { LogOut } from 'lucide-react-native';

export default function HomeScreen() {
  const { user, signOut } = useAuth();
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
  const [mealType, setMealType] = useState<'Breakfast'|'Lunch'|'Dinner'>('Dinner');
  const [servings, setServings] = useState<number>(2);
  const [maxTime, setMaxTime] = useState<number | 'Any'>(30);
  const [mode, setMode] = useState<'strict'|'loose'>('strict');
  const regenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Auto-regenerate when servings changes and we already have a library
  useEffect(() => {
    if (!libraryAny) return;
    if (loading) return;
    if (regenTimer.current) clearTimeout(regenTimer.current);
    regenTimer.current = setTimeout(() => {
      generateDishes();
    }, 250);
    return () => {
      if (regenTimer.current) clearTimeout(regenTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [servings]);

  // Load when auth state resolves (user becomes available)
  useEffect(() => {
    if (user?.id) {
      loadUserLibrary();
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
            maxTimeMinutes: maxTime === 'Any' ? null : maxTime,
            mode,
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setGeneratedDishes(data.dishes);
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
          <Text style={styles.headerSubtitle}>Choose meal type, time, and servings (uses your Library)</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
          <LogOut size={24} color="#666" />
        </TouchableOpacity>
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

        <View style={styles.controlGroup}>
          <Text style={styles.controlLabel}>Serving Size</Text>
          <View style={styles.segmentRow}>
            {[1,2,3,4,5,6].map((n) => (
              <TouchableOpacity key={n} style={[styles.segment, servings===n && styles.segmentActive]} onPress={() => setServings(n)}>
                <Text style={[styles.segmentText, servings===n && styles.segmentTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.controlGroup}>
          <Text style={styles.controlLabel}>Max Prep Time (minutes)</Text>
          <View style={styles.segmentRow}>
            {([15,30,45,60,'Any'] as const).map((t) => (
              <TouchableOpacity key={String(t)} style={[styles.segment, maxTime===t && styles.segmentActive]} onPress={() => setMaxTime(t)}>
                <Text style={[styles.segmentText, maxTime===t && styles.segmentTextActive]}>{String(t)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.controlGroup}>
          <Text style={styles.controlLabel}>Dish Creation Mode</Text>
          <View style={styles.segmentRow}>
            {(['strict','loose'] as const).map((m) => (
              <TouchableOpacity key={m} style={[styles.segment, mode===m && styles.segmentActive]} onPress={() => setMode(m)}>
                <Text style={[styles.segmentText, mode===m && styles.segmentTextActive]}>{m==='strict' ? 'Strict' : 'Loose'}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.helper}>
            {mode==='strict' ? 'Strict: Use only your Library items plus pantry staples (salt, pepper, oil, water).' : 'Loose: Prefer your Library; allow reasonable additions/substitutions.'}
          </Text>
        </View>

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
});
