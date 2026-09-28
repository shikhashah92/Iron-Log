# Iron Log

A private strength-training log: an exercise library with form cues, set-by-set logging, a rest timer, templates,
several people on one phone, and progress charts. It installs to your phone's home screen and works offline.

**Your data stays on your phone.** There's no account and no server, and nothing is uploaded. Backups are files you
save yourself, to Files, iCloud Drive, Google Drive or email, and they can be locked with a passphrase
(AES-256-GCM, encrypted on the phone). To move to a new phone, save a backup on the old one and restore it on the new one.

**Stack:** Expo + React Native Web + TypeScript. It's exported as a static web app and hosted on GitHub Pages at
`/Iron-Log/`. The architecture is the same as [Munshi](../expense-tracker): IndexedDB storage behind one serial
write queue, validated load and restore, undo history (the last 10 versions), and a service worker for offline use.

## Develop

```bash
npm ci
npx expo start --web     # dev server
npm run check            # the release gate: typecheck, lint, build, tests
```

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`: `npm run check`, then publish `dist/` to GitHub Pages.
The workflow copies `index.html` to `404.html` so deep links work. **One-time setup:** repo **Settings → Pages →
Source: GitHub Actions**.

If the repo is renamed, change `experiments.baseUrl` in `app.json` and the path check in `tests/core.test.ts`.

## Install on iPhone

Open the site in **Safari**, tap **Share → Add to Home Screen**. Installing matters. Safari may clear a website's
storage after 7 days without a visit, but not for a home-screen app. Iron Log also reminds you weekly to save a backup.

## Moving from the old (Firebase) Iron Log

The old app is kept at `/Iron-Log/legacy/` only so people can move their data over:

1. The new app spots data left behind by the old one and offers **Bring my data over**. You can also reach it from Settings.
2. The old page signs you in with Google, reads every profile from Firestore, and leaves the data in this browser's
   IndexedDB (same origin). Then it opens the new app.
3. The new app validates the data, asks you to confirm, and imports it. Anything already on the phone goes to Undo history first.
4. The new app then offers to **delete the cloud copy**. The old page refuses to delete until the new app has the data.
   After deleting, it signs you out and clears its own local data.

Once everyone has moved, delete `public/legacy/` and the Firebase project (`iron-log-975eb`).

## Files

- `src/model.ts`: the data model and every change to it, as pure functions (workouts, planned and ticked sets)
- `src/workout.tsx`: the live workout's set table (shared with "Edit workout") and the start / finish flow
- `src/strong.ts`: import from a Strong CSV export
- `src/exercises.ts`: the built-in library (65 exercises)
- `public/illustrations/`: 3-frame drawings for each built-in exercise, from
  [Workout Guide](https://github.com/bryllim/workout-guide) / Everkinetic, **CC BY-SA 4.0** (credit in `LICENSE.md` there
  and in Settings). Re-import with `node scripts/import-illustrations.mjs <workout-guide checkout>`.
- `src/backup.ts`: backup validation, CSV export, and conversion from the old app's data
- `src/store.tsx`: the IndexedDB write queue and undo snapshots
- `src/app/`: screens (expo-router)
- `public/sw.js`: the offline service worker
- `tests/`: `node --test`
