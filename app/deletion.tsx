import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const SUPPORT_EMAIL = 'pantrypalooza45@gmail.com';
const SUPPORT_SUBJECT = encodeURIComponent('Pantry Palooza Account Deletion Request');

export default function DeletionRequestScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.hero}>
          <Text style={styles.title}>Request Account Deletion</Text>
          <Text style={styles.subtitle}>
            Use this page to securely request removal of your Pantry Palooza account and associated data.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>How to submit your request</Text>
          <Text style={styles.cardCopy}>
            Send us a message using the email address that is linked to your Pantry Palooza account. We will
            verify the request and remove eligible data within 30 days unless we are legally required to retain
            certain records.
          </Text>
          <TouchableOpacity
            style={styles.primaryCta}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${SUPPORT_SUBJECT}`)}
            accessibilityRole="button"
          >
            <Text style={styles.primaryCtaText}>Email Deletion Request</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What gets deleted</Text>
          <Text style={styles.sectionCopy}>
            When your request is confirmed, we delete your account, pantry Library, generated dishes, saved meals,
            analytics events, and other personal data stored in Supabase. Aggregated, non-identifying metrics may be
            retained for service reliability.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Need help right now?</Text>
          <Text style={styles.sectionCopy}>
            If you can’t access the email tied to your account or have urgent questions, contact us at the email
            above and include alternate verification details so we can locate your account.
          </Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerPrompt}>Want to review our full data practices?</Text>
          <TouchableOpacity onPress={() => router.push('/policy')} accessibilityRole="link">
            <Text style={styles.footerLink}>Read the Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  backBtn: {
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderColor: '#E1E8ED',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginTop: 16,
    marginBottom: 16,
    backgroundColor: '#FFF',
  },
  backText: { color: '#2C3E50', fontWeight: '700' },
  hero: { marginBottom: 24 },
  title: { fontSize: 28, fontWeight: '800', color: '#2C3E50', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#5D6D7E', lineHeight: 20 },
  card: {
    borderWidth: 2,
    borderColor: '#E1E8ED',
    borderRadius: 14,
    backgroundColor: '#F9F9FB',
    padding: 20,
    gap: 12,
    marginBottom: 24,
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#2C3E50' },
  cardCopy: { fontSize: 15, color: '#2C3E50', lineHeight: 22 },
  primaryCta: {
    marginTop: 4,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryCtaText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  section: {
    borderWidth: 2,
    borderColor: '#E1E8ED',
    borderRadius: 14,
    padding: 18,
    backgroundColor: '#FFFFFF',
    marginBottom: 18,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#2C3E50', marginBottom: 8 },
  sectionCopy: { fontSize: 14, color: '#5A6C7D', lineHeight: 20 },
  footer: { marginTop: 24, alignItems: 'center', gap: 8 },
  footerPrompt: { fontSize: 14, color: '#5A6C7D' },
  footerLink: { fontSize: 15, fontWeight: '700', color: '#4ECDC4' },
});
