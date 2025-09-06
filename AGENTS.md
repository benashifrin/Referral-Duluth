# Repository Guidelines


## IMPORTANT INSTRUCTIONS
- Before using or writing ANY code that requires external API docs or Libraries, you MUST use the Context7 tools you have access to, to pull the latest documentation and ensure your code is up to date and accurate.


## Project Structure & Module Organization
- `backend/`: Flask API (auth, referrals, admin). Entry: `app.py`; prod runs via `gunicorn.conf.py`.
- `frontend/`: React SPA (patient + admin UIs). Entry: `src/`, build to `frontend/build/`.
- `frontend/public/`: Static assets (e.g., `ding.wav`, `_redirects`).
- `scripts/`: Local utilities (e.g., `record-qrcode.js` for 4K capture).
- Root config: `package.json`, `railway.toml`, `Procfile`, `requirements.txt` (backend), `DEPLOY_*` docs.

## Build, Test, and Development Commands
Backend (Flask):
- Install deps: `pip install -r backend/requirements.txt`
- Run locally (dev): `python backend/app.py`
- Prod entry (reference): `cd backend && gunicorn --config gunicorn.conf.py app:app`

Frontend (React):
- Dev server: `npm run dev` (proxies your changes while editing)
- Build: `npm run build` (outputs `frontend/build/`)

Utilities:
- Record 4K /qrcode video: `npm run record:qrcode` (env: `DURATION=20` or `URL=...`)

## Coding Style & Naming Conventions
- Python: 4‑space indent, PEP8 names (`snake_case` functions, `PascalCase` classes). Keep endpoints in `backend/app.py` cohesive and scoped by route group.
- JavaScript/React: 2‑space indent, Components `PascalCase`, files under `src/pages` / `src/components`. Prefer function components + hooks.
- Strings: use consistent quoting within a file. Keep env/config names UPPER_SNAKE_CASE.

## Testing Guidelines
- No formal test harness present. Add endpoint smoke checks under `scripts/` if needed.
- Manual API checks: `/health`, `/auth/send-otp`, `/auth/verify-otp`, `/qr/stream`.
- Frontend: validate flows (login OTP, admin lists/actions, /qrcode sound-on-scan) in a private test deployment before merging.

## Commit & Pull Request Guidelines
- Commits: short, imperative subject; optional scope. Examples:
  - `qrcode: restore side-by-side layout`
  - `backend: add /qr/login redirect + SSE broadcast`
- PRs: include purpose, summary of changes, screenshots for UI, and any env/DB migration notes (e.g., new columns: `user.signed_up_by_staff`, `referral.origin`). Link issues when applicable.

## Security & Configuration Tips
- Set env vars in prod: `DATABASE_URL`, `SESSION_COOKIE_DOMAIN`, `ALLOWED_ORIGINS`, `ADMIN_EMAILS`, `RESEND_API_KEY`, `SECRET_KEY`.
- CORS: credentials + explicit origins are enforced in `backend/app.py`.
- Cookies: SameSite=None; Secure; HttpOnly for cross‑site session.
- DB changes: Prefer Alembic in future; current startup adds missing columns defensively.

## Architecture Overview
- Flask API + React SPA. QR flow uses redirect endpoints (`/qr/login`, `/qr/review`) and SSE (`/qr/stream`) so /qrcode can beep immediately on scan.

