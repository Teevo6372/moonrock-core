#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
MANIFEST="${REPO_ROOT}/deployments/homepage-v2-manifest.txt"
PACKAGE_DIR="${1:-${REPO_ROOT}/build/homepage-v2}"

if [[ ! -f "$MANIFEST" ]]; then
  echo "Manifest not found: $MANIFEST" >&2
  exit 1
fi

mkdir -p "$PACKAGE_DIR"

while IFS='|' read -r source destination; do
  [[ -z "$source" || "$source" == \#* ]] && continue

  if [[ ! -f "${REPO_ROOT}/${source}" ]]; then
    echo "Manifest source missing: $source" >&2
    exit 1
  fi

  case "$destination" in
    wp-content/themes/xstore-child/*) ;;
    *)
      echo "Unsafe production destination rejected: $destination" >&2
      exit 1
      ;;
  esac

  mkdir -p "${PACKAGE_DIR}/$(dirname "$destination")"
  cp "${REPO_ROOT}/${source}" "${PACKAGE_DIR}/${destination}"
done < "$MANIFEST"

echo "Homepage package prepared at: $PACKAGE_DIR"
