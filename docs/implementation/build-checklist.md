# Moonrock Homepage — Build Checklist

**Version:** 1.1.0  
**Branch:** feature/deployment-pipeline  
**Repository:** moonrock-core  
**Last updated:** 2026-07-20

> **Deployment scripts are now available.** Phases 2–5 below can be automated.
> See `scripts/README.md` and `docs/deployment-guide.md`.

---

## Phase 0 — Pre-Build: Backup & Staging

- [ ] Create a full WordPress backup (files + database).
- [ ] Set up a staging environment (subdomain or local clone).
- [ ] Verify staging site loads correctly with XStore + XStore Child active.
- [ ] Verify WooCommerce products, orders, customer accounts, and payment gateways are intact.
- [ ] Confirm Elementor Pro license is active on staging.

---

## Phase 1 — Theme & Plugin Verification

> **🤖 Automated:** `scripts/check-environment.sh` verifies all items below.

- [ ] Run `bash scripts/check-environment.sh` on the server.
- [ ] Confirm **XStore Child** theme is active (Appearance → Themes).
- [ ] Confirm **Elementor Pro** is installed and license activated.
- [ ] Confirm **WooCommerce** is installed and operational.
- [ ] Install a **Lucide Icons integration** for Elementor (plugin or custom icon set upload).
- [ ] Deactivate any unused or conflicting page-builder plugins.

---

## Phase 2 — XStore Child Theme Setup

> **🤖 Automated:** `scripts/deploy-homepage.sh` handles file deployment, backup, and verification.

- [ ] Run `bash scripts/deploy-homepage.sh --dry-run` to preview.
- [ ] Run `bash scripts/deploy-homepage.sh` to deploy.
- [ ] Verify the child stylesheet loads (inspect any page for `.moonrock-card` styles in browser DevTools).

---

## Phase 3 — Elementor Global Settings

### 3.1 — Features
- [ ] Go to Elementor → Settings → Features.
- [ ] Set **Flexbox Container** = **Active**.
- [ ] Set **Grid Container** = **Active** (if available).
- [ ] Disable "Improve CSS Loading" if it conflicts with XStore.

### 3.2 — Global Colors
- [ ] Go to Elementor → Site Settings → Global Colors.
- [ ] Configure the existing Moonrock palette. At minimum:
  - Primary (dark background): `#0a0a0f`
  - Secondary (alt background): `#0e0e18`
  - Accent (neon/CTA): extract from live site or brand guide
  - Text (light): `#ffffff`
  - Text (muted): `rgba(255,255,255,0.65)`

### 3.3 — Global Fonts
- [ ] Go to Elementor → Site Settings → Global Fonts.
- [ ] Configure primary typeface (headings + body) matching existing Moonrock brand.
- [ ] Set fallback stack to system fonts.
- [ ] Body minimum size: 16px.

### 3.4 — Layout Settings
- [ ] Go to Elementor → Site Settings → Layout.
- [ ] Set **Content Width** = `1200px`.
- [ ] Set **Widget Gap** = `20px`.

### 3.5 — Breakpoints
- [ ] Go to Elementor → Site Settings → Breakpoints.
- [ ] Mobile: max `767px`.
- [ ] Tablet: `768px`.

---

## Phase 4 — WooCommerce Category Setup

> **🤖 Partially automated:** Category creation can be scripted via WP-CLI. See `scripts/README.md` for the WP-CLI commands. Manual product curation still required.

### 4.1 — Create Categories
- [ ] Products → Categories → Add New:
  - **Launch Resources** (slug: `launch-resources`)
  - **Growth Resources** (slug: `growth-resources`)
  - **AI Resources** (slug: `ai-resources`)
  - **Business Tools** (slug: `business-tools`)
- [ ] Do **not** delete, rename, or reorganize existing product categories.

### 4.2 — Create Nova's Picks Tag
- [ ] Products → Tags → Add New:
  - **nova-pick** (slug: `nova-pick`)
- [ ] Assign `nova-pick` tag to 3–4 curated products.

---

## Phase 5 — Template Import

> **🤖 Automated:** `scripts/deploy-homepage.sh` imports all 8 templates via WP-CLI and skips duplicates.

### 5.1 — Pre-Import Checks
- [ ] Read `elementor/templates/README.md` fully.
- [ ] Confirm all Phase 3 global settings are saved.

### 5.2 — Import (automated)
- [ ] The deploy script imports all 8 templates in order. No manual import needed.

### 5.3 — Post-Import Verification
- [ ] Open each imported template in Elementor Editor.
- [ ] Confirm all containers, headings, and text widgets render.
- [ ] Confirm icons display (Lucide library loaded).
- [ ] Confirm no broken widget types.

---

## Phase 6 — Manual Configuration

### 6.1 — CTA Destinations (replace all `#` links)
- [ ] **Primary CTA — Chat with Nova:** Replace `#nova-chat` with GHL chat widget anchor or embed trigger.
- [ ] **Secondary CTA — Build My Flight Plan:** Replace `#` with Launch Assessment or Growth Assessment GHL funnel URL.
- [ ] **Recognition cards 1–5:** Replace `#growth-assessment` with GHL Growth Assessment URL. Wire hidden GHL field per card.
- [ ] **Recognition card 6:** Replace `#nova-chat` with Nova destination.
- [ ] **Growth Hub category buttons:** Replace `#growth-hub-*` with real Growth Hub category page URLs.
- [ ] **Growth Hub primary/secondary CTAs:** Replace with Growth Hub page + Nova chat URLs.
- [ ] **Footer navigation links:** Wire up real page URLs as they become available.

### 6.2 — GHL Integration
- [ ] Embed GoHighLevel chat widget for Nova (WordPress → Customizer or GHL plugin).
- [ ] Wire hidden assessment values from Recognition cards into GHL form fields.
- [ ] Test: clicking a Recognition card → GHL assessment form → correct field pre-populated.

### 6.3 — Nova Visual
- [ ] Replace `placehold.co` image in Section 06 (`meet-nova.json`) with approved Nova artwork URL or media library image.

### 6.4 — Voice CTA (Talk with Nova)
- [ ] If voice is not live at launch, add "Coming Soon" tooltip or indicator to the "Talk with Nova" button in Section 06.
- [ ] Do not remove the button — it sets expectations for the roadmap.

### 6.5 — Footer
- [ ] Confirm email: `stephen@moonrockmarketing.com`.
- [ ] Set phone number or hide the placeholder.
- [ ] Add Facebook URL to social icon widget (or hide widget).
- [ ] Add LinkedIn URL to social icon widget (or hide widget).
- [ ] Replace legal link `#` placeholders with published page URLs.

---

## Phase 7 — Header & Navigation

- [ ] Configure XStore header builder with approved navigation structure:
  - Growth
  - Startups
  - Shop
  - Blog
  - About
  - Contact
- [ ] Ensure the Moonrock logo is displayed in the header.
- [ ] Verify navigation is responsive on mobile.

---

## Phase 8 — Testing

### 8.1 — Desktop (Chrome, Safari, Firefox, Edge)
- [ ] All sections render in correct order.
- [ ] Flight Plan connector line and dots are visible.
- [ ] Card hover effects trigger on interactive cards.
- [ ] Comparison table renders correctly.
- [ ] Nova two-column layout displays side-by-side.
- [ ] All CTA buttons link to correct destinations.
- [ ] Footer navigation links resolve.

### 8.2 — Tablet (768px–1024px)
- [ ] Card grids collapse to 2 columns.
- [ ] Flight Plan stacks centered.
- [ ] Nova layout stacks.
- [ ] Brand pillars collapse to 2 columns.
- [ ] Growth Hub categories collapse to 2 columns.
- [ ] Final CTA cards remain balanced.

### 8.3 — Mobile (<768px)
- [ ] All cards stack to single column.
- [ ] Flight Plan timeline shifts to left-aligned.
- [ ] Comparison table collapses to stacked cards.
- [ ] Nova visual appears above content.
- [ ] All CTA buttons are full-width.
- [ ] Footer columns stack.
- [ ] No horizontal scrolling.
- [ ] Touch targets are ≥44px.

### 8.4 — Accessibility
- [ ] Keyboard navigation: Tab through all interactive elements.
- [ ] Focus indicators are visible on all links and buttons.
- [ ] Heading hierarchy is logical (H1 → H2 → H3).
- [ ] Images have alt text where meaningful.
- [ ] Color contrast meets WCAG AA minimums.
- [ ] Reduced-motion media query disables animations.

### 8.5 — WooCommerce
- [ ] Product pages, cart, and checkout function normally.
- [ ] Digital download delivery works.
- [ ] Existing product URLs are unchanged.
- [ ] No WooCommerce templates are overridden by homepage changes.

### 8.6 — Performance
- [ ] Largest Contentful Paint < 2.5s on mobile.
- [ ] No layout shift during page load.
- [ ] Images are compressed and using modern formats.
- [ ] Nova video (if present) is lazy-loaded and does not block first paint.

---

## Phase 9 — Go-Live

- [ ] Move homepage from staging to production (Elementor template export → import, or page duplicate).
- [ ] Verify all CTA destinations are production URLs (not staging).
- [ ] Verify analytics (GA4, GSC, Meta Pixel, Clarity) are installed.
- [ ] Verify GHL chat widget loads on production.
- [ ] Submit XML sitemap to Google Search Console.
- [ ] Test a complete visitor journey end-to-end.

---

## Rollback Plan

> **🤖 Automated:** `scripts/rollback-homepage.sh` handles all items below.

If the homepage causes issues post-launch:

1. Run `bash scripts/rollback-homepage.sh` — restores style.css, functions.php, removes all 8 templates, clears cache.
2. Run `bash scripts/rollback-homepage.sh --list` to view available backups.
3. Run `bash scripts/rollback-homepage.sh --backup-dir <path>` to use a specific backup.
4. If rollback script unavailable: Restore the previous homepage revision from WordPress revisions or backup.
5. Full site restore from Phase 0 backup as last resort.

---

## Phase 10 — Recovery & Maintenance

- [ ] **List backups:** `bash scripts/rollback-homepage.sh --list`
- [ ] **Rollback:** `bash scripts/rollback-homepage.sh`
- [ ] **Re-deploy after fix:** `bash scripts/deploy-homepage.sh`
- [ ] **View deployment logs:** `cat deployments/deploy-*.log`
- [ ] **View rollback logs:** `cat deployments/rollback-*.log`
