const { execFileSync } = require("child_process");
const { existsSync, rmSync, writeFileSync, readFileSync } = require("fs");
const { resolve } = require("path");

const dest = resolve("prisma/dev.db");
const expectedSize = 1626112;
const header = "SQLite format 3";
const sidecars = [
  resolve("prisma/dev.db-wal"),
  resolve("prisma/dev.db-shm"),
  resolve("prisma/dev.db-journal"),
];

function remove(path) {
  if (!existsSync(path)) {
    return;
  }
  try {
    rmSync(path, { force: true });
    console.log(`Removed ${path}`);
  } catch (error) {
    const code = error && error.code ? String(error.code) : "";
    if (code === "EBUSY" || code === "EPERM") {
      throw new Error(
        `${path} is locked. Stop npm run dev (Ctrl+C), close Cursor, then run this again.`,
      );
    }
    throw error;
  }
}

for (const path of [dest, ...sidecars]) {
  remove(path);
}

execFileSync("git", ["fetch", "origin", "cursor/restore-vod-db-527e"], {
  stdio: "inherit",
});

const buf = execFileSync(
  "git",
  ["show", "origin/cursor/restore-vod-db-527e:prisma/dev.db"],
  { maxBuffer: 20 * 1024 * 1024 },
);

writeFileSync(dest, buf);

const written = readFileSync(dest);
const writtenHeader = written.subarray(0, 15).toString("utf8");
if (written.length !== expectedSize || writtenHeader !== header) {
  throw new Error(
    `Restore failed. size=${written.length} header=${JSON.stringify(writtenHeader)}`,
  );
}

console.log(`Wrote ${written.length} bytes`);
console.log(`Header: ${writtenHeader}`);
console.log("OK. Start the app with: npm.cmd run dev");
