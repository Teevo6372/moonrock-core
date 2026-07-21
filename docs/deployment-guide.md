# Moonrock Deployment Guide  v2.0.0

**Audience:** Moonrock developers and DevOps engineers  
**Last updated:** 2026-07-20

---

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   GitHub    │────▶│  FusionArc       │────▶│   WordPress     │
│  (source)   │     │  HyperHaven      │     │   (LIVE SITE)   │
│             │     │  (hosting)       │     │                 │
└─────────────┘     └──────────────────┘     │ Existing pages  │
                           │                 │   UNCHANGED     │
                    ┌──────┴──────┐          │                 │
                    │  Deployment │          │ NEW dev page    │
                    │  Scripts    │          │ ← templates     │
                    │             │          │   assembled     │
                    │  check      │          │                 │
                    │  deploy     │          │ Old homepage    │
                    │  rollback   │          │   STAYS ACTIVE  │
                    └──────┬──────┘          │                 │
                           │                 └─────────────────┘
                    ┌──────┴──────┐
                    │  JetBackup  │
                    │  (full DR)  │
                    └─────────────┘
```

**GitHub** is the single source of truth.  
**FusionArc HyperHaven** hosts the live WordPress site.  
**Deployment scripts** bridge the two — pulling from the repo and pushing to WordPress safely.  
**JetBackup** is the disaster-recovery method for full files-and-database restoration.

There is **no separate staging installation**. Development happens on the live server using an unlinked Elementor page that does not replace the existing homepage until final human approval.

---

## Deployment Approach

```
Production Site (LIVE — never taken offline)
│
├── Existing homepage (unchanged, active throughout)
│
├── NEW Elementor development page (unlinked, not set as front page)
│   └── 8 imported section templates assembled here
│   └── QA'd in place
│   └── When approved → manually set as homepage
│
└── Backup taken before every deployment (JetBackup)
```

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
7. bash scripts/deploy-homepage.sh [--deploy-theme-files]
          │
          ▼
8. In WordPress admin:
   • Create NEW Elementor page (Pages → Add New → Edit with Elementor)
   • Do NOT set as front page — leave existing homepage active
   • Assemble imported section templates on the new page
          │
          ▼
9. Manual post-deployment config (GHL URLs, Nova image, footer)
          │
          ▼
10. QA the new page while old homepage remains live
          │
          ▼
11. Human approval → Settings → Reading → set new page as homepage
```

### What Each Step Does

| Step | Location | Effect |
|---|---|---|
| 3 | SSH | Secure shell to FusionArc |
| 4 | Server | Syncs repo files from GitHub |
| 5 | Server | Validates PHP, WP-CLI, plugins, theme, disk, permissions |
| 6 | Server | Simulates deployment — no changes |
| 7 | Server | Backs up files → deploys CSS/PHP (if gated) → imports templates → clears cache |
| 8 | WP Admin | New Elementor page created — existing homepage untouched |
| 9 | WP Admin | Replace `#` URLs with GHL links, Nova image, footer config |
| 10 | Browser | Visual QA on new page |
| 11 | WP Admin | Manual: set new page as front page |

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
   • Removes ONLY templates with marker:
     moonrock_deployment_package = homepage-v1
   • Clears supported caches
          │
          ▼
4. Existing homepage is unaffected (it was never changed)
          │
          ▼
5. Fix the issue in GitHub
          │
          ▼
6. Re-deploy
```

### What Rollback Does NOT Do

- ✗ Database restore
- ✗ Full filesystem restore
- ✗ WooCommerce data rollback
- ✗ Page/post restoration beyond the 8 templates

**For full disaster recovery, use JetBackup in cPanel.**

---

## Git-Based Deployment Workflow

The recommended workflow for FusionArc:

```
GitHub (moonrock-core)
       │
       │  git pull (manual trigger)
       ▼
FusionArc server clone
       │
       │  scripts/deploy-homepage.sh
       ▼
WordPress live site (existing homepage untouched)
```

### Why git pull + deploy script

FusionArc does not natively support GitHub webhooks for push-to-deploy. The safest approach is:
1. Merge to `main` on GitHub (reviewed, approved)
2. SSH into server + `git pull` (manual, verifiable)
3. Run deployment scripts (automated, idempotent, logged)

### Cron-based auto-deploy (future, not recommended yet)

A cron job could auto-pull and deploy for non-critical updates. This is **not currently implemented** and should only be considered after the pipeline is battle-tested on manual triggers.

---

## How Future Developers Should Deploy Changes

### For theme/CSS changes:
```bash
# 1. Edit xstore-child/ files in moonrock-core
# 2. Commit to feature branch → PR → merge to main
# 3. SSH into server → git pull origin main
# 4. bash scripts/deploy-homepage.sh --deploy-theme-files --dry-run
# 5. bash scripts/deploy-homepage.sh --deploy-theme-files
```

### For Elementor template changes:
```bash
# 1. Edit JSON in elementor/templates/ → commit → PR → merge
# 2. SSH into server → git pull → deploy
#    (templates with the package marker will be updated automatically)
```

### For new pages or sections:
```bash
# 1. Add section-XX-name.json to elementor/templates/
# 2. The deploy script imports it automatically
# 3. Assemble on the dev page in WordPress admin
```

---

## Directory Structure

```
moonrock-core/
│
├── scripts/                          # Deployment automation
│   ├── README.md
│   ├── check-environment.sh          # Pre-flight checks
│   ├── deploy-homepage.sh            # Deploy to WordPress (gated)
│   └── rollback-homepage.sh          # Revert deployment (targeted)
│
├── xstore-child/                     # Theme files (deployed with --deploy-theme-files)
│   ├── style.css
│   └── functions.php
│
├── elementor/templates/              # Elementor JSON (imported with metadata marker)
│   ├── README.md
│   └── section-*.json
│
├── docs/
│   ├── implementation/
│   │   └── build-checklist.md        # WordPress admin setup steps
│   ├── deployment-guide.md           # This document
│   └── homepage-blueprint.md         # Authoritative homepage spec
│
├── deployments/                      # Created at runtime
│   ├── backups/<timestamp>/
│   ├── deploy-*.log
│   └── rollback-*.log
│
└── releases/                         # Versioned release notes
```

---

## Security Considerations

- Scripts never store credentials — use active SSH session or WP-CLI's existing config
- Theme files are never deployed without `--deploy-theme-files` or explicit confirmation
- Backups are timestamped and never overwritten
- Rollback only removes templates it created (identified by metadata marker)
- Templates carry `moonrock_deployment_package = homepage-v1` — never cleaned up by accident
- `--dry-run` mode allows full simulation before any changes
- The active homepage ID is captured before deployment and verified unchanged after
