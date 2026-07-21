#!/usr/bin/env bash
# =============================================================================
# Moonrock — Homepage Deployment Script  v2.0.0
#
# Deploys the Moonrock homepage implementation to the live WordPress site.
# Idempotent — safe to run multiple times.
# Never changes the active homepage, navigation, or WooCommerce products.
#
# Usage:
#   bash scripts/deploy-homepage.sh --dry-run
#   bash scripts/deploy-homepage.sh --deploy-theme-files
#   bash scripts/deploy-homepage.sh --deploy-theme-files --dry-run
#
# Theme-file deployment requires an explicit flag or interactive confirmation.
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
WP_PATH="${WP_PATH:-}"
CHILD_THEME_DIR=""
DEPLOY_LOG="${REPO_ROOT}/deployments/deploy-$(date -u +'%Y%m%d-%H%M%S').log"
BACKUP_DIR="${REPO_ROOT}/deployments/backups/$(date -u +'%Y%m%d-%H%M%S')"
DRY_RUN=false
DEPLOY_THEME_FILES=false
TEMPLATE_DIR="${REPO_ROOT}/elementor/templates"
PACKAGE_MARKER="moonrock_deployment_package"
PACKAGE_VALUE="homepage-v1"
TEMPLATE_IMPORTED=0
TEMPLATE_SKIPPED=0
TEMPLATE_UPDATED=0
HOMEPAGE_ID_BEFORE=""
HOMEPAGE_ID_AFTER=""

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------
for arg in "$@"; do
  case "$arg" in
    --dry-run)          DRY_RUN=true ;;
    --deploy-theme-files) DEPLOY_THEME_FILES=true ;;
    *) echo "Unknown argument: $arg"; exit 1 ;;
  esac
done

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
green()  { echo -e "\033[32m[OK]\033[0m $*"; }
yellow() { echo -e "\033[33m[SKIP]\033[0m $*"; }
red()    { echo -e "\033[31m[ERROR]\033[0m $*"; }
warn()   { echo -e "   [WARN] $*"; }
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
echo "  Moonrock Homepage Deployment  v2.0.0"
echo "  $(date -u +'%Y-%m-%d %H:%M:%S UTC')"
if $DRY_RUN; then
  echo "  MODE: DRY RUN — no changes will be made"
fi
if $DEPLOY_THEME_FILES; then
  echo "  THEME FILES: will be deployed"
else
  echo "  THEME FILES: will NOT be deployed (use --deploy-theme-files)"
fi
echo "=============================================="
echo ""

mkdir -p "$(dirname "$DEPLOY_LOG")" "$BACKUP_DIR"
log "Deployment started. Log: $DEPLOY_LOG"

# ---------------------------------------------------------------------------
# Step 0 — Environment check
# ---------------------------------------------------------------------------
log "Step 0: Environment check"
if bash "${SCRIPT_DIR}/check-environment.sh"; then
  log "Environment check passed."
else
  die "Environment check failed. Fix issues and retry."
fi

# ---------------------------------------------------------------------------
# Step 1 — Detect environment via WP-CLI
# ---------------------------------------------------------------------------
log "Step 1: Detect WordPress environment"

# Find WordPress path if not set
if [ -z "$WP_PATH" ]; then
  if wp core is-installed 2>/dev/null; then
    WP_PATH="$(wp eval 'echo ABSPATH;' 2>/dev/null || echo '')"
  fi
  if [ -z "$WP_PATH" ]; then
    # Try common paths
    for candidate in /home/*/public_html /var/www/html /var/www; do
      if [ -f "$candidate/wp-config.php" ]; then
        WP_PATH="$candidate"
        break
      fi
    done
  fi
fi

if [ -z "$WP_PATH" ] || [ ! -f "${WP_PATH}/wp-config.php" ]; then
  die "Cannot detect WordPress installation. Set WP_PATH environment variable."
fi

log "  WordPress path: $WP_PATH"

# Site info
SITE_URL=$(wp option get siteurl --path="$WP_PATH" 2>/dev/null || echo "unknown")
DB_NAME=$(wp config get DB_NAME --path="$WP_PATH" 2>/dev/null || echo "unknown")
PHP_VER=$(php -r 'echo PHP_VERSION;' 2>/dev/null || echo "unknown")
WP_CLI_VER=$(wp cli version 2>/dev/null | grep -oP '[\d.]+' | head -1 || echo "unknown")

log "  Site URL:        $SITE_URL"
log "  Database:        $DB_NAME"
log "  PHP version:     $PHP_VER"
log "  WP-CLI version:  $WP_CLI_VER"

# ---------------------------------------------------------------------------
# Step 2 — Detect theme
# ---------------------------------------------------------------------------
log "Step 2: Detect active theme"

ACTIVE_THEME=$(wp theme list --status=active --field=name --path="$WP_PATH" 2>/dev/null || echo "")
ACTIVE_THEME_DIR=$(wp theme list --status=active --field=stylesheet --path="$WP_PATH" 2>/dev/null || echo "")

log "  Active theme:    $ACTIVE_THEME"
log "  Stylesheet dir:  $ACTIVE_THEME_DIR"

# Verify it is a child theme
TEMPLATE=$(wp theme get "$ACTIVE_THEME_DIR" --field=template --path="$WP_PATH" 2>/dev/null || echo "")
if [ -z "$TEMPLATE" ] || [ "$TEMPLATE" = "$ACTIVE_THEME_DIR" ]; then
  die "Active theme '$ACTIVE_THEME' does not appear to be a child theme (no Template header). Refusing to deploy into a parent theme."
fi

log "  Parent template: $TEMPLATE"
log "  Verified: active theme is a child theme."

CHILD_THEME_DIR="${WP_PATH}/wp-content/themes/${ACTIVE_THEME_DIR}"
if [ ! -d "$CHILD_THEME_DIR" ]; then
  die "Child theme directory not found: $CHILD_THEME_DIR"
fi

log "  Child theme path: $CHILD_THEME_DIR"

# ---------------------------------------------------------------------------
# Step 3 — Capture current homepage
# ---------------------------------------------------------------------------
log "Step 3: Capture current homepage"

HOMEPAGE_ID_BEFORE=$(wp option get page_on_front --path="$WP_PATH" 2>/dev/null || echo "0")
if [ "$HOMEPAGE_ID_BEFORE" != "0" ] && [ -n "$HOMEPAGE_ID_BEFORE" ]; then
  HOMEPAGE_TITLE_BEFORE=$(wp post get "$HOMEPAGE_ID_BEFORE" --field=post_title --path="$WP_PATH" 2>/dev/null || echo "unknown")
  log "  Homepage ID:     $HOMEPAGE_ID_BEFORE"
  log "  Homepage title:  $HOMEPAGE_TITLE_BEFORE"
else
  HOMEPAGE_ID_BEFORE="0"
  log "  Homepage:        not set (posts page or custom front page)"
fi

# ---------------------------------------------------------------------------
# Step 4 — Plugin verification
# ---------------------------------------------------------------------------
log "Step 4: Plugin verification"

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
  wp plugin is-active elementor-pro --path="$WP_PATH" 2>/dev/null && \
    log "  Elementor Pro: active" || \
    log "  Elementor Pro: not verified via WP-CLI slug — continuing"
  verify_plugin "woocommerce" "WooCommerce"
else
  info "  (dry-run) Plugin verification skipped"
fi

# ---------------------------------------------------------------------------
# Step 5 — Theme file deployment (gated)
# ---------------------------------------------------------------------------
log "Step 5: Theme file deployment"

SOURCE_CSS="${REPO_ROOT}/xstore-child/style.css"
SOURCE_PHP="${REPO_ROOT}/xstore-child/functions.php"
DEST_CSS="${CHILD_THEME_DIR}/style.css"
DEST_PHP="${CHILD_THEME_DIR}/functions.php"

# Verify source files exist
for src in "$SOURCE_CSS" "$SOURCE_PHP"; do
  if [ ! -f "$src" ]; then
    die "Source file not found: $src"
  fi
done

# Gate: require --deploy-theme-files or interactive confirmation
if ! $DEPLOY_THEME_FILES; then
  echo ""
  yellow "Theme file deployment is disabled by default."
  echo ""
  echo "  To deploy style.css and functions.php, re-run with:"
  echo "    bash scripts/deploy-homepage.sh --deploy-theme-files"
  echo ""
  echo "  Or pass --dry-run to preview without changes."
  echo ""

  if $DRY_RUN; then
    info "  Dry run: would compare checksums and show diff, but not deploy."
  fi

  # Interactive fallback
  if ! $DRY_RUN; then
    read -r -p "  Deploy theme files now? [y/N]: " CONFIRM
    if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
      DEPLOY_THEME_FILES=true
    fi
  fi
fi

if $DEPLOY_THEME_FILES; then
  # Compare checksums
  for pair in "$SOURCE_CSS|$DEST_CSS|style.css" "$SOURCE_PHP|$DEST_PHP|functions.php"; do
    IFS='|' read -r src dest name <<< "$pair"

    if [ -f "$dest" ]; then
      SRC_SUM=$(sha256sum "$src" | awk '{print $1}')
      DEST_SUM=$(sha256sum "$dest" | awk '{print $1}')

      if [ "$SRC_SUM" = "$DEST_SUM" ]; then
        log "  $name: identical (no changes needed)"
      else
        info "  $name: differs from deployed version"
        if $DRY_RUN; then
          info "    (dry-run) Would back up existing, then copy."
          diff --unified=1 "$dest" "$src" 2>/dev/null | head -40 || true
        fi
      fi
    else
      log "  $name: does not exist at destination — will create"
    fi
  done

  # Backup existing files
  if ! $DRY_RUN; then
    for pair in "$DEST_CSS|style.css" "$DEST_PHP|functions.php"; do
      IFS='|' read -r dest name <<< "$pair"
      if [ -f "$dest" ]; then
        cp "$dest" "${BACKUP_DIR}/${name}.bak"
        log "  Backed up: $name"
      fi
    done
  fi

  # Copy files
  if ! $DRY_RUN; then
    cp "$SOURCE_CSS" "$DEST_CSS"
    cp "$SOURCE_PHP" "$DEST_PHP"
    log "  Deployed: style.css → $DEST_CSS"
    log "  Deployed: functions.php → $DEST_PHP"
  else
    dry "  Would copy: style.css → $DEST_CSS"
    dry "  Would copy: functions.php → $DEST_PHP"
  fi
fi

# ---------------------------------------------------------------------------
# Step 6 — Import Elementor templates (idempotent, metadata-tagged)
# ---------------------------------------------------------------------------
log "Step 6: Import Elementor templates"

import_template() {
  local json_file="$1"
  local template_name
  template_name=$(python3 -c "import json; print(json.load(open('$json_file'))['title'])" 2>/dev/null || \
                  grep -oP '"title"\s*:\s*"\K[^"]+' "$json_file" | head -1 || echo "unknown")

  # Check if a template with our deployment marker already exists
  EXISTING_ID=$(wp post list \
    --post_type=elementor_library \
    --meta_key="$PACKAGE_MARKER" \
    --meta_value="$PACKAGE_VALUE" \
    --title="$template_name" \
    --field=ID \
    --path="$WP_PATH" 2>/dev/null | head -1 || echo "")

  if [ -n "$EXISTING_ID" ]; then
    log "  Template '$template_name' already exists (ID: $EXISTING_ID) with package marker — updating"

    if ! $DRY_RUN; then
      TEMPLATE_JSON=$(cat "$json_file")
      wp post meta update "$EXISTING_ID" "_elementor_data" "$TEMPLATE_JSON" --path="$WP_PATH" 2>/dev/null || true
      wp post meta update "$EXISTING_ID" "_elementor_version" "3.18.0" --path="$WP_PATH" 2>/dev/null || true
      wp post meta update "$EXISTING_ID" "$PACKAGE_MARKER" "$PACKAGE_VALUE" --path="$WP_PATH" 2>/dev/null || true
      TEMPLATE_UPDATED=$((TEMPLATE_UPDATED + 1))
    else
      dry "  Would update: $template_name (ID: $EXISTING_ID)"
    fi
    return
  fi

  # Also check by title alone (catches templates from v1 without the marker)
  EXISTING_BY_TITLE=$(wp post list \
    --post_type=elementor_library \
    --title="$template_name" \
    --field=ID \
    --path="$WP_PATH" 2>/dev/null | head -1 || echo "")

  if [ -n "$EXISTING_BY_TITLE" ]; then
    log "  Template '$template_name' exists (ID: $EXISTING_BY_TITLE) without package marker — adding marker, skipping update"
    if ! $DRY_RUN; then
      wp post meta update "$EXISTING_BY_TITLE" "$PACKAGE_MARKER" "$PACKAGE_VALUE" --path="$WP_PATH" 2>/dev/null || true
    fi
    TEMPLATE_SKIPPED=$((TEMPLATE_SKIPPED + 1))
    return
  fi

  # Create new template
  if $DRY_RUN; then
    dry "  Would create: $template_name"
    TEMPLATE_IMPORTED=$((TEMPLATE_IMPORTED + 1))
    return
  fi

  NEW_ID=$(wp post create \
    --post_type=elementor_library \
    --post_title="$template_name" \
    --post_status=publish \
    --porcelain \
    --path="$WP_PATH" 2>/dev/null || echo "")

  if [ -z "$NEW_ID" ]; then
    red "  Failed to create template: $template_name"
    return
  fi

  TEMPLATE_JSON=$(cat "$json_file")
  wp post meta update "$NEW_ID" "_elementor_template_type" "container" --path="$WP_PATH" 2>/dev/null || true
  wp post meta update "$NEW_ID" "_elementor_edit_mode" "builder" --path="$WP_PATH" 2>/dev/null || true
  wp post meta update "$NEW_ID" "_elementor_data" "$TEMPLATE_JSON" --path="$WP_PATH" 2>/dev/null || true
  wp post meta update "$NEW_ID" "_elementor_version" "3.18.0" --path="$WP_PATH" 2>/dev/null || true
  wp post meta update "$NEW_ID" "$PACKAGE_MARKER" "$PACKAGE_VALUE" --path="$WP_PATH" 2>/dev/null || true

  log "  Created: $template_name (ID: $NEW_ID) [marker: $PACKAGE_MARKER=$PACKAGE_VALUE]"
  TEMPLATE_IMPORTED=$((TEMPLATE_IMPORTED + 1))
}

if $DRY_RUN; then
  info "  (dry-run) Would process templates from $TEMPLATE_DIR"
  for f in "$TEMPLATE_DIR"/section-*.json; do
    [ -f "$f" ] || continue
    TEMPLATE_NAME=$(grep -oP '"title"\s*:\s*"\K[^"]+' "$f" | head -1 || basename "$f" .json)
    info "    → $TEMPLATE_NAME"
    TEMPLATE_IMPORTED=$((TEMPLATE_IMPORTED + 1))
  done
else
  if wp eval "echo class_exists('\\\\Elementor\\\\Plugin') ? 'yes' : 'no';" --path="$WP_PATH" 2>/dev/null | grep -q "yes"; then
    log "  Elementor detected — importing templates..."
    for f in "$TEMPLATE_DIR"/section-*.json; do
      [ -f "$f" ] || continue
      import_template "$f"
    done
  else
    red "  Elementor not detected via WP-CLI. Cannot import templates automatically."
    warn "  Manual import required: Elementor → Templates → Import → section-*.json"
  fi
fi

# ---------------------------------------------------------------------------
# Step 7 — Verify homepage unchanged
# ---------------------------------------------------------------------------
log "Step 7: Verify homepage unchanged"

if ! $DRY_RUN; then
  HOMEPAGE_ID_AFTER=$(wp option get page_on_front --path="$WP_PATH" 2>/dev/null || echo "0")
  if [ "$HOMEPAGE_ID_BEFORE" = "$HOMEPAGE_ID_AFTER" ]; then
    log "  Homepage ID unchanged: $HOMEPAGE_ID_AFTER"
  else
    red "  WARNING: Homepage ID changed! Before: $HOMEPAGE_ID_BEFORE, After: $HOMEPAGE_ID_AFTER"
    red "  This script does NOT change the homepage. Something else may have modified it."
  fi
else
  info "  (dry-run) Homepage verification skipped"
fi

# ---------------------------------------------------------------------------
# Step 8 — Cache clearing (conditional, warnings only)
# ---------------------------------------------------------------------------
log "Step 8: Cache clearing"

clear_elementor_cache() {
  if ! $DRY_RUN; then
    if wp eval "echo class_exists('\\\\Elementor\\\\Plugin') ? 'yes' : 'no';" --path="$WP_PATH" 2>/dev/null | grep -q "yes"; then
      wp eval "\Elementor\Plugin::instance()->files_manager->clear_cache();" --path="$WP_PATH" 2>/dev/null && \
        log "  Elementor CSS cache cleared" || \
        warn "Elementor CSS cache clear failed — this is not critical. Run manually: Elementor → Tools → Regenerate CSS"
    else
      warn "Elementor not available — cache not cleared"
    fi
  else
    info "  (dry-run) Would attempt Elementor cache clear"
  fi
}

clear_litespeed_cache() {
  if ! $DRY_RUN; then
    if command -v wp >/dev/null && wp litespeed-purge all --path="$WP_PATH" 2>/dev/null; then
      log "  LiteSpeed cache purged"
    else
      warn "LiteSpeed cache purge not available — this is not critical. Clear manually if needed."
    fi
  else
    info "  (dry-run) Would attempt LiteSpeed cache purge"
  fi
}

clear_elementor_cache
clear_litespeed_cache

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "=============================================="
echo "  DEPLOYMENT COMPLETE"
echo "=============================================="
echo ""
echo "  Mode:              $([ "$DRY_RUN" = true ] && echo 'DRY RUN' || echo 'LIVE')"
echo "  Theme files:       $([ "$DEPLOY_THEME_FILES" = true ] && echo 'DEPLOYED' || echo 'SKIPPED')"
echo "  Templates created: $TEMPLATE_IMPORTED"
echo "  Templates updated: $TEMPLATE_UPDATED"
echo "  Templates skipped: $TEMPLATE_SKIPPED"
echo "  Homepage:          unchanged (ID: ${HOMEPAGE_ID_BEFORE:-N/A})"
echo "  Backups:           $BACKUP_DIR"
echo "  Log:               $DEPLOY_LOG"
echo ""

if $DRY_RUN; then
  yellow "Dry run complete — no changes were made. Remove --dry-run to deploy."
else
  green "Deployment successful."
  echo ""
  echo "  Manual steps remaining:"
  echo "    1. Create a NEW Elementor page (do NOT set as front page)"
  echo "    2. Assemble the 8 imported section templates on that page"
  echo "    3. Replace CTA placeholder URLs with real GHL destinations"
  echo "    4. Set Nova artwork image"
  echo "    5. Configure GHL chat widget"
  echo "    6. Set footer contact/social details"
  echo "    7. After QA, manually set the new page as homepage"
  echo ""
  echo "  See: docs/implementation/build-checklist.md Phases 6–9"
fi

echo ""

log "Deployment finished."
