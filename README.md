# Iron Log

A personal strength-training exercise library and weight log — installable on your
phone as a home-screen app, synced across devices, and free to run forever.

**Stack:** plain HTML/CSS/JS (no build step), Firebase Authentication + Firestore
for sign-in and sync (free "Spark" plan), GitHub Pages for hosting (free for public
repos). Total monthly cost: **$0**, for personal-scale use.

---

## 1. Create your Firebase project (free)

1. Go to <https://console.firebase.google.com> and sign in with your Google
   account (shikhashah92@gmail.com or whichever you prefer).
2. **Add project** → name it e.g. `iron-log` → you can disable Google Analytics
   (not needed) → **Create project**.
3. On the project overview page, click the **`</>` (Web)** icon to register a web
   app → nickname it `iron-log` → **do not** check "Also set up Firebase
   Hosting" (we're using GitHub Pages instead) → **Register app**.
4. Firebase shows a `firebaseConfig` object like:
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "iron-log-xxxxx.firebaseapp.com",
     projectId: "iron-log-xxxxx",
     storageBucket: "iron-log-xxxxx.appspot.com",
     messagingSenderId: "...",
     appId: "..."
   };
   ```
   Copy those six values into **`firebase-config.js`** in this folder, replacing
   the `"REPLACE_ME"` placeholders. (This key is not secret — Firebase web API
   keys only identify your project; your data is protected by the security
   rules below, not by hiding this file.)
5. Left sidebar → **Build → Authentication** → **Get started** → under
   **Sign-in method**, enable **Google** → pick a support email → **Save**.
6. Left sidebar → **Build → Firestore Database** → **Create database** →
   **Start in production mode** → pick a region close to you (e.g.
   `asia-south1 (Mumbai)`) → **Enable**.
7. In Firestore, open the **Rules** tab, replace the contents with the rules
   below, and click **Publish**:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{uid}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == uid;
       }
     }
   }
   ```
   This means: only you, signed in, can read or write your own data — nobody
   else, even with the project config, can see or change it.

## 2. Put it on GitHub Pages (free)

1. Create a new **public** repository on GitHub, e.g. `iron-log`. (Public is
   fine — the code has no secrets in it; your workout *data* lives in
   Firestore behind the rules above, not in this repo.)
2. From this folder:
   ```bash
   git remote add origin https://github.com/<your-username>/iron-log.git
   git branch -M main
   git push -u origin main
   ```
3. On GitHub: repo → **Settings → Pages** → Source: **Deploy from a branch** →
   Branch: `main`, folder: `/ (root)` → **Save**.
4. Wait about a minute, then your app is live at:
   `https://<your-username>.github.io/iron-log/`
5. Back in Firebase console → **Authentication → Settings → Authorized
   domains** → **Add domain** → add `<your-username>.github.io`. (Without
   this step, Google sign-in will be blocked on the live site.)

## 3. Install it on your iPhone

1. Open `https://<your-username>.github.io/iron-log/` in **Safari** (must be
   Safari, not Chrome, for this to work on iOS).
2. Sign in with Google when prompted.
3. Tap the **Share** icon → **Add to Home Screen** → **Add**.
4. You now have a full-screen "Iron Log" icon. Sign in once per device with
   the same Google account and your data stays in sync everywhere.

## Updating the app later

```bash
# edit index.html / other files, then:
git add -A
git commit -m "describe the change"
git push
```
GitHub Pages redeploys automatically within about a minute. Existing
home-screen icons keep pointing at the same URL — nobody needs to reinstall.

## What's free, and for how long

- **Firebase Spark plan**: 1 GiB Firestore storage, 50k reads / 20k writes /
  20k deletes per day, unlimited Authentication users — all far beyond what
  one person logging workouts will ever use. No credit card required, no
  trial period that expires.
- **GitHub Pages**: free indefinitely for public repositories on a personal
  GitHub account.

If Google ever changes Firebase's free tier, the only cost driver here would
be Firestore reads/writes, and this app's usage (a handful of writes per gym
session) is nowhere near the free quota.

## Files

- `index.html` — the whole app (UI, exercise library, logic)
- `firebase-config.js` — your project's public config (fill this in — step 1)
- `manifest.json` — PWA metadata (name, icons, colors) for "Add to Home Screen"
- `sw.js` — a small service worker that caches the app shell for offline launch
- `icons/` — app icons at the sizes iOS/Android expect
