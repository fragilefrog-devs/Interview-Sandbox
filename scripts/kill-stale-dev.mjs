/**
 * Clears stale `next dev` servers for THIS project before a new one starts.
 *
 * Why this exists: Next 16 keeps `.next/dev/lock` ({pid, port, ...}) and, on
 * startup, refuses to boot if that PID is still alive:
 *
 *     x Another next dev server is already running.
 *     - Local: http://localhost:3001
 *     - PID:   17380
 *
 * It exits with code 1 and the prompt simply returns, which reads as
 * "the dev server closed by itself". The orphan usually holds a DIFFERENT port
 * (3001, 3002, ...) than the one you expect (3000), so port-based cleanup alone
 * misses it.
 *
 * Safety: a candidate PID is only killed if its command line actually
 * references this project directory, so a recycled/unrelated PID is never hit.
 *
 * Usage: node scripts/kill-stale-dev.mjs
 */
import { execFileSync } from "node:child_process";
import { readFileSync, rmSync, existsSync } from "node:fs";
import { join } from "node:path";
import { platform } from "node:process";

const projectDir = process.cwd();
const lockPath = join(projectDir, ".next", "dev", "lock");

if (platform !== "win32") {
  console.log("[kill-stale-dev] non-Windows; skipping");
  process.exit(0);
}

const SYSTEM32 = "C:/Windows/System32";
const run = (bin, args) => {
  for (const candidate of [bin, `${SYSTEM32}/${bin}.exe`]) {
    try {
      return execFileSync(candidate, args, { encoding: "utf8", windowsHide: true });
    } catch {
      /* try the next candidate */
    }
  }
  return null;
};

/* 1. PIDs advertised by the lock file. */
const candidates = new Set();
if (existsSync(lockPath)) {
  try {
    const { pid } = JSON.parse(readFileSync(lockPath, "utf8"));
    if (Number.isInteger(pid) && pid > 0) candidates.add(pid);
  } catch {
    console.log("[kill-stale-dev] lock file unreadable; ignoring");
  }
}

/* 2. Any listener on 3000-3010 (orphans drift to the next free port). */
const netstat = run("netstat", ["-ano"]);
if (netstat) {
  for (const line of netstat.split(/\r?\n/)) {
    if (!/LISTENING/i.test(line)) continue;
    const cols = line.trim().split(/\s+/);
    if (cols.length < 5) continue;
    const local = cols[1] ?? "";
    const port = Number((local.split(":").pop() ?? ""));
    if (port >= 3000 && port <= 3010) {
      const pid = Number(cols[4]);
      if (Number.isInteger(pid) && pid > 0) candidates.add(pid);
    }
  }
}

if (candidates.size === 0) {
  console.log("[kill-stale-dev] no stale dev server found");
  process.exit(0);
}

/* 3. Keep only processes that actually belong to this project. */
const pidList = [...candidates].join(",");
const ps = `${SYSTEM32}/WindowsPowerShell/v1.0/powershell.exe`;
let owners = "";
try {
  owners = execFileSync(
    ps,
    [
      "-NoProfile",
      "-Command",
      `Get-CimInstance Win32_Process | Where-Object { @(${pidList}) -contains $_.ProcessId } | ForEach-Object { "$($_.ProcessId)|$($_.CommandLine)" }`,
    ],
    { encoding: "utf8", windowsHide: true },
  );
} catch {
  console.log("[kill-stale-dev] could not inspect processes; skipping to be safe");
  process.exit(0);
}

const needle = projectDir.toLowerCase();
const mine = [];
for (const line of owners.split(/\r?\n/)) {
  const [pid, ...rest] = line.split("|");
  const cmd = rest.join("|") ?? "";
  const id = Number(pid);
  if (!Number.isInteger(id) || id <= 0) continue;
  if (cmd.toLowerCase().includes(needle)) mine.push(id);
}

if (mine.length === 0) {
  console.log(`[kill-stale-dev] no live process belongs to ${projectDir}; clearing stale lock`);
} else {
  for (const pid of mine) {
    if (run("taskkill", ["/F", "/T", "/PID", String(pid)]) !== null) {
      console.log(`[kill-stale-dev] killed stale dev server pid ${pid}`);
    } else {
      console.log(`[kill-stale-dev] could not kill pid ${pid}`);
    }
  }
}

/* 4. Drop the lock so Next does not read a dead PID. */
try {
  rmSync(lockPath, { force: true });
} catch {
  /* best effort */
}
console.log("[kill-stale-dev] port 3000-3010 clear");
