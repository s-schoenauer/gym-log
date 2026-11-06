# Gym Log

Private, offline-first gym tracker as a PWA (React + Vite + TypeScript + Dexie/IndexedDB). Design: "Mono Bold".

## Run locally

```bash
npm install
npm run dev        # development server
npm run build      # production build into dist/
npm run preview    # serve the build
```

## Deploy (GitHub Pages)

1. Push this folder to a GitHub repository.
2. Repository → Settings → Pages → Source: **GitHub Actions**.
3. The workflow in `.github/workflows/deploy.yml` builds and publishes on every push to `main`.
4. Open the Pages link on your phone → Share → **Add to Home Screen**.

## Data

Everything is stored in the browser (IndexedDB) on the device. Use Settings → Export for a JSON backup.
Every record has a UUID v7, `updatedAt` and `deletedAt`, so a server sync can be added later.

## Structure

- `src/db.ts` – schema (8 tables)
- `src/seed.ts` – starting exercises and plans
- `src/repo.ts` – all reads/writes
- `src/calc.ts` – last values, records, volume, heatmap
- `src/i18n.ts` – German / English
- `src/screens/` – Today, Workout, Finish, Stats, Plans, Library, Settings
