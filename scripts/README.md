# Moonrock Deployment Scripts  v2.1.0

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
Elementor, Elementor Pro, WooCommerce, active theme (verifies child theme),
JetBackup, disk space, writable directories, LiteSpeed.

Output: PASS / WARNING / FAIL with recommendations. Exits non-zero on any FAIL.

### `deploy-homepage.sh`

Deploys child theme files and Elementor templates. Idempotent.

```bash
bash scripts/deploy-homepage.sh --dry-run
bash scripts/deploy-homepage.sh
bash scripts/deploy-homepage.sh --deploy-theme-files
bash scripts/deploy-homepage.sh --deploy-theme-files --dry-run
```

**Theme file gate:** `style.css` and `functions.php` are NOT deployed by default.
Use `--deploy-theme-files` or answer `y` at the interactive prompt.

Steps: environment check → detect WP path/site URL/database/theme → verify child theme →
capture homepage ID → verify plugins → gated theme-file deployment (backup + checksum diff) →
import Elementor templates with `moonrock_deployment_package = homepage-v1` metadata →
verify homepage unchanged → conditional cache clearing.

**Never:** changes homepage, touches navigation, modifies WooCommerce, deletes content,
or deploys theme files without explicit permission.

### `rollback-homepage.sh`

Targeted rollback. Requires confirmation (or `--force`).

```bash
bash scripts/rollback-homepage.sh                        # Interactive
bash scripts/rollback-homepage.sh --force                # Non-interactive
bash scripts/rollback-homepage.sh --backup-dir <path>    # Specific backup
bash scripts/rollback-homepage.sh --list                 # List backups
```

Steps: shows what will be affected → confirmation prompt → restore theme files from backup →
remove ONLY templates with `moonrock_deployment_package = homepage-v1` marker →
clear caches.

**Never:** restores the database, reverts WooCommerce data, changes the active homepage,
or touches pages/posts/menus/categories. For full DR, use JetBackup.

---

## Typical Workflow

```bash
ssh user@fusionarc-server
cd /path/to/moonrock-core
git pull origin main
bash scripts/check-environment.sh
bash scripts/deploy-homepage.sh --dry-run
bash scripts/deploy-homepage.sh                        # templates only
bash scripts/deploy-homepage.sh --deploy-theme-files   # + theme files if needed

# In WordPress admin:
#   Create NEW unlinked Elementor page → assemble templates → QA → approve → set as homepage

# If something goes wrong:
bash scripts/rollback-homepage.sh
```

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| `Cannot detect WordPress` | `export WP_PATH=/home/user/public_html` |
| `Active theme is not a child theme` | Activate XStore Child in Appearance → Themes |
| `WP-CLI not found` | Install via curl (see Prerequisites) |
| `Elementor Pro not detected` | Deploy continues; verify manually |
| `Template import fails` | Manual import: Elementor → Templates → Import |
| Cache clear warnings | Not critical; clear manually if needed |

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
│   ├── README.md
│   ├── check-environment.sh
│   ├── deploy-homepage.sh
│   └── rollback-homepage.sh
├── xstore-child/
├── elementor/templates/
└── docs/
```
