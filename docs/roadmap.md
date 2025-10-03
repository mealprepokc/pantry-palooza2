# Pantry Palooza Roadmap

This roadmap groups tasks by phase (impact-first progression) and annotates each with Impact and Effort. Update statuses as we complete items.

## Operating Guide
- Status values: [todo | in_progress | blocked | done]
- Edit this file when priorities change. Keep notes brief and link issues/PRs if applicable.

---

# Phase 1: Quick Wins (High impact, low effort)
- [ ] Increase bottom bar size so icons/images are easier to see
  - Impact: High
  - Effort: Easy
  - Status: todo
  - Notes: Likely CSS/style tweak in web export and tab bar config.

- [ ] When user clicks "Generate dishes", anchor to results or show a dedicated results screen
  - Impact: High
  - Effort: Easy
  - Status: todo
  - Notes: Improves perceived speed; consider scrollIntoView or route push.

- [ ] Add calorie count display to dishes (if available from source)
  - Impact: Medium
  - Effort: Easy
  - Status: todo
  - Notes: Use a fair estimate if exact value missing; label clearly (e.g., "~320 kcal").

- [ ] Clarify max number of items allowed before generating dishes
  - Impact: Medium
  - Effort: Easy
  - Status: todo
  - Notes: Cap confirmed at 30. Show helper text when exceeded and disable generation.

- [ ] Change "Entrees" label to "Proteins"
  - Impact: Medium
  - Effort: Easy
  - Status: todo
  - Notes: Simple copy change in UI labels.

- [ ] Print‑friendly mode and share links (basic version)
  - Impact: Medium
  - Effort: Easy
  - Status: todo
  - Notes: Add print stylesheet; share by copying current selection state as a querystring.

---

# Phase 2: Core Improvements (Medium effort, strong UX gains)
- [ ] Add serving size option (1–6) and scale generated dish results accordingly
  - Impact: High
  - Effort: Medium
  - Status: todo
  - Notes: Impacts portions, shopping list quantities, nutrition.

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

- [ ] Breakfast/Lunch/Dinner selection to tailor results
  - Impact: Medium
  - Effort: Medium
  - Status: todo
  - Notes: Adds a meal‑type dimension to generation and shopping list.

- [ ] Weekly meal planner: pick 7 favorites and auto‑generate a weekly view
  - Impact: High
  - Effort: Medium
  - Status: todo
  - Notes: Persist selections; generate calendar/week layout.

- [ ] Cost per serving estimate with total
  - Impact: Medium
  - Effort: Medium
  - Status: todo
  - Notes: Use a simple price map per ingredient to start; refine later.

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
  - Status: todo
  - Notes: Strict = only selected items; Loose = assume basic pantry staples.

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
