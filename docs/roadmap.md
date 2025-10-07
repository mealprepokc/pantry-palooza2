# Pantry Palooza Roadmap

This roadmap groups tasks by phase (impact-first progression) and annotates each with Impact and Effort. Update statuses as we complete items.

## Operating Guide
- Status values: [todo | in_progress | blocked | done]
- Edit this file when priorities change. Keep notes brief and link issues/PRs if applicable.

---

# Phase 1: Quick Wins (High impact, low effort)
- [x] Increase bottom bar size so icons/images are easier to see
  - Impact: High
  - Effort: Easy
  - Status: done
  - Notes: Likely CSS/style tweak in web export and tab bar config.

- [x] When user clicks "Generate dishes", anchor to results or show a dedicated results screen
  - Impact: High
  - Effort: Easy
  - Status: done
  - Notes: Improves perceived speed; consider scrollIntoView or route push.

- [x] Add calorie count display to dishes (if available from source)
  - Impact: Medium
  - Effort: Easy
  - Status: done
  - Notes: Use a fair estimate if exact value missing; label clearly (e.g., "~320 kcal").

- [x] Clarify max number of items allowed before generating dishes
  - Impact: Medium
  - Effort: Easy
  - Status: done
  - Notes: Cap confirmed at 100. Show helper text when exceeded and disable generation.

- [x] Change "Entrees" label to "Proteins"
  - Impact: Medium
  - Effort: Easy
  - Status: done
  - Notes: Simple copy change in UI labels.

- [ ] Print‑friendly mode and share links (basic version)
  - Impact: Medium
  - Effort: Easy
  - Status: in_progress
  - Notes: Share links implemented via querystring; Print triggers available. UI temporarily hidden; print stylesheet pending.

---

# Phase 2: Core Improvements (Medium effort, strong UX gains)
- [ ] Domain & DNS: choose TLD and set up site domain
  - Impact: High
  - Effort: Medium
  - Status: todo
  - Notes: Decide TLD (e.g., pantrypalooza.app vs .com vs .ai). Register domain, add to Netlify, set DNS (A/ALIAS or Netlify-managed DNS), force HTTPS, configure apex ↔ www redirects, add analytics. .app enforces HSTS (HTTPS‑only) which is nice for security; .com is most familiar; .ai is trendy but pricier.

- [x] Add serving size option (1–6) and scale generated dish results accordingly
  - Impact: High
  - Effort: Medium
  - Status: done
  - Notes: Implemented UI control and auto-regenerate on change; generator scales ingredients per servings.

- [ ] Library favorites (tag items) + large-library hint
  - Impact: Medium
  - Effort: Medium
  - Status: todo
  - Notes: Let users mark favorite ingredients in Library. When Library is very large, hint to "Use favorites first". Does not cap Library size.

- [ ] Smart shopping list: combine ingredient quantities across selected dishes, grouped by aisle
  - Impact: High
  - Effort: Medium
  - Status: todo
  - Notes: Normalize units; map ingredients → aisles; de‑duplicate items.

- [ ] Dietary filters and nutrition goals (toggles + presets)
  - Impact: High
  - Effort: Medium
  - Status: todo
  - Notes: Quick toggles (vegetarian, dairy‑free, low‑sodium). Presets (high‑protein, low‑carb, etc.).

- [ ] Allow users to add custom items when missing from default dropdown
  - Impact: Medium
  - Effort: Medium
  - Status: todo
  - Notes: Validate and tag custom entries to improve future suggestions.

- [x] Breakfast/Lunch/Dinner selection to tailor results
  - Impact: Medium
  - Effort: Medium
  - Status: done
  - Notes: Prompt guidance plus client-side heuristics now prioritize time-of-day fits; edge function returns 15 dishes for faster results.

- [ ] Weekly meal planner: pick 7 favorites and auto‑generate a weekly view
  - Impact: High
  - Effort: Medium
  - Status: todo
  - Notes: Persist selections; generate calendar/week layout.

- [x] Cost per serving estimate with total
  - Impact: Medium
  - Effort: Medium
  - Status: done
  - Notes: Server-side cost estimation with ingredient parsing and price map; returns total_cost_usd and cost_per_serving_usd.

- [ ] Publish/Share selected dishes via unique URL or JSON (enhanced)
  - Impact: Medium
  - Effort: Medium
  - Status: todo
  - Notes: Encode state; integrate short-link service (e.g., TinyURL, Rebrandly). Research required.

- [ ] Error tracking & session replay (Sentry + Replay) to catch UX issues quickly
  - Impact: High
  - Effort: Easy‑Medium
  - Status: todo
  - Notes: Prod-only, privacy-safe defaults; add `SENTRY_DSN` in Netlify env; initialize early on web.

## Phase 2 – Additional completed items
- [x] Show prep time text next to clock icon
  - Impact: Medium
  - Effort: Easy
  - Status: done
  - Notes: Time displayed as "NN mins" alongside the icon.

- [x] Ingredient measurements and units in generated results
  - Impact: High
  - Effort: Medium
  - Status: done
  - Notes: Prompt requires quantified ingredients (e.g., cups, tbsp, lb). Ensures scaling per servings.

- [x] Increase generated dishes to 20
  - Impact: Medium
  - Effort: Easy
  - Status: done
  - Notes: Edge function now returns exactly 20 dishes.

- [x] Auto-regenerate on serving size change
  - Impact: Medium
  - Effort: Easy
  - Status: done
  - Notes: Debounced refresh when servings change and library present.

- [x] Remove Max Prep Time control on Generate page (keep times on cards)
  - Impact: Medium
  - Effort: Easy
  - Status: done
  - Notes: Simplifies filters; edge function still supports time internally if re-enabled.

- [x] Library tab icon updated to open‑book (brand)
  - Impact: Low
  - Effort: Easy
  - Status: done
  - Notes: New SVG icon added and wired in tab bar.

- [x] Dish cards: Sides section sourced from Library (e.g., green beans, corn, salad, potatoes)
  - Impact: Medium
  - Effort: Medium
  - Status: done
  - Notes: Shows up to 3–5 suggested sides based on user's Produce; sides now always treated as loose recommendations.

- [x] Saved tab: Collapsible rows with chevron
  - Impact: Medium
  - Effort: Medium
  - Status: done
  - Notes: One-line title row expands to reveal ingredients and instructions.

- [x] Library polish: Hide selected from “Add more items” and de‑duplicate Produce
  - Impact: Medium
  - Effort: Easy
  - Status: done
  - Notes: Case/whitespace‑insensitive normalization for suggestions and more‑items lists.

- [x] Library: Show only selected chips in main grid for all sections
  - Impact: Medium
  - Effort: Easy
  - Status: done
  - Notes: All other options appear under “Add more items”; if none selected, only “Add more items” is shown.

- [x] Saved dishes backend: create table + RLS policies
  - Impact: High
  - Effort: Medium
  - Status: done
  - Notes: `public.saved_dishes` with insert/select/delete own-row RLS; unique (user_id, title).

- [x] Auth: Magic-link callback handler and Expo deep-link scheme
  - Impact: Medium
  - Effort: Medium
  - Status: done
  - Notes: Route `/auth` exchanges code for session (web/native). Expo scheme set to `pantrypalooza`.

- [x] Dish cards: Move cost to a dedicated line (APPROX COST)
  - Impact: Low
  - Effort: Easy
  - Status: done
  - Notes: Cost label/value rendered under the meta row for clarity.

---

# Phase 3: Advanced & Polish (Higher effort or scope)
- [ ] Smart substitutes (strict vs loose)
  - Impact: High
  - Effort: Hard
  - Status: todo
  - Notes: Suggest alternatives when items unavailable; requires rules/ML heuristics.

- [ ] Strict vs. Loose results mode
  - Impact: Medium
  - Effort: Medium
  - Status: in_progress
  - Notes: Prompt definitions updated; sides remain loose. Need final UX for toggles and educational copy before marking done.

- [x] Email confirmations: Resend SMTP + HTML template
  - Impact: Medium
  - Effort: Medium
  - Status: done
  - Notes: Configured Resend SMTP via Supabase, verified DNS in Vercel, and added branded HTML confirmation email template.

- [x] Vercel Analytics on web builds
  - Impact: Medium
  - Effort: Easy
  - Status: done
  - Notes: Installed `@vercel/analytics` and mounted `<Analytics />` for production web. Guarded with platform/env checks.

- [x] Cooked dishes table + screen
  - Impact: Medium
  - Effort: Medium
  - Status: done
  - Notes: Added `cooked_dishes` migration, applied via CLI, and deployed new `/cooked` summary screen.

- [ ] Analytics: Google Tag Manager + GA4 (web; native later)
  - Impact: Medium
  - Effort: Easy
  - Status: todo
  - Notes: Add GTM container to Expo web shell and configure GA4 tag. Track custom events (generate_clicked, dish_saved, dish_unsaved, library_item_added) via dataLayer; add GA4 native SDK later for iOS/Android if desired.

- [ ] Appliance profile (user equipment)
  - Impact: Medium
  - Effort: Medium
  - Status: todo
  - Notes: Filter/sort dishes by available equipment (e.g., air fryer, instant pot).

- [ ] Quick Start presets (e.g., Family‑Style, 15‑Minute Dinners, Pantry‑Only, DF/GF)
  - Impact: Medium
  - Effort: Medium
  - Status: todo
  - Notes: Save preset filters and equipment assumptions.

- [ ] "Make a quick reference chart" (seasonings + cook times) printable/savable
  - Impact: Medium
  - Effort: Medium
  - Status: todo
  - Notes: Static resource page with print layout.

- [ ] Figure out breakfast/lunch/dinner multi‑library or modularization (if scope expands)
  - Impact: Medium
  - Effort: Hard
  - Status: todo
  - Notes: Consider a separate data library or package if features diverge.

- [ ] Dynamic pricing and regional cost accuracy
  - Impact: High
  - Effort: Medium‑Hard
  - Status: todo
  - Notes: Two paths:
    1) Supabase table of commodity prices with scheduled updates (cron/Edge Functions). Localize by region/store; cache per user.
    2) External APIs for live pricing (availability, auth, and ToS vary):
       - PriceAPI (priceapi.com) for product price scraping/monitoring (paid).
       - SerpApi (Google Shopping) for shopping results (paid; scraping-based; respect ToS).
       - RapidAPI marketplace providers for grocery pricing (varied quality; vet carefully).
       - Retailer APIs (Walmart, Kroger, Target) often require partner access and approvals.
       Combine with fuzzy ingredient→SKU mapping and fallback to our internal price map.

---

# Open Questions / Decisions
- Max items cap before generation: confirmed at 30.
- Calorie/nutrition source of truth: do we estimate or require structured data?
- Share/state format: URL query vs short link service.
- Data model for substitutes and aisles: static JSON vs Supabase tables.

---

# Suggestions for your approval (not yet added to roadmap)
- Performance: code‑split heavy routes and lazy‑load large lists/images
- Accessibility pass: color contrast, focus order, keyboard nav on web
  - Impact: Medium | Effort: Easy
- Analytics: basic event tracking for generate, save, print, share
  - Impact: Medium | Effort: Easy

Confirm which of these you’d like me to add to the roadmap.

---

# Phase 4: Go-to-Market (App Stores, Website, Socials, Content)
- [ ] App Store readiness (iOS + Android)
  - Impact: High
  - Effort: Medium
  - Status: todo
  - Notes: App metadata (name, icons, splash), bundle IDs, EAS signing/build profiles, privacy manifest (iOS), screenshots, store descriptions. Flow: EAS Build → TestFlight/Internal → Review.

- [ ] Website (Landing + Policies)
  - Impact: High
  - Effort: Medium
  - Status: todo
  - Notes: Landing page (value prop, screenshots, CTAs), SEO basics, analytics, Privacy Policy + Terms pages. Deploy via Netlify.

- [ ] Social accounts + Branding kit
  - Impact: Medium
  - Effort: Easy
  - Status: todo
  - Notes: Reserve handles (YouTube, TikTok, Instagram, X, Facebook), bios, posting cadence, logo/color/font templates.

- [ ] Affiliate links (ingredients/equipment)
  - Impact: Medium
  - Effort: Medium
  - Status: todo
  - Notes: Start with Amazon Associates; add disclosures. Place links in dish/equipment cards, shopping list, website. Later integrate short links (Phase 2).

- [ ] Content & Video plan (Calendar)
  - Impact: High
  - Effort: Medium
  - Status: todo
  - Notes: Weekly cadence (feature, tip, story, ingredient subs, community, planner). Example: date‑night "impress your date" demo; budget week; high‑protein week.

- [ ] AI Video Automation (Scoping → MVP)
  - Impact: Medium
  - Effort: Hard
  - Status: todo
  - Notes: MVP 1: slideshow + TTS + music, assembled via worker service (FFmpeg) and auto‑upload to YouTube; return link to user. Not suitable for Netlify Functions—use a queue + worker (Cloud Run/Lambda). Future: multi‑platform uploads.
