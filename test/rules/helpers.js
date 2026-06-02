import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join, dirname } from "node:path";
import { initializeTestEnvironment } from "@firebase/rules-unit-testing";

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function makeEnv() {
  return initializeTestEnvironment({
    projectId: "iammoo-tapuntap-test",
    firestore: {
      rules: readFileSync(join(__dirname, "../../firestore.rules"), "utf8"),
      host: "localhost",
      port: 8080
    }
  });
}
