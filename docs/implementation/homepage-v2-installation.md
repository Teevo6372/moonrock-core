# Moonrock Marketing Homepage v2 Installation

## Scope

This package reproduces the approved ChatGPT Sites homepage inside the existing
WordPress installation. It changes presentation files in the active XStore
child theme only. It does not replace WordPress, write to the database, change
the active homepage, alter navigation, or modify WooCommerce, plugins, uploads,
posts, products, legal pages, the existing header, or the existing footer.

The exact production file set is controlled by
`deployments/homepage-v2-manifest.txt`.

## Recommended approval path

1. Review and approve the draft pull request.
2. Take a FusionArc/JetBackup filesystem and database restore point.
3. Deploy the manifest-owned files while the current homepage remains selected.
4. In WordPress, create a new page named `Homepage v2 Review`.
5. Either assign the `Moonrock Marketing Homepage` page template or edit with
   Elementor, import `moonrock-homepage-sites-v2.json`, and insert it.
6. Keep the page unlinked and do not select it under **Settings → Reading**.
7. Preview at desktop, tablet, and mobile widths. Complete the acceptance list.
8. Record the current `page_on_front` ID.
9. After explicit approval, select `Homepage v2 Review` as the static homepage.
10. Purge XStore, Elementor, WordPress, server, and CDN caches.

The Elementor import is intentionally a thin editable assembly layer. The
approved visual implementation, responsive rules, and accessibility behavior
stay version-controlled in the child theme so repository and production cannot
silently drift apart.

## CTA configuration

The default CTA destinations preserve the approved site routes:

- Build My Flight Plan → `/startups/#flight-plan`
- Chat with Nova → `/contact/`

They may be pointed to approved GoHighLevel destinations without editing the
template by adding WordPress filters:

```php
add_filter( 'moonrock_flight_plan_url', fn() => 'https://approved.example/flight-plan' );
add_filter( 'moonrock_nova_url', fn() => 'https://approved.example/nova' );
```

Do not commit private or tokenized URLs.

## Acceptance checklist

- Existing header and footer render unchanged.
- The page contains one H1.
- Logo and both Nova images load from the child theme.
- Growth, Startups, Shop, Blog, About, Contact, WooCommerce, account, checkout,
  and legal URLs still resolve.
- Both primary CTAs and all section links resolve to approved destinations.
- Keyboard focus is visible and follows the visual order.
- Text and controls remain readable at 320, 375, 768, 1024, and 1440 pixels.
- No horizontal scrolling occurs.
- Reduced-motion preference disables reveal movement.
- Lazy loading is active for the below-the-fold Nova portrait.
- The browser console has no homepage errors.
- WordPress Site Health and WooCommerce status show no new critical errors.
- The previous homepage remains available and its ID is recorded.

## GitHub Actions preparation

The manual `Deploy Moonrock Homepage` workflow supports SSH/rsync or SFTP.
Configure these as GitHub Environment secrets under an approval-protected
`production` environment:

### Shared

- `FUSIONARC_WP_ROOT`

### SSH

- `FUSIONARC_SSH_HOST`
- `FUSIONARC_SSH_PORT`
- `FUSIONARC_SSH_USER`
- `FUSIONARC_SSH_PRIVATE_KEY`
- `FUSIONARC_SSH_HOST_KEY`

### SFTP

- `FUSIONARC_SFTP_HOST`
- `FUSIONARC_SFTP_PORT`
- `FUSIONARC_SFTP_USER`
- `FUSIONARC_SFTP_PASSWORD`

No secret value belongs in the repository. The production environment should
require owner approval. The workflow must not be run until the pull request is
approved and merged.
