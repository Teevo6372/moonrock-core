# Moonrock Deployment Guide

**Version:** 1.0.0  
**Audience:** Moonrock developers and DevOps engineers  
**Last updated:** 2026-07-20

---

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   GitHub    │────▶│  FusionArc       │────▶│   WordPress     │
│  (source)   │     │  HyperHaven      │     │   + Elementor   │
│             │     │  (hosting)       │     │   + WooCommerce  │
└─────────────┘     └──────────────────┘     └─────────────────┘
                           │
                    ┌──────┴──────┐
                    │  Deployment │
                    │  Scripts    │
                    │             │
                    │  check      │
                    │  deploy     │
                    │  rollback   │
                    └─────────────┘
```

**GitHub** is the single source of truth. Every change begins as a commit to `moonrock-core`.  
**FusionArc HyperHaven** hosts the live WordPress site with cPanel, SSH, and LiteSpeed.  
**Deployment scripts** bridge the two — they pull from the repo and push to WordPress safely and reversibly.

---

## Deployment Flow

```
1. Developer commits to GitHub
          │
          ▼
2. PR reviewed + merged to main
          │
          ▼
3. SSH into FusionArc server
          │
          ▼
4. git pull origin main
          │
          ▼
5. bash scripts/check-environment.sh
          │
          ▼
6. bash scripts/deploy-homepage.sh --dry-run
          │
          ▼
7. bash scripts/deploy-homepage.sh
          │
          ▼
8. Manual post-deployment config (Phase 6)
          │
          ▼
9. Verify on staging
          │
          ▼
10. Promote to production page
```

### What Each Step Does

| Step | Command | Effect |
|---|---|---|
| 3 | `ssh user@host` | Secure shell access |
| 4 | `git pull origin main` | Syncs repo files to server |
| 5 | `check-environment.sh` | Validates PHP, WP-CLI, plugins, disk, permissions |
| 6 | `deploy --dry-run` | Simulates deployment — verifies without changes |
| 7 | `deploy-homepage.sh` | Backs up → deploys CSS/PHP → imports templates → clears cache |
| 8 | Manual | Replace `#` URLs with real GHL links, set Nova image, configure footer |
| 9 | Browser QA | Visual check on staging page |
| 10 | Elementor page assignment | Point the staged homepage to the live URL |

---

## Rollback Flow

```
1. Issue detected
          │
          ▼
2. bash scripts/rollback-homepage.sh
          │
          ▼
3. Automatically:
   • Restores style.css from backup
   • Restores functions.php from backup
   • Removes 8 imported Elementor templates
   • Clears caches
          │
          ▼
4. Site returns to pre-deployment state
          │
          ▼
5. Fix the issue in GitHub
          │
          ▼
6. Re-deploy
```

Rollback is **instant** and touches nothing except the specific files and templates deployed. Existing pages, products, navigation, and content are never affected.

---

## Git-Based Deployment Workflow (Recommended)

FusionArc HyperHaven supports Git via cPanel and SSH. The recommended workflow:

```
GitHub (moonrock-core)
       │
       │  git pull (manual or cron)
       ▼
FusionArc server clone
       │
       │  scripts/deploy-homepage.sh
       ▼
WordPress (wp-content/themes/xstore-child)
```

### Why Git Pull + Script (not Git push-to-deploy)

FusionArc does not natively support GitHub webhooks or Git push-to-deploy without custom server-side configuration. The most reliable and secure method is:

1. **Merge to `main` on GitHub** (reviewed, approved)
2. **SSH into server + `git pull`** (manual trigger, verifiable)
3. **Run deployment scripts** (automated, idempotent, logged)

### Future: Cron-based auto-deploy

For non-critical updates (CSS tweaks, template refinements), a cron job can be configured:

```bash
# /etc/cron.d/moonrock-deploy (runs daily at 3 AM)
0 3 * * * cd /path/to/moonrock-core && git pull origin main && bash scripts/deploy-homepage.sh
```

**Risk:** Auto-deploy skips human verification. Use only after the pipeline is battle-tested.

### Alternative: cPanel Git Version Control

cPanel's Git Version Control interface can auto-deploy from a GitHub repository to a directory. If the repo is cloned into the WordPress theme directory, changes to `xstore-child/` would deploy automatically on pull. However, this bypasses the backup, verification, and logging steps — the scripts remain the recommended approach.

---

## How Future Developers Should Deploy Changes

### For theme/CSS changes:
```bash
# 1. Edit files in moonrock-core/xstore-child/
# 2. Commit to a feature branch
# 3. Open PR → review → merge to main
# 4. SSH into server
# 5. git pull origin main
# 6. bash scripts/deploy-homepage.sh
```

### For Elementor template changes:
```bash
# Option A: Edit JSON templates directly in moonrock-core/elementor/templates/
#           (same flow as above — deploy script imports them)

# Option B: Edit in Elementor editor, export as JSON,
#           replace the file in the repo, commit, deploy
```

### For new pages or sections:
```bash
# 1. Create new section-XX-name.json in elementor/templates/
# 2. Add the template title to TEMPLATE_TITLES array in both:
#    - scripts/deploy-homepage.sh
#    - scripts/rollback-homepage.sh
# 3. Follow standard deploy flow
```

---

## Directory Structure

```
moonrock-core/
│
├── scripts/                          # Deployment automation
│   ├── README.md
│   ├── check-environment.sh          # Pre-flight checks
│   ├── deploy-homepage.sh            # Deploy to WordPress
│   └── rollback-homepage.sh          # Revert deployment
│
├── xstore-child/                     # Theme files (deployed to wp-content/themes/)
│   ├── style.css
│   └── functions.php
│
├── elementor/templates/              # Elementor JSON (imported by deploy script)
│   ├── README.md
│   └── section-*.json
│
├── docs/
│   ├── implementation/
│   │   └── build-checklist.md        # Manual WordPress setup steps
│   ├── deployment-guide.md           # This document
│   └── homepage-blueprint.md         # Authoritative homepage spec
│
├── deployments/                      # Created by deploy script at runtime
│   ├── backups/<timestamp>/          # Pre-deployment file backups
│   ├── deploy-<timestamp>.log        # Deployment logs
│   └── rollback-<timestamp>.log      # Rollback logs
│
└── releases/                         # Versioned release notes
```

---

## Security Considerations

- Deployment scripts never store credentials — they use the active SSH session or WP-CLI's existing `wp-config.php` connection
- Backups are timestamped and never overwritten
- Rollback is always available from `deployments/backups/`
- Scripts never execute destructive SQL queries
- Template import is idempotent — duplicate runs are safe
- `--dry-run` mode allows full simulation before any changes
