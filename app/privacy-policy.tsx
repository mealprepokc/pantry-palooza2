import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionBody}>{children}</View>
  </View>
);

export default function PrivacyPolicyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Pantry Palooza Privacy Policy</Text>
        <Text style={styles.updated}>Last updated: November 19, 2025</Text>

        <Text style={styles.paragraph}>
          Pantry Palooza (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) provides tools that help you organize pantry items and generate meal ideas.
          This Privacy Policy explains how we collect, use, share, and protect personal information when you use the Pantry
          Palooza mobile apps, web experience, and related services (collectively, the &quot;Services&quot;). It also explains the choices
          you have about your data. Questions or requests? Email <Text style={styles.link}>support@pantrypalooza.com</Text>.
        </Text>

        <Section title="1. Information We Collect">
          <Text style={styles.paragraph}>
            • <Text style={styles.bold}>Account Information:</Text> Email address, authentication tokens, and optional profile name stored in Supabase Auth.
          </Text>
          <Text style={styles.paragraph}>
            • <Text style={styles.bold}>Pantry & Meal Preferences:</Text> Pantry library items, dietary settings, servings, saved/cooked dishes, dislikes.
          </Text>
          <Text style={styles.paragraph}>
            • <Text style={styles.bold}>Generated Content:</Text> Dish requests and AI-generated recipes so we can deliver results and reduce duplicates.
          </Text>
          <Text style={styles.paragraph}>
            • <Text style={styles.bold}>Device & Usage Data:</Text> IP address, device type, OS version, app version, and analytics events collected through
            Expo tooling and Vercel Analytics to monitor performance and reliability.
          </Text>
          <Text style={styles.paragraph}>
            • <Text style={styles.bold}>Support Communications:</Text> Emails and in-app feedback so we can respond to you.
          </Text>
          <Text style={styles.paragraph}>We do not intentionally collect sensitive health data. Meal suggestions are informational only.</Text>
        </Section>

        <Section title="2. How We Use Information">
          <Text style={styles.paragraph}>• Provide and maintain the Services, including syncing your pantry and generating dishes.</Text>
          <Text style={styles.paragraph}>• Authenticate you, secure your account, and personalize results.</Text>
          <Text style={styles.paragraph}>• Communicate service updates and respond to support requests.</Text>
          <Text style={styles.paragraph}>• Monitor reliability, debug issues, enforce rate limits, and protect against abuse.</Text>
          <Text style={styles.paragraph}>• Comply with legal obligations and enforce our Terms. We do not sell your personal information.</Text>
        </Section>

        <Section title="3. How AI Models Are Used">
          <Text style={styles.paragraph}>
            Pantry Palooza sends your selected ingredients and filters to OpenAI&apos;s GPT-4o API to generate dishes off-device. Strict mode applies an allowlist
            so recipes stay within the ingredients you toggled plus basic staples. We filter cached and newly generated dishes against your dislikes.
          </Text>
          <Text style={styles.paragraph}>
            Generated content is informational only. Always verify cooking times, temperatures, and nutrition with qualified professionals.
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>AI Safety Measures:</Text> inputs are limited to food planning, outputs run through sanitizers and allowlists, and rate-limit
            logs help prevent abuse.
          </Text>
        </Section>

        <Section title="4. Service Providers & Data Sharing">
          <Text style={styles.paragraph}>• Supabase (authentication, database, storage).</Text>
          <Text style={styles.paragraph}>• OpenAI (AI-generated meal ideas via GPT-4o).</Text>
          <Text style={styles.paragraph}>• Vercel (web hosting, analytics for web builds).</Text>
          <Text style={styles.paragraph}>• Expo & EAS (app distribution, OTA updates, crash tooling).</Text>
          <Text style={styles.paragraph}>
            We may disclose limited information if required by law or to prevent fraud. We do not share your data with advertising networks.
          </Text>
        </Section>

        <Section title="5. Data Retention">
          <Text style={styles.paragraph}>Account data remains while your account is active.</Text>
          <Text style={styles.paragraph}>Generated dishes, dislikes, and cache entries are retained for up to 12 months to provide history and faster results.</Text>
          <Text style={styles.paragraph}>Operational analytics and event logs are retained for up to 18 months.</Text>
          <Text style={styles.paragraph}>We delete or anonymize data when it is no longer needed or once a verified deletion request is processed.</Text>
        </Section>

        <Section title="6. Your Choices & Rights">
          <Text style={styles.paragraph}>Manage pantry items, dietary prefs, and account info in-app.</Text>
          <Text style={styles.paragraph}>Request data export or deletion by emailing support@pantrypalooza.com from your registered address.</Text>
          <Text style={styles.paragraph}>Opt out of marketing emails via unsubscribe links or by contacting us.</Text>
          <Text style={styles.paragraph}>Depending on your region (e.g., GDPR/CCPA), additional rights may apply—contact us to exercise them.</Text>
        </Section>

        <Section title="7. Security">
          <Text style={styles.paragraph}>We use HTTPS/TLS, Supabase row-level security, and access controls. No system is perfectly secure—use strong credentials and alert us to suspicious activity.</Text>
        </Section>

        <Section title="8. Children">
          <Text style={styles.paragraph}>The Services are not directed to children under 13. If a child has provided data, contact us and we will delete it.</Text>
        </Section>

        <Section title="9. Changes">
          <Text style={styles.paragraph}>We may update this policy as the Services evolve. We will post the new date and, for significant changes, notify you via in-app notice or email.</Text>
        </Section>

        <Section title="10. Contact">
          <Text style={styles.paragraph}>
            Email <Text style={styles.link}>support@pantrypalooza.com</Text> or write to: Pantry Palooza Support, PO Box 12345, Oklahoma City, OK 73101, USA.
          </Text>
        </Section>

        <Section title="11. Health & Nutritional Disclaimer">
          <Text style={styles.paragraph}>
            Pantry Palooza provides meal suggestions and nutritional estimates for informational purposes only. We are not a medical or dietary service. Always confirm
            ingredient suitability, cooking temperatures, and nutrition with qualified professionals, especially if you have allergies or medical conditions.
          </Text>
        </Section>

        <Section title="12. Data Deletion Instructions">
          <Text style={styles.paragraph}>
            To delete your data, request account deletion via the in-app option or email support@pantrypalooza.com with the subject &quot;Data Deletion Request&quot;. Provide the
            email tied to your account. We will confirm deletion within 30 days, removing Supabase records, cached dishes, and analytics identifiers except where law requires retention.
          </Text>
        </Section>
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
    paddingTop: 16,
  },
  heading: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 6,
  },
  updated: {
    color: '#5A6C7D',
    marginBottom: 16,
  },
  paragraph: {
    fontSize: 15,
    color: '#2C3E50',
    lineHeight: 22,
    marginBottom: 12,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 10,
  },
  sectionBody: {
    borderLeftWidth: 3,
    borderLeftColor: '#E1E8ED',
    paddingLeft: 12,
  },
  bold: {
    fontWeight: '700',
  },
  link: {
    color: '#1B95E0',
    fontWeight: '600',
  },
});
