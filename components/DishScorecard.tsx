import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { GeneratedDish } from '@/types/database';
import { BookmarkPlus, BookmarkCheck, Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface DishScorecardProps {
  dish: GeneratedDish;
  isSaved?: boolean;
  onSaveToggle?: () => void;
}

export function DishScorecard({ dish, isSaved = false, onSaveToggle }: DishScorecardProps) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(isSaved);
  const [saving, setSaving] = useState(false);

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
    <View style={styles.card}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{dish.title}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.cuisine}>{dish.cuisine_type}</Text>
              <View style={styles.timeContainer}>
                <Clock size={14} color="#5A6C7D" />
                <Text style={styles.time}>{dish.cooking_time}</Text>
              </View>
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
    </View>
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
    color: '#5A6C7D',
    fontWeight: '600',
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
