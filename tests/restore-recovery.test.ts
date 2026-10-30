import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { zipSync, unzipSync, strToU8 } from "fflate";
import { CoquiDatabase } from "../packages/storage/index.ts";
import { prepareRestore, recoverRestore } from "../packages/storage/restore.ts";
function archive(root: string, title: string, version?: number) {
  const donor = path.join(root, "donor"),
    db = new CoquiDatabase(donor);
  db.put("chat", "one", {
    title,
    messages: [],
    ...(version ? { version } : {}),
  });
  db.close();
  const entries: Record<string, Uint8Array> = {
    "library.sqlite": fs.readFileSync(path.join(donor, "coquilearn.sqlite")),
    "prompts/teaching.txt": strToU8("replacement prompt"),
    "assets/extra.txt": strToU8("replacement asset"),
  };
  entries["manifest.json"] = strToU8(
    JSON.stringify({
      version: 1,
      app: "CoquiLearn",
      files: Object.fromEntries(
        Object.entries(entries).map(([n, b]) => [
          n,
          {
            bytes: b.length,
            sha256: createHash("sha256").update(b).digest("hex"),
          },
        ]),
      ),
    }),
  );
  return zipSync(entries);
}
for (const checkpoint of ["prepared", "old-moved", "new-installed"])
  test(
    "Interrupted restore at " +
      checkpoint +
      " restores the entire previous library",
    () => {
      const root = fs.mkdtempSync(
          path.join(os.tmpdir(), "coqui-restore-race-"),
        ),
        live = path.join(root, "library");
      try {
        const db = new CoquiDatabase(live);
        db.put("chat", "one", { title: "original", messages: [] });
        db.close();
        fs.mkdirSync(path.join(live, "prompts"));
        fs.writeFileSync(
          path.join(live, "prompts", "teaching.txt"),
          "original prompt",
        );
        fs.mkdirSync(path.join(live, "assets"));
        fs.writeFileSync(
          path.join(live, "assets", "original.txt"),
          "original asset",
        );
        const restore = prepareRestore(root, archive(root, "replacement"));
        if (checkpoint !== "prepared")
          assert.throws(
            () =>
              restore.install((phase) => {
                if (phase === checkpoint)
                  throw new Error("simulated process death");
              }),
            /process death/,
          );
        recoverRestore(root);
        const opened = new CoquiDatabase(live);
        assert.equal(opened.get<any>("chat", "one")?.title, "original");
        opened.close();
        assert.equal(
          fs.readFileSync(path.join(live, "prompts", "teaching.txt"), "utf8"),
          "original prompt",
        );
        assert.equal(
          fs.readFileSync(path.join(live, "assets", "original.txt"), "utf8"),
          "original asset",
        );
        assert.equal(
          fs.existsSync(path.join(live, "assets", "extra.txt")),
          false,
        );
      } finally {
        fs.rmSync(root, { recursive: true, force: true });
      }
    },
  );
test("Verified restore switches database, prompts and assets together and survives startup recovery", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-restore-commit-")),
    live = path.join(root, "library");
  try {
    new CoquiDatabase(live).close();
    const tx = prepareRestore(root, archive(root, "replacement"));
    tx.install();
    tx.commit();
    recoverRestore(root);
    const db = new CoquiDatabase(live);
    assert.equal(db.get<any>("chat", "one")?.title, "replacement");
    db.close();
    assert.equal(
      fs.readFileSync(path.join(live, "prompts", "teaching.txt"), "utf8"),
      "replacement prompt",
    );
    assert.equal(
      fs.readFileSync(path.join(live, "assets", "extra.txt"), "utf8"),
      "replacement asset",
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("Restore refuses undeclared, traversal, tampered, missing and future-schema archives before touching the library", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-restore-invalid-"));
  const live = path.join(root, "library");
  try {
    const db = new CoquiDatabase(live);
    db.put("chat", "one", { title: "original" });
    db.close();
    const bytes = archive(root, "replacement");
    const mutations = [
      (e: Record<string, Uint8Array>) => {
        e["unlisted.txt"] = strToU8("extra");
      },
      (e: Record<string, Uint8Array>) => {
        e["assets/extra.txt"] = strToU8("tampered");
      },
      (e: Record<string, Uint8Array>) => {
        delete e["prompts/teaching.txt"];
      },
      (e: Record<string, Uint8Array>) => {
        const m = JSON.parse(new TextDecoder().decode(e["manifest.json"]));
        m.version = 100;
        e["manifest.json"] = strToU8(JSON.stringify(m));
      },
      (e: Record<string, Uint8Array>) => {
        const m = JSON.parse(new TextDecoder().decode(e["manifest.json"]));
        m.files["../outside.txt"] = m.files["assets/extra.txt"];
        e["../outside.txt"] = e["assets/extra.txt"]!;
        e["manifest.json"] = strToU8(JSON.stringify(m));
      },
    ];
    for (const mutate of mutations) {
      const entries = unzipSync(bytes);
      mutate(entries);
      assert.throws(() => prepareRestore(root, zipSync(entries)));
      const current = new CoquiDatabase(live);
      assert.equal(current.get<any>("chat", "one")?.title, "original");
      current.close();
      assert.equal(
        fs.existsSync(path.join(root, "recovery", "restore-journal.json")),
        false,
      );
    }
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
test("A valid archive containing a future native session is refused without switching libraries", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-future-session-"));
  try {
    const db = new CoquiDatabase(path.join(root, "library"));
    db.put("chat", "one", { title: "original", messages: [] });
    db.close();
    assert.throws(
      () => prepareRestore(root, archive(root, "future", 10)),
      /newer CoquiLearn/,
    );
    const current = new CoquiDatabase(path.join(root, "library"));
    assert.equal(current.get<any>("chat", "one")?.title, "original");
    current.close();
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
