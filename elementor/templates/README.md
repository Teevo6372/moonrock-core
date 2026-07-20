# Elementor Templates — Import Guide

**Project:** Moonrock Marketing  
**Branch:** feature/homepage-elementor-build  
**Last updated:** 2026-07-20

---

## Before You Import

### Required Environment

| Requirement | Version / Detail |
|---|---|
| WordPress | 6.x (latest stable) |
| Elementor Pro | 3.18+ (Flexbox Containers required) |
| Elementor Features | Flexbox Container = **Active** (Elementor → Settings → Features) |
| Theme | XStore Child (parent: XStore) |
| WooCommerce | Active (for Growth Hub product grid) |
| Lucide Icons | Install via Elementor Custom Icons or a Lucide-for-Elementor plugin |
| Custom CSS | `xstore-child/style.css` must be loaded (see `functions.php`) |

### Elementor Global Settings (configure before import)

1. **Global Colors** — configure in Elementor → Site Settings → Global Colors. The accent color (`--e-global-color-accent`) is referenced throughout all templates.
2. **Global Fonts** — configure primary and secondary typeface. Templates use `inherit`; they rely on these globals.
3. **Container Width** — set default boxed content width to **1200px**.
4. **Breakpoints** — mobile-first. Ensure:
   - Mobile: max 767px
   - Tablet: 768px–1024px
   - Desktop: 1025px+

### Background Colors Per Section

Templates assume these alternating background hex values (set in each container's Background setting):

| Section | Background |
|---|---|
| Hero | `#0a0a0f` |
| Recognition | `#0a0a0f` |
| Imagine What's Possible | `#0e0e18` |
| Flight Plan | `#0a0a0f` |
| Guidance Before Guesswork | `#0e0e18` |
| Meet Nova | `#0a0a0f` |
| Growth Hub | `#0e0e18` |
| Final CTA | `#0a0a0f` |
| Footer | `#06060a` |

---

## Import Instructions

1. In WordPress admin, go to **Elementor → Templates → Import**.
2. Import each JSON file from this directory, one at a time.
3. **Recommended order** matches homepage flow:
   - `section-01-hero.json`
   - `section-02-recognition.json`
   - `section-03-imagine-whats-possible.json`
   - `section-04-flight-plan.json`
   - `section-05-guidance-before-guesswork.json`
   - `section-06-meet-nova.json`
   - `section-07-growth-hub.json`
   - `section-08-final-cta-footer.json`
4. After import, open each template in Elementor Editor and verify.
5. Assemble the homepage by placing each template container onto the page in order.

---

## Dependencies

- **Lucide icon library** — Templates reference icon names like `lucide-rocket`, `lucide-compass`, etc. If Lucide icons aren't loaded, widgets will fall back to empty icon placeholders.
- **WooCommerce** — Section 07 (Growth Hub) uses the `woocommerce-products` widget. Without WooCommerce active, this widget will not render.
- **Child theme CSS** — Several CSS classes (`moonrock-card`, `moonrock-btn`, `flight-plan-timeline`, `flight-plan-stage`, `nova-layout`, `moonrock-comparison`, `moonrock-footer`) are styled by `xstore-child/style.css`. Import templates will render structurally without it, but styling will be incomplete.

---

## Elements Requiring Manual Configuration

| Element | Template | What to configure |
|---|---|---|
| Nova visual | Section 06 | Replace `placehold.co` image with approved Nova artwork URL |
| All CTA links (`#`, `#nova-chat`, `#growth-hub`, etc.) | All sections | Replace placeholders with real GHL assessment URLs, Nova chat embed anchor, Growth Hub page URL |
| GHL hidden values | Section 02 | Wire `_ghl_hidden_value` fields (Lead Nurturing, Website Conversion, Visibility, Operations, Reporting, Needs Guidance) into GHL form/assessment URL parameters |
| Nova's Picks (WooCommerce) | Section 07 | Tag curated products with `nova-pick` in WP Admin → Products → Tags |
| Footer email | Section 08 | Already set to `stephen@moonrockmarketing.com` |
| Footer phone | Section 08 | Replace `[Configure in WordPress]` placeholder |
| Footer social icons | Section 08 | Replace `#` with real Facebook/LinkedIn URLs, or hide widgets |
| Footer legal links | Section 08 | Replace `#` with published Privacy Policy, Terms, Cookie Policy, Accessibility URLs |
| Logo | All sections | Add Moonrock logo to the header/navigation separately (Header is not covered by these section templates) |

---

## Known Limitations

1. **Untested imports** — These JSON templates are structurally valid but have not been tested in a live Elementor instance. Elementor's JSON import can be sensitive to exact schema versions. Test in staging first.
2. **Schema compatibility** — Templates assume Elementor Pro 3.18+ Flexbox Container schema. Older versions or Sections-mode installations will not import correctly.
3. **Lucide icon fallback** — If a Lucide integration plugin is not present, all `lucide-*` icon references will need to be replaced manually in each widget.
4. **WooCommerce widget** — The `woocommerce-products` widget in Section 07 requires Elementor Pro + WooCommerce active. If either is missing, replace with a manual product grid.
5. **CSS class dependency** — Custom CSS classes (e.g., `moonrock-card`, `flight-plan-timeline`) are applied via Elementor's CSS Classes field. Verify the child theme stylesheet is loading after import.
6. **Header/Navigation** — Not included. Navigation (Growth, Startups, Shop, Blog, About, Contact) must be configured separately in the XStore theme header builder.
