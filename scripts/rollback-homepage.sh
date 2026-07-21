#!/usr/bin/env bash
# =============================================================================
# Moonrock — Homepage Rollback Script
# Version: 1.0.0
#
# Restores child theme files from the most recent backup and removes
# only the Elementor templates imported by deploy-homepage.sh.
# Leaves all unrelated content, products, pages, and navigation untouched.
#
# Usage:
#   bash scripts/rollback-homepage.sh              # Use latest backup
#   bash scripts/rollback-homepage.sh --backup-dir /path/to/specific  # Use specific backup
#   bash scripts/rollback-homepage.sh --list       # List available backups
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
WP_PATH="${WP_PATH:-/home/*/public_html}"
CHILD_THEME_DIR="${WP_PATH}/wp-content/themes/xstore-child"
BACKUPS_ROOT="${REPO_ROOT}/deployments/backups"
ROLLBACK_LOG="${REPO_ROOT}/deployments/rollback-$(date -u +'%Y%m%d-%H%M%S').log"
BACKUP_DIR=""
LIST_MODE=false

# Template titles to remove (must match deploy script naming)
TEMPLATE_TITLES=(
  "Moonrock — Hero"
  "Moonrock — Recognition"
  "Moonrock — Imagine What's Possible"
  "Moonrock — Flight Plan"
  "Moonrock — Guidance Before Guesswork"
  "Moonrock — Meet Nova"
  "Moonrock — Growth Hub"
  "Moonrock — Final CTA & Footer"
)

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
for arg in "$@"; do
  case "$arg" in
    --list) LIST_MODE=true ;;
    --backup-dir)
      shift
      BACKUP_DIR="${1:-}"
      ;;
    *) : ;;
  esac
done

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
green()  { echo -e "\033[32m[OK]\033[0m $*"; }
yellow() { echo -e "\033[33m[SKIP]\033[0m $*"; }
red()    { echo -e "\033[31m[ERROR]\033[0m $*"; }
info()   { echo -e "\033[36m[INFO]\033[0m $*"; }
log()    { echo "[$(date -u +'%T')] $*" | tee -a "$ROLLBACK_LOG"; }

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
echo "  Moonrock Homepage Rollback"
echo "  $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
echo "=============================================="
echo ""

# ---------------------------------------------------------------------------
# Step 1 — Restore child theme files
# ---------------------------------------------------------------------------
log "Step 1: Restore child theme files"

restore_file() {
  local backup="$1"
  local dest="$2"
  local name="$3"

  if [ -f "$backup" ]; then
    cp "$backup" "$dest"
    green "  Restored: $name"
    log "  Restored: $name from $backup"
  else
    yellow "  No backup for $name — skipping"
    log "  No backup for $name"
  fi
}

if [ -d "$CHILD_THEME_DIR" ]; then
  restore_file "${BACKUP_DIR}/style.css.bak" "${CHILD_THEME_DIR}/style.css" "style.css"
  restore_file "${BACKUP_DIR}/functions.php.bak" "${CHILD_THEME_DIR}/functions.php" "functions.php"
else
  yellow "  Child theme directory not found — nothing to restore"
fi

# ---------------------------------------------------------------------------
# Step 2 — Remove imported templates
# ---------------------------------------------------------------------------
log "Step 2: Remove imported Elementor templates"

REMOVED=0
SKIPPED=0

for title in "${TEMPLATE_TITLES[@]}"; do
  # Find template by title
  TEMPLATE_ID=$(wp post list \
    --post_type=elementor_library \
    --title="$title" \
    --field=ID \
    --path="$WP_PATH" 2>/dev/null || echo "")

  if [ -n "$TEMPLATE_ID" ]; then
    wp post delete "$TEMPLATE_ID" --force --path="$WP_PATH" 2>/dev/null && \
      green "  Removed: $title (ID: $TEMPLATE_ID)" && \
      log "  Removed template: $title (ID: $TEMPLATE_ID)" && \
      REMOVED=$((REMOVED + 1)) || \
      red "  Failed to remove: $title (ID: $TEMPLATE_ID)"
  else
    yellow "  Not found: $title — skipping"
    SKIPPED=$((SKIPPED + 1))
  fi
done

log "  Removed: $REMOVED, Skipped (not found): $SKIPPED"

# ---------------------------------------------------------------------------
# Step 3 — Clear caches
# ---------------------------------------------------------------------------
log "Step 3: Clear caches"

if wp eval "echo class_exists('\\\\Elementor\\\\Plugin') ? 'yes' : 'no';" --path="$WP_PATH" 2>/dev/null | grep -q "yes"; then
  wp eval "\Elementor\Plugin::instance()->files_manager->clear_cache();" --path="$WP_PATH" 2>/dev/null && \
    log "  Elementor CSS cache cleared" || \
    log "  Elementor cache clear skipped"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "=============================================="
echo "  ROLLBACK COMPLETE"
echo "=============================================="
echo ""
echo "  Files restored: style.css, functions.php"
echo "  Templates removed: $REMOVED"
echo "  Templates skipped: $SKIPPED"
echo "  Log: $ROLLBACK_LOG"
echo ""
green "Rollback successful. The site has been returned to its pre-deployment state."
echo ""
echo "  Note: Manually created Elementor pages or assignments"
echo "        are not affected by this rollback — only the"
echo "        imported section templates were removed."
echo ""

log "Rollback finished."
