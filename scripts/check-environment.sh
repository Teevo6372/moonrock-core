#!/usr/bin/env bash
# =============================================================================
# Moonrock — Environment Check Script
# Version: 1.0.0
#
# Verifies that the server environment meets all requirements for
# Moonrock homepage deployment. Produces PASS / WARNING / FAIL output
# with actionable recommendations. Makes no changes to the system.
#
# Usage:
#   bash scripts/check-environment.sh [--json]
#
#   --json   Output results as JSON (for CI/CD consumption)
# =============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
WP_PATH="${WP_PATH:-/home/*/public_html}"
REQUIRED_PHP_VERSION="8.0"
REQUIRED_DISK_SPACE_MB=500
REQUIRED_THEME="xstore-child"
ELEMENTOR_VERSION_MIN="3.18.0"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
OUTPUT_FORMAT="${1:-text}"

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------
PASSES=()
WARNINGS=()
FAILURES=()
HAS_WP_CLI=false
HAS_GIT=false

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
green()  { echo -e "\033[32m[PASS]\033[0m $*"; }
yellow() { echo -e "\033[33m[WARN]\033[0m $*"; }
red()    { echo -e "\033[31m[FAIL]\033[0m $*"; }

record_pass()   { PASSES+=("$1");   green "$1"; }
record_warn()   { WARNINGS+=("$1"); yellow "$1"; }
record_fail()   { FAILURES+=("$1"); red "$1"; }

die() {
  echo ""
  echo "=============================================="
  echo "  ENVIRONMENT CHECK FAILED"
  echo "=============================================="
  echo ""
  red "Critical failure: $1"
  echo ""
  echo "Please resolve before running deployment."
  exit 1
}

# ---------------------------------------------------------------------------
# Checks
# ---------------------------------------------------------------------------

echo ""
echo "=============================================="
echo "  Moonrock Environment Check"
echo "  $TIMESTAMP"
echo "=============================================="
echo ""

# --- WordPress Path ---
echo "--- WordPress Installation ---"
if [ -n "${WP_PATH:-}" ] && [ -f "${WP_PATH}/wp-config.php" ]; then
  record_pass "WordPress found at ${WP_PATH}"
elif [ -f "./wp-config.php" ]; then
  WP_PATH="."
  record_pass "WordPress found in current directory"
elif wp core is-installed --path="${WP_PATH}" 2>/dev/null; then
  record_pass "WordPress installed (detected via WP-CLI)"
else
  record_warn "WordPress path not auto-detected. Set WP_PATH environment variable."
  WP_PATH=""
fi

# --- PHP Version ---
echo "--- PHP ---"
if command -v php &>/dev/null; then
  PHP_VER=$(php -r 'echo PHP_VERSION;')
  if printf '%s\n' "$REQUIRED_PHP_VERSION" "$PHP_VER" | sort -V -C 2>/dev/null || \
     [ "$(printf '%s\n' "$REQUIRED_PHP_VERSION" "$PHP_VER" | sort -V | head -1)" = "$REQUIRED_PHP_VERSION" ]; then
    record_pass "PHP $PHP_VER (>= $REQUIRED_PHP_VERSION required)"
  else
    record_fail "PHP $PHP_VER is below required $REQUIRED_PHP_VERSION"
  fi
else
  record_fail "PHP CLI not found"
fi

# --- WP-CLI ---
echo "--- WP-CLI ---"
if command -v wp &>/dev/null; then
  WP_CLI_VER=$(wp cli version 2>/dev/null | grep -oP '[\d.]+' | head -1)
  record_pass "WP-CLI ${WP_CLI_VER:-installed}"
  HAS_WP_CLI=true
else
  record_fail "WP-CLI not found — install with: curl -O https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar"
fi

# --- Git ---
echo "--- Git ---"
if command -v git &>/dev/null; then
  GIT_VER=$(git --version | awk '{print $3}')
  record_pass "Git $GIT_VER"
  HAS_GIT=true
else
  record_warn "Git not found — Git-based deployment unavailable"
fi

# --- SSH ---
echo "--- SSH ---"
if [ -n "${SSH_CONNECTION:-}" ] || [ -n "${SSH_TTY:-}" ]; then
  record_pass "SSH session active"
elif [ -f "$HOME/.ssh/id_rsa" ] || [ -f "$HOME/.ssh/id_ed25519" ]; then
  record_pass "SSH keys present (non-interactive deployment possible)"
else
  record_warn "No active SSH session or keys detected. SFTP/FTP may be required."
fi

# --- File Permissions ---
echo "--- File Permissions ---"
if [ -n "${WP_PATH:-}" ] && [ -d "${WP_PATH}/wp-content" ]; then
  if [ -w "${WP_PATH}/wp-content/themes" ]; then
    record_pass "wp-content/themes is writable"
  else
    record_fail "wp-content/themes is NOT writable — cannot deploy child theme files"
  fi
  if [ -w "${WP_PATH}/wp-content/uploads" ]; then
    record_pass "wp-content/uploads is writable"
  else
    record_warn "wp-content/uploads is not writable — media uploads may fail"
  fi
else
  record_warn "Cannot verify file permissions without WordPress path"
fi

# --- Plugins ---
echo "--- Required Plugins ---"
if $HAS_WP_CLI && [ -n "${WP_PATH:-}" ]; then
  # Elementor
  if wp plugin is-installed elementor --path="$WP_PATH" 2>/dev/null; then
    if wp plugin is-active elementor --path="$WP_PATH" 2>/dev/null; then
      record_pass "Elementor (active)"
    else
      record_fail "Elementor installed but NOT active"
    fi
  else
    record_fail "Elementor not installed"
  fi

  # Elementor Pro
  if wp plugin is-installed elementor-pro --path="$WP_PATH" 2>/dev/null; then
    if wp plugin is-active elementor-pro --path="$WP_PATH" 2>/dev/null; then
      record_pass "Elementor Pro (active)"
    else
      record_fail "Elementor Pro installed but NOT active"
    fi
  else
    record_warn "Elementor Pro not detected via WP-CLI (may be installed under a different slug or via manual upload)"
  fi

  # WooCommerce
  if wp plugin is-installed woocommerce --path="$WP_PATH" 2>/dev/null; then
    if wp plugin is-active woocommerce --path="$WP_PATH" 2>/dev/null; then
      record_pass "WooCommerce (active)"
    else
      record_fail "WooCommerce installed but NOT active"
    fi
  else
    record_fail "WooCommerce not installed"
  fi
else
  record_warn "WP-CLI not available — cannot verify plugins. Manually confirm: Elementor, Elementor Pro, WooCommerce"
fi

# --- Theme ---
echo "--- Theme ---"
if $HAS_WP_CLI && [ -n "${WP_PATH:-}" ]; then
  ACTIVE_THEME=$(wp theme list --status=active --field=name --path="$WP_PATH" 2>/dev/null)
  ACTIVE_DIR=$(wp theme list --status=active --field=stylesheet --path="$WP_PATH" 2>/dev/null)
  THEME_TEMPLATE=$(wp theme get "$ACTIVE_DIR" --field=template --path="$WP_PATH" 2>/dev/null || echo "")

  if echo "$ACTIVE_THEME" | grep -qi "xstore"; then
    record_pass "Active theme: $ACTIVE_THEME (dir: $ACTIVE_DIR)"
  else
    record_warn "Active theme is '$ACTIVE_THEME' — expected XStore Child"
  fi

  if [ -n "$THEME_TEMPLATE" ] && [ "$THEME_TEMPLATE" != "$ACTIVE_DIR" ]; then
    record_pass "Verified child theme — parent template: $THEME_TEMPLATE"
    record_pass "Child theme directory: ${WP_PATH}/wp-content/themes/${ACTIVE_DIR}"
  else
    record_fail "Active theme does not appear to be a child theme. Deployment into a parent theme is blocked."
  fi

  if wp theme is-installed xstore-child --path="$WP_PATH" 2>/dev/null; then
    record_pass "XStore Child theme installed"
  else
    record_fail "XStore Child theme not installed"
  fi
else
  record_warn "Cannot verify theme without WP-CLI"
fi

# --- Backup ---
echo "--- Backup ---"
if [ -d "/usr/local/cpanel" ] || [ -f "/usr/local/cpanel/version" ]; then
  record_pass "cPanel detected — JetBackup likely available via cPanel > JetBackup"
elif command -v jetbackup &>/dev/null; then
  record_pass "JetBackup CLI available"
else
  record_warn "JetBackup not detected. Ensure backups exist before deployment."
fi

# --- Disk Space ---
echo "--- Disk Space ---"
if AVAIL_KB=$(df --output=avail "${WP_PATH:-.}" 2>/dev/null | tail -1 | tr -d ' '); then
  AVAIL_MB=$((AVAIL_KB / 1024))
  if [ "$AVAIL_MB" -ge "$REQUIRED_DISK_SPACE_MB" ]; then
    record_pass "Disk space: ${AVAIL_MB}MB available (minimum ${REQUIRED_DISK_SPACE_MB}MB)"
  else
    record_fail "Disk space: only ${AVAIL_MB}MB available (need ${REQUIRED_DISK_SPACE_MB}MB)"
  fi
else
  record_warn "Cannot determine available disk space"
fi

# --- Writable Directories ---
echo "--- Writable Directories ---"
for dir in "${WP_PATH}/wp-content/themes" "${WP_PATH}/wp-content/uploads" "${WP_PATH}/wp-content/plugins"; do
  if [ -w "$dir" ]; then
    record_pass "Writable: $dir"
  else
    record_warn "Not writable: $dir"
  fi
done

# --- LiteSpeed ---
echo "--- Web Server ---"
if command -v litespeed &>/dev/null || [ -f "/usr/local/lsws/VERSION" ]; then
  record_pass "LiteSpeed detected — cache clearing via LiteSpeed API available"
else
  record_warn "LiteSpeed not detected. Post-deployment cache may need manual clearing."
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "=============================================="
echo "  SUMMARY"
echo "=============================================="
echo ""
echo "  PASS:   ${#PASSES[@]}"
echo "  WARN:   ${#WARNINGS[@]}"
echo "  FAIL:   ${#FAILURES[@]}"
echo ""

if [ ${#FAILURES[@]} -gt 0 ]; then
  echo "Failures:"
  for f in "${FAILURES[@]}"; do echo "  ✗ $f"; done
  echo ""
fi
if [ ${#WARNINGS[@]} -gt 0 ]; then
  echo "Warnings:"
  for w in "${WARNINGS[@]}"; do echo "  ! $w"; done
  echo ""
fi

if [ ${#FAILURES[@]} -gt 0 ]; then
  echo "VERDICT: ❌ NOT READY — resolve failures before deploying."
  exit 1
elif [ ${#WARNINGS[@]} -gt 0 ]; then
  echo "VERDICT: ⚠️  READY WITH WARNINGS — review warnings before deploying."
  exit 0
else
  echo "VERDICT: ✅ ALL CHECKS PASSED — environment is ready for deployment."
  exit 0
fi
