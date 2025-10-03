import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { DropdownSelector } from '@/components/DropdownSelector';
import { SEASONINGS, VEGETABLES, ENTREES, PASTAS, EQUIPMENT } from '@/constants/ingredients';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { GeneratedDish } from '@/types/database';
import { DishScorecard } from '@/components/DishScorecard';
import { LogOut } from 'lucide-react-native';

export default function HomeScreen() {
  const { user, signOut } = useAuth();
  const [seasonings, setSeasonings] = useState<string[]>([]);
  const [vegetables, setVegetables] = useState<string[]>([]);
  const [entrees, setEntrees] = useState<string[]>([]);
  const [pastas, setPastas] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [generatedDishes, setGeneratedDishes] = useState<GeneratedDish[]>([]);
  const [error, setError] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const [dishesOffsetY, setDishesOffsetY] = useState<number | null>(null);

  useEffect(() => {
    loadUserSelections();
  }, []);

  const loadUserSelections = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('user_selections')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setSeasonings(data.seasonings || []);
      setVegetables(data.vegetables || []);
      setEntrees(data.entrees || []);
      setPastas(data.pastas || []);
      setEquipment(data.equipment || []);
    }
  };

  const saveUserSelections = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('user_selections')
      .upsert({
        user_id: user.id,
        seasonings,
        vegetables,
        entrees,
        pastas,
        equipment,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      console.error('Error saving selections:', error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      saveUserSelections();
    }, 500);

    return () => clearTimeout(timer);
  }, [seasonings, vegetables, entrees, pastas, equipment]);

  const toggleItem = (list: string[], setList: (items: string[]) => void, item: string) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const generateDishes = async () => {
    if (!seasonings.length && !vegetables.length && !entrees.length && !pastas.length) {
      setError('Please select at least some ingredients');
      return;
    }

    if (!equipment.length) {
      setError('Please select at least one cooking equipment');
      return;
    }

    setLoading(true);
    setError('');
    setGeneratedDishes([]);

    try {
      const { data, error } = await supabase.functions.invoke('generate-dishes', {
        body: {
          seasonings,
          vegetables,
          entrees,
          pastas,
          equipment,
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

  const hasSelections = seasonings.length > 0 || vegetables.length > 0 || entrees.length > 0 || pastas.length > 0;
  const totalSelected = seasonings.length + vegetables.length + entrees.length + pastas.length;
  const remainingGlobal = Math.max(0, 30 - totalSelected);

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
          <Text style={styles.headerSubtitle}>Select your ingredients</Text>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
          <LogOut size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView ref={scrollRef} style={styles.scrollView} contentContainerStyle={styles.content}>
        <DropdownSelector
          title="Seasonings"
          items={SEASONINGS}
          selectedItems={seasonings}
          onToggle={(item) => toggleItem(seasonings, setSeasonings, item)}
          maxSelections={seasonings.length + remainingGlobal}
        />

        <DropdownSelector
          title="Vegetables"
          items={VEGETABLES}
          selectedItems={vegetables}
          onToggle={(item) => toggleItem(vegetables, setVegetables, item)}
          maxSelections={vegetables.length + remainingGlobal}
        />

        <DropdownSelector
          title="Proteins"
          items={ENTREES}
          selectedItems={entrees}
          onToggle={(item) => toggleItem(entrees, setEntrees, item)}
          maxSelections={entrees.length + remainingGlobal}
        />

        <DropdownSelector
          title="Pasta & Grains"
          items={PASTAS}
          selectedItems={pastas}
          onToggle={(item) => toggleItem(pastas, setPastas, item)}
          maxSelections={pastas.length + remainingGlobal}
        />

        <DropdownSelector
          title="Cooking Equipment"
          items={EQUIPMENT}
          selectedItems={equipment}
          onToggle={(item) => toggleItem(equipment, setEquipment, item)}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {remainingGlobal === 0 && (
          <Text style={styles.helper}>
            You\'ve reached the 30 item limit. Remove some selections to add more.
          </Text>
        )}

        <TouchableOpacity
          style={[styles.generateButton, (!hasSelections || !equipment.length) && styles.generateButtonDisabled]}
          onPress={generateDishes}
          disabled={loading || !hasSelections || !equipment.length}
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
              <DishScorecard key={index} dish={dish} />
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
