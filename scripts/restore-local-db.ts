import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const dest = resolve("prisma/dev.db");
const ref = "origin/cursor/restore-vod-db-527e:prisma/dev.db";

execFileSync("git", ["fetch", "origin", "cursor/restore-vod-db-527e"], {
  stdio: "inherit",
});

const buf = execFileSync("git", ["show", ref], {
  maxBuffer: 20 * 1024 * 1024,
});

try {
  writeFileSync(dest, buf);
} catch (error) {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
  if (code === "EBUSY" || code === "EPERM") {
    throw new Error(
      "prisma/dev.db is locked. Stop npm run dev (Ctrl+C), close Cursor, then run this again.",
    );
  }
  throw error;
}

console.log(`Wrote ${buf.length} bytes to ${dest}`);
console.log("Start the app with: npm.cmd run dev");
