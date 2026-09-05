#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG_FILE="${LUCENT_ANALYTICS_CONFIG:-$ROOT_DIR/analytics.env}"
DAYS="${1:-7}"

if [[ ! "$DAYS" =~ ^[1-9][0-9]*$ ]]; then
  echo "Usage: $0 [number-of-days]" >&2
  exit 2
fi

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Missing $CONFIG_FILE" >&2
  echo "Copy analytics.env.example to analytics.env and add the Railway token." >&2
  exit 1
fi

# This file is local-only and ignored by git. Do not print its contents.
set -a
# shellcheck disable=SC1090
source "$CONFIG_FILE"
set +a

: "${ANALYTICS_API_URL:?Set ANALYTICS_API_URL in $CONFIG_FILE}"
: "${ANALYTICS_ADMIN_TOKEN:?Set ANALYTICS_ADMIN_TOKEN in $CONFIG_FILE}"

BASE_URL="${ANALYTICS_API_URL%/}"

while IFS= read -r date; do
  printf '\n%s\n' "--- $date ---"
  curl --fail --silent --show-error \
    -H "X-Analytics-Admin-Token: $ANALYTICS_ADMIN_TOKEN" \
    "$BASE_URL/analytics/summary?date=$date" \
    | python3 -m json.tool
done < <(
  python3 - "$DAYS" <<'PY'
from datetime import datetime, timedelta, timezone
import sys

days = int(sys.argv[1])
today = datetime.now(timezone.utc).date()
for offset in range(days):
    print(today - timedelta(days=offset))
PY
)
