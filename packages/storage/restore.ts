import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { stageBackup } from "./backup.ts";
type Journal = {
  version: 1;
  id: string;
  phase: "prepared" | "old-moved" | "new-installed" | "verified";
};
function locations(root: string, id: string) {
  return {
    live: path.join(root, "library"),
    stage: path.join(root, "restore-stage-" + id),
    old: path.join(root, "recovery", "library-before-" + id),
    failed: path.join(root, "recovery", "library-failed-" + id),
    journal: path.join(root, "recovery", "restore-journal.json"),
  };
}
function syncDirectory(directory: string) {
  const fd = fs.openSync(directory, "r");
  try {
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}
function writeJournal(root: string, value: Journal) {
  const { journal } = locations(root, value.id);
  fs.mkdirSync(path.dirname(journal), { recursive: true, mode: 0o700 });
  const temp = journal + ".tmp",
    fd = fs.openSync(temp, "w", 0o600);
  try {
    fs.writeFileSync(fd, JSON.stringify(value));
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(temp, journal);
  syncDirectory(path.dirname(journal));
}
function readJournal(root: string): Journal | null {
  const file = path.join(root, "recovery", "restore-journal.json");
  if (!fs.existsSync(file)) return null;
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  if (
    j.version !== 1 ||
    !/^[a-f0-9-]{36}$/.test(j.id) ||
    !["prepared", "old-moved", "new-installed", "verified"].includes(j.phase)
  )
    throw new Error(
      "Restore recovery journal is invalid. Your existing files were retained.",
    );
  return j;
}
function finish(root: string, j: Journal) {
  const p = locations(root, j.id);
  fs.rmSync(p.stage, { recursive: true, force: true });
  fs.unlinkSync(p.journal);
  syncDirectory(path.dirname(p.journal));
}
/** Called before starting SQLite. Incomplete restores conservatively restore the previous directory. */
export function recoverRestore(root: string) {
  const j = readJournal(root);
  if (!j) return;
  const p = locations(root, j.id);
  if (j.phase === "verified" && fs.existsSync(p.live)) {
    finish(root, j);
    return;
  }
  if (fs.existsSync(p.old)) {
    if (fs.existsSync(p.live)) fs.renameSync(p.live, p.failed);
    fs.renameSync(p.old, p.live);
    syncDirectory(root);
  } else if (!fs.existsSync(p.live))
    throw new Error(
      "Restore recovery needs attention; no library was replaced.",
    );
  finish(root, j);
}
export function prepareRestore(root: string, bytes: Uint8Array) {
  if (readJournal(root))
    throw new Error("Another restore needs recovery first.");
  const id = randomUUID(),
    p = locations(root, id);
  let count: { records: number };
  try {
    count = stageBackup(bytes, p.stage);
  } catch (error) {
    fs.rmSync(p.stage, { recursive: true, force: true });
    throw error;
  }
  let journal: Journal = { version: 1, id, phase: "prepared" };
  writeJournal(root, journal);
  return {
    records: count.records,
    install(checkpoint?: (phase: string) => void) {
      fs.renameSync(p.live, p.old);
      syncDirectory(root);
      checkpoint?.("old-moved");
      journal = { ...journal, phase: "old-moved" };
      writeJournal(root, journal);
      fs.renameSync(p.stage, p.live);
      syncDirectory(root);
      checkpoint?.("new-installed");
      journal = { ...journal, phase: "new-installed" };
      writeJournal(root, journal);
    },
    commit() {
      journal = { ...journal, phase: "verified" };
      writeJournal(root, journal);
      finish(root, journal);
    },
    rollback() {
      recoverRestore(root);
    },
  };
}
