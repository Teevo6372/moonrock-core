#!/usr/bin/env bash
# =============================================================================
# Moonrock — Homepage Rollback Script  v2.1.0
#
# Restores child theme files from the most recent backup and removes
# ONLY the Elementor templates that carry the deployment-package marker.
# Does NOT perform a complete database or filesystem restore.
# JetBackup is the disaster-recovery method for full restoration.
#
# Usage:
#   bash scripts/rollback-homepage.sh                          # Interactive
#   bash scripts/rollback-homepage.sh --force                  # Non-interactive
#   bash scripts/rollback-homepage.sh --backup-dir <path>      # Specific backup
#   bash scripts/rollback-homepage.sh --list                   # List backups
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Trap handler
# ---------------------------------------------------------------------------
trap 'echo ""; echo "[rollback-homepage] FAILED at line $LINENO — check log."; exit 1' ERR
trap 'echo ""; echo "[rollback-homepage] Interrupted."; exit 130' INT TERM

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
WP_PATH="${WP_PATH:-}"
CHILD_THEME_DIR=""
BACKUPS_ROOT="${REPO_ROOT}/deployments/backups"
ROLLBACK_LOG="${REPO_ROOT}/deployments/rollback-$(date -u +'%Y%m%d-%H%M%S').log"
BACKUP_DIR=""
LIST_MODE=false
FORCE_MODE=false
PACKAGE_MARKER="moonrock_deployment_package"
PACKAGE_VALUE="homepage-v1"

# ---------------------------------------------------------------------------
# Parse arguments (improved: handle --backup-dir value properly)
# ---------------------------------------------------------------------------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --list)       LIST_MODE=true ;;
    --force)      FORCE_MODE=true ;;
    --backup-dir) BACKUP_DIR="${2:-}"; shift ;;
    *)            : ;;
  esac
  shift
done

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
green()  { echo -e "\033[32m[OK]\033[0m $*"; }
yellow() { echo -e "\033[33m[SKIP]\033[0m $*"; }
red()    { echo -e "\033[31m[ERROR]\033[0m $*"; }
warn()   { echo -e "   [WARN] $*"; }
info()   { echo -e "\033[36m[INFO]\033[0m $*"; }
log()    { echo "[$(date -u +'%T')] $*" | tee -a "$ROLLBACK_LOG"; }

die() {
  red "FATAL: $*"
  log "FATAL: $*"
  exit 1
}

# ---------------------------------------------------------------------------
# List mode
# ---------------------------------------------------------------------------
if $LIST_MODE; then
  echo ""
  echo "Available backups:"
  echo ""
  if [ -d "$BACKUPS_ROOT" ]; then
    ls -1t "$BACKUPS_ROOT" 2>/dev/null || echo "  (none)"
  else
    echo "  No backup directory found at $BACKUPS_ROOT"
  fi
  echo ""
  exit 0
fi

# ---------------------------------------------------------------------------
# Find WP path and child theme
# ---------------------------------------------------------------------------
detect_wp_path() {
  if [ -n "$WP_PATH" ] && [ -f "${WP_PATH}/wp-config.php" ]; then
    return 0
  fi
  if command -v wp &>/dev/null && wp core is-installed 2>/dev/null; then
    WP_PATH="$(wp eval 'echo rtrim(ABSPATH, "/");' 2>/dev/null || echo '')"
    if [ -n "$WP_PATH" ] && [ -f "${WP_PATH}/wp-config.php" ]; then
      return 0
    fi
  fi
  for candidate in /home/*/public_html /var/www/html /var/www; do
    if [ -f "$candidate/wp-config.php" ]; then
      WP_PATH="$candidate"
      return 0
    fi
  done
  return 1
}

detect_wp_path || true  # best-effort; not fatal for rollback

if [ -n "$WP_PATH" ]; then
  ACTIVE_THEME_DIR=$(wp theme list --status=active --field=stylesheet --path="$WP_PATH" 2>/dev/null || echo "")
  if [ -n "$ACTIVE_THEME_DIR" ]; then
    CHILD_THEME_DIR="${WP_PATH}/wp-content/themes/${ACTIVE_THEME_DIR}"
  fi
fi

# ---------------------------------------------------------------------------
# Find backup
# ---------------------------------------------------------------------------
mkdir -p "$(dirname "$ROLLBACK_LOG")"

if [ -z "$BACKUP_DIR" ]; then
  if [ -d "$BACKUPS_ROOT" ]; then
    BACKUP_DIR=$(ls -1dt "$BACKUPS_ROOT"/*/ 2>/dev/null | head -1 || echo "")
  fi
  if [ -z "$BACKUP_DIR" ]; then
    die "No backups found. Cannot roll back."
  fi
  log "Using latest backup: $BACKUP_DIR"
else
  if [ ! -d "$BACKUP_DIR" ]; then
    die "Backup directory not found: $BACKUP_DIR"
  fi
  log "Using specified backup: $BACKUP_DIR"
fi

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------
echo ""
echo "=============================================="
echo "  Moonrock Homepage Rollback  v2.1.0"
echo "  $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
echo "=============================================="
echo ""
echo "  This script will:"
echo "    • Restore backed-up style.css and functions.php"
echo "    • Remove ONLY Elementor templates with marker:"
echo "      $PACKAGE_MARKER = $PACKAGE_VALUE"
echo "    • Clear supported caches"
echo ""
echo "  This script will NOT:"
echo "    • Perform a database restore"
echo "    • Restore deleted products, pages, or posts"
echo "    • Roll back WooCommerce data"
echo "    • Change the active homepage"
echo ""
echo "  For full disaster recovery, use JetBackup in cPanel."
echo ""

# ---------------------------------------------------------------------------
# Count what will be affected (for confirmation)
# ---------------------------------------------------------------------------
TEMPLATE_COUNT=0
if [ -n "$WP_PATH" ]; then
  TEMPLATE_COUNT=$(wp post list \
    --post_type=elementor_library \
    --meta_key="$PACKAGE_MARKER" \
    --meta_value="$PACKAGE_VALUE" \
    --field=ID \
    --path="$WP_PATH" 2>/dev/null | wc -l || echo "0")
fi

echo "  Backup:          $BACKUP_DIR"
echo "  Templates found: $TEMPLATE_COUNT (marked $PACKAGE_MARKER=$PACKAGE_VALUE)"
echo ""

# Confirmation gate
if ! $FORCE_MODE; then
  read -r -p "  Proceed with rollback? [y/N]: " CONFIRM
  if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo ""
    yellow "Rollback cancelled."
    exit 0
  fi
fi

echo ""
log "Rollback started."

# ---------------------------------------------------------------------------
# Step 1 — Restore child theme files
# ---------------------------------------------------------------------------
log "Step 1: Restore child theme files from backup"

restore_file() {
  local backup="$1"
  local dest="$2"
  local name="$3"

  if [ -f "$backup" ]; then
    # Verify backup is non-empty before restoring
    if [ -s "$backup" ]; then
      cp "$backup" "$dest"
      green "  Restored: $name"
      log "  Restored: $name from $backup"
    else
      red "  Backup for $name is empty — NOT restored (keeping current file)"
      log "  Backup for $name is empty — skipped"
    fi
  else
    yellow "  No backup for $name — skipping"
    log "  No backup for $name — file left as-is"
  fi
}

if [ -n "$CHILD_THEME_DIR" ] && [ -d "$CHILD_THEME_DIR" ]; then
  restore_file "${BACKUP_DIR}/style.css.bak" "${CHILD_THEME_DIR}/style.css" "style.css"
  restore_file "${BACKUP_DIR}/functions.php.bak" "${CHILD_THEME_DIR}/functions.php" "functions.php"
else
  yellow "  Child theme directory not found — nothing to restore"
fi

# ---------------------------------------------------------------------------
# Step 2 — Remove package-owned Elementor templates
# ---------------------------------------------------------------------------
log "Step 2: Remove package-owned Elementor templates"

REMOVED=0

if [ -z "$WP_PATH" ]; then
  yellow "  WordPress path not available — cannot remove templates"
else
  TEMPLATE_IDS=$(wp post list \
    --post_type=elementor_library \
    --meta_key="$PACKAGE_MARKER" \
    --meta_value="$PACKAGE_VALUE" \
    --field=ID \
    --path="$WP_PATH" 2>/dev/null || echo "")

  if [ -z "$TEMPLATE_IDS" ]; then
    yellow "  No templates found with marker $PACKAGE_MARKER=$PACKAGE_VALUE"
  else
    while IFS= read -r tid; do
      [ -z "$tid" ] && continue
      TITLE=$(wp post get "$tid" --field=post_title --path="$WP_PATH" 2>/dev/null || echo "unknown")
      if wp post delete "$tid" --force --path="$WP_PATH" 2>/dev/null; then
        green "  Removed: $TITLE (ID: $tid)"
        log "  Removed: $TITLE (ID: $tid)"
        REMOVED=$((REMOVED + 1))
      else
        red "  Failed to remove ID: $tid"
      fi
    done <<< "$TEMPLATE_IDS"
  fi
fi

log "  Templates removed: $REMOVED"

# ---------------------------------------------------------------------------
# Step 3 — Conditional cache clearing
# ---------------------------------------------------------------------------
log "Step 3: Clear caches"

if [ -n "$WP_PATH" ]; then
  if wp eval "echo class_exists('\\\\Elementor\\\\Plugin') ? 'yes' : 'no';" --path="$WP_PATH" 2>/dev/null | grep -q "yes"; then
    wp eval "\Elementor\Plugin::instance()->files_manager->clear_cache();" --path="$WP_PATH" 2>/dev/null && \
      log "  Elementor CSS cache cleared" || \
      warn "Elementor CSS cache clear skipped"
  fi
fi

if command -v wp >/dev/null && [ -n "$WP_PATH" ]; then
  wp litespeed-purge all --path="$WP_PATH" 2>/dev/null && \
    log "  LiteSpeed cache purged" || \
    warn "LiteSpeed cache purge not available"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "=============================================="
echo "  ROLLBACK COMPLETE"
echo "=============================================="
echo ""
echo "  Theme files restored:  style.css, functions.php (from $BACKUP_DIR)"
echo "  Templates removed:     $REMOVED (marked $PACKAGE_MARKER=$PACKAGE_VALUE)"
echo "  Log:                   $ROLLBACK_LOG"
echo ""
green "Rollback finished."

echo ""
echo "  ═══════════════════════════════════════════"
echo "  IMPORTANT — what this rollback did NOT do:"
echo "  ═══════════════════════════════════════════"
echo ""
echo "  ✗ Did NOT restore the database"
echo "  ✗ Did NOT restore deleted content"
echo "  ✗ Did NOT revert WooCommerce data"
echo "  ✗ Did NOT change the active homepage"
echo "  ✗ Did NOT modify pages, posts, menus, or categories"
echo ""
echo "  For a full site restoration, use JetBackup in cPanel."
echo ""

log "Rollback finished."
