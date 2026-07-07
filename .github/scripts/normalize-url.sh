#!/usr/bin/env bash
set -euo pipefail

normalize_url() {
  local raw="${1:-}"
  raw="${raw//$'\r'/}"
  raw="${raw//$'\n'/}"
  raw="${raw//[[:space:]]/}"
  while [[ "$raw" == \"*\" ]]; do
    raw="${raw#\"}"
    raw="${raw%\"}"
  done
  while [[ "$raw" == \'*\' ]]; do
    raw="${raw#\'}"
    raw="${raw%\'}"
  done
  raw="${raw%/health}"
  while [[ "$raw" == */ ]]; do
    raw="${raw%/}"
  done
  printf '%s' "$raw"
}

validate_http_url() {
  local url="$1"
  local label="$2"
  if [[ -z "$url" ]]; then
    echo "::error::${label} boş. GitHub → Settings → Variables → Actions"
    return 1
  fi
  if [[ ! "$url" =~ ^https?://[A-Za-z0-9.-]+(/[A-Za-z0-9._~:/?#\[\]@!$&'()*+,;=%-]*)?$ ]]; then
    echo "::error::${label} geçersiz format."
    echo "::error::Girilen değer: '${url}'"
    echo "::error::Doğru örnek: https://localpilot-ai-1eea.onrender.com (tırnak ve /health olmadan)"
    return 1
  fi
}

build_health_url() {
  local base
  base="$(normalize_url "$1")"
  validate_http_url "$base" "AI_SERVICE_URL"
  printf '%s/health' "$base"
}