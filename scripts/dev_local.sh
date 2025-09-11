#!/usr/bin/env bash
set -euo pipefail

# Resolve repo root (this script lives in scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT_DIR"

echo "[dev] Repo: $ROOT_DIR"

# Create venv if needed and install backend deps
if [[ ! -d .venv ]]; then
  echo "[dev] Creating Python venv (.venv)"
  python3 -m venv .venv
fi
source .venv/bin/activate
python3 -m pip install --upgrade pip >/dev/null
python3 -m pip install -r backend/requirements.txt

# Pick a free port for backend (prefer 5000..5010)
PORT=""
for p in 5000 5001 5002 5003 5004 5005 5006 5007 5008 5009 5010; do
  if ! lsof -nP -iTCP:$p -sTCP:LISTEN >/dev/null 2>&1; then
    PORT="$p"; break
  fi
done
if [[ -z "$PORT" ]]; then
  echo "[dev] Could not find a free port 5000-5010. Aborting." >&2
  exit 1
fi
echo "[dev] Using backend port: $PORT"

# Stop any previous backend from this helper
if [[ -f dev_backend.pid ]]; then
  if kill -0 "$(cat dev_backend.pid)" >/dev/null 2>&1; then
    echo "[dev] Stopping previous backend PID $(cat dev_backend.pid)"
    kill "$(cat dev_backend.pid)" || true
    sleep 1
  fi
  rm -f dev_backend.pid
fi

export FLASK_ENV=production
# Allow local HTTP cookies for session
export DEV_INSECURE_COOKIES=1
# Allow OTP fallback without an email provider set
export DEV_ALLOW_FAKE_OTP=1
# Ensure admin bootstrap
export ADMIN_EMAIL="admin@dentaloffice.com"
export ADMIN_EMAILS="admin@dentaloffice.com"
# Use localhost for QR links during local development
export CUSTOM_DOMAIN="http://localhost:${PORT}"
export PORT
echo "[dev] Starting backend..."
nohup python3 backend/app.py > backend_dev.log 2>&1 & echo $! > dev_backend.pid
sleep 1

# Wait until health responds (10s timeout)
echo -n "[dev] Waiting for backend to be ready"
for i in {1..20}; do
  if curl -sS -m 1 -I "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
    echo " -> OK"
    break
  fi
  echo -n "."
  sleep 0.5
done

if ! curl -sS -m 1 -I "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
  echo "\n[dev] Backend did not start. Check backend_dev.log for details." >&2
  exit 1
fi

# Start frontend pointing to the chosen API URL
echo "[dev] Installing frontend deps..."
cd frontend
npm install
echo "[dev] Starting frontend with REACT_APP_API_URL=http://localhost:${PORT}"
export REACT_APP_API_URL="http://localhost:${PORT}"
npm start
