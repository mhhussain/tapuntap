# Migration scripts

## migrate-decks.mjs

One-time import of `data/decks/*.json` into Firestore at
`users/{TARGET_UID}/decks/{deckId}` (+ `versions/{n}`). Idempotent — uses `set`, so
re-running overwrites rather than duplicating.

Install admin SDK if needed: `npm i -D firebase-admin`

Against the emulator (start it first with `npm run emulators`):

    TARGET_UID=<your-emulator-uid> FIRESTORE_EMULATOR_HOST=localhost:8080 \
    GCLOUD_PROJECT=tapuntap node scripts/migrate-decks.mjs

Against live: set GOOGLE_APPLICATION_CREDENTIALS to a service-account key (no
FIRESTORE_EMULATOR_HOST), then run with your real uid.
