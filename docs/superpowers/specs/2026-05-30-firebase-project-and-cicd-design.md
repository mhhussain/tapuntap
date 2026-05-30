# tapuntap — Firebase Project Setup & GitHub Actions CI/CD

**Status:** Approved design — ready for implementation
**Date:** 2026-05-30

---

## 1. Summary

Set up the live Firebase project (`iammoo-tapuntap`) and wire GitHub Actions for automated preview deploys on PRs and full production deploys on merge to `main`. The Firebase project was created and the app configured during brainstorming; this plan covers the remaining setup steps (Auth, Blaze upgrade, service account) and the two workflow files.

---

## 2. Firebase Project State (already done)

| Item | Status |
|---|---|
| Project created (`iammoo-tapuntap`) | ✅ Done |
| Firestore default database (us-east1) | ✅ Done |
| Web app registered (`appId: 1:250674169535:web:addcaa3287d16c71bd680a`) | ✅ Done |
| `public/js/firebase-config.js` filled with real config | ✅ Done |
| `.firebaserc` updated to `iammoo-tapuntap` | ✅ Done |
| All project ID references in source updated | ✅ Done |
| Google Auth provider enabled | ✅ Done |
| Blaze (pay-as-you-go) plan — **required for Functions deploy** | ⏳ Operator |

The Blaze plan must be enabled before `firebase deploy` can include Cloud Functions. Hosting-only deploys work on the free Spark plan.

---

## 3. GitHub Actions CI/CD

### 3.1 Trigger Summary

| Event | Workflow | What deploys |
|---|---|---|
| Push to a PR branch | `preview.yml` | Hosting to a temporary preview channel; rules + indexes + functions to production* |
| Merge to `main` | `deploy.yml` | Full production deploy (rules, indexes, functions, hosting) |

*Preview channels (Firebase Hosting) are isolated per PR. Firestore rules, indexes, and Functions share production because Firebase has no per-PR backend environments. This is acceptable — the preview is primarily for UI verification.

### 3.2 Preview Workflow (`.github/workflows/preview.yml`)

**Trigger:** `pull_request` on any branch targeting `main`

**Steps:**
1. Checkout code
2. Set up Node 20
3. Install root deps (`npm ci`)
4. Install functions deps (`npm ci` inside `functions/`)
5. Run rules tests (`npm run test:rules` via Firebase emulator)
6. Deploy to Firebase preview channel using `FirebaseExtended/action-hosting-deploy@v0`
   - Deploys: hosting + firestore rules + firestore indexes + functions
   - Channel: auto-named from PR number (e.g. `pr-42`)
   - Expires: 7 days
7. Action posts a PR comment with the preview URL automatically

**Secret required:** `FIREBASE_SERVICE_ACCOUNT_IAMMOO_TAPUNTAP` (service account JSON)

### 3.3 Production Workflow (`.github/workflows/deploy.yml`)

**Trigger:** `push` to `main` (i.e. PR merged)

**Steps:**
1. Checkout code
2. Set up Node 20
3. Install root deps (`npm ci`)
4. Install functions deps (`npm ci` inside `functions/`)
5. Full Firebase deploy (`firebase deploy --only firestore:rules,firestore:indexes,functions,hosting`)

**Secret required:** Same `FIREBASE_SERVICE_ACCOUNT_IAMMOO_TAPUNTAP`

### 3.4 Service Account

`FirebaseExtended/action-hosting-deploy` requires a service account with Firebase deploy permissions. The account is generated via:

```bash
firebase init hosting:github
```

This command:
- Creates a service account in the Firebase/GCP project
- Grants it the `Firebase Hosting Admin` role
- Encodes the JSON key
- Optionally writes it to GitHub secrets directly (requires `gh` CLI auth with `admin:org` scope) — or outputs it for manual paste into GitHub → Settings → Secrets → Actions

Secret name convention: `FIREBASE_SERVICE_ACCOUNT_IAMMOO_TAPUNTAP` (matches Firebase's auto-generated naming).

---

## 4. File Structure

```
.github/
  workflows/
    preview.yml     (new) PR preview deploy
    deploy.yml      (new) Production deploy on merge to main
```

---

## 5. Constraints

- **Blaze plan required** for Functions in both workflows. If not yet on Blaze, the `--only` flag can temporarily exclude `functions` from preview deploys until the plan is upgraded.
- **`npm run test:rules`** in the preview workflow requires the Firestore emulator. This runs via `firebase emulators:exec --only firestore "node --test 'test/rules/*.test.js'"` which starts and stops the emulator automatically — no persistent emulator process needed in CI.
- **Node version:** workflows pin Node 20 to match the Functions runtime target.
- **No secrets in source:** `firebase-config.js` contains only the public web SDK config (API key, project ID, appId) — safe to commit. The service account JSON stays in GitHub secrets only.
