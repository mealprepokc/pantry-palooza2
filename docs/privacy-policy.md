# Pantry Palooza Privacy Policy

_Last updated: November 19, 2025_

Pantry Palooza ("we," "our," or "us") provides tools that help you organize pantry items and generate meal ideas. This Privacy Policy explains how we collect, use, share, and protect personal information when you use the Pantry Palooza mobile apps, web experience, and related services (collectively, the "Services"). It also explains the choices you have about your data.

If you have questions or requests at any time, contact us at **support@pantrypalooza.com**.

---

## 1. Information We Collect

| Category | Details | Purpose |
| --- | --- | --- |
| **Account Information** | Name (optional), email address, authentication tokens, and profile selections stored through Supabase Auth. | Create and secure your account, communicate about the Service. |
| **Pantry & Meal Preferences** | Library items you add, dietary settings, serving sizes, saved and cooked dishes, dislikes. | Generate recipes, personalize suggestions, populate library and shopping lists. |
| **Generated Content** | Dish requests and AI-generated recipes. | Deliver the requested outputs, provide history, improve relevance, enforce strict-mode filtering. |
| **Device & Usage Data** | IP address, device type, OS version, app version, crash and performance analytics collected through Vercel Analytics and Expo tooling. | Maintain security, monitor performance, troubleshoot issues, understand feature usage. |
| **Support Communications** | Emails and in-app feedback messages. | Respond to inquiries and provide support. |

We do **not** intentionally collect sensitive health data. Meal suggestions are informational only.

---

## 2. How We Use Information

We process personal information to:

1. Provide and maintain the Services, including syncing your pantry library, generating dishes, and saving favorites.
2. Authenticate you and secure your account.
3. Personalize content (e.g., dietary filters, preferred ingredients).
4. Communicate service updates, onboarding guidance, and respond to support requests.
5. Monitor reliability, debug issues, and protect against abuse (e.g., rate limiting AI calls).
6. Comply with legal obligations and enforce our Terms.

We do **not** sell your personal information.

---

## 3. How AI Models Are Used

- Pantry Palooza sends your ingredient selections, context, and prompt instructions to OpenAI’s GPT-4o API to generate dishes off-device.
- Strict mode adds an allowlist to limit ingredients to those you toggled plus basic staples.
- We filter cached and newly generated dishes against your dislikes to avoid undesired ingredients or titles.
- Generated content is not guaranteed to be accurate; cooking times, temperatures, and nutrition should be verified by you.

### AI Safety Measures

- Inputs are limited to meal-planning context only.
- We restrict ingredient outputs via allowlists and sanitation logic.
- We log rate-limit data to prevent abuse and protect API quotas.

---

## 4. Service Providers & Data Sharing

We rely on third parties that process data on our behalf:

- **Supabase** (United States): authentication, database storage, file storage.
- **OpenAI** (United States): AI-generated meal ideas via GPT-4o API.
- **Vercel** (United States): web hosting, analytics on marketing site and Expo web builds.
- **Expo & EAS** (United States): app distribution tooling, OTA updates, crash reporting.

We may share limited information if required by law, to respond to legal requests, to prevent fraud or abuse, or during a business transition (e.g., merger or acquisition). We do not share your personal data for advertising networks.

---

## 5. Data Retention

- Account and pantry data remain while your account is active.
- Generated dishes, dislikes, and cache entries are retained for up to 12 months to provide history and faster results.
- Analytics and event logs are retained for operational purposes for up to 18 months.
- We delete or anonymize data when it is no longer needed or upon verified deletion requests.

---

## 6. Your Choices & Rights

- **Access & Update**: Manage pantry items, dietary preferences, and profile settings within the app.
- **Download**: Request an export of your data by emailing **support@pantrypalooza.com** from the email tied to your account.
- **Delete**: Request account deletion through in-app settings or via email. We will remove Supabase records within 30 days, subject to legal requirements.
- **Marketing Communications**: Opt out by using unsubscribe links in emails or contacting us.

Depending on your region, you may have additional rights (e.g., GDPR, CCPA). Contact us to exercise them.

---

## 7. Security

We use industry-standard safeguards, including:

- HTTPS/TLS encryption in transit.
- Supabase row-level security (RLS) per user.
- Access controls, API keys, and environment variable management.

No system is perfectly secure; please use a strong unique password or passkey and notify us of any unauthorized access.

---

## 8. Children

Pantry Palooza is not directed to children under 13. We do not knowingly collect personal information from children. If you believe a child has provided data, contact us and we will delete it.

---

## 9. Changes

We may update this Privacy Policy to reflect changes to the Services or legal requirements. We will post the updated policy with a new "Last updated" date, and may notify you via app notice or email for significant changes.

---

## 10. Contact

Questions or requests? Email **support@pantrypalooza.com** or write to:

Pantry Palooza Support  
PO Box 12345  
Oklahoma City, OK 73101  
United States

---

## 11. Health & Nutritional Disclaimer

Pantry Palooza provides meal suggestions and nutritional estimates for informational purposes only. We are not a medical or dietary service. Always confirm ingredient suitability, cooking temperatures, and dietary needs with qualified professionals. Individuals with allergies or medical conditions should consult a doctor or dietitian before following any recipes or recommendations.

---

## 12. Data Deletion Instructions (App Store Review Reference)

To request deletion of your data:

1. Open Pantry Palooza → Account tab → "Delete my data" (available in upcoming release).  
   - Until the in-app control ships, email **support@pantrypalooza.com** with subject "Data Deletion Request".
2. Provide the email address associated with your account.  
3. We will confirm deletion within 30 days and remove associated Supabase records, cached dishes, and analytics identifiers, except where retention is required by law.

---

By using Pantry Palooza, you agree to this Privacy Policy.
