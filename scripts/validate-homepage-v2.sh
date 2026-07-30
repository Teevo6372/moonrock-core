#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
CONTENT="${REPO_ROOT}/xstore-child/template-parts/moonrock-homepage-content.php"
CSS="${REPO_ROOT}/xstore-child/assets/css/moonrock-homepage.css"
MANIFEST="${REPO_ROOT}/deployments/homepage-v2-manifest.txt"

required=(
  "$CONTENT"
  "$CSS"
  "$MANIFEST"
  "${REPO_ROOT}/xstore-child/assets/images/moonrock-brand.webp"
  "${REPO_ROOT}/xstore-child/assets/images/nova-hero.webp"
  "${REPO_ROOT}/xstore-child/assets/images/nova-profile.webp"
)

for file in "${required[@]}"; do
  [[ -s "$file" ]] || { echo "Required file missing or empty: $file" >&2; exit 1; }
done

[[ "$(grep -c '<h1' "$CONTENT")" -eq 1 ]] || {
  echo "Homepage must contain exactly one H1." >&2
  exit 1
}

for breakpoint in "max-width: 900px" "max-width: 640px" "prefers-reduced-motion: reduce"; do
  grep -Fq "$breakpoint" "$CSS" || {
    echo "Required responsive/accessibility rule missing: $breakpoint" >&2
    exit 1
  }
done

while IFS='|' read -r source destination; do
  [[ -z "$source" || "$source" == \#* ]] && continue
  [[ -f "${REPO_ROOT}/${source}" ]] || {
    echo "Manifest source missing: $source" >&2
    exit 1
  }
  [[ "$destination" == wp-content/themes/xstore-child/* ]] || {
    echo "Manifest destination escapes child theme: $destination" >&2
    exit 1
  }
done < "$MANIFEST"

if rg -n --hidden --glob '!*.webp' \
  '(BEGIN (RSA|OPENSSH|EC) PRIVATE KEY|AKIA[0-9A-Z]{16}|password\s*[:=]\s*[^$<{])' \
  "${REPO_ROOT}/xstore-child" \
  "${REPO_ROOT}/.github/workflows/deploy-moonrock-homepage.yml"; then
  echo "Potential secret detected." >&2
  exit 1
fi

echo "Homepage v2 validation passed."
