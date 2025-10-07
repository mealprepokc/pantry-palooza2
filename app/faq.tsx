import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

export default function FAQScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>FAQ</Text>

        <View style={styles.qa}>
          <Text style={styles.q}>How do I sign in?</Text>
          <Text style={styles.a}>Use the magic link in the Auth screen. After clicking the link in your email, you'll be signed in automatically.</Text>
        </View>

        <View style={styles.qa}>
          <Text style={styles.q}>How do I build my Library?</Text>
          <Text style={styles.a}>Go to Library and select the items you have on hand. Type into each category to add more items. Your dishes are generated from your Library.</Text>
        </View>

        <View style={styles.qa}>
          <Text style={styles.q}>What does Strict vs. Loose mode do?</Text>
          <Text style={styles.a}>Strict only uses your Library items (plus staples). Loose prefers your Library but allows reasonable additions/substitutions.</Text>
        </View>

        <View style={styles.qa}>
          <Text style={styles.q}>How do dietary preferences work?</Text>
          <Text style={styles.a}>Set them in Account. Your Library will hide non-compliant items and generated dishes will respect your preferences.</Text>
        </View>

        <View style={styles.qa}>
          <Text style={styles.q}>What is Cooked vs. Saved?</Text>
          <Text style={styles.a}>Saved keeps your favorites. Mark a dish as Cooked to move it into Cooked where weekly/monthly summaries appear.</Text>
        </View>

        <View style={styles.qa}>
          <Text style={styles.q}>Where is the Shopping List?</Text>
          <Text style={styles.a}>In Account, tap Shopping List. It shows items required by Saved dishes that aren't in your Library.</Text>
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
  title: { fontSize: 24, fontWeight: '800', color: '#2C3E50', marginBottom: 8 },
  qa: { marginTop: 12 },
  q: { color: '#2C3E50', fontWeight: '800', marginBottom: 4 },
  a: { color: '#2C3E50' },
  secondary: { borderWidth: 2, borderColor: '#E1E8ED', backgroundColor: '#FFF', paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  secondaryText: { color: '#2C3E50', fontSize: 15, fontWeight: '700' },
});
