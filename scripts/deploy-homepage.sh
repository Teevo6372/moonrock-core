#!/usr/bin/env bash
# =============================================================================
# Moonrock — Homepage Deployment Script
# Version: 1.0.0
#
# Deploys the Moonrock homepage implementation to WordPress.
# Idempotent — safe to run multiple times.
# Never changes the active homepage, navigation, or WooCommerce products.
#
# Usage:
#   bash scripts/deploy-homepage.sh            # Full deployment
#   bash scripts/deploy-homepage.sh --dry-run  # Simulate only, no changes
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
WP_PATH="${WP_PATH:-/home/*/public_html}"
CHILD_THEME_DIR="${WP_PATH}/wp-content/themes/xstore-child"
DEPLOY_LOG="${REPO_ROOT}/deployments/deploy-$(date -u +'%Y%m%d-%H%M%S').log"
BACKUP_DIR="${REPO_ROOT}/deployments/backups/$(date -u +'%Y%m%d-%H%M%S')"
DRY_RUN=false
TEMPLATE_DIR="${REPO_ROOT}/elementor/templates"
TEMPLATE_IMPORTED=0
TEMPLATE_SKIPPED=0

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
green()  { echo -e "\033[32m[OK]\033[0m $*"; }
yellow() { echo -e "\033[33m[SKIP]\033[0m $*"; }
red()    { echo -e "\033[31m[ERROR]\033[0m $*"; }
info()   { echo -e "\033[36m[INFO]\033[0m $*"; }
dry()    { if $DRY_RUN; then yellow "(dry-run) $*"; else green "$*"; fi; }

log()    { echo "[$(date -u +'%T')] $*" | tee -a "$DEPLOY_LOG"; }

die() {
  red "FATAL: $*"
  log "FATAL: $*"
  exit 1
}

# ---------------------------------------------------------------------------
# Banner
# ---------------------------------------------------------------------------
echo ""
echo "=============================================="
echo "  Moonrock Homepage Deployment"
echo "  $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
if $DRY_RUN; then
  echo "  MODE: DRY RUN — no changes will be made"
fi
echo "=============================================="
echo ""

mkdir -p "$(dirname "$DEPLOY_LOG")" "$BACKUP_DIR"
log "Deployment started. Log: $DEPLOY_LOG"

# ---------------------------------------------------------------------------
# Step 0 — Environment check
# ---------------------------------------------------------------------------
log "Step 0: Environment check"
bash "${SCRIPT_DIR}/check-environment.sh" || die "Environment check failed. Fix issues and retry."
log "Environment check passed."

# ---------------------------------------------------------------------------
# Step 1 — Backup existing files
# ---------------------------------------------------------------------------
log "Step 1: Backup existing child theme files"

backup_file() {
  local src="$1"
  local name="$2"
  if [ -f "$src" ]; then
    cp "$src" "${BACKUP_DIR}/${name}"
    log "  Backed up: $name"
  else
    log "  No existing $name to back up"
  fi
}

if [ -d "$CHILD_THEME_DIR" ]; then
  dry "Backing up child theme files to $BACKUP_DIR"
  if ! $DRY_RUN; then
    backup_file "${CHILD_THEME_DIR}/style.css" "style.css.bak"
    backup_file "${CHILD_THEME_DIR}/functions.php" "functions.php.bak"
  fi
else
  log "  Child theme directory not found at $CHILD_THEME_DIR — will create"
  if ! $DRY_RUN; then
    mkdir -p "$CHILD_THEME_DIR"
  fi
fi

# ---------------------------------------------------------------------------
# Step 2 — Verify plugin availability
# ---------------------------------------------------------------------------
log "Step 2: Plugin verification"

verify_plugin() {
  local slug="$1"
  local label="$2"
  if wp plugin is-active "$slug" --path="$WP_PATH" 2>/dev/null; then
    log "  $label: active"
    return 0
  else
    die "$label ($slug) is not active. Install and activate it first."
  fi
}

if ! $DRY_RUN; then
  verify_plugin "elementor" "Elementor"
  verify_plugin "elementor-pro" "Elementor Pro" || log "  Elementor Pro not verified via WP-CLI slug — continuing; verify manually"
  verify_plugin "woocommerce" "WooCommerce"
else
  info "  (dry-run) Plugin verification skipped"
fi

# ---------------------------------------------------------------------------
# Step 3 — Deploy child theme files
# ---------------------------------------------------------------------------
log "Step 3: Deploy child theme files"

deploy_file() {
  local src="$1"
  local dest="$2"
  local name="$3"

  if [ ! -f "$src" ]; then
    die "Source file not found: $src"
  fi

  dry "  Deploying $name → $dest"
  if ! $DRY_RUN; then
    cp "$src" "$dest"
    log "  Deployed: $name"
  fi
}

deploy_file "${REPO_ROOT}/xstore-child/style.css" "${CHILD_THEME_DIR}/style.css" "style.css"
deploy_file "${REPO_ROOT}/xstore-child/functions.php" "${CHILD_THEME_DIR}/functions.php" "functions.php"

# ---------------------------------------------------------------------------
# Step 4 — Import Elementor templates
# ---------------------------------------------------------------------------
log "Step 4: Import Elementor templates"

if $DRY_RUN; then
  info "  (dry-run) Would import templates from $TEMPLATE_DIR"
  for f in "$TEMPLATE_DIR"/section-*.json; do
    [ -f "$f" ] || continue
    info "    → $(basename "$f")"
    TEMPLATE_IMPORTED=$((TEMPLATE_IMPORTED + 1))
  done
else
  # Check if we can use WP-CLI to import
  if wp eval "echo class_exists('\\\\Elementor\\\\Plugin') ? 'yes' : 'no';" --path="$WP_PATH" 2>/dev/null | grep -q "yes"; then
    log "  Elementor detected. Importing templates via WP-CLI..."

    for f in "$TEMPLATE_DIR"/section-*.json; do
      [ -f "$f" ] || continue
      TEMPLATE_NAME=$(basename "$f" .json)
      log "  Importing: $TEMPLATE_NAME"

      # Check if template already exists (idempotent)
      EXISTING=$(wp post list \
        --post_type=elementor_library \
        --title="$TEMPLATE_NAME" \
        --field=ID \
        --path="$WP_PATH" 2>/dev/null || echo "")

      if [ -n "$EXISTING" ]; then
        yellow "  Template '$TEMPLATE_NAME' already exists (ID: $EXISTING) — skipping"
        TEMPLATE_SKIPPED=$((TEMPLATE_SKIPPED + 1))
        continue
      fi

      # Read template content and create via WP-CLI
      TEMPLATE_JSON=$(cat "$f")

      # Create an Elementor template post
      NEW_ID=$(wp post create \
        --post_type=elementor_library \
        --post_title="$TEMPLATE_NAME" \
        --post_status=publish \
        --post_content='<!-- Elementor template placeholder -->' \
        --porcelain \
        --path="$WP_PATH" 2>/dev/null || echo "")

      if [ -z "$NEW_ID" ]; then
        red "  Failed to create template: $TEMPLATE_NAME"
        continue
      fi

      # Set Elementor template type and data
      wp post meta update "$NEW_ID" "_elementor_template_type" "container" --path="$WP_PATH" 2>/dev/null || true
      wp post meta update "$NEW_ID" "_elementor_edit_mode" "builder" --path="$WP_PATH" 2>/dev/null || true
      wp post meta update "$NEW_ID" "_elementor_data" "$TEMPLATE_JSON" --path="$WP_PATH" 2>/dev/null || true
      wp post meta update "$NEW_ID" "_elementor_version" "3.18.0" --path="$WP_PATH" 2>/dev/null || true

      log "  Imported: $TEMPLATE_NAME (ID: $NEW_ID)"
      TEMPLATE_IMPORTED=$((TEMPLATE_IMPORTED + 1))
    done
  else
    log "  Elementor WP-CLI integration not available."
    log "  Manual import required: Elementor → Templates → Import → section-*.json"
    yellow "  Manual import required for all Elementor templates."
  fi
fi

# ---------------------------------------------------------------------------
# Step 5 — Verify deployment
# ---------------------------------------------------------------------------
log "Step 5: Verify deployment"

if ! $DRY_RUN; then
  # Check child theme files
  for f in style.css functions.php; do
    if [ -f "${CHILD_THEME_DIR}/${f}" ]; then
      log "  Verified: ${f} exists in child theme"
    else
      red "  MISSING: ${f} not found in child theme"
    fi
  done

  # Check template imports
  log "  Templates imported: $TEMPLATE_IMPORTED"
  log "  Templates skipped (already exist): $TEMPLATE_SKIPPED"
else
  info "  (dry-run) Verification skipped"
fi

# ---------------------------------------------------------------------------
# Step 6 — Clear caches (safe)
# ---------------------------------------------------------------------------
log "Step 6: Cache clearing"

if ! $DRY_RUN; then
  # Elementor CSS cache
  if wp eval "echo class_exists('\\\\Elementor\\\\Plugin') ? 'yes' : 'no';" --path="$WP_PATH" 2>/dev/null | grep -q "yes"; then
    wp eval "\Elementor\Plugin::instance()->files_manager->clear_cache();" --path="$WP_PATH" 2>/dev/null && \
      log "  Elementor CSS cache cleared" || \
      log "  Elementor cache clear skipped (may need manual: Elementor → Tools → Regenerate CSS)"
  fi

  # LiteSpeed cache
  if command -v litespeed &>/dev/null; then
    wp litespeed-purge all --path="$WP_PATH" 2>/dev/null && \
      log "  LiteSpeed cache purged" || \
      log "  LiteSpeed purge skipped"
  else
    log "  LiteSpeed not detected — clear cache manually if needed"
  fi
else
  info "  (dry-run) Cache clearing skipped"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "=============================================="
echo "  DEPLOYMENT COMPLETE"
echo "=============================================="
echo ""
echo "  Mode:       $([ "$DRY_RUN" = true ] && echo 'DRY RUN' || echo 'LIVE')"
echo "  Templates:  $TEMPLATE_IMPORTED imported, $TEMPLATE_SKIPPED skipped"
echo "  Backups:    $BACKUP_DIR"
echo "  Log:        $DEPLOY_LOG"
echo ""

if $DRY_RUN; then
  yellow "Dry run complete — no changes were made. Remove --dry-run to deploy."
else
  green "Deployment successful."

  echo "  Manual steps remaining:"
  echo "    1. Replace CTA placeholder URLs in Elementor templates"
  echo "    2. Set Nova artwork image"
  echo "    3. Configure GHL chat widget"
  echo "    4. Set footer contact/social details"
  echo "    5. Configure XStore header navigation"
  echo "    6. Assign 'nova-pick' tag to curated products"
  echo ""
  echo "  See: docs/implementation/build-checklist.md Phase 6"
fi

echo ""

log "Deployment finished."
