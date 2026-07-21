# Moonrock Deployment Scripts

**Version:** 1.0.0  
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
| File permissions | write to `wp-content/themes/` | verified by check script |
| Disk space | 500MB free | verified by check script |

### WP-CLI Setup

```bash
# Install WP-CLI if not present
curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar
chmod +x wp-cli.phar
sudo mv wp-cli.phar /usr/local/bin/wp

# Verify
wp --info
```

### Required WordPress Plugins

| Plugin | Slug | Check |
|---|---|---|
| Elementor | `elementor` | `wp plugin is-active elementor` |
| Elementor Pro | `elementor-pro` | manual verification |
| WooCommerce | `woocommerce` | `wp plugin is-active woocommerce` |
| XStore Child theme | `xstore-child` | `wp theme is-active xstore-child` |

---

## Scripts

### `check-environment.sh`

Verifies the server environment. Makes no changes.

```bash
bash scripts/check-environment.sh          # Text output
bash scripts/check-environment.sh --json   # JSON output (for CI/CD)
```

**Expected output:**
```
==============================================
  Moonrock Environment Check
  2026-07-20T22:00:00Z
==============================================

--- WordPress Installation ---
[PASS] WordPress found at /home/user/public_html
--- PHP ---
[PASS] PHP 8.2.0 (>= 8.0 required)
--- WP-CLI ---
[PASS] WP-CLI 2.11.0
...

==============================================
  SUMMARY
==============================================

  PASS:   12
  WARN:   2
  FAIL:   0

VERDICT: ⚠️  READY WITH WARNINGS — review warnings before deploying.
```

### `deploy-homepage.sh`

Deploys child theme files and Elementor templates. Idempotent.

```bash
bash scripts/deploy-homepage.sh            # Live deployment
bash scripts/deploy-homepage.sh --dry-run  # Simulate only
```

**What it does:**
1. Runs `check-environment.sh` — aborts if critical checks fail
2. Backs up existing `style.css` + `functions.php` to `deployments/backups/<timestamp>/`
3. Verifies Elementor, Elementor Pro, and WooCommerce are active
4. Copies `xstore-child/style.css` and `xstore-child/functions.php` to the theme directory
5. Imports all 8 Elementor section templates via WP-CLI (skips existing)
6. Clears Elementor CSS cache + LiteSpeed cache
7. Logs everything to `deployments/deploy-<timestamp>.log`

**What it never does:**
- Change the active homepage
- Touch navigation/menus
- Modify WooCommerce products, orders, or categories
- Delete anything

### `rollback-homepage.sh`

Restores the pre-deployment state.

```bash
bash scripts/rollback-homepage.sh                        # Use latest backup
bash scripts/rollback-homepage.sh --backup-dir <path>    # Use specific backup
bash scripts/rollback-homepage.sh --list                 # List available backups
```

**What it does:**
1. Restores `style.css` and `functions.php` from backup
2. Removes ONLY the 8 imported Elementor section templates
3. Clears caches
4. Logs everything to `deployments/rollback-<timestamp>.log`

**What it never does:**
- Touch pages, posts, products, categories, tags, or navigation
- Affect manually created Elementor content

---

## Typical Workflow

```bash
# 1. SSH into the FusionArc server
ssh user@moonrock-server

# 2. Pull latest from GitHub
cd /path/to/moonrock-core
git pull origin main

# 3. Check the environment
bash scripts/check-environment.sh

# 4. Dry run the deployment
bash scripts/deploy-homepage.sh --dry-run

# 5. Deploy
bash scripts/deploy-homepage.sh

# 6. If something goes wrong, roll back
bash scripts/rollback-homepage.sh
```

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `WP-CLI not found` | WP-CLI not installed | `curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar` |
| `WordPress path not auto-detected` | Script run from outside WP root | `export WP_PATH=/home/user/public_html` |
| `Elementor Pro not detected` | Pro uses a different slug or manual install | Verify manually in WP Admin; deployment continues with warning |
| `Child theme directory not found` | XStore Child not installed | Install via WP Admin → Appearance → Themes |
| `wp post create` fails | WP-CLI can't reach database | Check `wp-config.php` and `wp db check` |
| Templates imported but styling broken | Lucide icons not installed | Install a Lucide Icons Elementor plugin |

---

## Directory Structure After First Deploy

```
moonrock-core/
├── deployments/
│   ├── backups/
│   │   └── 20260720-220000/
│   │       ├── style.css.bak
│   │       └── functions.php.bak
│   ├── deploy-20260720-220000.log
│   └── rollback-20260720-221500.log
├── scripts/
│   ├── check-environment.sh
│   ├── deploy-homepage.sh
│   ├── rollback-homepage.sh
│   └── README.md
├── xstore-child/
├── elementor/
└── docs/
```
