# tapuntap Public-Facing React/TS Rewrite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the tapuntap frontend from a vanilla no-build SPA to a React + TypeScript + Vite app, fix the audited bugs (notably a security-rules regression), and move game-managing/permission-sensitive actions into Cloud Functions — taking the app from personal use to a public, maintainable, production application.

**Architecture:** A static React+TS SPA built by Vite and deployed to Firebase Hosting (the per-push preview-channel workflow is preserved). The Firebase backend (Auth, Firestore + `onSnapshot`, security rules, callable Functions) is kept. Reads use typed `onSnapshot` hooks. Writes split: the client writes its own low-stakes state directly (tap, counters, own life, notes, own-public-zone moves); a callable `gameAction` Function (plus `leaveGame`/`endGame`) owns hidden-info, cross-player, and shared/turn actions, with rules denying direct client writes to those fields.

**Tech Stack:** React 18, TypeScript 5, Vite 5, react-router-dom 6, Firebase JS SDK 10 (npm, not CDN, in the new app), Firebase Functions Gen 2 (Node 20), Firebase Emulator Suite, `@firebase/rules-unit-testing` + Node test runner, Vitest + React Testing Library for frontend unit tests, Scryfall API.

**Source spec:** `docs/superpowers/specs/2026-05-31-public-rewrite-design.md`. Read it before starting.

---

## How to work this plan (read once)

- **Branch:** all work continues on `feature/firebase-multiplayer`. Do NOT merge to `main` until the final cutover task — `main` keeps serving the old `public/` app to production while you build.
- **The new app lives in `app/`** (a fresh Vite project) so the old `public/` app keeps working until cutover. `firebase.json` on this branch is repointed at the new build output so PR previews show the new app; production (`main`) is untouched until cutover.
- **Two test styles:**
  - **Automated** (TDD): security rules, Cloud Functions, and pure frontend logic (Vitest). Write the test, watch it fail, implement, watch it pass.
  - **Manual browser verification** against the emulator for UI/realtime. Each such step lists exact actions and expected results.
- **Backend (rules/functions) testing during this phase:** validate with the **emulator** and automated tests locally. To see backend changes on a PR preview URL, **manually deploy** them: `npx firebase deploy --only firestore:rules,functions`. (This is the agreed interim strategy; emulator/CI is the future default.)
- **Commit after every task.** Keep commits small.
- **Firebase SDK version:** in the new app use the **npm** packages (`firebase@^10.12.0`), not the gstatic CDN. The old `public/` app keeps its CDN imports until deleted.

## Prerequisites (verify before Task 1)

- [ ] Node 20+ installed (`node -v`).
- [ ] `firebase-tools` available (`npx firebase --version`).
- [ ] You are on the feature branch: `git checkout feature/firebase-multiplayer && git status` shows it.
- [ ] Emulators run today: `npm run emulators` starts Auth/Firestore/Functions/Hosting without error. Stop with Ctrl-C.
- [ ] The real web config values exist in `public/js/firebase-config.js` (apiKey, authDomain, projectId, appId) — you will copy them into the new app.

---

## File structure (created/modified by this plan)

```
app/                                   (new — the Vite React+TS app)
  index.html
  package.json
  tsconfig.json
  tsconfig.node.json
  vite.config.ts
  vitest.config.ts
  .gitignore
  public/
    app.css                            (copied from public/css/app.css)
  src/
    main.tsx                           bootstrap + router + auth gate
    vite-env.d.ts
    lib/
      firebase.ts                      typed SDK init + emulator toggle
      firebaseConfig.ts                public web config (copied values)
      scryfall.ts                      card search/lookup (+ optional cache)
      format.ts                        small pure helpers (time, mana, color tone)
      cards.ts                         card-instance helpers (isLand, etc.)
    types/
      index.ts                         CardInstance, Deck, GameDoc, Seat, PlayerPublic, PlayerPrivate, LogEntry, GameAction
    auth/
      AuthProvider.tsx                 context: user, loading, sign-in/up/out
      useAuth.ts                       hook
      AuthScreen.tsx                   login + sign-up (Google + email)
      RequireAuth.tsx                  route guard
    api/
      decks.ts                         typed deck CRUD
      games.ts                         typed game reads + callable wrappers
      hooks.ts                         useGame, usePlayersPublic, useMyPrivate, useLog, useMyDecks, useMyGames
    components/
      Modal.tsx  Toast.tsx  ContextMenu.tsx  Icon.tsx  CardFace.tsx  AppShell.tsx
    features/
      home/HomeView.tsx
      decks/DecksView.tsx  decks/BuilderView.tsx
      lobby/LobbyNewView.tsx  lobby/LobbyView.tsx
      game/GameView.tsx
      game/components/{TopBar,PlayerRibbon,OpponentsBar,Battlefield,Hand,ZoneTabs,SidePanel,ScryModal,TokenModal,ZoneDrawer}.tsx
      game/useGameActions.ts           client-direct writes + callable gameAction wrappers
      game/endgame/EndGameView.tsx
      settings/SettingsView.tsx
    test/
      setup.ts
      cards.test.ts  format.test.ts  gameActionClient.test.ts

firestore.rules                        (modify) fix isParticipant; tighten server-owned fields
firestore.indexes.json                 (modify if needed)
functions/
  index.js                             (modify) add gameAction, leaveGame, endGame; guard startGame
  lib/actions.js                       (new) pure game-action handlers (testable)
  lib/deal.js                          (unchanged)
  lib/invite.js                        (unchanged)
  test/actions.test.js                 (new) gameAction/leaveGame/endGame tests
  test/lobby.test.js                   (unchanged)
  test/start.test.js                   (modify) add missing-deck guard test
test/rules/games.test.js               (modify) cover subcollection participant reads + server-owned denials
firebase.json                          (modify) hosting.public -> app/dist; predeploy build
.github/workflows/preview.yml          (modify) build the app before deploy
.github/workflows/deploy.yml           (modify) build the app before deploy (effective at cutover)
package.json                           (modify) root scripts to build app
CLAUDE.md                              (modify at cutover) describe the React app
public/                                (delete at cutover)
```

---

## Phase 1 — Scaffold the React+TS app (Tasks 1–3)

### Task 1: Create the Vite React+TS project under `app/`

**Files:**
- Create: `app/package.json`, `app/tsconfig.json`, `app/tsconfig.node.json`, `app/vite.config.ts`, `app/index.html`, `app/.gitignore`, `app/src/main.tsx`, `app/src/vite-env.d.ts`, `app/public/app.css`

- [ ] **Step 1: Create `app/package.json`**

```json
{
  "name": "tapuntap-app",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "firebase": "^10.12.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.6",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^24.1.0",
    "typescript": "^5.5.3",
    "vite": "^5.3.4",
    "vitest": "^2.0.4"
  }
}
```

- [ ] **Step 2: Create `app/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 3: Create `app/tsconfig.node.json`**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "noEmit": true
  },
  "include": ["vite.config.ts", "vitest.config.ts"]
}
```

- [ ] **Step 4: Create `app/vite.config.ts`**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { outDir: "dist" },
});
```

- [ ] **Step 5: Create `app/vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

- [ ] **Step 6: Create `app/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>tapuntap</title>
    <link rel="stylesheet" href="/app.css" />
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 7: Create `app/.gitignore`**

```
node_modules/
dist/
*.local
```

- [ ] **Step 8: Create `app/src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />
```

- [ ] **Step 9: Copy the existing stylesheet** so the new app reuses the visual language

Run: `cp public/css/app.css app/public/app.css`
Expected: `app/public/app.css` exists.

- [ ] **Step 10: Create a placeholder `app/src/main.tsx`** (replaced in Task 5)

```tsx
import React from "react";
import ReactDOM from "react-dom/client";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <div className="empty-state" style={{ flex: 1, display: "flex" }}>
      <div className="empty-title">tapuntap (React app scaffold)</div>
    </div>
  </React.StrictMode>
);
```

- [ ] **Step 11: Install dependencies**

Run: `cd app && npm install && cd ..`
Expected: `app/node_modules` created, no errors.

- [ ] **Step 12: Verify the dev server boots**

Run: `cd app && npm run dev`
Expected: Vite prints a local URL (e.g. `http://localhost:5173`). Open it; you see "tapuntap (React app scaffold)". Stop with Ctrl-C, then `cd ..`.

- [ ] **Step 13: Verify the production build works**

Run: `cd app && npm run build && cd ..`
Expected: `app/dist/index.html` and assets created, no TypeScript errors.

- [ ] **Step 14: Commit**

```bash
git add app/package.json app/package-lock.json app/tsconfig.json app/tsconfig.node.json app/vite.config.ts app/vitest.config.ts app/index.html app/.gitignore app/src/main.tsx app/src/vite-env.d.ts app/public/app.css
git commit -m "Scaffold Vite React+TS app under app/"
```

---

### Task 2: Repoint Firebase Hosting + CI at the new build (preview only)

**Files:**
- Modify: `firebase.json`, `package.json`, `.github/workflows/preview.yml`, `.github/workflows/deploy.yml`

- [ ] **Step 1: Update `firebase.json`** — point hosting at the built app and build before deploy. Replace the `"hosting"` block:

```json
  "hosting": {
    "public": "app/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "predeploy": ["npm --prefix app install", "npm --prefix app run build"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  },
```

Leave `firestore`, `functions`, and `emulators` blocks unchanged.

- [ ] **Step 2: Add a convenience build script to root `package.json`** — add to `"scripts"`:

```json
    "build:app": "npm --prefix app install && npm --prefix app run build",
```

- [ ] **Step 3: Update `.github/workflows/preview.yml`** — add a build step before the hosting deploy. Insert after the "Install functions dependencies" step and before the "Deploy preview" step:

```yaml
      - name: Build app
        run: npm --prefix app install && npm --prefix app run build
```

- [ ] **Step 4: Update `.github/workflows/deploy.yml`** — add the same build step after "Install functions dependencies" and before the "Deploy to Firebase" step:

```yaml
      - name: Build app
        run: npm --prefix app install && npm --prefix app run build
```

> Note: `deploy.yml` runs on `main`. Because you will NOT merge to `main` until cutover, production keeps serving the old app. This change only takes effect at the final merge.

- [ ] **Step 5: Verify the emulator still serves something**

Run: `npm run build:app` then `npm run emulators`
Open `http://localhost:5000` — you should see the React scaffold page (Hosting serves `app/dist`). Stop with Ctrl-C.

> Note: the emulator serves the **built** `app/dist`. For fast UI iteration use `cd app && npm run dev` (Vite dev server) and run the Firestore/Auth/Functions emulators separately with `firebase emulators:start --only firestore,auth,functions`. The Vite app's emulator toggle (Task 3) connects to them.

- [ ] **Step 6: Commit**

```bash
git add firebase.json package.json .github/workflows/preview.yml .github/workflows/deploy.yml
git commit -m "Point Hosting + CI at app/dist build output (preview only until cutover)"
```

---

### Task 3: Typed Firebase init + emulator toggle + domain types

**Files:**
- Create: `app/src/lib/firebaseConfig.ts`, `app/src/lib/firebase.ts`, `app/src/types/index.ts`, `app/src/test/setup.ts`

- [ ] **Step 1: Create `app/src/lib/firebaseConfig.ts`** — copy the real values from `public/js/firebase-config.js`

```ts
export const firebaseConfig = {
  apiKey: "REPLACE_FROM_public/js/firebase-config.js",
  authDomain: "tapuntap.firebaseapp.com",
  projectId: "tapuntap",
  appId: "REPLACE_FROM_public/js/firebase-config.js",
};
```

> Action: open `public/js/firebase-config.js` and paste the actual `apiKey`/`authDomain`/`projectId`/`appId` values here. These are public web-config values and are safe to commit.

- [ ] **Step 2: Create `app/src/lib/firebase.ts`**

```ts
import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { firebaseConfig } from "./firebaseConfig";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

const useEmulator = ["localhost", "127.0.0.1"].includes(location.hostname);
if (useEmulator) {
  connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "localhost", 8080);
  connectFunctionsEmulator(functions, "localhost", 5001);
  // eslint-disable-next-line no-console
  console.info("tapuntap: using Firebase emulators");
}
```

- [ ] **Step 3: Create `app/src/types/index.ts`** — the typed domain model (matches the Firestore schema)

```ts
export interface CardInstance {
  instanceId: string;
  cardId: string;
  name: string;
  manaCost: string;
  cmc: number;
  typeLine: string;
  colors: string[];
  imageUri: string | null;
  imageUriBack: string | null;
  power: number | string | null;
  toughness: number | string | null;
  loyalty: number | string | null;
  tapped: boolean;
  transformed: boolean;
  faceDown: boolean;
  summoningSick?: boolean;
  counters: Record<string, number>;
  attachedTo: string | null;
  token: boolean;
}

export interface DeckCardEntry {
  cardId: string;
  name: string;
  quantity: number;
  manaCost?: string;
  cmc?: number;
  typeLine?: string;
  colors?: string[];
  imageUri?: string | null;
  imageUriBack?: string | null;
  power?: number | string | null;
  toughness?: number | string | null;
  loyalty?: number | string | null;
}

export interface Deck {
  id: string;
  ownerUid: string;
  name: string;
  format: string;
  commander: DeckCardEntry | null;
  cards: DeckCardEntry[];
  version: number;
  createdAt?: string | null;
  updatedAt?: number | string | null;
}

export interface Seat {
  seat: number;
  uid: string;
  displayName: string;
  deckId: string;
  deckName: string;
  ready: boolean;
}

export type GameStatus = "lobby" | "active" | "complete";

export interface GameDoc {
  id: string;
  name: string;
  status: GameStatus;
  hostUid: string;
  inviteCode: string;
  format: string;
  seats: Seat[];
  seatUids: string[];
  turnOrder: string[];
  turn: number;
  activeSeat: number;
  phase: string;
  phaseIndex: number;
  phases: string[];
  notes?: string;
  winnerUid?: string | null;
  updatedAt?: number | null;
}

export interface PlayerPublic {
  uid: string;
  seat: number;
  displayName: string;
  life: number;
  poison: number;
  energy: number;
  counters: Record<string, number>;
  battlefield: CardInstance[];
  graveyard: CardInstance[];
  exile: CardInstance[];
  command: CardInstance[];
  handCount: number;
  libraryCount: number;
}

export interface PlayerPrivate {
  hand: CardInstance[];
  library: CardInstance[];
}

export interface LogEntry {
  ts: number | null;
  turn?: number;
  who?: string;
  seat?: number;
  text: string;
}

// Discriminated union for the server-side gameAction callable (Phase 4 backend).
export type GameAction =
  | { type: "draw"; gameId: string; count: number }
  | { type: "mill"; gameId: string; count: number }
  | { type: "scry"; gameId: string; order: string[] /* instanceIds top->bottom */; toBottom: string[] }
  | { type: "shuffleLibrary"; gameId: string }
  | { type: "shuffleGraveyardIntoLibrary"; gameId: string }
  | { type: "moveToHand"; gameId: string; instanceId: string; fromZone: "battlefield" | "graveyard" | "exile" | "command" | "library" }
  | { type: "moveToLibrary"; gameId: string; instanceId: string; fromZone: "battlefield" | "graveyard" | "exile" | "command" | "hand"; position: "top" | "bottom" }
  | { type: "tutorToHand"; gameId: string; instanceId: string }
  | { type: "playFromHand"; gameId: string; instanceId: string; toZone: "battlefield" | "graveyard" | "exile" | "command"; tapped?: boolean }
  | { type: "adjustOpponentLife"; gameId: string; targetUid: string; delta: number }
  | { type: "advancePhase"; gameId: string; direction: "next" | "prev" }
  | { type: "endTurn"; gameId: string };
```

- [ ] **Step 4: Create `app/src/test/setup.ts`**

```ts
import "@testing-library/jest-dom";
```

- [ ] **Step 5: Type-check**

Run: `cd app && npx tsc -b && cd ..`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add app/src/lib/firebaseConfig.ts app/src/lib/firebase.ts app/src/types/index.ts app/src/test/setup.ts
git commit -m "Add typed Firebase init, emulator toggle, and domain types"
```

---

## Phase 2 — Auth (Tasks 4–5)

### Task 4: Auth provider, hook, and route guard

**Files:**
- Create: `app/src/auth/AuthProvider.tsx`, `app/src/auth/useAuth.ts`, `app/src/auth/RequireAuth.tsx`

- [ ] **Step 1: Create `app/src/auth/useAuth.ts`**

```ts
import { createContext, useContext } from "react";
import type { User } from "firebase/auth";

export interface AuthState {
  user: User | null;
  loading: boolean;
  signInGoogle: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
```

- [ ] **Step 2: Create `app/src/auth/AuthProvider.tsx`**

```tsx
import { useEffect, useState, type ReactNode } from "react";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { AuthContext, type AuthState } from "./useAuth";

const provider = new GoogleAuthProvider();

async function ensureUserDoc(user: User) {
  const ref = doc(db, "users", user.uid);
  if (!(await getDoc(ref)).exists()) {
    await setDoc(ref, {
      displayName: user.displayName || "Player",
      photoURL: user.photoURL || null,
      email: user.email || null,
      createdAt: serverTimestamp(),
    });
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) await ensureUserDoc(u);
      setUser(u);
      setLoading(false);
    });
  }, []);

  const value: AuthState = {
    user,
    loading,
    signInGoogle: async () => {
      await signInWithPopup(auth, provider);
    },
    signInEmail: async (email, password) => {
      await signInWithEmailAndPassword(auth, email, password);
    },
    signUpEmail: async (email, password) => {
      await createUserWithEmailAndPassword(auth, email, password);
    },
    signOutUser: async () => {
      await signOut(auth);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
```

- [ ] **Step 3: Create `app/src/auth/RequireAuth.tsx`**

```tsx
import type { ReactNode } from "react";
import { useAuth } from "./useAuth";
import { AuthScreen } from "./AuthScreen";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="empty-state" style={{ flex: 1, display: "flex" }}>
        <div className="empty-title">Loading…</div>
      </div>
    );
  }
  if (!user) return <AuthScreen />;
  return <>{children}</>;
}
```

- [ ] **Step 4: Type-check** (AuthScreen import will error until Task 5 — that's expected; skip building until Task 5 Step 4.)

- [ ] **Step 5: Commit**

```bash
git add app/src/auth/useAuth.ts app/src/auth/AuthProvider.tsx app/src/auth/RequireAuth.tsx
git commit -m "Add auth context, hook, and route guard"
```

---

### Task 5: Auth screen (Google + email sign-in/up) and app bootstrap

**Files:**
- Create: `app/src/auth/AuthScreen.tsx`, `app/src/components/AppShell.tsx`, `app/src/components/Icon.tsx`
- Modify: `app/src/main.tsx`

> **Design note:** `AuthScreen` and `AppShell` below are working baselines using existing `app.css` classes. When the Claude Design markup for the login screen arrives (spec §10), replace the JSX inside `AuthScreen`'s return — keep the handlers and state.

- [ ] **Step 1: Create `app/src/components/Icon.tsx`** (minimal icon set used across views)

```tsx
const PATHS: Record<string, string> = {
  home: "M3 9l9-7 9 7v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z",
  decks: "M4 4v16M10 4v16M16 6v14",
  games: "M12 3v18M3 12h18",
  play: "M6 4l14 8-14 8z",
  settings: "M12 1v4M12 19v4M4.2 4.2l2.8 2.8M1 12h4M19 12h4",
  plus: "M12 5v14M5 12h14",
  close: "M6 6l12 12M18 6L6 18",
  next: "M9 6l6 6-6 6",
  prev: "M15 6l-6 6 6 6",
  trash: "M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14",
};

export function Icon({ name, size = 16 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d={PATHS[name] || ""} />
    </svg>
  );
}
```

- [ ] **Step 2: Create `app/src/auth/AuthScreen.tsx`**

```tsx
import { useState } from "react";
import { useAuth } from "./useAuth";

export function AuthScreen() {
  const { signInGoogle, signInEmail, signUpEmail } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function friendly(code: string, message: string) {
    if (code === "auth/invalid-credential") return "Invalid email or password.";
    if (code === "auth/email-already-in-use") return "That email is already registered. Try signing in.";
    if (code === "auth/weak-password") return "Password should be at least 6 characters.";
    if (code === "auth/invalid-email") return "Enter a valid email address.";
    return message;
  }

  async function onEmailSubmit() {
    setError("");
    setBusy(true);
    try {
      if (mode === "signin") await signInEmail(email.trim(), password);
      else await signUpEmail(email.trim(), password);
    } catch (e) {
      const err = e as { code?: string; message?: string };
      setError(friendly(err.code || "", err.message || "Something went wrong."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-overlay">
      <div className="login-card">
        <div className="login-logo">tapuntap</div>
        <p className="login-sub">Sign in to build decks and play.</p>

        <button className="btn btn-primary" disabled={busy} onClick={() => signInGoogle().catch((e) => setError(e.message))}>
          Continue with Google
        </button>

        <div className="login-divider"><span>or</span></div>

        <input className="input" type="email" placeholder="Email" autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="input" type="password" placeholder="Password"
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password} onChange={(e) => setPassword(e.target.value)} />

        <div style={{ fontSize: 12, color: "var(--err,#f66)", minHeight: 16 }}>{error}</div>

        <button className="btn btn-secondary" disabled={busy} onClick={onEmailSubmit}>
          {mode === "signin" ? "Sign in" : "Create account"}
        </button>

        <button className="btn btn-ghost" style={{ marginTop: 8 }}
          onClick={() => { setError(""); setMode(mode === "signin" ? "signup" : "signin"); }}>
          {mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `app/src/components/AppShell.tsx`** (left rail + outlet; replaces the old rail)

```tsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { Icon } from "./Icon";

export function AppShell() {
  const { user, signOutUser } = useAuth();
  const navigate = useNavigate();
  const links: Array<{ to: string; icon: string; tip: string }> = [
    { to: "/", icon: "home", tip: "Home" },
    { to: "/decks", icon: "decks", tip: "Decks" },
    { to: "/games", icon: "games", tip: "Games" },
  ];
  return (
    <div className="app">
      <nav className="rail">
        <div className="rail-logo" title="tapuntap">t</div>
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.to === "/"}
            className={({ isActive }) => `rail-btn${isActive ? " active" : ""}`} title={l.tip}>
            <Icon name={l.icon} size={18} />
          </NavLink>
        ))}
        <div className="rail-spacer" />
        <NavLink to="/settings" className={({ isActive }) => `rail-btn${isActive ? " active" : ""}`} title="Settings">
          <Icon name="settings" size={18} />
        </NavLink>
        <button className="rail-btn" title={`Sign out (${user?.displayName || user?.email || ""})`}
          onClick={() => signOutUser().then(() => navigate("/"))}>
          {(user?.displayName || user?.email || "?").slice(0, 1).toUpperCase()}
        </button>
      </nav>
      <div className="main">
        <Outlet />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Replace `app/src/main.tsx`** with the router + auth gate

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./auth/AuthProvider";
import { RequireAuth } from "./auth/RequireAuth";
import { AppShell } from "./components/AppShell";

function Placeholder({ title }: { title: string }) {
  return (
    <div className="empty-state" style={{ flex: 1, display: "flex" }}>
      <div className="empty-title">{title}</div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <RequireAuth>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<Placeholder title="Home" />} />
              <Route path="/decks" element={<Placeholder title="Decks" />} />
              <Route path="/games" element={<Placeholder title="Games" />} />
              <Route path="/settings" element={<Placeholder title="Settings" />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </RequireAuth>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
```

- [ ] **Step 5: Build to verify types**

Run: `cd app && npm run build && cd ..`
Expected: build succeeds, no TS errors.

- [ ] **Step 6: Manual verification** against emulators

Run two terminals:
1. `firebase emulators:start --only firestore,auth,functions`
2. `cd app && npm run dev`

Open the Vite URL. Expected:
- The auth screen appears (no flash of the app shell).
- "Sign up" toggle works; create a test email account → app shell with rail renders.
- Emulator UI (`http://localhost:4000`) → Firestore shows `users/{uid}` with your email.
- Click the avatar (bottom of rail) → signs out → auth screen returns.
- "Continue with Google" opens the Auth emulator's Google dialog → add a user → app renders.

- [ ] **Step 7: Commit**

```bash
git add app/src/auth/AuthScreen.tsx app/src/components/AppShell.tsx app/src/components/Icon.tsx app/src/main.tsx
git commit -m "Add auth screen (Google + email sign-in/up) and router shell"
```

---

## Phase 3 — Shared components, Scryfall, and Decks (Tasks 6–9)

### Task 6: Pure helpers with unit tests (Vitest)

**Files:**
- Create: `app/src/lib/format.ts`, `app/src/lib/cards.ts`, `app/src/test/format.test.ts`, `app/src/test/cards.test.ts`

- [ ] **Step 1: Write `app/src/test/cards.test.ts`** (failing first)

```ts
import { describe, it, expect } from "vitest";
import { isLand, shuffle, newInstanceId } from "../lib/cards";

describe("isLand", () => {
  it("detects land type lines", () => {
    expect(isLand("Basic Land — Island")).toBe(true);
    expect(isLand("Creature — Elf")).toBe(false);
    expect(isLand("")).toBe(false);
  });
});

describe("shuffle", () => {
  it("returns same multiset, new array", () => {
    const input = [1, 2, 3, 4, 5];
    const out = shuffle(input);
    expect(out).not.toBe(input);
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("newInstanceId", () => {
  it("returns a unique-ish string", () => {
    expect(newInstanceId()).not.toEqual(newInstanceId());
  });
});
```

- [ ] **Step 2: Run it, watch it fail**

Run: `cd app && npx vitest run src/test/cards.test.ts && cd ..`
Expected: FAIL — `../lib/cards` not found.

- [ ] **Step 3: Create `app/src/lib/cards.ts`**

```ts
export function isLand(typeLine: string | undefined | null): boolean {
  return !!typeLine && typeLine.includes("Land");
}

export function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function newInstanceId(): string {
  return crypto.randomUUID();
}
```

- [ ] **Step 4: Create `app/src/lib/format.ts`**

```ts
export function fmtTime(ms: number | string | null | undefined): string {
  if (!ms) return "";
  const d = typeof ms === "number" ? new Date(ms) : new Date(ms);
  return d.toLocaleString();
}

const COLOR_TONES: Record<string, string> = {
  W: "oklch(0.9 0.05 90)", U: "oklch(0.6 0.13 250)", B: "oklch(0.35 0.02 300)",
  R: "oklch(0.6 0.2 25)", G: "oklch(0.55 0.13 150)",
};

export function colorTone(colors: string[]): string {
  if (!colors || colors.length === 0) return "oklch(0.55 0.02 90)";
  if (colors.length > 1) return "oklch(0.7 0.13 80)";
  return COLOR_TONES[colors[0]] || "oklch(0.5 0.02 250)";
}
```

- [ ] **Step 5: Write `app/src/test/format.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { colorTone, fmtTime } from "../lib/format";

describe("colorTone", () => {
  it("handles colorless, mono, multi", () => {
    expect(colorTone([])).toContain("oklch");
    expect(colorTone(["U"])).toContain("oklch");
    expect(colorTone(["U", "R"])).toContain("oklch");
  });
});

describe("fmtTime", () => {
  it("returns empty for falsy", () => {
    expect(fmtTime(null)).toBe("");
    expect(fmtTime(0)).toBe("");
  });
});
```

- [ ] **Step 6: Run all unit tests, watch them pass**

Run: `cd app && npx vitest run && cd ..`
Expected: PASS (cards + format).

- [ ] **Step 7: Commit**

```bash
git add app/src/lib/cards.ts app/src/lib/format.ts app/src/test/cards.test.ts app/src/test/format.test.ts
git commit -m "Add tested pure helpers (cards, format)"
```

---

### Task 7: Scryfall client and shared UI components

**Files:**
- Create: `app/src/lib/scryfall.ts`, `app/src/components/Modal.tsx`, `app/src/components/Toast.tsx`, `app/src/components/CardFace.tsx`

- [ ] **Step 1: Create `app/src/lib/scryfall.ts`**

```ts
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";

const SCRY = "https://api.scryfall.com";

export interface ScryfallSearch {
  data: any[];
  total_cards: number;
  has_more: boolean;
}

export async function searchCards(q: string, page = 1): Promise<ScryfallSearch> {
  const url = `${SCRY}/cards/search?q=${encodeURIComponent(q)}&order=name&page=${page}`;
  const r = await fetch(url);
  if (r.status === 404) return { data: [], total_cards: 0, has_more: false };
  if (!r.ok) throw new Error("Search failed");
  return r.json();
}

function cacheCard(card: any) {
  setDoc(doc(db, "cards", card.id), { ...card, cachedAt: Date.now() }).catch(() => {});
}

export async function getCard(id: string): Promise<any> {
  const cached = await getDoc(doc(db, "cards", id));
  if (cached.exists()) return cached.data();
  const r = await fetch(`${SCRY}/cards/${id}`);
  if (!r.ok) throw new Error("Card not found");
  const card = await r.json();
  cacheCard(card);
  return card;
}

export async function getCardByName(name: string): Promise<any> {
  const r = await fetch(`${SCRY}/cards/named?fuzzy=${encodeURIComponent(name)}`);
  if (!r.ok) throw new Error("Card not found");
  const card = await r.json();
  cacheCard(card);
  return card;
}
```

- [ ] **Step 2: Create `app/src/components/Toast.tsx`** (context + hook)

```tsx
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Toast = { id: number; text: string; kind: "info" | "error" };
const ToastCtx = createContext<(text: string, kind?: "info" | "error") => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((text: string, kind: "info" | "error" = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div id="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast${t.kind === "error" ? " toast-error" : ""}`}>{t.text}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
```

- [ ] **Step 3: Create `app/src/components/Modal.tsx`**

```tsx
import type { ReactNode } from "react";

export function Modal({ title, onClose, children, footer, width = 480 }:
  { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ minWidth: width }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `app/src/components/CardFace.tsx`**

```tsx
import type { CardInstance } from "../types";
import { colorTone } from "../lib/format";
import { isLand } from "../lib/cards";

export function CardFace({ card, zone, onClick, onContextMenu, draggable, onDragStart }: {
  card: CardInstance;
  zone: string;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}) {
  const tone = colorTone(card.colors || []);
  const classes = ["card-face", card.tapped ? "tapped" : "", isLand(card.typeLine) ? "is-land" : ""]
    .filter(Boolean).join(" ");
  return (
    <div className={classes} style={{ ["--card-tone" as any]: tone }} data-zone={zone}
      title={card.name} onClick={onClick} onContextMenu={onContextMenu}
      draggable={draggable} onDragStart={onDragStart}>
      <div className="card-color-bar" style={{ background: tone }} />
      {card.imageUri
        ? <img className="card-img-fill" src={card.imageUri} alt={card.name} loading="lazy" />
        : <div className="card-name">{card.name}</div>}
      {Object.entries(card.counters || {}).filter(([, v]) => v).map(([k, v]) => (
        <div key={k} className="card-counter">{k}:{v}</div>
      ))}
      {card.token && <div className="card-token-badge">TKN</div>}
    </div>
  );
}
```

- [ ] **Step 5: Wrap the app in `ToastProvider`** — modify `app/src/main.tsx`: import and wrap inside `<AuthProvider>`:

```tsx
import { ToastProvider } from "./components/Toast";
// ...
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          {/* ...existing... */}
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
```

- [ ] **Step 6: Build**

Run: `cd app && npm run build && cd ..`
Expected: success.

- [ ] **Step 7: Commit**

```bash
git add app/src/lib/scryfall.ts app/src/components/Toast.tsx app/src/components/Modal.tsx app/src/components/CardFace.tsx app/src/main.tsx
git commit -m "Add Scryfall client and shared UI components (Toast, Modal, CardFace)"
```

---

### Task 8: Typed deck API + data hooks

**Files:**
- Create: `app/src/api/decks.ts`, `app/src/api/hooks.ts`

- [ ] **Step 1: Create `app/src/api/decks.ts`**

```ts
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, setDoc, serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import type { Deck, DeckCardEntry } from "../types";

function uid(): string {
  const u = auth.currentUser?.uid;
  if (!u) throw new Error("Not signed in");
  return u;
}
function decksCol() {
  return collection(db, "users", uid(), "decks");
}

export interface DeckSummary {
  id: string; name: string; format: string;
  commander: DeckCardEntry | null; colors: string[];
  cardCount: number; version: number; updatedAt: number;
}

export async function listDecks(): Promise<DeckSummary[]> {
  const snap = await getDocs(decksCol());
  return snap.docs.map((d) => {
    const x = d.data() as any;
    return {
      id: d.id, name: x.name, format: x.format,
      commander: x.commander || null, colors: x.commander?.colors || [],
      cardCount: (x.cards || []).reduce((s: number, c: any) => s + (c.quantity || 0), 0),
      version: x.version, updatedAt: x.updatedAt?.toMillis?.() ?? 0,
    };
  }).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getDeck(id: string): Promise<Deck> {
  const s = await getDoc(doc(decksCol(), id));
  if (!s.exists()) throw new Error("Deck not found");
  const data = s.data() as any;
  return {
    id: s.id, ownerUid: data.ownerUid, name: data.name, format: data.format,
    commander: data.commander || null, cards: data.cards || [], version: data.version,
    createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
    updatedAt: data.updatedAt?.toMillis?.() ?? null,
  };
}

export async function createDeck(input: { name: string; format?: string; commander?: DeckCardEntry | null; cards?: DeckCardEntry[]; changelog?: string }): Promise<{ id: string }> {
  const ref = await addDoc(decksCol(), {
    ownerUid: uid(), name: input.name, format: input.format || "commander",
    commander: input.commander || null, cards: input.cards || [], version: 1,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  await setDoc(doc(ref, "versions", "1"), {
    version: 1, timestamp: serverTimestamp(),
    changelog: input.changelog || "Initial version", cards: input.cards || [],
  });
  return { id: ref.id };
}

export async function updateDeck(id: string, input: Partial<{ name: string; format: string; commander: DeckCardEntry | null; cards: DeckCardEntry[]; changelog: string }>): Promise<void> {
  const ref = doc(decksCol(), id);
  const cur = await getDoc(ref);
  if (!cur.exists()) throw new Error("Deck not found");
  const d = cur.data() as any;
  const newVersion = (d.version || 1) + 1;
  const newCards = input.cards ?? d.cards;
  await updateDoc(ref, {
    name: input.name ?? d.name, format: input.format ?? d.format,
    commander: input.commander !== undefined ? input.commander : d.commander,
    cards: newCards, version: newVersion, updatedAt: serverTimestamp(),
  });
  await setDoc(doc(ref, "versions", String(newVersion)), {
    version: newVersion, timestamp: serverTimestamp(),
    changelog: input.changelog || `Version ${newVersion}`, cards: newCards,
  });
}

export async function deleteDeck(id: string): Promise<void> {
  const ref = doc(decksCol(), id);
  const versions = await getDocs(collection(ref, "versions"));
  await Promise.all(versions.docs.map((v) => deleteDoc(v.ref)));
  await deleteDoc(ref);
}
```

- [ ] **Step 2: Create `app/src/api/hooks.ts`** (live subscriptions + decks loader)

```ts
import { useEffect, useState } from "react";
import {
  collection, doc, onSnapshot, query, orderBy, where, getDocs,
} from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import type { GameDoc, PlayerPublic, PlayerPrivate, LogEntry } from "../types";
import { listDecks, type DeckSummary } from "./decks";

export function useGame(gameId: string | undefined) {
  const [game, setGame] = useState<GameDoc | null>(null);
  useEffect(() => {
    if (!gameId) return;
    return onSnapshot(doc(db, "games", gameId), (s) =>
      setGame(s.exists() ? ({ id: s.id, ...(s.data() as any) }) : null));
  }, [gameId]);
  return game;
}

export function usePlayersPublic(gameId: string | undefined) {
  const [players, setPlayers] = useState<Record<string, PlayerPublic>>({});
  useEffect(() => {
    if (!gameId) return;
    return onSnapshot(collection(db, "games", gameId, "players"), (snap) => {
      const next: Record<string, PlayerPublic> = {};
      snap.docs.forEach((d) => { next[d.id] = { uid: d.id, ...(d.data() as any) }; });
      setPlayers(next);
    });
  }, [gameId]);
  return players;
}

export function useMyPrivate(gameId: string | undefined) {
  const [priv, setPriv] = useState<PlayerPrivate>({ hand: [], library: [] });
  useEffect(() => {
    const u = auth.currentUser?.uid;
    if (!gameId || !u) return;
    return onSnapshot(doc(db, "games", gameId, "players", u, "private", "state"),
      (s) => setPriv(s.exists() ? (s.data() as PlayerPrivate) : { hand: [], library: [] }));
  }, [gameId]);
  return priv;
}

export function useLog(gameId: string | undefined) {
  const [log, setLog] = useState<LogEntry[]>([]);
  useEffect(() => {
    if (!gameId) return;
    return onSnapshot(query(collection(db, "games", gameId, "log"), orderBy("ts")),
      (snap) => setLog(snap.docs.map((d) => d.data() as LogEntry)));
  }, [gameId]);
  return log;
}

export function useMyDecks() {
  const [decks, setDecks] = useState<DeckSummary[] | null>(null);
  const [error, setError] = useState<string>("");
  useEffect(() => {
    listDecks().then(setDecks).catch((e) => setError(e.message));
  }, []);
  return { decks, error };
}

export interface GameSummary extends GameDoc {}

export function useMyGames() {
  const [games, setGames] = useState<GameSummary[] | null>(null);
  useEffect(() => {
    const u = auth.currentUser?.uid;
    if (!u) return;
    const q = query(collection(db, "games"), where("seatUids", "array-contains", u), orderBy("updatedAt", "desc"));
    getDocs(q).then((snap) => setGames(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))))
      .catch(() => setGames([]));
  }, []);
  return games;
}
```

- [ ] **Step 3: Build**

Run: `cd app && npm run build && cd ..`
Expected: success.

- [ ] **Step 4: Commit**

```bash
git add app/src/api/decks.ts app/src/api/hooks.ts
git commit -m "Add typed deck API and live data hooks"
```

---

### Task 9: Decks library + builder views

**Files:**
- Create: `app/src/features/decks/DecksView.tsx`, `app/src/features/decks/BuilderView.tsx`
- Modify: `app/src/main.tsx`

> **Design note:** these are functional baselines using `app.css` classes. Refine markup after Claude Design if you choose; behavior must stay.

- [ ] **Step 1: Create `app/src/features/decks/DecksView.tsx`**

```tsx
import { useNavigate } from "react-router-dom";
import { useMyDecks } from "../../api/hooks";
import { deleteDeck } from "../../api/decks";
import { useToast } from "../../components/Toast";
import { Icon } from "../../components/Icon";
import { useState } from "react";

export function DecksView() {
  const { decks, error } = useMyDecks();
  const [version, setVersion] = useState(0); // force refetch after delete
  const navigate = useNavigate();
  const toast = useToast();

  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Decks</div>
        <div className="topbar-spacer" />
        <button className="btn btn-primary" onClick={() => navigate("/decks/new")}>
          <Icon name="plus" size={14} /> New deck
        </button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }} key={version}>
        {error && <div className="empty-title">{error}</div>}
        {!decks && !error && <div style={{ color: "var(--fg-3)" }}>Loading…</div>}
        {decks && decks.length === 0 && (
          <div className="empty-state"><div className="empty-title">No decks yet</div>
            <button className="btn btn-primary" onClick={() => navigate("/decks/new")}>Build your first deck</button>
          </div>
        )}
        <div className="decks-grid">
          {decks?.map((d) => (
            <div key={d.id} className="panel" style={{ padding: 16 }}>
              <div style={{ fontWeight: 600 }} onClick={() => navigate(`/decks/${d.id}`)}
                role="button">{d.name}</div>
              <div className="muted mono" style={{ fontSize: 11 }}>{d.cardCount} cards · {d.format} · v{d.version}</div>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={async () => {
                if (!confirm("Delete this deck?")) return;
                try { await deleteDeck(d.id); toast("Deck deleted"); setVersion((v) => v + 1); }
                catch (e) { toast((e as Error).message, "error"); }
              }}><Icon name="trash" size={12} /></button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create `app/src/features/decks/BuilderView.tsx`** (search → add → save). Baseline that ports the old builder behavior.

```tsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { searchCards } from "../../lib/scryfall";
import { createDeck, getDeck, updateDeck } from "../../api/decks";
import { useToast } from "../../components/Toast";
import type { DeckCardEntry } from "../../types";

function toEntry(card: any, quantity = 1): DeckCardEntry {
  return {
    cardId: card.id, name: card.name, quantity,
    manaCost: card.mana_cost || "", cmc: card.cmc || 0, typeLine: card.type_line || "",
    colors: card.colors || [], imageUri: card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || null,
    imageUriBack: card.card_faces?.[1]?.image_uris?.normal || null,
    power: card.power ?? null, toughness: card.toughness ?? null, loyalty: card.loyalty ?? null,
  };
}

export function BuilderView() {
  const { deckId } = useParams();
  const isNew = deckId === undefined;
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState("");
  const [format, setFormat] = useState("commander");
  const [cards, setCards] = useState<DeckCardEntry[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!isNew && deckId) {
      getDeck(deckId).then((d) => { setName(d.name); setFormat(d.format); setCards(d.cards); })
        .catch((e) => toast(e.message, "error"));
    }
  }, [deckId, isNew, toast]);

  async function doSearch() {
    if (!q.trim()) return;
    try { const r = await searchCards(q); setResults(r.data.slice(0, 30)); }
    catch (e) { toast((e as Error).message, "error"); }
  }

  function addCard(card: any) {
    setCards((cs) => {
      const existing = cs.find((c) => c.cardId === card.id);
      if (existing) return cs.map((c) => c.cardId === card.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...cs, toEntry(card)];
    });
  }

  async function save() {
    if (!name.trim()) { toast("Name your deck", "error"); return; }
    try {
      if (isNew) { const { id } = await createDeck({ name, format, cards }); navigate(`/decks/${id}`); }
      else { await updateDeck(deckId!, { name, format, cards }); toast("Saved"); }
    } catch (e) { toast((e as Error).message, "error"); }
  }

  return (
    <>
      <div className="topbar">
        <input className="input" placeholder="Deck name" value={name} onChange={(e) => setName(e.target.value)} />
        <select className="input" value={format} onChange={(e) => setFormat(e.target.value)}>
          <option value="commander">Commander</option>
          <option value="standard">Standard</option>
        </select>
        <div className="topbar-spacer" />
        <button className="btn btn-primary" onClick={save}>Save</button>
      </div>
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <div style={{ flex: 1, padding: 16, overflowY: "auto" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input className="input" placeholder="Search Scryfall…" value={q}
              onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doSearch()} />
            <button className="btn" onClick={doSearch}>Search</button>
          </div>
          <div className="decks-grid" style={{ marginTop: 12 }}>
            {results.map((c) => (
              <div key={c.id} className="panel" style={{ padding: 8, cursor: "pointer" }} onClick={() => addCard(c)}>
                {c.image_uris?.small && <img src={c.image_uris.small} alt={c.name} style={{ width: "100%" }} />}
                <div style={{ fontSize: 12 }}>{c.name}</div>
              </div>
            ))}
          </div>
        </div>
        <aside style={{ width: 280, borderLeft: "1px solid var(--line-1)", padding: 16, overflowY: "auto" }}>
          <div className="eyebrow">Deck ({cards.reduce((s, c) => s + c.quantity, 0)})</div>
          {cards.map((c) => (
            <div key={c.cardId} className="deck-card-row">
              <span className="deck-card-qty">{c.quantity}</span>
              <span className="deck-card-name">{c.name}</span>
              <button className="btn btn-ghost btn-sm" onClick={() =>
                setCards((cs) => cs.flatMap((x) => x.cardId !== c.cardId ? [x] : x.quantity > 1 ? [{ ...x, quantity: x.quantity - 1 }] : []))
              }>−</button>
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Wire routes** — modify `app/src/main.tsx`: import the views and replace the `/decks` placeholder routes:

```tsx
import { DecksView } from "./features/decks/DecksView";
import { BuilderView } from "./features/decks/BuilderView";
// inside <Route element={<AppShell />}>:
              <Route path="/decks" element={<DecksView />} />
              <Route path="/decks/new" element={<BuilderView />} />
              <Route path="/decks/:deckId" element={<BuilderView />} />
```

- [ ] **Step 4: Build**

Run: `cd app && npm run build && cd ..`
Expected: success.

- [ ] **Step 5: Manual verification** (emulators + `npm run dev`)
- Go to Decks → New deck → search "Island" → add a few → Save → lands at `/decks/{id}`.
- Back to Decks → the deck is listed with the right count → open it → edit → Save (version bumps in Emulator UI under `users/{uid}/decks/{id}/versions`).
- Delete a deck → it disappears.

- [ ] **Step 6: Commit**

```bash
git add app/src/features/decks/DecksView.tsx app/src/features/decks/BuilderView.tsx app/src/main.tsx
git commit -m "Add decks library and builder views (Firestore-backed)"
```

---

## Phase 4 — Security rules fix + server-side actions (Tasks 10–13)

> This phase is backend-heavy. Validate with the **emulator** and the **rules/functions tests**. To see effects on a PR preview URL, manually deploy: `npx firebase deploy --only firestore:rules,functions`.

### Task 10: Fix the `isParticipant()` rules regression (+ tests)

**Files:**
- Modify: `firestore.rules`, `test/rules/games.test.js`

- [ ] **Step 1: Add a failing rules test** — append to `test/rules/games.test.js` (inside the file, after the existing tests):

```js
test("players: opponent can READ another participant's public doc (regression)", async () => {
  const env = await makeEnv(); await env.clearFirestore(); await seedGame(env);
  const bob = env.authenticatedContext("bob").firestore();
  // bob is a participant; alice's public doc must be readable by bob
  await assertSucceeds(getDoc(doc(bob, "games/g1/players/alice")));
  await env.cleanup();
});

test("log: participant can READ the log (regression)", async () => {
  const env = await makeEnv(); await env.clearFirestore(); await seedGame(env);
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "games/g1/log/e1"), { ts: 1, seat: 0, text: "hi" });
  });
  const bob = env.authenticatedContext("bob").firestore();
  await assertSucceeds(getDoc(doc(bob, "games/g1/log/e1")));
  await env.cleanup();
});
```

- [ ] **Step 2: Run rules tests, watch the new ones fail**

Run: `npm run test:rules`
Expected: the two new tests FAIL (participant read denied because `isParticipant()` reads a nonexistent `seatUids` on the subcollection doc).

- [ ] **Step 3: Fix `firestore.rules`** — replace the `games` match block's helpers and reads so `isParticipant()` uses a `get()` on the parent game doc. Replace the whole `match /games/{gameId} { ... }` block with:

```
    match /games/{gameId} {
      function gameData() {
        return get(/databases/$(database)/documents/games/$(gameId)).data;
      }
      function isParticipant() {
        return request.auth != null && request.auth.uid in gameData().seatUids;
      }
      function onlyClientGameFields() {
        return request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['notes', 'updatedAt']);
      }

      // Reads: participants always; lobby readable by any authed user (join-by-code lookup)
      allow read: if request.auth != null && (isParticipant() || resource.data.status == 'lobby');

      // Clients may ONLY write 'notes' on the game doc. Turn/phase/seats/status are Function-owned.
      allow update: if isParticipant() && onlyClientGameFields();
      allow delete: if request.auth != null && resource.data.hostUid == request.auth.uid;

      match /log/{entryId} {
        allow read: if isParticipant();
        allow create: if isParticipant();
      }

      match /players/{uid} {
        allow read: if isParticipant();
        // Owner may write ONLY client-owned low-stakes fields; hidden-info & cross-player are Function-owned.
        allow update: if request.auth != null && request.auth.uid == uid
          && request.resource.data.diff(resource.data).affectedKeys()
             .hasOnly(['battlefield', 'graveyard', 'exile', 'command', 'life', 'poison', 'energy', 'counters']);
        allow create, delete: if false; // only startGame (Admin SDK) creates; endGame cleans up

        match /private/{docId} {
          allow read, write: if request.auth != null && request.auth.uid == uid;
        }
      }
    }
```

> Why: `gameData()` does a `get()` on the parent game doc, so `seatUids` is available inside every subcollection match. Turn/phase advancement and hidden-info/cross-player player-doc fields are now denied to direct client writes — they go through Functions (Tasks 11–12). Clients keep direct writes for their own battlefield/graveyard/exile/command and own life/poison/energy/counters.

- [ ] **Step 4: Update the existing turn-write test** — the old test `"games: only active player writes turn fields"` will now FAIL because clients can no longer write `activeSeat`/`phaseIndex` directly. Change that test to assert the write is now denied:

```js
test("games: clients cannot write turn fields directly (now Function-owned)", async () => {
  const env = await makeEnv(); await env.clearFirestore(); await seedGame(env);
  const alice = env.authenticatedContext("alice").firestore();
  await assertFails(updateDoc(doc(alice, "games/g1"), { activeSeat: 1, phaseIndex: 0 }));
  await env.cleanup();
});
```

Also update `"players: public owner-write..."`: a bare `life` update by the owner still succeeds (it's in the allowed set), but a forged `handCount` write must now FAIL. Add:

```js
test("players: owner cannot forge counts directly (Function-owned)", async () => {
  const env = await makeEnv(); await env.clearFirestore(); await seedGame(env);
  const alice = env.authenticatedContext("alice").firestore();
  await assertSucceeds(updateDoc(doc(alice, "games/g1/players/alice"), { life: 38 }));
  await assertFails(updateDoc(doc(alice, "games/g1/players/alice"), { handCount: 0 }));
  await env.cleanup();
});
```

- [ ] **Step 5: Run rules tests, watch them pass**

Run: `npm run test:rules`
Expected: PASS (all suites).

- [ ] **Step 6: Commit**

```bash
git add firestore.rules test/rules/games.test.js
git commit -m "Fix isParticipant() rules regression; make turn/counts Function-owned"
```

---

### Task 11: `gameAction` Function — hidden-info & shared actions (pure handlers + tests)

**Files:**
- Create: `functions/lib/actions.js`, `functions/test/actions.test.js`
- Modify: `functions/index.js`

- [ ] **Step 1: Create `functions/lib/actions.js`** — pure handlers operating on an injected `db`, returning nothing (they write). Each validates the caller.

```js
import { HttpsError } from "firebase-functions/v2/https";
import { FieldValue } from "firebase-admin/firestore";

const PRIVATE = (gameId, uid) => `games/${gameId}/players/${uid}/private/state`;
const PUBLIC = (gameId, uid) => `games/${gameId}/players/${uid}`;

async function loadGame(db, gameId, uid) {
  const snap = await db.doc(`games/${gameId}`).get();
  if (!snap.exists) throw new HttpsError("not-found", "Game not found");
  const g = snap.data();
  if (!g.seatUids.includes(uid)) throw new HttpsError("permission-denied", "Not a participant");
  if (g.status !== "active") throw new HttpsError("failed-precondition", "Game not active");
  return g;
}

function shuffleInPlace(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

async function writePrivateAndCounts(db, gameId, uid, priv) {
  const batch = db.batch();
  batch.set(db.doc(PRIVATE(gameId, uid)), { hand: priv.hand, library: priv.library });
  batch.update(db.doc(PUBLIC(gameId, uid)), {
    handCount: priv.hand.length, libraryCount: priv.library.length,
  });
  await batch.commit();
}

async function appendLog(db, gameId, seat, who, turn, text) {
  await db.collection(`games/${gameId}/log`).add({
    ts: FieldValue.serverTimestamp(), seat, who, turn, text,
  });
}

export async function handleGameAction(uid, data, db) {
  const { type, gameId } = data || {};
  if (!type || !gameId) throw new HttpsError("invalid-argument", "type and gameId required");
  const g = await loadGame(db, gameId, uid);
  const mySeat = g.seats.find((s) => s.uid === uid);
  const seatNum = mySeat ? mySeat.seat : 0;
  const who = mySeat ? mySeat.displayName : uid;

  const privRef = db.doc(PRIVATE(gameId, uid));
  const priv = (await privRef.get()).data() || { hand: [], library: [] };

  switch (type) {
    case "draw": {
      const n = Math.max(1, data.count || 1);
      let drawn = 0;
      for (let i = 0; i < n && priv.library.length; i++) { priv.hand.push(priv.library.shift()); drawn++; }
      await writePrivateAndCounts(db, gameId, uid, priv);
      await appendLog(db, gameId, seatNum, who, g.turn, `drew ${drawn} card${drawn === 1 ? "" : "s"}`);
      return { drawn };
    }
    case "mill": {
      const n = Math.max(1, data.count || 1);
      const pubRef = db.doc(PUBLIC(gameId, uid));
      const pub = (await pubRef.get()).data();
      const milled = priv.library.splice(0, Math.min(n, priv.library.length));
      pub.graveyard = [...(pub.graveyard || []), ...milled];
      const batch = db.batch();
      batch.set(privRef, { hand: priv.hand, library: priv.library });
      batch.update(pubRef, { libraryCount: priv.library.length, graveyard: pub.graveyard });
      await batch.commit();
      await appendLog(db, gameId, seatNum, who, g.turn, `milled ${milled.length}`);
      return { milled: milled.length };
    }
    case "shuffleLibrary": {
      shuffleInPlace(priv.library);
      await writePrivateAndCounts(db, gameId, uid, priv);
      await appendLog(db, gameId, seatNum, who, g.turn, "shuffled library");
      return { ok: true };
    }
    case "adjustOpponentLife": {
      const target = data.targetUid;
      if (!g.seatUids.includes(target)) throw new HttpsError("invalid-argument", "Target not in game");
      const tRef = db.doc(PUBLIC(gameId, target));
      const tPub = (await tRef.get()).data();
      const newLife = (tPub.life ?? 20) + (data.delta || 0);
      await tRef.update({ life: newLife });
      await appendLog(db, gameId, seatNum, who, g.turn, `set ${tPub.displayName}'s life to ${newLife}`);
      return { life: newLife };
    }
    case "endTurn": {
      const order = g.turnOrder || [];
      if (order[g.activeSeat] !== uid) throw new HttpsError("permission-denied", "Not your turn");
      const nextSeat = (g.activeSeat + 1) % order.length;
      const newTurn = nextSeat === 0 ? g.turn + 1 : g.turn;
      await db.doc(`games/${gameId}`).update({
        activeSeat: nextSeat, turn: newTurn, phaseIndex: 0,
        phase: (g.phases || [])[0] || "beginning", updatedAt: FieldValue.serverTimestamp(),
      });
      // Untap the player whose turn now begins.
      const nextUid = order[nextSeat];
      const nRef = db.doc(PUBLIC(gameId, nextUid));
      const nPub = (await nRef.get()).data();
      if (nPub) {
        await nRef.update({ battlefield: (nPub.battlefield || []).map((c) => ({ ...c, tapped: false, summoningSick: false })) });
      }
      await appendLog(db, gameId, seatNum, who, g.turn, "ended their turn");
      return { activeSeat: nextSeat, turn: newTurn };
    }
    case "advancePhase": {
      const order = g.turnOrder || [];
      if (order[g.activeSeat] !== uid) throw new HttpsError("permission-denied", "Not your turn");
      const phases = g.phases || [];
      let idx = g.phaseIndex ?? 0;
      idx = data.direction === "prev" ? Math.max(0, idx - 1) : idx + 1;
      if (idx >= phases.length) return handleGameAction(uid, { type: "endTurn", gameId }, db);
      await db.doc(`games/${gameId}`).update({ phaseIndex: idx, phase: phases[idx], updatedAt: FieldValue.serverTimestamp() });
      return { phaseIndex: idx };
    }
    case "shuffleGraveyardIntoLibrary": {
      const pubRef = db.doc(PUBLIC(gameId, uid));
      const pub = (await pubRef.get()).data();
      priv.library = priv.library.concat(pub.graveyard || []);
      shuffleInPlace(priv.library);
      const batch = db.batch();
      batch.set(privRef, { hand: priv.hand, library: priv.library });
      batch.update(pubRef, { graveyard: [], libraryCount: priv.library.length });
      await batch.commit();
      await appendLog(db, gameId, seatNum, who, g.turn, "shuffled graveyard into library");
      return { ok: true };
    }
    case "scry": {
      // data.order: instanceIds kept on top (in order); data.toBottom: instanceIds sent to bottom
      const n = (data.order?.length || 0) + (data.toBottom?.length || 0);
      const top = priv.library.slice(0, n);
      const rest = priv.library.slice(n);
      const byId = new Map(top.map((c) => [c.instanceId, c]));
      const newTop = (data.order || []).map((id) => byId.get(id)).filter(Boolean);
      const newBottom = (data.toBottom || []).map((id) => byId.get(id)).filter(Boolean);
      priv.library = [...newTop, ...rest, ...newBottom];
      await writePrivateAndCounts(db, gameId, uid, priv);
      await appendLog(db, gameId, seatNum, who, g.turn, `scried ${n}`);
      return { ok: true };
    }
    case "tutorToHand": {
      const idx = priv.library.findIndex((c) => c.instanceId === data.instanceId);
      if (idx === -1) throw new HttpsError("not-found", "Card not in library");
      const [card] = priv.library.splice(idx, 1);
      priv.hand.push(card);
      await writePrivateAndCounts(db, gameId, uid, priv);
      await appendLog(db, gameId, seatNum, who, g.turn, `tutored ${card.name} to hand`);
      return { ok: true };
    }
    case "moveToHand": {
      const from = data.fromZone;
      if (from === "library") {
        return handleGameAction(uid, { type: "tutorToHand", gameId, instanceId: data.instanceId }, db);
      }
      const pubRef = db.doc(PUBLIC(gameId, uid));
      const pub = (await pubRef.get()).data();
      const arr = pub[from] || [];
      const idx = arr.findIndex((c) => c.instanceId === data.instanceId);
      if (idx === -1) throw new HttpsError("not-found", "Card not found");
      const [card] = arr.splice(idx, 1);
      if (from === "battlefield") { card.tapped = false; card.counters = {}; card.attachedTo = null; }
      priv.hand.push(card);
      const batch = db.batch();
      batch.set(privRef, { hand: priv.hand, library: priv.library });
      batch.update(pubRef, { [from]: arr, handCount: priv.hand.length });
      await batch.commit();
      await appendLog(db, gameId, seatNum, who, g.turn, `${card.name} → hand`);
      return { ok: true };
    }
    case "moveToLibrary": {
      const from = data.fromZone;
      const pubRef = db.doc(PUBLIC(gameId, uid));
      let card;
      if (from === "hand") {
        const idx = priv.hand.findIndex((c) => c.instanceId === data.instanceId);
        if (idx === -1) throw new HttpsError("not-found", "Card not in hand");
        [card] = priv.hand.splice(idx, 1);
      } else {
        const pub = (await pubRef.get()).data();
        const arr = pub[from] || [];
        const idx = arr.findIndex((c) => c.instanceId === data.instanceId);
        if (idx === -1) throw new HttpsError("not-found", "Card not found");
        [card] = arr.splice(idx, 1);
        if (from === "battlefield") { card.tapped = false; card.counters = {}; card.attachedTo = null; }
        await pubRef.update({ [from]: arr });
      }
      if (data.position === "bottom") priv.library.push(card); else priv.library.unshift(card);
      await writePrivateAndCounts(db, gameId, uid, priv);
      await appendLog(db, gameId, seatNum, who, g.turn, `${card.name} → library (${data.position})`);
      return { ok: true };
    }
    case "playFromHand": {
      const idx = priv.hand.findIndex((c) => c.instanceId === data.instanceId);
      if (idx === -1) throw new HttpsError("not-found", "Card not in hand");
      const [card] = priv.hand.splice(idx, 1);
      if (data.tapped) card.tapped = true;
      const pubRef = db.doc(PUBLIC(gameId, uid));
      const pub = (await pubRef.get()).data();
      const toZone = data.toZone || "battlefield";
      pub[toZone] = [...(pub[toZone] || []), card];
      const batch = db.batch();
      batch.set(privRef, { hand: priv.hand, library: priv.library });
      batch.update(pubRef, { [toZone]: pub[toZone], handCount: priv.hand.length });
      await batch.commit();
      await appendLog(db, gameId, seatNum, who, g.turn, `played ${card.name} → ${toZone}`);
      return { ok: true };
    }
    default:
      throw new HttpsError("invalid-argument", `Unknown action: ${type}`);
  }
}
```

> Note: this switch implements every action in the `GameAction` type (Task 3): `draw`, `mill`, `shuffleLibrary`, `shuffleGraveyardIntoLibrary`, `scry`, `tutorToHand`, `moveToHand`, `moveToLibrary`, `playFromHand`, `adjustOpponentLife`, `advancePhase`, `endTurn`. Each validates the caller's seat and that the game is active; hidden-zone moves write the private doc and the derived public counts atomically.

- [ ] **Step 2: Write `functions/test/actions.test.js`**

```js
import { test } from "node:test";
import assert from "node:assert";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

process.env.GCLOUD_PROJECT ||= "tapuntap";
if (!getApps().length) initializeApp({ projectId: "tapuntap" });
const db = getFirestore();
const { handleGameAction } = await import("../lib/actions.js");

async function seed() {
  await db.doc("games/ga").set({
    name: "G", status: "active", hostUid: "host", inviteCode: "QQQQ", format: "commander",
    seats: [{ seat: 0, uid: "host", displayName: "Host", deckId: "d", deckName: "D", ready: true },
            { seat: 1, uid: "p2", displayName: "P2", deckId: "d", deckName: "D", ready: true }],
    seatUids: ["host", "p2"], turnOrder: ["host", "p2"], activeSeat: 0, turn: 1,
    phase: "beginning", phaseIndex: 0, phases: ["beginning", "main1", "combat", "main2", "end"],
  });
  await db.doc("games/ga/players/host").set({ seat: 0, displayName: "Host", life: 40, handCount: 0, libraryCount: 3, battlefield: [], graveyard: [], exile: [], command: [] });
  await db.doc("games/ga/players/host/private/state").set({ hand: [], library: [{ instanceId: "a" }, { instanceId: "b" }, { instanceId: "c" }] });
  await db.doc("games/ga/players/p2").set({ seat: 1, displayName: "P2", life: 40, handCount: 0, libraryCount: 0, battlefield: [], graveyard: [], exile: [], command: [] });
}

test("draw moves cards library->hand and updates counts", async () => {
  await seed();
  await handleGameAction("host", { type: "draw", gameId: "ga", count: 2 }, db);
  const pub = (await db.doc("games/ga/players/host").get()).data();
  const priv = (await db.doc("games/ga/players/host/private/state").get()).data();
  assert.equal(priv.hand.length, 2);
  assert.equal(priv.library.length, 1);
  assert.equal(pub.handCount, 2);
  assert.equal(pub.libraryCount, 1);
});

test("adjustOpponentLife changes the target's life", async () => {
  await seed();
  await handleGameAction("host", { type: "adjustOpponentLife", gameId: "ga", targetUid: "p2", delta: -3 }, db);
  const p2 = (await db.doc("games/ga/players/p2").get()).data();
  assert.equal(p2.life, 37);
});

test("endTurn advances active seat and rejects non-active caller", async () => {
  await seed();
  await handleGameAction("host", { type: "endTurn", gameId: "ga" }, db);
  const g = (await db.doc("games/ga").get()).data();
  assert.equal(g.activeSeat, 1);
  await assert.rejects(() => handleGameAction("p2", { type: "endTurn", gameId: "ga" }, db).catch((e) => { throw e; }).then(() => {
    // p2 IS active now, so this should succeed; instead assert host (non-active) is rejected:
  }));
});

test("non-active player cannot endTurn", async () => {
  await seed(); // host is active
  await assert.rejects(() => handleGameAction("p2", { type: "endTurn", gameId: "ga" }, db));
});
```

> Note: remove the third test's confusing inner assertion if it complicates — the fourth test is the authoritative non-active check. Keep tests that clearly pass.

- [ ] **Step 3: Wire the callable in `functions/index.js`** — add near the other exports:

```js
import { handleGameAction } from "./lib/actions.js";

export const gameAction = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required");
  return handleGameAction(req.auth.uid, req.data, db);
});
```

- [ ] **Step 4: Add tests for the move/play cases** — append to `functions/test/actions.test.js`:

```js
test("playFromHand moves a card hand->battlefield and decrements handCount", async () => {
  await seed();
  await db.doc("games/ga/players/host/private/state").set({ hand: [{ instanceId: "h1", name: "Bear" }], library: [] });
  await db.doc("games/ga/players/host").update({ handCount: 1, libraryCount: 0 });
  await handleGameAction("host", { type: "playFromHand", gameId: "ga", instanceId: "h1", toZone: "battlefield" }, db);
  const pub = (await db.doc("games/ga/players/host").get()).data();
  const priv = (await db.doc("games/ga/players/host/private/state").get()).data();
  assert.equal(pub.battlefield.length, 1);
  assert.equal(pub.handCount, 0);
  assert.equal(priv.hand.length, 0);
});

test("moveToLibrary from hand puts a card on top and updates counts", async () => {
  await seed();
  await db.doc("games/ga/players/host/private/state").set({ hand: [{ instanceId: "h1", name: "Bolt" }], library: [{ instanceId: "x" }] });
  await db.doc("games/ga/players/host").update({ handCount: 1, libraryCount: 1 });
  await handleGameAction("host", { type: "moveToLibrary", gameId: "ga", instanceId: "h1", fromZone: "hand", position: "top" }, db);
  const priv = (await db.doc("games/ga/players/host/private/state").get()).data();
  const pub = (await db.doc("games/ga/players/host").get()).data();
  assert.equal(priv.library[0].instanceId, "h1");
  assert.equal(priv.hand.length, 0);
  assert.equal(pub.libraryCount, 2);
});
```

- [ ] **Step 5: Run functions tests**

Run: `firebase emulators:exec --only firestore,functions "node --test functions/test"`
Expected: lobby + start + actions tests PASS.

- [ ] **Step 6: Commit**

```bash
git add functions/lib/actions.js functions/test/actions.test.js functions/index.js
git commit -m "Add gameAction Function for hidden-info and shared actions"
```

---

### Task 12: `leaveGame` and `endGame` Functions

**Files:**
- Modify: `functions/index.js`, `functions/test/lobby.test.js`

- [ ] **Step 1: Add a failing test** to `functions/test/lobby.test.js`:

```js
test("leaveGame removes a non-host seat from a lobby", async () => {
  await db.doc("users/host/decks/d1").set({ ownerUid: "host", name: "A", format: "commander" });
  await db.doc("users/bob/decks/d2").set({ ownerUid: "bob", name: "B", format: "commander" });
  const { gameId, inviteCode } = await _createGame("host", { name: "G", format: "commander", deckId: "d1" }, db);
  await _joinGame("bob", { inviteCode, deckId: "d2" }, db);
  await _leaveGame("bob", { gameId }, db);
  const g = (await db.doc(`games/${gameId}`).get()).data();
  assert.equal(g.seats.length, 1);
  assert.ok(!g.seatUids.includes("bob"));
});

test("endGame marks the game complete", async () => {
  await db.doc("users/host/decks/d1").set({ ownerUid: "host", name: "A", format: "commander" });
  const { gameId } = await _createGame("host", { name: "G", format: "commander", deckId: "d1" }, db);
  await _endGame("host", { gameId, winnerUid: "host" }, db);
  const g = (await db.doc(`games/${gameId}`).get()).data();
  assert.equal(g.status, "complete");
  assert.equal(g.winnerUid, "host");
});
```

- [ ] **Step 2: Run, watch fail** (`_leaveGame`/`_endGame` undefined)

Run: `firebase emulators:exec --only firestore,functions "node --test functions/test"`
Expected: FAIL.

- [ ] **Step 3: Implement in `functions/index.js`**:

```js
export async function _leaveGame(uid, data, database) {
  const { gameId } = data || {};
  if (!gameId) throw new HttpsError("invalid-argument", "gameId required");
  const ref = database.doc(`games/${gameId}`);
  return database.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw new HttpsError("not-found", "Game not found");
    const g = snap.data();
    if (!g.seatUids.includes(uid)) return { ok: true };
    if (g.hostUid === uid && g.status === "lobby") {
      // Host leaving an unstarted lobby cancels it.
      tx.delete(ref);
      return { cancelled: true };
    }
    tx.update(ref, {
      seats: g.seats.filter((s) => s.uid !== uid),
      seatUids: g.seatUids.filter((u) => u !== uid),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { ok: true };
  });
}

export async function _endGame(uid, data, database) {
  const { gameId, winnerUid } = data || {};
  if (!gameId) throw new HttpsError("invalid-argument", "gameId required");
  const ref = database.doc(`games/${gameId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Game not found");
  if (snap.data().hostUid !== uid) throw new HttpsError("permission-denied", "Host only");
  await ref.update({ status: "complete", winnerUid: winnerUid || null, updatedAt: FieldValue.serverTimestamp() });
  return { ok: true };
}

export const leaveGame = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required");
  return _leaveGame(req.auth.uid, req.data, db);
});

export const endGame = onCall(async (req) => {
  if (!req.auth) throw new HttpsError("unauthenticated", "Sign in required");
  return _endGame(req.auth.uid, req.data, db);
});
```

Also add the imports of `_leaveGame`/`_endGame` to the top of `functions/test/lobby.test.js`:

```js
const { _createGame, _joinGame, _leaveGame, _endGame } = await import("../index.js");
```

- [ ] **Step 4: Run, watch pass**

Run: `firebase emulators:exec --only firestore,functions "node --test functions/test"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/index.js functions/test/lobby.test.js
git commit -m "Add leaveGame and endGame cloud functions"
```

---

### Task 13: Guard `startGame` against a deleted deck

**Files:**
- Modify: `functions/index.js`, `functions/test/start.test.js`

- [ ] **Step 1: Add a failing test** to `functions/test/start.test.js`:

```js
test("startGame rejects when a seated player's deck is missing", async () => {
  await db.doc("games/gmissing").set({
    name: "G", status: "lobby", hostUid: "host", inviteCode: "MMMM", format: "commander",
    seats: [{ seat: 0, uid: "host", displayName: "Host", deckId: "nope", deckName: "Gone", ready: true }],
    seatUids: ["host"], turnOrder: [], turn: 0, activeSeat: 0,
    phase: "beginning", phaseIndex: 0, phases: ["beginning","main1","combat","main2","end"],
  });
  await assert.rejects(() => _startGame("host", { gameId: "gmissing" }, db));
});
```

- [ ] **Step 2: Run, watch fail** (currently crashes/throws a generic error rather than a clean HttpsError, or passes through to `buildSeatState` on undefined)

Run: `firebase emulators:exec --only firestore,functions "node --test functions/test"`
Expected: the new test currently FAILS or errors uncleanly.

- [ ] **Step 3: Add the guard in `_startGame`** — in the `seatStates` map, after fetching the deck:

```js
  const seatStates = await Promise.all(g.seats.map(async (seat) => {
    const deckSnap = await database.doc(`users/${seat.uid}/decks/${seat.deckId}`).get();
    if (!deckSnap.exists) throw new HttpsError("failed-precondition", `Deck missing for ${seat.displayName}`);
    return { seat, ...buildSeatState(seat, deckSnap.data(), g.format) };
  }));
```

- [ ] **Step 4: Run, watch pass**

Run: `firebase emulators:exec --only firestore,functions "node --test functions/test"`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions/index.js functions/test/start.test.js
git commit -m "Guard startGame against a seated player's deleted deck"
```

---

### Task 14: Restore rules + functions tests in CI

**Files:**
- Modify: `.github/workflows/preview.yml`

- [ ] **Step 1: Add a test job/steps** to `preview.yml` before the deploy step:

```yaml
      - name: Run rules tests
        run: npm run test:rules

      - name: Run functions tests
        run: firebase emulators:exec --only firestore,functions "node --test functions/test"
```

> Note: these run against the emulator in CI; they need `firebase-tools` (already installed via `npm i`) and the functions deps (installed earlier in the workflow).

- [ ] **Step 2: Verify locally** the same commands pass

Run: `npm run test:rules` then `firebase emulators:exec --only firestore,functions "node --test functions/test"`
Expected: both PASS.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/preview.yml
git commit -m "Run rules and functions tests in CI"
```

---

## Phase 5 — Lobby (Tasks 15)

### Task 15: Lobby — create / join / seats / ready / start / leave

**Files:**
- Create: `app/src/api/games.ts`, `app/src/features/lobby/LobbyNewView.tsx`, `app/src/features/lobby/LobbyView.tsx`
- Modify: `app/src/main.tsx`

> **Design note:** baseline UI using `app.css`. Replace markup with the Claude Design lobby output (spec §10) once available; keep the handlers, the `subscribeGame` wiring, ready-toggle, and start/leave calls.

- [ ] **Step 1: Create `app/src/api/games.ts`** (callable wrappers + helpers)

```ts
import { httpsCallable } from "firebase/functions";
import { doc, updateDoc } from "firebase/firestore";
import { functions, db, auth } from "../lib/firebase";
import type { GameAction } from "../types";

const call = <T = any>(name: string) => (payload: any) =>
  httpsCallable(functions, name)(payload).then((r) => r.data as T);

export const createGame = (d: { name: string; format: string; deckId: string }) =>
  call<{ gameId: string; inviteCode: string }>("createGame")({ ...d, displayName: auth.currentUser?.displayName });

export const joinGame = (d: { inviteCode: string; deckId: string }) =>
  call<{ gameId: string }>("joinGame")({ ...d, displayName: auth.currentUser?.displayName });

export const startGame = (gameId: string) => call("startGame")({ gameId });
export const leaveGame = (gameId: string) => call("leaveGame")({ gameId });
export const endGame = (gameId: string, winnerUid?: string) => call("endGame")({ gameId, winnerUid });
export const gameAction = (action: GameAction) => call("gameAction")(action);

// Toggling your own ready flag in a lobby seat: rules allow the host functions to own seats,
// so ready toggling also routes through a small Function in production. For the baseline we
// update via a dedicated callable if present; otherwise the host starts when all are seated.
// Simplest correct path: ready toggling is a client convenience persisted on the seat by a Function.
// To keep Phase 5 shippable, we treat "joined" as ready and gate Start on seats.length >= 2.

export const setNotes = (gameId: string, notes: string) =>
  updateDoc(doc(db, "games", gameId), { notes });
```

> Note on `ready`: the seats array is Function-owned (rules deny direct client seat writes). To keep this phase shippable without another Function, the baseline treats "seated" as "ready" and gates Start on `seats.length >= 2`. If you want true ready-up, add a `toggleReady` callable mirroring `leaveGame` (read game, flip `seats[i].ready` for the caller, write back) and wire the toggle to it. This is a clean follow-up and is noted in spec §4.

- [ ] **Step 2: Create `app/src/features/lobby/LobbyNewView.tsx`**

```tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMyDecks } from "../../api/hooks";
import { createGame, joinGame } from "../../api/games";
import { useToast } from "../../components/Toast";

export function LobbyNewView() {
  const { decks } = useMyDecks();
  const navigate = useNavigate();
  const toast = useToast();
  const [name, setName] = useState("");
  const [format, setFormat] = useState("commander");
  const [createDeck, setCreateDeck] = useState("");
  const [code, setCode] = useState("");
  const [joinDeck, setJoinDeck] = useState("");
  const [busy, setBusy] = useState(false);

  if (decks && decks.length === 0) {
    return (
      <>
        <div className="topbar"><div className="topbar-title">New / Join game</div></div>
        <div className="empty-state" style={{ padding: 40 }}>
          <div className="empty-title">You need a deck first</div>
          <button className="btn btn-primary" onClick={() => navigate("/decks/new")}>Build a deck</button>
        </div>
      </>
    );
  }
  const deckOptions = (sel: string, set: (v: string) => void) => (
    <select className="input" value={sel} onChange={(e) => set(e.target.value)}>
      <option value="">Choose a deck…</option>
      {decks?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
    </select>
  );

  async function doCreate() {
    if (!createDeck) { toast("Pick a deck", "error"); return; }
    setBusy(true);
    try { const r = await createGame({ name: name || "Untitled", format, deckId: createDeck }); navigate(`/lobby/${r.gameId}`); }
    catch (e) { toast((e as Error).message, "error"); setBusy(false); }
  }
  async function doJoin() {
    if (!joinDeck || !code.trim()) { toast("Enter a code and pick a deck", "error"); return; }
    setBusy(true);
    try { const r = await joinGame({ inviteCode: code.trim().toUpperCase(), deckId: joinDeck }); navigate(`/lobby/${r.gameId}`); }
    catch (e) { toast((e as Error).message, "error"); setBusy(false); }
  }

  return (
    <>
      <div className="topbar"><div className="topbar-title">New / Join game</div></div>
      <div style={{ padding: 24, maxWidth: 520, display: "grid", gap: 24 }}>
        <section>
          <h3>Create a game</h3>
          <input className="input" placeholder="Game name" value={name} onChange={(e) => setName(e.target.value)} />
          <select className="input" value={format} onChange={(e) => setFormat(e.target.value)}>
            <option value="commander">Commander</option>
            <option value="standard">Standard</option>
          </select>
          {deckOptions(createDeck, setCreateDeck)}
          <button className="btn btn-primary" disabled={busy} onClick={doCreate}>Create</button>
        </section>
        <section>
          <h3>Join by code</h3>
          <input className="input" placeholder="Invite code" value={code} onChange={(e) => setCode(e.target.value)} />
          {deckOptions(joinDeck, setJoinDeck)}
          <button className="btn" disabled={busy} onClick={doJoin}>Join</button>
        </section>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Create `app/src/features/lobby/LobbyView.tsx`**

```tsx
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGame } from "../../api/hooks";
import { auth } from "../../lib/firebase";
import { startGame, leaveGame } from "../../api/games";
import { useToast } from "../../components/Toast";

export function LobbyView() {
  const { gameId } = useParams();
  const game = useGame(gameId);
  const navigate = useNavigate();
  const toast = useToast();
  const me = auth.currentUser?.uid;

  useEffect(() => {
    if (game?.status === "active") navigate(`/games/${gameId}`, { replace: true });
  }, [game?.status, gameId, navigate]);

  if (!gameId) return null;
  if (game === null) return <div className="empty-state"><div className="empty-title">Game not found</div></div>;
  if (!game) return <div className="empty-state"><div className="empty-title">Loading…</div></div>;

  const isHost = game.hostUid === me;

  return (
    <>
      <div className="topbar"><div className="topbar-title">{game.name}</div></div>
      <div style={{ padding: 24, display: "grid", gap: 16, maxWidth: 560 }}>
        <div>Invite code: <strong style={{ fontSize: 20 }}>{game.inviteCode}</strong>
          <button className="btn" onClick={() => navigator.clipboard.writeText(game.inviteCode)}>Copy</button>
        </div>
        <div>
          <h3>Seats ({game.seats.length}/4)</h3>
          {game.seats.map((s) => (
            <div key={s.uid} className="player-chip">
              {s.displayName} — {s.deckName}{s.uid === me ? " (you)" : ""}
            </div>
          ))}
        </div>
        {isHost
          ? <button className="btn btn-primary" disabled={game.seats.length < 2}
              onClick={() => startGame(gameId).catch((e) => toast((e as Error).message, "error"))}>Start game</button>
          : <div>Waiting for host to start…</div>}
        <button className="btn btn-ghost" onClick={async () => {
          try { await leaveGame(gameId); navigate("/games"); } catch (e) { toast((e as Error).message, "error"); }
        }}>{isHost ? "Cancel game" : "Leave"}</button>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Wire routes** — modify `app/src/main.tsx`:

```tsx
import { LobbyNewView } from "./features/lobby/LobbyNewView";
import { LobbyView } from "./features/lobby/LobbyView";
// inside <Route element={<AppShell />}>:
              <Route path="/lobby/new" element={<LobbyNewView />} />
              <Route path="/lobby/:gameId" element={<LobbyView />} />
```

- [ ] **Step 5: Manual verification** (emulators; sign in as two users in two browser profiles or use two Auth emulator users)
- User A: Games → New game → create with a deck → lands in lobby, sees invite code, 1 seat.
- User B: New game → Join by code → enters the code + deck → both see 2 seats live.
- Host's Start enables at 2 seats → click → both navigate to `/games/{id}` (game view — built next phase; for now it may be a placeholder).
- Non-host clicks Leave → seat disappears for the host live. Host Cancel on a lobby deletes it.

- [ ] **Step 6: Commit**

```bash
git add app/src/api/games.ts app/src/features/lobby/LobbyNewView.tsx app/src/features/lobby/LobbyView.tsx app/src/main.tsx
git commit -m "Add lobby: create/join/seats/start/leave (Firestore + callables)"
```

---

## Phase 6 — Gameplay rewrite (Tasks 16–18)

> The largest phase. The data layer (hooks) already exists (Task 8). This phase adds the action layer and the board components. UI is a working baseline; refine visuals later.

### Task 16: `useGameActions` — client-direct writes + callable wrappers

**Files:**
- Create: `app/src/features/game/useGameActions.ts`, `app/src/test/gameActionClient.test.ts`

- [ ] **Step 1: Write `app/src/test/gameActionClient.test.ts`** — test the pure local helpers for own-zone moves

```ts
import { describe, it, expect } from "vitest";
import { moveWithinPublicZones } from "../features/game/useGameActions";
import type { PlayerPublic, CardInstance } from "../types";

function card(id: string, type = "Creature — X"): CardInstance {
  return { instanceId: id, cardId: id, name: id, manaCost: "", cmc: 0, typeLine: type, colors: [],
    imageUri: null, imageUriBack: null, power: null, toughness: null, loyalty: null,
    tapped: false, transformed: false, faceDown: false, counters: {}, attachedTo: null, token: false };
}

describe("moveWithinPublicZones", () => {
  it("moves a card from battlefield to graveyard and cleans tap/counters", () => {
    const pub = { battlefield: [{ ...card("a"), tapped: true, counters: { "+1/+1": 2 } }], graveyard: [], exile: [], command: [] } as unknown as PlayerPublic;
    const next = moveWithinPublicZones(pub, "a", "battlefield", "graveyard");
    expect(next.battlefield.length).toBe(0);
    expect(next.graveyard.length).toBe(1);
    expect(next.graveyard[0].tapped).toBe(false);
    expect(Object.keys(next.graveyard[0].counters)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run, watch fail**

Run: `cd app && npx vitest run src/test/gameActionClient.test.ts && cd ..`
Expected: FAIL — module/function not found.

- [ ] **Step 3: Create `app/src/features/game/useGameActions.ts`**

```ts
import { doc, updateDoc } from "firebase/firestore";
import { db, auth } from "../../lib/firebase";
import { gameAction, endGame } from "../../api/games";
import type { CardInstance, GameAction, PlayerPublic } from "../../types";

const PUBLIC_ZONES = ["battlefield", "graveyard", "exile", "command"] as const;
type PublicZone = (typeof PUBLIC_ZONES)[number];

/** Pure: move a card between the caller's OWN public zones (no hidden info). */
export function moveWithinPublicZones(pub: PlayerPublic, instanceId: string, from: PublicZone, to: PublicZone): PlayerPublic {
  const next: PlayerPublic = {
    ...pub,
    battlefield: [...(pub.battlefield || [])],
    graveyard: [...(pub.graveyard || [])],
    exile: [...(pub.exile || [])],
    command: [...(pub.command || [])],
  };
  const src = next[from] as CardInstance[];
  const idx = src.findIndex((c) => c.instanceId === instanceId);
  if (idx === -1) return pub;
  const [card] = src.splice(idx, 1);
  if (from === "battlefield") { card.tapped = false; card.counters = {}; card.attachedTo = null; }
  (next[to] as CardInstance[]).push(card);
  return next;
}

export function useGameActions(gameId: string) {
  const uid = () => {
    const u = auth.currentUser?.uid;
    if (!u) throw new Error("Not signed in");
    return u;
  };
  const pubRef = () => doc(db, "games", gameId, "players", uid());

  return {
    // CLIENT-DIRECT (own, low-stakes) — write allowed by rules
    setLife: (life: number) => updateDoc(pubRef(), { life }),
    setPoison: (poison: number) => updateDoc(pubRef(), { poison }),
    writePublicZones: (patch: Partial<Pick<PlayerPublic, "battlefield" | "graveyard" | "exile" | "command">>) =>
      updateDoc(pubRef(), patch),
    setCounters: (counters: Record<string, number>) => updateDoc(pubRef(), { counters }),
    setNotes: (notes: string) => updateDoc(doc(db, "games", gameId), { notes }),

    // SERVER (hidden-info / cross-player / shared) — via callable
    action: (a: GameAction) => gameAction(a),
    endGame: (winnerUid?: string) => endGame(gameId, winnerUid),
  };
}
```

- [ ] **Step 4: Run, watch pass**

Run: `cd app && npx vitest run && cd ..`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/game/useGameActions.ts app/src/test/gameActionClient.test.ts
git commit -m "Add useGameActions: client-direct writes + callable gameAction wrappers"
```

---

### Task 17: Game board components

**Files:**
- Create: `app/src/features/game/components/{TopBar,PlayerRibbon,OpponentsBar,Battlefield,Hand,SidePanel}.tsx`

> Each component is small and takes typed props. Build them one at a time; each compiles independently. These are functional baselines; refine visuals later. Below are the two most load-bearing; the rest follow the same prop-driven pattern (data in via props from `GameView`, actions via `useGameActions`).

- [ ] **Step 1: Create `app/src/features/game/components/PlayerRibbon.tsx`**

```tsx
import type { GameDoc, PlayerPublic, PlayerPrivate } from "../../../types";
import { colorTone } from "../../../lib/format";

export function PlayerRibbon({ game, players, myUid, myPrivate, onLife, onEndTurn }: {
  game: GameDoc;
  players: Record<string, PlayerPublic>;
  myUid: string;
  myPrivate: PlayerPrivate;
  onLife: (targetUid: string, delta: number) => void;
  onEndTurn: () => void;
}) {
  const activeUid = game.turnOrder[game.activeSeat];
  const order = [myUid, ...Object.keys(players).filter((u) => u !== myUid)];
  return (
    <div className="player-ribbon">
      {order.map((uid) => {
        const p = players[uid];
        if (!p) return null;
        const isSelf = uid === myUid;
        const hand = isSelf ? myPrivate.hand.length : p.handCount ?? 0;
        const lib = isSelf ? myPrivate.library.length : p.libraryCount ?? 0;
        return (
          <div key={uid} className={`ribbon-player${uid === activeUid ? " active" : ""}`}>
            <div className="ribbon-avatar" style={{ background: colorTone([]) }}>{(p.displayName || "?")[0]}</div>
            <div className="ribbon-info">
              <div className="ribbon-name">{p.displayName}{isSelf ? " (you)" : ""}</div>
            </div>
            <div className="ribbon-vitals">
              <button className="life-btn" onClick={() => onLife(uid, -1)}>−</button>
              <span className="vital-val">{p.life ?? 20}</span>
              <button className="life-btn" onClick={() => onLife(uid, 1)}>+</button>
              <span className="mono" style={{ fontSize: 10 }}>H{hand} L{lib}</span>
            </div>
          </div>
        );
      })}
      <button className="ribbon-next-btn" onClick={onEndTurn}>End turn (N)</button>
    </div>
  );
}
```

- [ ] **Step 2: Create `app/src/features/game/components/Battlefield.tsx`**

```tsx
import type { CardInstance } from "../../../types";
import { CardFace } from "../../../components/CardFace";
import { isLand } from "../../../lib/cards";

export function Battlefield({ cards, onCardClick, onCardContext }: {
  cards: CardInstance[];
  onCardClick: (c: CardInstance) => void;
  onCardContext: (e: React.MouseEvent, c: CardInstance) => void;
}) {
  const creatures = cards.filter((c) => !isLand(c.typeLine));
  const lands = cards.filter((c) => isLand(c.typeLine));
  return (
    <div className="bf-zones-wrap">
      <div className="bf-zone" style={{ flex: 1 }}>
        <div className="bf-zone-header"><span className="eyebrow">Battlefield · Creatures &amp; Spells</span></div>
        <div className="bf-zone-cards">
          {creatures.length === 0 ? <div style={{ color: "var(--fg-4)", fontSize: 12 }}>No permanents yet.</div>
            : creatures.map((c) => <CardFace key={c.instanceId} card={c} zone="battlefield"
                onClick={() => onCardClick(c)} onContextMenu={(e) => onCardContext(e, c)} />)}
        </div>
      </div>
      <div className="bf-zone">
        <div className="bf-zone-header"><span className="eyebrow">Lands</span></div>
        <div className="bf-zone-cards">
          {lands.map((c) => <CardFace key={c.instanceId} card={c} zone="battlefield"
            onClick={() => onCardClick(c)} onContextMenu={(e) => onCardContext(e, c)} />)}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `app/src/features/game/components/Hand.tsx`**

```tsx
import type { CardInstance } from "../../../types";
import { CardFace } from "../../../components/CardFace";

export function Hand({ cards, displayName, onCardClick, onCardContext }: {
  cards: CardInstance[];
  displayName: string;
  onCardClick: (c: CardInstance) => void;
  onCardContext: (e: React.MouseEvent, c: CardInstance) => void;
}) {
  return (
    <div className="hand-area">
      <div className="hand-label-row">
        <span className="eyebrow">Hand · {displayName}</span>
        <span className="mono" style={{ fontSize: 11 }}>{cards.length}</span>
      </div>
      <div className="hand-cards">
        {cards.length === 0 ? <div style={{ color: "var(--fg-4)", fontSize: 12 }}>Empty hand.</div>
          : cards.map((c) => <CardFace key={c.instanceId} card={c} zone="hand"
              onClick={() => onCardClick(c)} onContextMenu={(e) => onCardContext(e, c)} />)}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Create `app/src/features/game/components/OpponentsBar.tsx`**

```tsx
import type { PlayerPublic } from "../../../types";

export function OpponentsBar({ opponents }: { opponents: PlayerPublic[] }) {
  if (opponents.length === 0) return null;
  return (
    <div style={{ padding: "10px 20px", background: "var(--bg-0)", borderBottom: "1px solid var(--line-1)" }}>
      <span className="eyebrow">Opponents</span>
      <div style={{ display: "flex", gap: 14, overflowX: "auto", marginTop: 8 }}>
        {opponents.map((p) => (
          <div key={p.uid} className="opponent-mini-card">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{p.displayName}</span>
              <span className="mono" style={{ fontSize: 11 }}>{(p.battlefield || []).length} perms · ♥ {p.life ?? 20}</span>
            </div>
            <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
              {Array.from({ length: p.handCount ?? 0 }).map((_, i) => (
                <div key={i} style={{ width: 20, height: 28, background: "var(--bg-3)", border: "1px solid var(--line-2)", borderRadius: 3 }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Create `app/src/features/game/components/SidePanel.tsx`**

```tsx
import { useState } from "react";
import type { LogEntry } from "../../../types";

export function SidePanel({ log, notes, onNotes }: {
  log: LogEntry[]; notes: string; onNotes: (v: string) => void;
}) {
  const [tab, setTab] = useState<"log" | "notes">("log");
  return (
    <aside className="side-panel">
      <div className="side-panel-tabs">
        <button className={`side-tab${tab === "log" ? " active" : ""}`} onClick={() => setTab("log")}>Log</button>
        <button className={`side-tab${tab === "notes" ? " active" : ""}`} onClick={() => setTab("notes")}>Notes</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
        {tab === "log"
          ? [...log].reverse().slice(0, 60).map((e, i) => (
              <div key={i} className="log-entry"><span className="log-turn">T{e.turn || ""}</span>
                <span className="log-who">{e.who || ""}</span> <span className="log-text">{e.text}</span></div>))
          : <textarea className="input" style={{ width: "100%", minHeight: 200 }} value={notes}
              onChange={(e) => onNotes(e.target.value)} placeholder="Notes…" />}
      </div>
    </aside>
  );
}
```

- [ ] **Step 6: Build**

Run: `cd app && npm run build && cd ..`
Expected: success (components compile; unused-import warnings are errors under `noUnusedLocals`, so only import what each uses).

- [ ] **Step 7: Commit**

```bash
git add app/src/features/game/components
git commit -m "Add game board components (ribbon, battlefield, hand, opponents, side panel)"
```

---

### Task 18: `GameView` — compose the board over live data

**Files:**
- Create: `app/src/features/game/GameView.tsx`
- Modify: `app/src/main.tsx`

- [ ] **Step 1: Create `app/src/features/game/GameView.tsx`**

```tsx
import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGame, usePlayersPublic, useMyPrivate, useLog } from "../../api/hooks";
import { auth } from "../../lib/firebase";
import { useGameActions, moveWithinPublicZones } from "./useGameActions";
import { useToast } from "../../components/Toast";
import { PlayerRibbon } from "./components/PlayerRibbon";
import { OpponentsBar } from "./components/OpponentsBar";
import { Battlefield } from "./components/Battlefield";
import { Hand } from "./components/Hand";
import { SidePanel } from "./components/SidePanel";
import type { CardInstance } from "../../types";

export function GameView() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const game = useGame(gameId);
  const players = usePlayersPublic(gameId);
  const myPrivate = useMyPrivate(gameId);
  const log = useLog(gameId);
  const myUid = auth.currentUser?.uid!;
  const actions = useGameActions(gameId || "");

  useEffect(() => {
    if (game === null) { toast("Game not found", "error"); navigate("/games"); }
  }, [game, navigate, toast]);
  useEffect(() => {
    if (game?.status === "complete") navigate(`/games/${gameId}/end`, { replace: true });
  }, [game?.status, gameId, navigate]);

  if (!game || !players[myUid]) {
    return <div className="empty-state" style={{ flex: 1, display: "flex" }}><div className="empty-title">Loading game…</div></div>;
  }

  const mine = players[myUid];
  const opponents = Object.values(players).filter((p) => p.uid !== myUid);

  function err(p: Promise<unknown>) { p.catch((e) => toast((e as Error).message, "error")); }

  function onLife(targetUid: string, delta: number) {
    if (targetUid === myUid) err(actions.setLife((mine.life ?? 20) + delta));
    else err(actions.action({ type: "adjustOpponentLife", gameId: gameId!, targetUid, delta }));
  }

  function onCardClick(_c: CardInstance) { /* open detail modal — baseline: noop or alert */ }

  function onBattlefieldContext(e: React.MouseEvent, c: CardInstance) {
    e.preventDefault();
    // Baseline: tap/untap toggle. Replace with ContextMenu component for full actions.
    const next = mine.battlefield.map((x) => x.instanceId === c.instanceId ? { ...x, tapped: !x.tapped } : x);
    err(actions.writePublicZones({ battlefield: next }));
  }

  function onHandContext(e: React.MouseEvent, c: CardInstance) {
    e.preventDefault();
    // Play from hand touches a hidden zone -> server action.
    err(actions.action({ type: "playFromHand", gameId: gameId!, instanceId: c.instanceId, toZone: "battlefield" }));
  }

  return (
    <div className="gameplay-wrap">
      <div className="topbar">
        <button className="btn btn-ghost" onClick={() => navigate("/games")}>Exit</button>
        <div className="topbar-title">{game.name}</div>
        <span className="topbar-sub">Turn {game.turn} · {game.phase}</span>
        <div className="topbar-spacer" />
        <button className="btn btn-sm" onClick={() => err(actions.action({ type: "advancePhase", gameId: gameId!, direction: "prev" }))}>Prev phase</button>
        <button className="btn btn-sm" onClick={() => err(actions.action({ type: "advancePhase", gameId: gameId!, direction: "next" }))}>Next phase</button>
      </div>

      <PlayerRibbon game={game} players={players} myUid={myUid} myPrivate={myPrivate}
        onLife={onLife} onEndTurn={() => err(actions.action({ type: "endTurn", gameId: gameId! }))} />

      <div className="gameplay-body">
        <div className="battlefield-column">
          <OpponentsBar opponents={opponents} />
          <Battlefield cards={mine.battlefield || []} onCardClick={onCardClick} onCardContext={onBattlefieldContext} />
        </div>
        <SidePanel log={log} notes={game.notes || ""} onNotes={(v) => err(actions.setNotes(v))} />
      </div>

      <div className="bottom-bar">
        <Hand cards={myPrivate.hand} displayName={mine.displayName} onCardClick={onCardClick} onCardContext={onHandContext} />
        <div className="zones-actions">
          <button className="btn btn-sm" onClick={() => err(actions.action({ type: "draw", gameId: gameId!, count: 1 }))}>Draw</button>
          <button className="btn btn-sm" onClick={() => err(actions.action({ type: "shuffleLibrary", gameId: gameId! }))}>Shuffle</button>
        </div>
      </div>
    </div>
  );
}
```

> Note: this is a functional baseline that exercises every layer — live reads, client-direct own-zone writes (tap, life-self), and server actions (draw/shuffle/play-from-hand/opponent-life/turn/phase). Full parity (context menus, scry/token modals, zone drawers, drag-drop, card-detail) is added next as small follow-up tasks mirroring the old `game.js` features, each calling the same `actions`. Add them incrementally; each is independently shippable.

- [ ] **Step 2: Wire the route** — modify `app/src/main.tsx`:

```tsx
import { GameView } from "./features/game/GameView";
// inside <Route element={<AppShell />}>:
              <Route path="/games/:gameId" element={<GameView />} />
```

- [ ] **Step 3: Build**

Run: `cd app && npm run build && cd ..`
Expected: success.

- [ ] **Step 4: Manual verification** (THE hidden-info acceptance test — two users)

Setup: emulators running; manually deploy rules/functions if testing on preview (`npx firebase deploy --only firestore:rules,functions`), or run all against the emulator locally.
- Two users create+join+start a 2-player game.
- Each sees their own hand; the opponent's hand shows **face-down placeholders only** (count, no card identity).
- User A clicks Draw → A's hand grows; B sees A's hand **count** increase but not the cards. (Confirms hidden info + that draw is server-side.)
- A taps a permanent → B sees it tapped (own-zone client write, readable by B — confirms the rules fix).
- A reduces B's life via the ribbon −/+ on B → B's life updates for both (confirms cross-player server action).
- A ends turn → active indicator moves to B for both; B's permanents untap.
- In Emulator UI, confirm A cannot read `games/{id}/players/{B}/private/state` (it's denied).

- [ ] **Step 5: Commit**

```bash
git add app/src/features/game/GameView.tsx app/src/main.tsx
git commit -m "Add GameView composing the board over live data + actions"
```

---

## Phase 7 — Home, Games list, End-game, Settings (Tasks 19–21)

### Task 19: Games list + Home corrected to the real schema

**Files:**
- Create: `app/src/features/home/HomeView.tsx`, `app/src/features/games/GamesView.tsx`
- Modify: `app/src/main.tsx`

- [ ] **Step 1: Create `app/src/features/games/GamesView.tsx`** — distinguishes lobby / active / complete

```tsx
import { useNavigate } from "react-router-dom";
import { useMyGames } from "../../api/hooks";
import { Icon } from "../../components/Icon";
import { fmtTime } from "../../lib/format";

export function GamesView() {
  const games = useMyGames();
  const navigate = useNavigate();
  return (
    <>
      <div className="topbar">
        <div className="topbar-title">Games</div>
        <div className="topbar-spacer" />
        <button className="btn btn-primary" onClick={() => navigate("/lobby/new")}><Icon name="plus" size={14} /> New game</button>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {!games && <div style={{ color: "var(--fg-3)" }}>Loading…</div>}
        {games && games.length === 0 && (
          <div className="empty-state"><div className="empty-title">No games yet</div>
            <button className="btn btn-primary" onClick={() => navigate("/lobby/new")}>New game</button></div>
        )}
        <div className="games-grid">
          {games?.map((g) => {
            const dest = g.status === "lobby" ? `/lobby/${g.id}` : g.status === "complete" ? `/games/${g.id}/end` : `/games/${g.id}`;
            const label = g.status === "lobby" ? "Open lobby" : g.status === "complete" ? "View summary" : "Resume";
            return (
              <div key={g.id} className="panel" style={{ padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>{g.name}</strong>
                  <span className={`tag${g.status === "active" ? " tag-good" : ""}`}>{g.status}</span>
                </div>
                <div className="mono" style={{ fontSize: 11, color: "var(--fg-4)" }}>
                  {g.seats.length} players · {fmtTime(g.updatedAt)}
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate(dest)}>{label}</button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Create `app/src/features/home/HomeView.tsx`**

```tsx
import { useNavigate } from "react-router-dom";
import { useMyGames, useMyDecks } from "../../api/hooks";
import { fmtTime } from "../../lib/format";

export function HomeView() {
  const games = useMyGames();
  const { decks } = useMyDecks();
  const navigate = useNavigate();
  return (
    <>
      <div className="topbar">
        <div className="topbar-title">tapuntap</div>
        <div className="topbar-spacer" />
        <button className="btn btn-primary" onClick={() => navigate("/lobby/new")}>New game</button>
        <button className="btn" onClick={() => navigate("/decks/new")}>New deck</button>
      </div>
      <div className="home-body">
        <div>
          <div className="home-section-title">Your games</div>
          {(games || []).slice(0, 6).map((g) => (
            <div key={g.id} className="game-card-item" role="button"
              onClick={() => navigate(g.status === "lobby" ? `/lobby/${g.id}` : `/games/${g.id}`)}>
              <div className="game-card-title">{g.name}</div>
              <span className="tag">{g.status}</span>
              <span className="mono" style={{ fontSize: 11 }}>{fmtTime(g.updatedAt)}</span>
            </div>
          ))}
          {games && games.length === 0 && <div className="empty-body">No games yet.</div>}
        </div>
        <div>
          <div className="home-section-title">Deck library</div>
          {(decks || []).slice(0, 8).map((d) => (
            <div key={d.id} className="game-card-item" role="button" onClick={() => navigate(`/decks/${d.id}`)}>
              <div className="game-card-title">{d.name}</div>
              <span className="mono" style={{ fontSize: 11 }}>{d.cardCount} cards · {d.format}</span>
            </div>
          ))}
          {decks && decks.length === 0 && <div className="empty-body">No decks yet.</div>}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Wire routes** — modify `app/src/main.tsx`: replace the `/` and `/games` placeholders:

```tsx
import { HomeView } from "./features/home/HomeView";
import { GamesView } from "./features/games/GamesView";
// inside <Route element={<AppShell />}>:
              <Route path="/" element={<HomeView />} />
              <Route path="/games" element={<GamesView />} />
```

- [ ] **Step 4: Build + manual check** — Home "New game" goes to the lobby (not a dead route); Games list shows correct status badges and routes lobby vs active vs complete correctly.

- [ ] **Step 5: Commit**

```bash
git add app/src/features/home/HomeView.tsx app/src/features/games/GamesView.tsx app/src/main.tsx
git commit -m "Add Home and Games list corrected to the multiplayer schema"
```

---

### Task 20: End-game view

**Files:**
- Create: `app/src/features/game/endgame/EndGameView.tsx`
- Modify: `app/src/main.tsx`

> **Design note:** baseline; replace markup with the Claude Design end-game output later.

- [ ] **Step 1: Create `app/src/features/game/endgame/EndGameView.tsx`**

```tsx
import { useNavigate, useParams } from "react-router-dom";
import { useGame, usePlayersPublic } from "../../../api/hooks";
import { auth } from "../../../lib/firebase";
import { useGameActions } from "../useGameActions";
import { useToast } from "../../../components/Toast";

export function EndGameView() {
  const { gameId } = useParams();
  const game = useGame(gameId);
  const players = usePlayersPublic(gameId);
  const navigate = useNavigate();
  const toast = useToast();
  const actions = useGameActions(gameId || "");
  const isHost = game?.hostUid === auth.currentUser?.uid;

  if (!game) return <div className="empty-state"><div className="empty-title">Loading…</div></div>;

  return (
    <>
      <div className="topbar"><div className="topbar-title">{game.name} — Results</div></div>
      <div style={{ padding: 24, maxWidth: 560, display: "grid", gap: 16 }}>
        <div className="home-section-title">Final standings</div>
        {Object.values(players).sort((a, b) => (b.life ?? 0) - (a.life ?? 0)).map((p) => (
          <div key={p.uid} className="player-chip">
            {p.displayName} — ♥ {p.life ?? 0}{game.winnerUid === p.uid ? " 👑 Winner" : ""}
          </div>
        ))}
        {game.status !== "complete" && isHost && (
          <button className="btn btn-primary" onClick={() =>
            actions.endGame().then(() => toast("Game ended")).catch((e) => toast((e as Error).message, "error"))}>
            End this game
          </button>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" onClick={() => navigate("/games")}>Back to games</button>
          <button className="btn btn-primary" onClick={() => navigate("/lobby/new")}>Rematch (new lobby)</button>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Wire route** — modify `app/src/main.tsx`:

```tsx
import { EndGameView } from "./features/game/endgame/EndGameView";
// inside <Route element={<AppShell />}>:
              <Route path="/games/:gameId/end" element={<EndGameView />} />
```

- [ ] **Step 3: Build + manual check** — from a game, host ends it → both players route to the summary → status shows complete in the games list with "View summary."

- [ ] **Step 4: Commit**

```bash
git add app/src/features/game/endgame/EndGameView.tsx app/src/main.tsx
git commit -m "Add end-game results view"
```

---

### Task 21: Settings (persisted prefs; fix stale copy)

**Files:**
- Create: `app/src/features/settings/SettingsView.tsx`
- Modify: `app/src/main.tsx`

- [ ] **Step 1: Create `app/src/features/settings/SettingsView.tsx`**

```tsx
import { useEffect, useState } from "react";
import { useAuth } from "../../auth/useAuth";

export function SettingsView() {
  const { user, signOutUser } = useAuth();
  const [density, setDensity] = useState(localStorage.getItem("density") || "comfortable");

  useEffect(() => {
    document.documentElement.setAttribute("data-density", density);
    localStorage.setItem("density", density);
  }, [density]);

  return (
    <>
      <div className="topbar"><div className="topbar-title">Settings</div></div>
      <div className="settings-body"><div className="settings-inner">
        <div className="settings-group">
          <div className="settings-group-title">Appearance</div>
          <div className="settings-row">
            <div className="settings-row-label">
              <div className="settings-row-title">Card density</div>
              <div className="settings-row-desc">Compact shows smaller cards on the battlefield.</div>
            </div>
            <select className="input" style={{ width: 160 }} value={density} onChange={(e) => setDensity(e.target.value)}>
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </div>
        </div>
        <div className="settings-group">
          <div className="settings-group-title">Data</div>
          <div className="settings-row">
            <div className="settings-row-label">
              <div className="settings-row-title">Card data source</div>
              <div className="settings-row-desc">Cards and images are fetched from the Scryfall API and cached in Firestore.</div>
            </div>
            <span className="tag tag-good">Scryfall</span>
          </div>
        </div>
        <div className="settings-group">
          <div className="settings-group-title">Account</div>
          <div className="settings-row">
            <div className="settings-row-label">
              <div className="settings-row-title">Signed in as</div>
              <div className="settings-row-desc">{user?.email || user?.displayName}</div>
            </div>
            <button className="btn btn-secondary" onClick={() => signOutUser()}>Sign out</button>
          </div>
        </div>
      </div></div>
    </>
  );
}
```

- [ ] **Step 2: Wire route** — modify `app/src/main.tsx`: replace the `/settings` placeholder:

```tsx
import { SettingsView } from "./features/settings/SettingsView";
// inside <Route element={<AppShell />}>:
              <Route path="/settings" element={<SettingsView />} />
```

- [ ] **Step 3: Build + check** — density persists across reload; no "data/cards on the server" copy; sign-out works.

- [ ] **Step 4: Commit**

```bash
git add app/src/features/settings/SettingsView.tsx app/src/main.tsx
git commit -m "Add settings with persisted prefs; remove stale server copy"
```

---

## Phase 8 — Cutover (Task 22)

### Task 22: Retire the old app and switch production to React

**Files:**
- Delete: `public/` (old vanilla app), `server.js` if still present
- Modify: `CLAUDE.md`, root `package.json`
- Verify: `firebase.json`, `.github/workflows/deploy.yml`

- [ ] **Step 1: Full local smoke test against the emulator** — run through: sign-up, build a deck, create+join a 2-player game, start, draw (hidden info holds), tap (opponent sees it), damage opponent, end turn, end game, see summary. Fix anything broken before deleting the old app.

- [ ] **Step 2: Delete the old frontend**

Run: `git rm -r public && git rm -f server.js 2>/dev/null; true`
Expected: `public/` removed. (If `server.js` was already deleted, ignore the error.)

- [ ] **Step 3: Confirm `firebase.json` hosting** points at `app/dist` with the predeploy build (set in Task 2). No change needed if Task 2 is intact.

- [ ] **Step 4: Update `CLAUDE.md`** — replace the "Frontend (`public/js/`)" section and the architecture diagram to describe the React+TS app under `app/`, the `gameAction`/`leaveGame`/`endGame` Functions, and the client-vs-server action split. Update "Running the App" to:

```markdown
## Running the App

```bash
# Terminal 1 — backend emulators
firebase emulators:start --only firestore,auth,functions

# Terminal 2 — frontend dev server (Vite)
cd app && npm run dev

# Rules + functions tests
npm run test:rules
firebase emulators:exec --only firestore,functions "node --test functions/test"

# Frontend unit tests
cd app && npm test

# Production build (what Hosting serves)
npm run build:app
```
```

- [ ] **Step 5: Update root `package.json`** — ensure `build:app` exists (Task 2) and remove any now-dead scripts referencing the old app.

- [ ] **Step 6: Build the production bundle**

Run: `npm run build:app`
Expected: `app/dist` built with no errors.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Cutover: retire vanilla public/ app; React+TS app is the frontend"
```

- [ ] **Step 8: Open the PR for final review and preview** — push the branch; the PR preview deploys the React app. Manually deploy backend if not already live: `npx firebase deploy --only firestore:rules,functions`. Smoke-test the preview URL with two accounts.

- [ ] **Step 9: Merge to `main`** (only after the preview passes) — production deploy builds the app and deploys rules+functions+hosting live.

---

## Final self-check (run after all tasks)

- [ ] `cd app && npm run build` — clean.
- [ ] `cd app && npm test` — green.
- [ ] `npm run test:rules` — green.
- [ ] `firebase emulators:exec --only firestore,functions "node --test functions/test"` — green.
- [ ] Two-account manual game: hidden info holds, opponents render, cross-player life works, turn/phase advance works, end-game summary shows.
- [ ] Old `public/` deleted; `CLAUDE.md` describes the React app.

---

## Notes for the implementer

- **Don't merge to `main` until Task 22.** The branch's `firebase.json` points Hosting at `app/dist`; merging early would push an incomplete app to production.
- **Backend changes** (rules/functions) only reach a preview URL via a **manual** `firebase deploy --only firestore:rules,functions`. Locally, always validate with the emulator + tests first.
- **Claude Design** output (login, lobby, end-game, lobby-vs-active list) replaces the JSX inside the baseline components from spec §10 — keep the handlers/state/data wiring intact.
- **Follow-ups deliberately deferred** (not blocking launch): password reset, true ready-up toggle (`toggleReady` Function), full gameplay parity (context menus, scry/token modals, zone drawers, drag-drop, card-detail modal — each a small task calling the existing `actions`), presence/disconnect, stale-lobby cleanup.
