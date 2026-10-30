import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CoquiDatabase } from "../packages/storage/index.ts";
test("SQLite transactions roll back nested writes and preserve durable records after reopen", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-db-"));
  let d = new CoquiDatabase(dir);
  d.put("session", "one", { goal: "Understand gradients" });
  assert.throws(() =>
    d.transaction(() => {
      d.put("session", "two", {});
      d.transaction(() => d.append("coverage", { fp: "bad" }));
      throw new Error("power failure");
    }),
  );
  assert.equal(d.get("session", "two"), null);
  assert.deepEqual(d.ledger("coverage"), []);
  d.close();
  d = new CoquiDatabase(dir);
  assert.deepEqual(d.get("session", "one"), { goal: "Understand gradients" });
  d.close();
  fs.rmSync(dir, { recursive: true });
});
test("FTS searches treat punctuation as literal input", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-search-"));
  const d = new CoquiDatabase(dir);
  d.index(
    "session",
    "one",
    "Bayes rule",
    "Conditional probability and base rates",
  );
  assert.equal(d.search("probability").length, 1);
  assert.deepEqual(d.search('" OR 1=1'), []);
  d.close();
  fs.rmSync(dir, { recursive: true });
});
test("Future libraries are refused before changing journal mode or file bytes", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-future-")),
    file = path.join(dir, "coquilearn.sqlite");
  try {
    const db = new DatabaseSync(file);
    db.exec(
      "PRAGMA user_version=2; CREATE TABLE future_data(value TEXT); INSERT INTO future_data VALUES ('preserve')",
    );
    db.close();
    const hash = () =>
        createHash("sha256").update(fs.readFileSync(file)).digest("hex"),
      before = hash();
    assert.throws(() => new CoquiDatabase(dir), /newer version/);
    assert.equal(hash(), before);
    assert.deepEqual(fs.readdirSync(dir), ["coquilearn.sqlite"]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
