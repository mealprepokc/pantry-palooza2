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
  - Notes: Start as a UI field if data is present; otherwise add placeholder/estimation TBD.

- [ ] Clarify max number of items allowed before generating dishes
  - Impact: Medium
  - Effort: Easy
  - Status: todo
  - Notes: Decide cap (e.g., 25–50). Show helper text if the user exceeds the cap.

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
  - Notes: Encode state; consider short links.

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
- Max items cap before generation: propose starting at 30; confirm target.
- Calorie/nutrition source of truth: do we estimate or require structured data?
- Share/state format: URL query vs short link service.
- Data model for substitutes and aisles: static JSON vs Supabase tables.

---

# Suggestions for your approval (not yet added to roadmap)
- Error tracking & session replay (Sentry + Replay) to catch UX issues quickly
  - Impact: High | Effort: Easy‑Medium
- Performance: code‑split heavy routes and lazy‑load large lists/images
  - Impact: High | Effort: Medium
- Accessibility pass: color contrast, focus order, keyboard nav on web
  - Impact: Medium | Effort: Easy
- Analytics: basic event tracking for generate, save, print, share
  - Impact: Medium | Effort: Easy

Confirm which of these you’d like me to add to the roadmap.
