# Moonrock Deployment Scripts  v2.0.0

**Branch:** feature/deployment-pipeline

---

## Prerequisites

| Requirement | Minimum | Check |
|---|---|---|
| Bash | 4.0+ | `bash --version` |
| WP-CLI | 2.x | `wp cli version` |
| Git | 2.x | `git --version` |
| PHP CLI | 8.0+ | `php -v` |
| SSH access | key-based or password | `ssh user@host` |
| File permissions | write to active child theme directory | verified by check script |
| Disk space | 500MB free | verified by check script |
| Python 3 | (for JSON parsing in template import) | `python3 --version` |

### WP-CLI Setup

```bash
curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
chmod +x wp-cli.phar
sudo mv wp-cli.phar /usr/local/bin/wp
wp --info
```

### Required WordPress Plugins

| Plugin | Slug |
|---|---|
| Elementor | `elementor` |
| Elementor Pro | `elementor-pro` |
| WooCommerce | `woocommerce` |
| XStore Child theme | (detected automatically) |

---

## Scripts

### `check-environment.sh`

Pre-flight verification. Makes no changes.

```bash
bash scripts/check-environment.sh
```

Checks: WordPress path, PHP version, WP-CLI, Git, SSH, file permissions,
Elementor, WooCommerce, active theme, JetBackup, disk space, writable directories.

Output: PASS / WARNING / FAIL with recommendations. Exits non-zero on any FAIL.

### `deploy-homepage.sh`

Deploys child theme files and Elementor templates. Idempotent.

```bash
# Dry run — simulate everything, make no changes
bash scripts/deploy-homepage.sh --dry-run

# Deploy templates only (no theme files)
bash scripts/deploy-homepage.sh

# Deploy everything including theme files
bash scripts/deploy-homepage.sh --deploy-theme-files

# Preview theme-file deployment without changing
bash scripts/deploy-homepage.sh --deploy-theme-files --dry-run
```

**Theme file gate:** `style.css` and `functions.php` are NOT deployed by default.
Use `--deploy-theme-files` or answer `y` at the interactive prompt.

**What it does:**
1. Runs `check-environment.sh` — aborts on failure
2. Detects WordPress path, site URL, database, active theme via WP-CLI
3. Verifies the active theme is a child theme (refuses to deploy into a parent)
4. Captures current homepage ID and title
5. Verifies Elementor, Elementor Pro, WooCommerce are active
6. If `--deploy-theme-files`: backs up existing files, compares checksums, shows diffs, copies
7. Imports 8 Elementor templates with `moonrock_deployment_package = homepage-v1` metadata
8. Skips or updates templates that already carry the marker (true idempotency)
9. Confirms homepage ID is unchanged
10. Conditionally clears Elementor and LiteSpeed caches (warnings only on failure)

**What it never does:**
- Change the active homepage
- Touch navigation or menus
- Modify WooCommerce products, orders, or categories
- Delete anything
- Deploy theme files without explicit permission

### `rollback-homepage.sh`

Rolls back the deployment. Safe and targeted.

```bash
bash scripts/rollback-homepage.sh                        # Use latest backup
bash scripts/rollback-homepage.sh --backup-dir <path>    # Use specific backup
bash scripts/rollback-homepage.sh --list                 # List available backups
```

**What it does:**
1. Restores `style.css` and `functions.php` from backup
2. Removes ONLY Elementor templates that carry `moonrock_deployment_package = homepage-v1`
3. Conditionally clears caches

**What it does NOT do:**
- Perform a database restore
- Restore deleted content
- Revert WooCommerce data
- Change the active homepage

For full disaster recovery, use **JetBackup** in cPanel.

---

## Typical Workflow

```bash
# 1. SSH into the FusionArc server
ssh user@fusionarc-server

# 2. Pull latest from GitHub
cd /path/to/moonrock-core
git pull origin main

# 3. Check the environment
bash scripts/check-environment.sh

# 4. Dry run the deployment
bash scripts/deploy-homepage.sh --dry-run

# 5. Deploy templates
bash scripts/deploy-homepage.sh

# 6. If theme files changed, deploy them too
bash scripts/deploy-homepage.sh --deploy-theme-files

# 7. In WordPress admin:
#    - Create a NEW unlinked Elementor page (do NOT set as homepage)
#    - Assemble the 8 imported section templates on that page
#    - QA the page
#    - When approved, set it as the homepage

# 8. If something goes wrong, roll back
bash scripts/rollback-homepage.sh
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Cannot detect WordPress` | `export WP_PATH=/home/user/public_html` |
| `Active theme is not a child theme` | Activate XStore Child in Appearance → Themes |
| `WP-CLI not found` | `curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar` |
| `Elementor Pro not detected` | Deploy continues with warning; verify manually |
| `Template import fails` | Manual import: Elementor → Templates → Import |
| `LiteSpeed cache purge fails` | Warning only — clear manually in LiteSpeed panel |
| `Elementor cache clear fails` | Warning only — Elementor → Tools → Regenerate CSS |

---

## Directory Structure After First Deploy

```
moonrock-core/
├── deployments/
│   ├── backups/
│   │   └── 20260720-220000/
│   │       ├── style.css.bak
│   │       └── functions.php.bak
│   ├── deploy-*.log
│   └── rollback-*.log
├── scripts/
│   ├── README.md          ← this file
│   ├── check-environment.sh
│   ├── deploy-homepage.sh
│   └── rollback-homepage.sh
├── xstore-child/
├── elementor/templates/
└── docs/
```
