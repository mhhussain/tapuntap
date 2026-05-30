// Usage (emulator):
//   TARGET_UID=<uid> FIRESTORE_EMULATOR_HOST=localhost:8080 \
//   GCLOUD_PROJECT=iammoo-tapuntap node scripts/migrate-decks.mjs
// Usage (live): set GOOGLE_APPLICATION_CREDENTIALS to a service-account key instead
//   of FIRESTORE_EMULATOR_HOST.
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import admin from "firebase-admin";

const TARGET_UID = process.env.TARGET_UID;
if (!TARGET_UID) { console.error("Set TARGET_UID"); process.exit(1); }

admin.initializeApp({ projectId: process.env.GCLOUD_PROJECT || "iammoo-tapuntap" });
const db = admin.firestore();

const dir = join(process.cwd(), "data", "decks");
const files = (await readdir(dir)).filter(f => f.endsWith(".json"));
console.log(`Migrating ${files.length} decks for uid=${TARGET_UID}`);

for (const f of files) {
  const deck = JSON.parse(await readFile(join(dir, f), "utf8"));
  const deckRef = db.doc(`users/${TARGET_UID}/decks/${deck.id}`);
  await deckRef.set({
    ownerUid: TARGET_UID,
    name: deck.name,
    format: deck.format || "commander",
    commander: deck.commander || null,
    cards: deck.cards || [],
    version: deck.version || 1,
    createdAt: deck.createdAt || new Date().toISOString(),
    updatedAt: deck.updatedAt || new Date().toISOString()
  });
  for (const v of (deck.versions || [])) {
    await deckRef.collection("versions").doc(String(v.version)).set({
      version: v.version, timestamp: v.timestamp,
      changelog: v.changelog || `Version ${v.version}`,
      cards: v.cards || []
    });
  }
  console.log(`  ✓ ${deck.name} (${(deck.versions || []).length} versions)`);
}
console.log("Done.");
process.exit(0);
