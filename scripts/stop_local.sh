#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -f dev_backend.pid ]]; then
  PID="$(cat dev_backend.pid)"
  if kill -0 "$PID" >/dev/null 2>&1; then
    echo "[stop] Stopping backend PID $PID"
    kill "$PID" || true
    sleep 1
  fi
  rm -f dev_backend.pid
else
  echo "[stop] No dev_backend.pid found."
fi

echo "[stop] Done."

