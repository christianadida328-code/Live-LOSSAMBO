#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

export PYTHONUNBUFFERED=1
export PORT="${PORT:-5000}"

exec gunicorn app:app --bind "0.0.0.0:${PORT}" --workers "${WEB_CONCURRENCY:-2}" --timeout "${GUNICORN_TIMEOUT:-120}"
