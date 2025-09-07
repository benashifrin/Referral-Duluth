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
