import React, { useState, useEffect } from 'react';
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <DropdownSelector
          title="Seasonings"
          items={SEASONINGS}
          selectedItems={seasonings}
          onToggle={(item) => toggleItem(seasonings, setSeasonings, item)}
        />

        <DropdownSelector
          title="Vegetables"
          items={VEGETABLES}
          selectedItems={vegetables}
          onToggle={(item) => toggleItem(vegetables, setVegetables, item)}
        />

        <DropdownSelector
          title="Entrees"
          items={ENTREES}
          selectedItems={entrees}
          onToggle={(item) => toggleItem(entrees, setEntrees, item)}
        />

        <DropdownSelector
          title="Pasta & Grains"
          items={PASTAS}
          selectedItems={pastas}
          onToggle={(item) => toggleItem(pastas, setPastas, item)}
        />

        <DropdownSelector
          title="Cooking Equipment"
          items={EQUIPMENT}
          selectedItems={equipment}
          onToggle={(item) => toggleItem(equipment, setEquipment, item)}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

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
          <View style={styles.dishesContainer}>
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
