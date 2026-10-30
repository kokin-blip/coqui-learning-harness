import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { CoquiDatabase } from "../packages/storage/index.ts";
import { createHash } from "node:crypto";
test("The intentional external history reader is read-only and never opens credentials", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-reader-"));
  try {
    const db = new CoquiDatabase(dir);
    db.put("chat", "lesson", {
      id: "lesson",
      title: "Visible history",
      updatedAt: "2026-01-01",
      messages: [
        {
          id: "first",
          role: "user",
          content: "Explain local change.",
          timestamp: 1,
        },
      ],
    });
    db.close();
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        "tsx",
        "scripts/history.ts",
        "--library",
        dir,
        "--session",
        "lesson",
      ],
      { encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Visible history/);
    assert.match(result.stdout, /Explain local change/);
    const reopened = new CoquiDatabase(dir);
    assert.equal(reopened.all("chat").length, 1);
    reopened.close();
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("The independent reader exposes graph sources, literal/wildcard search, chains, optional fields and schema refusal", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-reader-graph-"));
  const invoke = (...args: string[]) =>
    spawnSync(
      process.execPath,
      ["--import", "tsx", "scripts/history.ts", "--library", dir, ...args],
      { encoding: "utf8" },
    );
  try {
    const db = new CoquiDatabase(dir);
    db.put("chat", "one", {
      id: "one",
      version: 1,
      title: "Source",
      updatedAt: "2026-01-01",
      messages: [
        {
          id: "user",
          role: "user",
          content: "Learner reasoning",
          timestamp: 0,
        },
        {
          id: "assistant",
          role: "assistant",
          content: [
            { type: "thinking", thinking: "Optional agent reasoning" },
            { type: "text", text: "A public explanation." },
          ],
          usage: { input: 12, output: 3 },
          stopReason: "stop",
          timestamp: 1,
        },
      ],
    });
    for (const [id, name] of [
      ["a", "Equality [a+b]"],
      ["b", "Same sum"],
    ])
      db.append("nodes", {
        id,
        name,
        statement: name,
        aliases: [],
        createdAt: "2026-01-01",
        provenance: [{ chatId: "one", messageId: "assistant" }],
      });
    db.append("chains", {
      id: "argument",
      premises: ["a"],
      conclusion: "b",
      createdAt: "2026-01-01",
      provenance: [{ chatId: "one", messageId: "assistant" }],
    });
    db.close();
    const hash = () =>
        createHash("sha256")
          .update(fs.readFileSync(path.join(dir, "coquilearn.sqlite")))
          .digest("hex"),
      before = hash();
    const find = invoke("graph", "find", "[a+b]", "--json");
    assert.equal(find.status, 0, find.stderr);
    assert.equal(JSON.parse(find.stdout).propositions.length, 1);
    assert.equal(
      JSON.parse(invoke("graph", "find", "*sum", "--json").stdout).propositions
        .length,
      1,
    );
    assert.equal(
      JSON.parse(invoke("graph", "chains", "--node", "a", "--json").stdout)
        .chains[0].id,
      "argument",
    );
    assert.equal(
      JSON.parse(invoke("graph", "sessions", "--json").stdout).sources[0]
        .propositions,
      2,
    );
    const plain = invoke("read", "one", "--json");
    assert.doesNotMatch(plain.stdout, /Optional agent reasoning/);
    assert.match(plain.stdout, /Learner reasoning/);
    assert.ok(JSON.parse(plain.stdout).omissions.length);
    const full = invoke(
      "read",
      "one",
      "--include-agent-thinking",
      "--include-operations",
      "--json",
    );
    assert.match(full.stdout, /Optional agent reasoning/);
    assert.equal(JSON.parse(full.stdout).session.messages[1].usage.input, 12);
    assert.equal(hash(), before);
    assert.equal(invoke("--help").status, 0);
    const future = new CoquiDatabase(dir);
    future.db.exec("PRAGMA user_version=2");
    future.close();
    const futureHash = hash();
    const refused = invoke("graph", "propositions", "--json");
    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr, /Unsupported library schema/);
    assert.equal(hash(), futureHash);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
