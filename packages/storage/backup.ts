import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { unzipSync, strFromU8 } from "fflate";
export const BACKUP_COLUMNS: Record<string, string[]> = {
  records: ["kind", "id", "json", "deleted_at"],
  ledgers: ["sequence", "kind", "json"],
  preferences: ["id", "json"],
  operations: ["id", "fingerprint", "state", "json", "created_at"],
  events: ["sequence", "type", "json", "created_at"],
  evidence: ["id", "session_id", "concept_id", "json", "created_at"],
  review_cards: ["id", "concept_id", "due", "json"],
  review_logs: ["id", "card_id", "json", "created_at"],
  tombstones: ["id", "json", "created_at"],
  search_index: ["kind", "id", "title", "body"],
};
/** Validate everything before any live library path can be touched. */
export function stageBackup(bytes: Uint8Array, directory: string) {
  let total = 0;
  const files = unzipSync(bytes, {
    filter: (f) => {
      total += f.originalSize;
      if (f.originalSize > 256 * 1024 * 1024 || total > 512 * 1024 * 1024)
        throw new Error("Backup exceeds restore limits");
      return true;
    },
  });
  const manifest = JSON.parse(
    strFromU8(files["manifest.json"] ?? new Uint8Array()),
  );
  if (
    manifest.version !== 1 ||
    manifest.app !== "CoquiLearn" ||
    !manifest.files ||
    Array.isArray(manifest.files) ||
    !manifest.files["library.sqlite"]
  )
    throw new Error("Unsupported backup format");
  for (const name of Object.keys(files))
    if (name !== "manifest.json" && !Object.hasOwn(manifest.files, name))
      throw new Error("Backup contains an undeclared file");
  for (const [name, meta] of Object.entries(manifest.files) as [
    string,
    any,
  ][]) {
    if (
      name.includes("\\") ||
      name.includes("\0") ||
      name.startsWith("/") ||
      name.split("/").some((x) => x === ".." || x === "." || !x) ||
      !(
        name === "library.sqlite" ||
        name.startsWith("assets/") ||
        name.startsWith("prompts/")
      )
    )
      throw new Error("Invalid backup path");
    const data = files[name];
    if (
      !data ||
      createHash("sha256").update(data).digest("hex") !== meta.sha256 ||
      data.length !== meta.bytes
    )
      throw new Error("Backup integrity check failed: " + name);
  }
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  for (const [name, data] of Object.entries(files))
    if (name !== "manifest.json") {
      const target = path.join(
        directory,
        name === "library.sqlite" ? "coquilearn.sqlite" : name,
      );
      fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
      const fd = fs.openSync(target, "wx", 0o600);
      try {
        fs.writeFileSync(fd, data);
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
    }
  const source = new DatabaseSync(path.join(directory, "coquilearn.sqlite"), {
    readOnly: true,
  });
  try {
    if ((source.prepare("PRAGMA user_version").get() as any).user_version !== 1)
      throw new Error("Backup needs a different CoquiLearn version");
    if (
      (source.prepare("PRAGMA integrity_check").get() as any)
        .integrity_check !== "ok"
    )
      throw new Error("Backup database is damaged");
    for (const [table, expected] of Object.entries(BACKUP_COLUMNS)) {
      const actual = source
        .prepare(`PRAGMA table_info(${table})`)
        .all()
        .map((c) => String(c.name));
      if (
        actual.length !== expected.length ||
        expected.some((c) => !actual.includes(c))
      )
        throw new Error("Unsupported database columns in backup: " + table);
      if (actual.includes("json"))
        for (const row of source
          .prepare(`SELECT json FROM ${table} WHERE json IS NOT NULL`)
          .all())
          JSON.parse(String(row.json));
    }
    for (const row of source
      .prepare("SELECT json FROM records WHERE kind='chat'")
      .all()) {
      const chat = JSON.parse(String(row.json));
      if (chat.version !== undefined && chat.version > 1)
        throw new Error(
          "A backed-up session requires a newer CoquiLearn version.",
        );
    }
    for (const row of source
      .prepare(
        "SELECT json FROM records WHERE kind='asset' AND deleted_at IS NULL",
      )
      .all()) {
      const asset = JSON.parse(String(row.json));
      if (
        !/^[a-f0-9]{64}$/.test(asset.digest) ||
        !/^\.(pdf|png|jpg|jpeg|webp|gif|txt|md|markdown|csv|json|html)$/.test(
          asset.ext,
        ) ||
        asset.path !== `assets/${asset.digest}${asset.ext}` ||
        !files[asset.path]
      )
        throw new Error("Backup has a missing or invalid source asset");
      if (
        createHash("sha256").update(files[asset.path]).digest("hex") !==
        asset.digest
      )
        throw new Error("Backup source identity does not match its bytes");
    }
    return {
      records: Number(
        (source.prepare("SELECT count(*) AS n FROM records").get() as any).n,
      ),
    };
  } finally {
    source.close();
  }
}
