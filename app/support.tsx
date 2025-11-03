import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

const SUPPORT_EMAIL = 'pantrypalooza45@gmail.com';
const SUPPORT_SUBJECT = encodeURIComponent('Pantry Palooza Support Request');

const SUPPORT_LINKS = [
  {
    title: 'FAQ',
    description: 'Find answers to common questions and tips for using Pantry Palooza.',
    actionLabel: 'View FAQ',
    onPress: () => router.push('/faq'),
  },
  {
    title: 'Privacy Policy',
    description: 'Review how we handle your data and your rights as a user.',
    actionLabel: 'View Policy',
    onPress: () => router.push('/policy'),
  },
  {
    title: 'Request Account Deletion',
    description: 'Submit a verified request to remove your account and personal data.',
    actionLabel: 'Open Deletion Page',
    onPress: () => router.push('/deletion' as any),
  },
  {
    title: 'Report a Bug',
    description: 'Let us know if something isn\'t working as expected.',
    actionLabel: 'Email Support',
    onPress: () => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${SUPPORT_SUBJECT}`),
  },
];

export default function SupportScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Support</Text>
          <Text style={styles.subtitle}>We\'re here to help you make the most of Pantry Palooza.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact Us</Text>
          <Text style={styles.cardCopy}>
            Reach our support team anytime at
            <Text style={styles.highlight}> {SUPPORT_EMAIL}</Text>. We aim to respond within 24 hours.
          </Text>
          <TouchableOpacity
            style={styles.primaryCta}
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${SUPPORT_SUBJECT}`)}
          >
            <Text style={styles.primaryCtaText}>Email Support</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sections}>
          {SUPPORT_LINKS.map((link) => (
            <TouchableOpacity key={link.title} style={styles.section} onPress={link.onPress}>
              <View style={styles.sectionText}>
                <Text style={styles.sectionTitle}>{link.title}</Text>
                <Text style={styles.sectionCopy}>{link.description}</Text>
              </View>
              <Text style={styles.sectionAction}>{link.actionLabel}</Text>
            </TouchableOpacity>
          ))}
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
  header: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: '#2C3E50' },
  subtitle: { fontSize: 14, color: '#5D6D7E', marginTop: 6 },
  card: {
    borderWidth: 2,
    borderColor: '#E1E8ED',
    borderRadius: 14,
    backgroundColor: '#F9F9FB',
    padding: 18,
    marginBottom: 24,
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#2C3E50', marginBottom: 8 },
  cardCopy: { fontSize: 15, color: '#2C3E50', lineHeight: 22 },
  highlight: { fontWeight: '700' },
  primaryCta: {
    marginTop: 14,
    backgroundColor: '#4ECDC4',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryCtaText: { color: '#FFFFFF', fontWeight: '800', fontSize: 16 },
  sections: { gap: 14 },
  section: {
    borderWidth: 2,
    borderColor: '#E1E8ED',
    borderRadius: 14,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  sectionText: { marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#2C3E50' },
  sectionCopy: { fontSize: 14, color: '#5A6C7D', marginTop: 4 },
  sectionAction: { fontSize: 14, fontWeight: '700', color: '#4ECDC4' },
});
