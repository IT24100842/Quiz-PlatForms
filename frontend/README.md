# Quiz Platform Frontend

React + Vite frontend for the Quiz Platform.

## Local Run

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
npm run preview
```

## Environment Variables

The app uses local mock API by default.

- `VITE_USE_LOCAL_API=true` uses browser localStorage mock backend (recommended for static deploy).
- `VITE_USE_LOCAL_API=false` uses real backend through `VITE_API_BASE`.
- `VITE_API_BASE=https://your-backend-domain.com` when using real backend.

## Deploy To Web

This repository is pre-configured for static hosting with SPA route support.

### Option 1: Vercel

- Config file: `../vercel.json`
- Build output: `frontend/dist`
- SPA rewrites: enabled

Steps:

1. Push this repo to GitHub.
2. Import the repo in Vercel.
3. Deploy (build settings are auto-loaded from `vercel.json`).

### Option 2: Netlify

- Config file: `../netlify.toml`
- Base dir: `frontend`
- Publish dir: `dist`
- SPA redirects: enabled

Steps:

1. Push this repo to GitHub.
2. Import the repo in Netlify.
3. Deploy (build settings are auto-loaded from `netlify.toml`).

## Root-Level Helper Scripts

From repository root:

```bash
npm run frontend:dev
npm run frontend:build
npm run frontend:preview
npm run deploy:prepare
```
