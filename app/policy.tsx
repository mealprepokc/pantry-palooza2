import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const SECTIONS = [
  {
    title: '1. Introduction',
    body: [
      'Pantry Palooza (“we,” “our,” or “us”) helps you plan meals using ingredients you already have. This Privacy Policy explains how we collect, use, and safeguard information when you use our mobile app and website. By using Pantry Palooza, you agree to the practices described here.',
    ],
  },
  {
    title: '2. Information We Collect',
    body: [
      'Account Information: Email address, display name, and authentication metadata handled through Supabase.',
      'Pantry & App Data: Ingredients, dietary preferences, saved dishes, meal requests, and settings you store in the app.',
      'Generated Content: Prompts you send to generate meal ideas and the AI results returned by our OpenAI integration.',
      'Device & Usage Data: Device model, operating system, app version, and diagnostic logs that help keep the service reliable.',
      'Optional Feedback: Responses you voluntarily share through surveys or support requests.',
    ],
  },
  {
    title: '3. How We Use Information',
    body: [
      'Deliver core features such as pantry syncing, dish suggestions, saved lists, and notifications.',
      'Protect the service, detect abuse, and keep accounts secure.',
      'Improve Pantry Palooza by analyzing anonymized usage trends.',
      'Send feature updates and important notices.',
      'Comply with legal obligations and respond to lawful requests.',
    ],
  },
  {
    title: '4. Sharing of Information',
    body: [
      'We do not sell your data. We only share information with trusted service providers that help us run the app (Supabase for auth/storage, OpenAI for meal generation, Expo for builds/OTA updates, and analytics providers) and when required by law.',
    ],
  },
  {
    title: '5. Data Retention',
    body: [
      'Account data is stored while your account remains active. You may request deletion at any time. Logs and aggregated analytics are retained only as long as necessary to maintain and improve the service.',
    ],
  },
  {
    title: '6. Security',
    body: [
      'We use industry-standard safeguards, including secure authentication and HTTPS encryption. No system is completely risk free, so we encourage you to use strong, unique credentials.',
    ],
  },
  {
    title: '7. Children’s Privacy',
    body: [
      'Pantry Palooza is not directed to children under 13. If you believe a child has provided personal data, contact us and we will remove it.',
    ],
  },
  {
    title: '8. Your Choices',
    body: [
      'Manage pantry items, preferences, and saved dishes from the app settings.',
      'Request account deletion by emailing pantrypalooza45@gmail.com. We will remove associated data from Supabase within 30 days unless legally required to retain it.',
      'Opt out of non-essential emails using the unsubscribe link or by contacting support.',
    ],
  },
  {
    title: '9. Request Account or Data Deletion',
    body: [
      'You can request the deletion of your Pantry Palooza account and associated data at any time.',
      'Submit your request at https://pantrypalooza.app/support or email pantrypalooza45@gmail.com using the same address tied to your account.',
      'We will acknowledge your request and remove eligible data within 30 days unless we are legally required to retain certain records.',
    ],
  },
  {
    title: '10. International Users',
    body: [
      'Your information may be processed in the United States or other countries where our service providers operate. By using Pantry Palooza, you consent to these transfers.',
    ],
  },
  {
    title: '11. Changes to this Policy',
    body: [
      'We may update this Privacy Policy. If changes are significant, we will notify you through the app or by email. Continued use of Pantry Palooza after updates constitutes acceptance.',
    ],
  },
  {
    title: '12. Contact Us',
    body: [
      'Pantry Palooza',
      'Email: pantrypalooza45@gmail.com',
      'Mail: 123 Meal Prep Way, Oklahoma City, OK 73101 (update with your official mailing address before launch).',
    ],
  },
];

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.subtitle}>Effective date: October 27, 2025</Text>
        </View>
        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.body.map((paragraph) => (
              <Text key={paragraph} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
    marginTop: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#5D6D7E',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    color: '#2C3E50',
    marginBottom: 10,
  },
});
