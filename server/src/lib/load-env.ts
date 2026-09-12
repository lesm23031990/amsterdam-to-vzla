import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// Loads the env file matching NODE_ENV before anything reads process.env.
// dotenv does NOT override variables already present in the environment,
// so platform-injected secrets (Render) always win over the file.
// Skipped during tests: Vitest sets VITEST=true and expects default secrets.
if (!process.env.VITEST && process.env.NODE_ENV !== "test") {
  const envFile =
    process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";

  const candidates = [
    path.resolve(__dirname, "..", "..", envFile), // server/.env.*
    path.resolve(process.cwd(), envFile), // fallback if cwd is server/
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      dotenv.config({ path: p });
      break;
    }
  }
}
