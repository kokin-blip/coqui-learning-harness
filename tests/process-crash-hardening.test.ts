import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { CoquiDatabase } from "../packages/storage/index.ts";
const worker = path.resolve("tests/helpers/crash-worker.ts");
const run = (root: string, phase: string, killed = false) => {
  const r = spawnSync(
    process.execPath,
    ["--import", "tsx", worker, root, phase],
    { encoding: "utf8", timeout: 20000 },
  );
  if (killed) assert.equal(r.signal, "SIGKILL", r.stderr);
  else assert.equal(r.status, 0, r.stderr);
};
for (const point of [
  "merge-after-node",
  "merge-after-chain",
  "merge-after-coverage",
  "merge-after-commit",
])
  test(
    "SIGKILL at " +
      point +
      " retains an entirely committed graph or honest uncovered state",
    () => {
      const root = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-graph-crash-"));
      try {
        run(root, point, true);
        const db = new CoquiDatabase(root);
        const committed = point === "merge-after-commit";
        assert.equal(db.ledger("nodes").length, committed ? 2 : 0);
        assert.equal(db.ledger("chains").length, committed ? 1 : 0);
        assert.equal(db.ledger("coverage").length, committed ? 1 : 0);
        assert.equal(
          db.db.prepare("PRAGMA integrity_check").get()!.integrity_check,
          "ok",
        );
        db.close();
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    },
  );
test("SIGKILL immediately after write-ahead save recovers an explicit Retry without duplicating learner input", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-input-crash-"));
  try {
    run(root, "input-after-save", true);
    const { chatId } = JSON.parse(
      fs.readFileSync(path.join(root, "case.json"), "utf8"),
    );
    let db = new CoquiDatabase(root);
    assert.equal(db.preference<any>("turn-state:" + chatId)?.state, "running");
    assert.equal(
      db.get<any>("chat", chatId).messages.filter((m: any) => m.role === "user")
        .length,
      1,
    );
    db.close();
    run(root, "input-recover");
    db = new CoquiDatabase(root);
    const messages = db.get<any>("chat", chatId).messages;
    assert.equal(messages.filter((m: any) => m.role === "user").length, 1);
    assert.ok(
      messages.some(
        (m: any) => m.role === "assistant" && m.stopReason === "error",
      ),
    );
    assert.ok(
      messages.some(
        (m: any) =>
          m.role === "assistant" &&
          m.content?.some(
            (c: any) => c.type === "toolCall" && c.name === "quiz",
          ),
      ),
    );
    db.close();
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
test("SIGKILL after worker completion before delivery recovers one result across repeated restarts", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-worker-crash-"));
  try {
    run(root, "worker-before-delivery", true);
    const { chatId, jobId } = JSON.parse(
      fs.readFileSync(path.join(root, "case.json"), "utf8"),
    );
    let db = new CoquiDatabase(root);
    assert.equal(db.get<any>("job", jobId).status, "done");
    assert.equal(db.get<any>("job", jobId).delivery.status, "pending");
    db.close();
    run(root, "worker-recover");
    run(root, "worker-recover");
    db = new CoquiDatabase(root);
    assert.equal(db.get<any>("job", jobId).delivery.status, "delivered");
    assert.equal(
      db
        .get<any>("chat", chatId)
        .messages.filter((m: any) => m.details?.jobId === jobId).length,
      1,
    );
    db.close();
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

for (const checkpoint of ["prepared", "old-moved", "new-installed"])
  test(
    "Actual SIGKILL during restore " +
      checkpoint +
      " recovers database, assets and prompts as one previous library",
    () => {
      const root = fs.mkdtempSync(
        path.join(os.tmpdir(), "coqui-restore-sigkill-"),
      );
      try {
        const live = path.join(root, "library");
        const db = new CoquiDatabase(live);
        db.put("chat", "original", {
          id: "original",
          title: "Keep original",
          version: 1,
          messages: [],
        });
        db.close();
        for (const [folder, text] of [
          ["assets", "old asset"],
          ["prompts", "old prompt"],
        ]) {
          fs.mkdirSync(path.join(live, folder!));
          fs.writeFileSync(path.join(live, folder!, "test.txt"), text!);
        }
        run(root, "restore-" + checkpoint, true);
        run(root, "restore-recover");
        const restored = new CoquiDatabase(live);
        assert.equal(
          restored.get<any>("chat", "original").title,
          "Keep original",
        );
        assert.equal(restored.get("chat", "replacement"), null);
        restored.close();
        assert.equal(
          fs.readFileSync(path.join(live, "assets/test.txt"), "utf8"),
          "old asset",
        );
        assert.equal(
          fs.readFileSync(path.join(live, "prompts/test.txt"), "utf8"),
          "old prompt",
        );
        assert.equal(
          fs.existsSync(path.join(root, "recovery/restore-journal.json")),
          false,
        );
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    },
  );
