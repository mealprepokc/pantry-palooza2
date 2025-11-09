// app/(tabs)/library.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ToastAndroid,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  MASTER_SECTIONS,
  MEAL_SECTION_MAP,
  type MasterLibrary,
  type MasterSection,
  createEmptyMasterLibrary,
} from '@/types/library';
import { getDefaultPantryItems, getSuggestedPantryItems } from '@/constants/pantryDefaults';

const SECTION_COLUMN_MAP: Record<MasterSection, string> = {
  Seasonings: 'seasonings',
  Produce: 'produce',
  Proteins: 'proteins',
  Grains: 'grains',
  Breads: 'breads',
  Dairy: 'dairy',
  'Sauces/Condiments': 'sauces_condiments',
  'Non-Perishable Items': 'non_perishables',
  Pasta: 'pastas',
  Equipment: 'equipment',
};

const SECTION_DEFAULTS: Record<MasterSection, string[]> = MASTER_SECTIONS.reduce((acc, section) => {
  acc[section] = getDefaultPantryItems(section);
  return acc;
}, {} as Record<MasterSection, string[]>);

const STARTER_ITEMS_PER_SECTION = 3;

const buildStarterLibrary = () => {
  const starter = createEmptyMasterLibrary();
  MASTER_SECTIONS.forEach((section) => {
    const defaults = SECTION_DEFAULTS[section];
    if (defaults.length > 0) {
      starter[section] = defaults.slice(0, STARTER_ITEMS_PER_SECTION);
    }
  });
  return starter;
};

const USER_SECTION_SUGGESTIONS: Record<MasterSection, string[]> = MASTER_SECTIONS.reduce((acc, section) => {
  acc[section] = getSuggestedPantryItems(section);
  return acc;
}, {} as Record<MasterSection, string[]>);

const normalizeList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  value.forEach((item) => {
    const text = String(item ?? '').trim();
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(capitalize(text));
  });
  return out.sort((a, b) => a.localeCompare(b));
};

const toMasterLibrary = (row: Record<string, unknown>): MasterLibrary => {
  const base = createEmptyMasterLibrary();
  MASTER_SECTIONS.forEach((section) => {
    const column = SECTION_COLUMN_MAP[section];
    base[section] = normalizeList(row?.[column]);
  });
  return base;
};

type LibraryPayload = { [key: string]: string[] } & { user_id?: string };

const toPayload = (library: MasterLibrary) => {
  const payload: LibraryPayload = {};
  MASTER_SECTIONS.forEach((section) => {
    const column = SECTION_COLUMN_MAP[section];
    payload[column] = library[section] ?? [];
  });
  return payload;
};

const capitalize = (text: string): string =>
  text
    .split(' ')
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(' ');

const buildEmptyInputs = () => {
  return MASTER_SECTIONS.reduce((acc, section) => {
    acc[section] = '';
    return acc;
  }, {} as Record<MasterSection, string>);
};

const buildCollapsedState = () => {
  return MASTER_SECTIONS.reduce((acc, section) => {
    acc[section] = false;
    return acc;
  }, {} as Record<MasterSection, boolean>);
};

export default function LibraryScreen() {
  const { user } = useAuth();
  const [library, setLibrary] = useState<MasterLibrary>(() => createEmptyMasterLibrary());
  const [inputs, setInputs] = useState<Record<MasterSection, string>>(() => buildEmptyInputs());
  const [collapsed, setCollapsed] = useState<Record<MasterSection, boolean>>(() => buildCollapsedState());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unsaved, setUnsaved] = useState(false);
  const [compactHeader, setCompactHeader] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);
  const hasShownOnboardingRef = useRef(false);

  const totalSelected = useMemo(
    () => MASTER_SECTIONS.reduce((sum, section) => sum + (library[section]?.length || 0), 0),
    [library]
  );

  const readyMeals = useMemo(() => {
    return Object.entries(MEAL_SECTION_MAP).reduce((acc, [meal, sections]) => {
      const complete = sections.every((section) => (library[section as MasterSection]?.length || 0) > 0);
      if (complete) acc.push(meal);
      return acc;
    }, [] as string[]);
  }, [library]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('user_library')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (!cancelled && data) {
          setLibrary(toMasterLibrary(data));
          setUnsaved(false);
        }

        let legacySelection: Record<string, unknown> | null = null;
        if (!data) {
          const { data: legacy, error: legacyError } = await supabase
            .from('user_selections')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (legacyError) throw legacyError;

          if (!cancelled) {
            const migrated = buildStarterLibrary();
            const legacySeasonings = normalizeList(legacy?.seasonings);
            const legacyProduce = normalizeList(legacy?.vegetables);
            const legacyProteins = normalizeList(legacy?.entrees);
            const legacyPastas = normalizeList(legacy?.pastas);
            const legacyEquipment = normalizeList(legacy?.equipment);
            migrated.Seasonings = legacySeasonings.length
              ? legacySeasonings
              : migrated.Seasonings;
            migrated.Produce = legacyProduce.length
              ? legacyProduce
              : migrated.Produce;
            migrated.Proteins = legacyProteins.length
              ? legacyProteins
              : migrated.Proteins;
            migrated.Pasta = legacyPastas.length
              ? legacyPastas
              : migrated.Pasta;
            migrated.Equipment = legacyEquipment.length
              ? legacyEquipment
              : migrated.Equipment;
            setLibrary(migrated);
            setUnsaved(true);
            legacySelection = legacy ?? null;
          }
        }
        if (!data && !legacySelection) {
          const starter = buildStarterLibrary();
          if (!cancelled) {
            setLibrary(starter);
            setUnsaved(true);
          }
        }
      } catch (err) {
        console.error('Load library error', err);
        if (!cancelled) Alert.alert('Error', 'Unable to load your library. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleCollapsed = useCallback((section: MasterSection) => {
    setCollapsed((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const shouldCompact = offsetY > 60;
      setCompactHeader((prev) => (prev !== shouldCompact ? shouldCompact : prev));
      if (!hasScrolled && offsetY > 4) {
        setHasScrolled(true);
      }
    },
    [hasScrolled]
  );

  const toggleItem = useCallback((section: MasterSection, item: string) => {
    const normalized = capitalize(item);
    setLibrary((prev) => {
      const current = prev[section] ?? [];
      const exists = current.some((value) => value.toLowerCase() === normalized.toLowerCase());
      const updated = exists
        ? current.filter((value) => value.toLowerCase() !== normalized.toLowerCase())
        : uniqueSorted([...current, normalized]);
      return { ...prev, [section]: updated };
    });
    setUnsaved(true);
  }, []);

  const addItems = useCallback((section: MasterSection) => {
    const raw = inputs[section] || '';
    const entries = raw
      .split(/[,\n]+/)
      .map((value) => capitalize(value.trim()))
      .filter((value) => value.length > 0);
    if (!entries.length) return;
    setLibrary((prev) => {
      const current = prev[section] ?? [];
      return {
        ...prev,
        [section]: uniqueSorted([...current, ...entries]),
      };
    });
    setInputs((prev) => ({ ...prev, [section]: '' }));
    setUnsaved(true);
  }, [inputs]);

  const hasMinimumForAnyMeal = useMemo(() => {
    return Object.values(MEAL_SECTION_MAP).some((sections) =>
      sections.every((section) => (library[section as MasterSection]?.length ?? 0) > 0)
    );
  }, [library]);

  const canSave = unsaved && hasMinimumForAnyMeal;

  const showSaveToast = useCallback(() => {
    const message =
      'Add at least one item per meal section, then save your Library to unlock Generate Dishes.';
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.LONG);
    } else {
      Alert.alert('Almost there', message);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!canSave) {
      showSaveToast();
      return;
    }
    if (!user) return;
    try {
      setSaving(true);
      const payload = toPayload(library);
      payload.user_id = user.id;
      const { error } = await supabase.from('user_library').upsert(payload, { onConflict: 'user_id' });
      if (error) throw error;
      setUnsaved(false);
      const successMessage = 'Library saved! Generate a meal idea next.';
      if (Platform.OS === 'android') {
        ToastAndroid.show(successMessage, ToastAndroid.SHORT);
      } else {
        Alert.alert('Saved', successMessage);
      }
      router.replace({ pathname: '/(tabs)', params: { meal: 'Breakfast' } } as any);
    } catch (err) {
      console.error('Save library error', err);
      Alert.alert('Error', 'Could not save your library. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [canSave, library, showSaveToast, user]);

  const statusLabel = hasMinimumForAnyMeal ? (unsaved ? 'Needs Save' : 'Ready') : 'Keep Adding';
  const statusStyle = hasMinimumForAnyMeal
    ? unsaved
      ? styles.statusPending
      : styles.statusReady
    : styles.statusNeutral;

  useEffect(() => {
    if (loading) return;
    if (hasShownOnboardingRef.current) return;
    if (!hasMinimumForAnyMeal) {
      showSaveToast();
      hasShownOnboardingRef.current = true;
    }
  }, [hasMinimumForAnyMeal, loading, showSaveToast]);

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoider}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 80}
      >
        <View style={[styles.header, compactHeader && styles.headerCompact]}>
          <Text style={[styles.headerTitle, compactHeader && styles.headerTitleCompact]}>Your Master Library</Text>
          {!compactHeader && (
            <Text style={styles.headerSubtitle}>
              Build a single pantry that powers Breakfast, Lunch, and Dinner. Tap to toggle suggestions, add
              custom items, and save when you are done.
            </Text>
          )}
        </View>

        {hasScrolled && (
          <View style={[styles.summaryCard, compactHeader && styles.summaryCardCompact]}>
            <View>
              <Text style={styles.summaryTitle}>{totalSelected} items saved</Text>
              {!compactHeader && (
                <Text style={styles.summaryDescription}>
                  Ready for {readyMeals.length ? readyMeals.join(', ') : 'no meals yet'}. Add at least one item per
                  category to unlock better suggestions.
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={[styles.statusBadge, statusStyle]}
              activeOpacity={0.8}
              onPress={() => {
                if (!canSave) showSaveToast();
              }}
            >
              <Text style={styles.statusBadgeText} numberOfLines={1} ellipsizeMode="tail">
                {statusLabel}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" />
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {MASTER_SECTIONS.map((section) => {
              const selectedItems = library[section] ?? [];
              const defaults = SECTION_DEFAULTS[section];
              const defaultSet = new Set(defaults.map((item) => item.toLowerCase()));
              const suggestions = USER_SECTION_SUGGESTIONS[section].filter(
                (item) => !defaultSet.has(item.toLowerCase())
              );
              const suggestionSet = new Set(suggestions.map((item) => item.toLowerCase()));
              const customItems = selectedItems.filter((item) => {
                const key = item.toLowerCase();
                return !defaultSet.has(key) && !suggestionSet.has(key);
              });
              const isCollapsed = collapsed[section];

              return (
                <View key={section} style={styles.sectionCard}>
                  <TouchableOpacity
                    style={styles.sectionHeader}
                    onPress={() => toggleCollapsed(section)}
                    activeOpacity={0.7}
                  >
                    <View>
                      <Text style={styles.sectionTitle}>{section}</Text>
                      <Text style={styles.sectionMeta}>{selectedItems.length} selected</Text>
                    </View>
                    <Text style={styles.sectionCollapse}>{isCollapsed ? '+' : '−'}</Text>
                  </TouchableOpacity>

                  {!isCollapsed && (
                    <>
                      <View style={styles.subSectionHeader}>
                        <Text style={styles.subSectionTitle}>Recommended</Text>
                      </View>
                      <View style={styles.chipGrid}>
                        {defaults.map((item) => {
                          const active = selectedItems.some((value) => value.toLowerCase() === item.toLowerCase());
                          return (
                            <TouchableOpacity
                              key={item}
                              style={[styles.chip, active && styles.chipActive]}
                              onPress={() => toggleItem(section, item)}
                            >
                              <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {suggestions.length > 0 ? (
                        <>
                          <View style={styles.subSectionHeader}>
                            <Text style={styles.subSectionTitle}>More ideas</Text>
                          </View>
                          <View style={styles.chipGrid}>
                            {suggestions.map((item) => {
                              const active = selectedItems.some(
                                (value) => value.toLowerCase() === item.toLowerCase()
                              );
                              return (
                                <TouchableOpacity
                                  key={item}
                                  style={[styles.chip, styles.chipGhost, active && styles.chipActive]}
                                  onPress={() => toggleItem(section, item)}
                                >
                                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{item}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </>
                      ) : null}

                      {customItems.length > 0 ? (
                        <>
                          <View style={styles.subSectionHeader}>
                            <Text style={styles.subSectionTitle}>Your items</Text>
                          </View>
                          <View style={styles.customGrid}>
                            {customItems.map((item) => (
                              <TouchableOpacity
                                key={item}
                                style={styles.customChip}
                                onPress={() => toggleItem(section, item)}
                              >
                                <Text style={styles.customChipText}>{item}</Text>
                                <Text style={styles.customChipRemove}>×</Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </>
                      ) : null}

                      <View style={styles.addRow}>
                        <TextInput
                          style={styles.addInput}
                          placeholder={`Add items to ${section.toLowerCase()}`}
                          value={inputs[section]}
                          onChangeText={(value) => setInputs((prev) => ({ ...prev, [section]: value }))}
                          multiline
                          blurOnSubmit={false}
                          autoCapitalize="words"
                          autoCorrect
                        />
                        <TouchableOpacity style={styles.addButton} onPress={() => addItems(section)}>
                          <Text style={styles.addButtonText}>Add</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              );
            })}

            <View style={{ height: 24 }} />
          </ScrollView>
        )}

        {hasScrolled && (
          <TouchableOpacity
            style={[styles.primaryButton, (!canSave || saving) && styles.primaryButtonDisabled]}
            disabled={saving || !canSave}
            onPress={handleSave}
            activeOpacity={canSave ? 0.85 : 1}
          >
            <Text style={styles.primaryButtonText}>{saving ? 'Saving…' : 'Save Library'}</Text>
          </TouchableOpacity>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const uniqueSorted = (items: string[]) => Array.from(new Set(items)).sort((a, b) => a.localeCompare(b));

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F9FB',
  },
  keyboardAvoider: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerCompact: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
  },
  headerTitleCompact: {
    fontSize: 22,
    marginBottom: 0,
  },
  headerSubtitle: {
    fontSize: 15,
    lineHeight: 20,
    color: '#5A6C7D',
  },
  summaryCard: {
    marginHorizontal: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E1E8ED',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#0000000d',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  summaryCardCompact: {
    paddingVertical: 12,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C3E50',
    marginBottom: 4,
  },
  summaryDescription: {
    fontSize: 14,
    color: '#5A6C7D',
    maxWidth: '80%',
  },
  statusBadge: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
    alignSelf: 'flex-start',
    flexShrink: 1,
    marginLeft: 12,
    minWidth: 140,
    maxWidth: '65%',
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B2A34',
    textAlign: 'center',
  },
  statusPending: {
    backgroundColor: '#FFE8B5',
  },
  statusReady: {
    backgroundColor: '#D9F5EF',
  },
  statusNeutral: {
    backgroundColor: '#E8EEF5',
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 96,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    shadowColor: '#0000000d',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2C3E50',
  },
  sectionMeta: {
    fontSize: 13,
    color: '#5A6C7D',
    marginTop: 4,
  },
  sectionCollapse: {
    fontSize: 24,
    color: '#4ECDC4',
    paddingHorizontal: 4,
  },
  subSectionHeader: {
    marginTop: 12,
    marginBottom: 8,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7A8A99',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E1E8ED',
    backgroundColor: '#FFFFFF',
  },
  chipGhost: {
    backgroundColor: 'transparent',
  },
  chipActive: {
    borderColor: '#4ECDC4',
    backgroundColor: 'rgba(78, 205, 196, 0.16)',
  },
  chipText: {
    color: '#2C3E50',
    fontSize: 14,
  },
  chipTextActive: {
    color: '#0F2F33',
    fontWeight: '600',
  },
  customGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  customChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#E8EEF5',
  },
  customChipText: {
    color: '#2C3E50',
    marginRight: 6,
  },
  customChipRemove: {
    color: '#E74C3C',
    fontWeight: '700',
  },
  addRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  addInput: {
    flex: 1,
    minHeight: 48,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#2C3E50',
    borderWidth: 1,
    borderColor: '#E1E8ED',
    fontSize: 15,
  },
  addButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  primaryButton: {
    margin: 24,
    marginTop: 12,
    borderRadius: 16,
    backgroundColor: '#4ECDC4',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  primaryButtonDisabled: {
    backgroundColor: '#BDEBE4',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});