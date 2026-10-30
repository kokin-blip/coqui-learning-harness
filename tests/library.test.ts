import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-library-"));
process.env.COQUI_DATA_DIR = path.join(dir, "library");
const { database } = await import("../packages/storage/index.ts");
const lib = await import("../packages/storage/library.ts");
after(() => {
  database().close();
  fs.rmSync(dir, { recursive: true, force: true });
});
test("Review scheduling stores FSRS-7 results independently from knowledge", () => {
  const now = new Date("2026-10-29T12:00:00Z");
  const item: any = lib.addReview(
    "gradient",
    "Gradient",
    "Explain the gradient",
    "Direction of steepest increase",
    now,
  );
  const next = lib.rateReview(item.id, 3, now);
  assert.ok(new Date(next.due) > now);
  assert.equal(next.scheduler, "ts-fsrs@6/FSRS-7");
  assert.equal(database().ledger("nodes").length, 0);
  assert.equal(lib.evidenceHistory().length, 1);
});
test("Import preview preserves identity, text, and duplicate detection", async () => {
  const bytes = new TextEncoder().encode(
    "A gradient combines partial derivatives.",
  );
  const [preview]: any = await lib.previewImport([{ name: "notes.md", bytes }]);
  assert.equal(preview.duplicate, false);
  assert.match(preview.text, /partial derivatives/);
  lib.commitImport(preview, bytes);
  const [again]: any = await lib.previewImport([{ name: "renamed.md", bytes }]);
  assert.equal(again.digest, preview.digest);
  assert.equal(again.duplicate, true);
  const updated = lib.commitImport(
    { ...again, text: "Updated recognition", phase: "saving", selected: true },
    bytes,
  );
  assert.equal(updated.name, "notes.md");
  assert.equal(updated.id, preview.id);
  assert.equal(updated.digest, preview.digest);
  assert.equal((await lib.materialPage(preview.digest, 1)).text, preview.text);
  assert.throws(
    () => lib.commitImport(preview, new Uint8Array([1])),
    /changed/,
  );
});
test("Import limits reject oversized files independently and reject oversized batches explicitly", async () => {
  const small = {
    name: "Valid.txt",
    bytes: new TextEncoder().encode("Readable"),
  };
  const items: any[] = await lib.previewImport([
    { name: "Too large.txt", bytes: new Uint8Array(32 * 1024 * 1024 + 1) },
    small,
  ]);
  assert.equal(items[0].status, "error");
  assert.match(items[0].error, /32 MB/);
  assert.equal(items[1].status, "ready");
  await assert.rejects(
    lib.previewImport(Array.from({ length: 33 }, () => small)),
    /32 files/,
  );
});
test("Backups restore the database, assets and review state without secrets", async () => {
  database().put("chat", "fixture", { title: "Original", messages: [] });
  fs.mkdirSync(path.join(dir, "credentials"));
  fs.writeFileSync(
    path.join(dir, "credentials", "private"),
    "must never export",
  );
  const backup = await lib.createBackup();
  database().put("chat", "fixture", { title: "Changed" });
  const result = lib.restoreBackup(backup);
  assert.ok(result.restored);
  assert.equal(database().get<any>("chat", "fixture")!.title, "Original");
  const { unzipSync } = await import("fflate");
  const entries = unzipSync(backup);
  assert.equal(
    Object.keys(entries).some((p) => p.includes("credential")),
    false,
  );
  const damaged = backup.slice(0, 80);
  assert.throws(() => lib.restoreBackup(damaged));
  assert.equal(database().get<any>("chat", "fixture")!.title, "Original");
});

test("FSRS histories replay deterministically with fixed clocks and persist ratings separately from confidence", () => {
  const start = new Date("2026-01-01T12:00:00Z");
  const a = lib.addReview("replay-a", "A", "Retrieve", "Answer", start) as any,
    b = lib.addReview("replay-b", "B", "Retrieve", "Answer", start) as any;
  let now = start;
  for (const grade of [1, 3, 3, 2, 4]) {
    const left = lib.rateReview(a.id, grade, now),
      right = lib.rateReview(b.id, grade, now);
    assert.equal(left.due, right.due);
    assert.equal(left.card.stability, right.card.stability);
    assert.equal(left.scheduler, "ts-fsrs@6/FSRS-7");
    now = new Date(left.due);
  }
  assert.throws(
    () => lib.rateReview(a.id, 3, now, start.toISOString()),
    /already been/,
  );
});
