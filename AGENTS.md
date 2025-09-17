# Repository Guidelines

## IMPORTANT INSTRUCTIONS
- Before using or writing ANY code that requires external API docs or libraries, you MUST use the Context tools you have accesf to, to pull the latest documentation and ensure your code is up to date and accurate.


## Project Structure & Module Organization
- `backend/`: Flask app (`app.py`), SQLAlchemy models, email services, ad‑hoc test scripts (`test_*.py`), `requirements.txt`.
- `frontend/`: React (CRA) with Tailwind. Code in `src/` (`components/`, `pages/`, `services/`, `utils/`), static in `public/`.
- `api/`: Lightweight Python endpoints (serverless-style handlers used by some deployments).
- Root: `app.py` (Railway entry), `Dockerfile`, `render.yaml`, `vercel.json`, `railway.toml`.

## Build, Test, and Development Commands
- Frontend dev: `npm run dev` (runs `frontend` on port 3000).
- Frontend build: `npm run build` (installs and builds `frontend/build`).
- Backend deps: `pip install -r requirements.txt` (uses `backend/requirements.txt`).
- Backend dev: `python backend/app.py` (defaults to port 5001). Alternatively `PORT=5000 python app.py` (root entry).
- Frontend tests: `cd frontend && npm test` (Jest via react-scripts).
- Backend tests: ad‑hoc scripts (e.g., `python backend/test_email.py`). If adding pytest, place tests in `backend/tests/` and run `pytest`.

## Coding Style & Naming Conventions
- JavaScript: 2‑space indent; React components in PascalCase (e.g., `src/components/UserCard.jsx`); utilities camelCase; follow CRA ESLint defaults.
- Python: 4‑space indent; modules and functions snake_case, classes PascalCase, constants UPPER_SNAKE_CASE. Keep routes cohesive in `backend/app.py` or factor by feature.
- Files: keep assets in `frontend/public/`; avoid committing build artifacts.

## Testing Guidelines
- Frontend: co-locate `*.test.js` with components or use `src/__tests__/`.
- Backend: prioritize tests for auth, referrals, and email; prefer pytest naming `test_*.py` and deterministic tests (no network or real SMTP).
- Aim for meaningful coverage on critical flows; add fixtures/fakes where needed.

## Commit & Pull Request Guidelines
- Commits: imperative mood with scope prefix. Example: `admin: show Referred Name in table` or `qrcode: center single QR layout`.
- PRs: clear description, linked issues, screenshots for UI, steps to test, note env or DB changes, and impact on frontend/backend.

## Security & Configuration Tips
- Never commit secrets. `.env` files are ignored; configure `backend/.env` (e.g., `SECRET_KEY`, SMTP creds). Align `REACT_APP_API_URL` with your backend port.
- CORS origins are controlled in `backend/app.py`/env (`ALLOWED_ORIGINS`). Update when adding new domains.

---

# Recent Additions & Changes (Referral Program + Security)

## iPad Display (/referralprogram)
- New public page at `/referralprogram` that mirrors the visual style of `/qrcode` but updates dynamically via Socket.IO.
- Default state shows:
  - Headline: “Welcome to Duluth Dental Center”
  - Subtext: “Ask us about our referral program”
- When a QR is active, shows a QR image and pill text “Scan this code to view your referral code.”
- Auto‑hides after scan, admin clear, or 2 minutes.
- Console logs landing URLs when QR updates (to aid debugging).

## Admin Dashboard → QR Code Display
- Patient search (by name/email), override email before generating.
- “Generate Referral QR” creates a short‑lived token (≤ 2m) mapped to the patient, generates a QR, emits a Socket.IO `new_qr` with `landing_url`, and emails a magic link.
- “Clear QR” emits `qr_clear` to the display.
- You can generate a QR by typed email even without selecting a search result; if the user doesn’t exist, it is created (admin‑only).
- Console logs landing URLs on generation.

## Backend (Flask)
- Added Socket.IO integration for `new_qr` and `qr_clear` events.
- Added `OnboardingToken` model with `jti`, `user_id`, `email_used`, `expires_at`, `used_at` (short‑lived, single‑use).
- Routes:
  - `POST /admin/generate_qr` → { qr_url (data URI), expires_at, landing_url } and emits `new_qr`.
  - `POST /admin/clear_qr` → emits `qr_clear`.
  - `GET /r/welcome` → validates token, marks used, clears QR, shows mobile‑optimized referral landing page.
  - `GET /ref/<referral_code>` → rich referral share/preview page (separate from token landing).

## Landing Page UX
- Steps redesigned (Share / Friend Visits / You Earn) with mobile‑first cards, numbered progress dots, consistent outline icons.
- Removed hero image block per request.
- Referral link + copy button + FAQ preserved.

## Local Dev Helper Scripts
- `scripts/dev_local.sh`: picks a free backend port (5000–5010), sets dev env, starts backend, waits for `/health`, then starts CRA with matching `REACT_APP_API_URL`.
- `scripts/stop_local.sh`: stops helper backend.
- Dev env automatically logs QR landing URLs and sets `CUSTOM_DOMAIN` to `http://localhost:<port>` so QR links resolve locally.

## Security Hardening
- Logging:
  - Redacts session cookie values from Set‑Cookie logs.
  - No longer logs OTP codes or full raw request bodies with secrets.
- Debug endpoints (`/debug/*`): return 404 in production.
- CORS:
  - In production, allowed origins come only from `ALLOWED_ORIGINS` env (comma‑separated) or fallback to `CUSTOM_DOMAIN`.
  - Socket.IO uses the same effective origins.
- CSRF‑like protection:
  - For POST/PUT/PATCH/DELETE, checks Origin/Referer (enabled by default with `CSRF_STRICT=1`). Rejects disallowed origins.
- XSS mitigation:
  - User‑provided values (e.g., `name` on landing success) are HTML‑escaped before insertion.
- Rate limiting (Flask‑Limiter):
  - `/auth/send-otp`: 5/min per IP
  - `/auth/verify-otp`: 10/min per IP
  - `/api/referral/signup`: 5/min per IP
- Cookies/HTTPS:
  - In production, cookies are secure by default. Dev‑only shortcuts do not apply in prod.

## Environment Variables (prod recommended)
- `FLASK_ENV=production`
- `ALLOWED_ORIGINS=https://bestdentistduluth.com,https://www.bestdentistduluth.com`
- `CUSTOM_DOMAIN=https://bestdentistduluth.com`
- `RESEND_API_KEY`, `EMAIL_USER` (verified sender/domain)
- `SESSION_COOKIE_SAMESITE`: `None` if cross‑site (requires HTTPS), otherwise `Lax`
- Do not set `DEV_INSECURE_COOKIES` or `DEV_ALLOW_FAKE_OTP` in production.

## Socket.IO Deployment
- For stable WebSockets in production run with eventlet/gevent workers (e.g., `gunicorn --worker-class eventlet -w 1 --chdir backend app:app`). The dev server may fall back to polling with Werkzeug.

## Referral Form Fix (Sept 2025)
**Problem**: Referral page forms (`/ref/<code>`) were not submitting data to backend.

**Root Causes & Fixes**:
1. **Session Cookie Domain Mismatch**:
   - Issue: Cookie set for `bestdentistduluth.com` but API calls proxied to `api.bestdentistduluth.com`
   - Fix: Set `SESSION_COOKIE_DOMAIN = '.bestdentistduluth.com'` (with leading dot) in production
   - Location: `backend/app.py` lines 77-80

2. **JavaScript Syntax Errors**:
   - Issue: Malformed quote escaping in `escapeHtml()` function and unescaped apostrophes in strings
   - Fix: Corrected quote syntax and replaced contractions ("We've" → "We have", "We're" → "We are")
   - Location: `backend/app.py` JavaScript template in `track_referral_click()` route

**Debugging Notes**:
- No console logs = JavaScript syntax error preventing execution
- Session issues return "No referral information found" from `/api/referral/signup`
- Test with browser dev tools: Console tab for JS errors, Network tab for API calls
- Verify cookie domain with Application tab → Cookies

## Quick Test Plan
- OTP endpoints rate‑limit and do not leak secrets in logs.
- `/debug/*` returns 404 with `FLASK_ENV=production`.
- Cross‑origin POSTs are blocked unless Origin is allowed.
- Landing pages escape user text.
- Admin QR flow: generate/clear QR, iPad page updates, and console logs landing URLs.
- **Referral forms**: Visit `/ref/<code>`, submit form, verify console logs and database insert.
