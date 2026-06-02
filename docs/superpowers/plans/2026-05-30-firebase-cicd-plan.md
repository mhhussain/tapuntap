# Firebase Project Setup & GitHub Actions CI/CD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the live Firebase project setup and wire two GitHub Actions workflows — a PR preview deploy and a production deploy on merge to `main`.

**Architecture:** A service account (created via `firebase init hosting:github`) authenticates both workflows. The preview workflow uses `FirebaseExtended/action-hosting-deploy` to deploy Hosting to a temporary per-PR channel and posts the URL as a PR comment. The production workflow runs `firebase deploy` for everything (rules, indexes, functions, hosting). Rules tests run in the preview workflow via the Firestore emulator.

**Tech Stack:** Firebase CLI, GitHub Actions, `FirebaseExtended/action-hosting-deploy@v0`, `google-github-actions/auth@v2`, Node 20, Firebase Emulator Suite.

---

## What is already done (do not redo)

- Firebase project `iammoo-tapuntap` created
- Firestore database created (us-east1)
- Web app registered; `public/js/firebase-config.js` filled with real config
- `.firebaserc` set to `iammoo-tapuntap`
- Google Auth provider enabled
- All source files updated with the new project ID

---

## File structure

```
.github/
  workflows/
    preview.yml     (new) PR preview deploy + rules tests
    deploy.yml      (new) Full production deploy on merge to main
```

---

## Task 1: Upgrade Firebase project to Blaze plan

Cloud Functions cannot be deployed on the free Spark plan. This is a manual step.

- [ ] **Step 1: Open the upgrade page**

Navigate to: https://console.firebase.google.com/project/iammoo-tapuntap/usage/details

Click **Upgrade** → select **Blaze (pay as you go)** → complete billing setup.

- [ ] **Step 2: Verify Functions can deploy**

Run from the repo root:

```bash
firebase deploy --only functions
```

Expected: deploys the three functions (`createGame`, `joinGame`, `startGame`) with no billing error. Output will include function URLs like:
```
✔  functions: Finished running predeploy script.
✔  functions[createGame]: Successful create operation.
✔  functions[joinGame]: Successful create operation.
✔  functions[startGame]: Successful create operation.
```

If you see `Error: Your project iammoo-tapuntap must be on the Blaze (pay-as-you-go) plan`, the upgrade is not yet complete.

---

## Task 2: Deploy Firestore rules and indexes

- [ ] **Step 1: Deploy rules and indexes**

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Expected:
```
✔  firestore: Released rules firestore.rules to cloud.firestore
✔  firestore: Deployed indexes in firestore.indexes.json successfully
```

- [ ] **Step 2: Verify rules are live**

Open: https://console.firebase.google.com/project/iammoo-tapuntap/firestore/rules

Confirm the published rules show the `match /users/{uid}`, `match /games/{gameId}`, etc. blocks from `firestore.rules`.

---

## Task 3: Create service account for GitHub Actions

`firebase init hosting:github` creates a service account, grants it Firebase deploy permissions, and can push the JSON key directly to GitHub secrets.

- [ ] **Step 1: Verify `gh` CLI is authenticated**

```bash
gh auth status
```

Expected: shows your logged-in GitHub account. If not logged in, run `gh auth login` first.

- [ ] **Step 2: Run the interactive setup**

```bash
firebase init hosting:github
```

Answer the prompts as follows:

| Prompt | Answer |
|---|---|
| For which GitHub repository? | `mhhussain/tapuntap` |
| Set up the workflow to run a build script before every deploy? | `N` (we write our own workflows) |
| Set up automatic deployment to your site's live channel when a PR is merged? | `N` (we write our own) |
| Set up automatic deployment to your site's preview channel when a PR is opened? | `N` (we write our own) |

The command will:
- Create a service account named something like `github-action-XXXXXXXXX`
- Grant it `Firebase Hosting Admin` and `Cloud Functions Admin` roles
- Encode the JSON key and write it to GitHub → Settings → Secrets as `FIREBASE_SERVICE_ACCOUNT_IAMMOO_TAPUNTAP`

- [ ] **Step 3: Verify the secret exists in GitHub**

```bash
gh secret list --repo mhhussain/tapuntap
```

Expected output includes:
```
FIREBASE_SERVICE_ACCOUNT_IAMMOO_TAPUNTAP    ...
```

If the secret is missing (the command couldn't write it automatically due to permissions), `firebase init hosting:github` will have printed the JSON to the terminal. Copy it and run:

```bash
gh secret set FIREBASE_SERVICE_ACCOUNT_IAMMOO_TAPUNTAP --repo mhhussain/tapuntap
```

Paste the JSON when prompted, then Ctrl-D.

- [ ] **Step 4: Delete any generated workflow files**

`firebase init hosting:github` may have created `.github/workflows/firebase-hosting-*.yml`. Delete them — we're replacing them with our own:

```bash
rm -f .github/workflows/firebase-hosting-*.yml
```

---

## Task 4: Create the preview workflow

- [ ] **Step 1: Create the `.github/workflows/` directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Create `.github/workflows/preview.yml`**

```yaml
name: Preview Deploy

on:
  pull_request:
    branches:
      - main

jobs:
  preview:
    runs-on: ubuntu-latest
    permissions:
      checks: write
      contents: read
      pull-requests: write

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install root dependencies
        run: npm ci

      - name: Install functions dependencies
        run: cd functions && npm ci

      - name: Run security rules tests
        run: npm run test:rules

      - name: Deploy preview to Firebase Hosting
        uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_IAMMOO_TAPUNTAP }}
          projectId: iammoo-tapuntap
          expires: 7d
```

Notes on what each part does:
- `permissions: pull-requests: write` — allows the action to post the preview URL as a PR comment
- `npm run test:rules` — runs `firebase emulators:exec --only firestore "node --test 'test/rules/*.test.js'"`, starting the emulator automatically in CI
- `FirebaseExtended/action-hosting-deploy@v0` without a `channelId` — auto-creates a channel named from the PR number (e.g. `pr-1`) and posts a comment with the URL
- `expires: 7d` — the preview channel is automatically deleted after 7 days

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/preview.yml
git commit -m "Add PR preview deploy workflow"
```

---

## Task 5: Create the production deploy workflow

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

```yaml
name: Production Deploy

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install root dependencies
        run: npm ci

      - name: Install functions dependencies
        run: cd functions && npm ci

      - uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_IAMMOO_TAPUNTAP }}

      - name: Deploy to Firebase (rules, indexes, functions, hosting)
        run: npx firebase deploy --only firestore:rules,firestore:indexes,functions,hosting
```

Notes:
- `google-github-actions/auth@v2` — sets `GOOGLE_APPLICATION_CREDENTIALS` in the environment so the `firebase` CLI picks up the service account automatically
- `npx firebase deploy` — uses the `firebase-tools` from `devDependencies` (no global install needed)
- Runs on every push to `main`, which includes PR merges

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "Add production deploy workflow"
```

---

## Task 6: Initial full deploy to production

Deploy everything live for the first time.

- [ ] **Step 1: Deploy all resources**

```bash
firebase deploy --only firestore:rules,firestore:indexes,functions,hosting
```

Expected (all four resources succeed):
```
✔  firestore: Released rules firestore.rules to cloud.firestore
✔  firestore: Deployed indexes in firestore.indexes.json successfully
✔  functions[createGame]: Successful update operation.
✔  functions[joinGame]: Successful update operation.
✔  functions[startGame]: Successful update operation.
✔  hosting[iammoo-tapuntap]: Channel live has been created/updated.
Hosting URL: https://iammoo-tapuntap.web.app
```

- [ ] **Step 2: Smoke test the live app**

Open `https://iammoo-tapuntap.web.app` in a browser.

Expected:
- Google sign-in overlay appears
- Signing in with a Google account works and shows the dashboard
- Deck list loads (empty is fine)

If the page is blank or the sign-in fails, open the browser devtools console — any Firebase config or auth error will be visible there.

---

## Task 7: Push the branch and verify end-to-end CI

- [ ] **Step 1: Push the current feature branch**

```bash
git push origin feature/firebase-multiplayer
```

- [ ] **Step 2: Open the PR on GitHub**

Navigate to: https://github.com/mhhussain/tapuntap/pulls

Find the open PR for `feature/firebase-multiplayer`.

- [ ] **Step 3: Verify the preview workflow runs**

In the PR's **Checks** tab, confirm:
- `Preview Deploy` workflow starts within ~30 seconds of the push
- `Run security rules tests` step passes (8/8 rules tests)
- `Deploy preview to Firebase Hosting` step completes

- [ ] **Step 4: Verify the preview URL comment**

A bot comment appears on the PR (posted by `github-actions[bot]`) with a URL like:
```
Visit the preview URL for this PR (updated for commit abc1234):
https://iammoo-tapuntap--pr-1-xxxxxxxx.web.app
```

Open the URL — the app should load and sign-in should work.

- [ ] **Step 5: Commit any final fixes to this branch and push to update the PR**

```bash
git push origin feature/firebase-multiplayer
```

---

## Whole-plan acceptance criteria

1. `firebase deploy --only functions` succeeds (Blaze plan active)
2. `https://iammoo-tapuntap.web.app` loads the app — Google sign-in works
3. Pushing to a PR branch triggers `Preview Deploy`, runs 8/8 rules tests, and posts a preview URL comment
4. Merging to `main` triggers `Production Deploy` and runs `firebase deploy` for all resources
5. The `FIREBASE_SERVICE_ACCOUNT_IAMMOO_TAPUNTAP` secret exists in GitHub repo settings
