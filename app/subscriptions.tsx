import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function SubscriptionsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Subscriptions</Text>
        <Text style={styles.subtitle}>Coming soon</Text>
        <Text style={styles.body}>
          We are working on subscription plans to unlock premium features (more dish generations, advanced dietary profiles, and more).
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Free</Text>
          <Text style={styles.cardPoint}>• Core features</Text>
          <Text style={styles.cardPoint}>• Save dishes, Cooked tracking</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Pro (Soon)</Text>
          <Text style={styles.cardPoint}>• Higher daily generations</Text>
          <Text style={styles.cardPoint}>• Advanced filters & analytics</Text>
          <Text style={styles.cardPoint}>• Priority features</Text>
          <TouchableOpacity style={styles.cta} onPress={() => Alert.alert('Coming soon', 'Subscriptions will be available soon!')}>
            <Text style={styles.ctaText}>Notify Me</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.secondary} onPress={() => router.back()}>
          <Text style={styles.secondaryText}>Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  content: { padding: 20 },
  title: { fontSize: 24, fontWeight: '800', color: '#2C3E50' },
  subtitle: { marginTop: 4, color: '#5A6C7D' },
  body: { marginTop: 12, color: '#2C3E50' },
  card: { borderWidth: 2, borderColor: '#E1E8ED', borderRadius: 14, padding: 16, marginTop: 16 },
  cardTitle: { fontWeight: '800', color: '#2C3E50', marginBottom: 6 },
  cardPoint: { color: '#2C3E50' },
  cta: { backgroundColor: '#4ECDC4', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignSelf: 'flex-start', marginTop: 10 },
  ctaText: { color: '#FFF', fontWeight: '800' },
  secondary: { borderWidth: 2, borderColor: '#E1E8ED', backgroundColor: '#FFF', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  secondaryText: { color: '#2C3E50', fontSize: 15, fontWeight: '700' },
});
