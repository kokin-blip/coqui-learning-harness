import { loadPdfjs, pdfOptions } from "./pdf-runtime.ts";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash, randomUUID } from "node:crypto";
import { zipSync, strToU8 } from "fflate";
import { DefaultScheduler, Rating } from "ts-fsrs";
import { recognizeText } from "./recognize.ts";
import { database, closeDatabase } from "./index.ts";
import { prepareRestore } from "./restore.ts";
import { stageBackup } from "./backup.ts";
const hash = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const scheduler = await DefaultScheduler({
  version: "FSRS-7",
  desiredRetention: 0.9,
  enableShortTerm: true,
  learningSteps: ["1m", "10m"],
  relearningSteps: ["10m"],
  enableFuzz: false,
});
export function evidence(
  sessionId: string | null,
  value: any,
  conceptId: string | null = null,
) {
  const id = randomUUID(),
    now = new Date().toISOString();
  database()
    .db.prepare(
      "INSERT INTO evidence(id,session_id,concept_id,json,created_at) VALUES(?,?,?,?,?)",
    )
    .run(id, sessionId, conceptId, JSON.stringify(value), now);
  return id;
}
export function evidenceHistory(sessionId?: string) {
  return database()
    .db.prepare(
      `SELECT * FROM evidence ${sessionId ? "WHERE session_id=?" : ""} ORDER BY created_at DESC LIMIT 500`,
    )
    .all(...(sessionId ? [sessionId] : []))
    .map((r) => ({ ...r, data: JSON.parse(String(r.json)), json: undefined }));
}
export function evidenceOnce(
  id: string,
  sessionId: string,
  value: unknown,
  at: string,
  conceptId: string | null = null,
) {
  database()
    .db.prepare(
      "INSERT OR IGNORE INTO evidence(id,session_id,concept_id,json,created_at) VALUES(?,?,?,?,?)",
    )
    .run(id, sessionId, conceptId, JSON.stringify(value), at);
}
export function correctEvidence(id: string, text: string) {
  const original = database()
    .db.prepare("SELECT session_id,concept_id FROM evidence WHERE id=?")
    .get(id);
  if (!original)
    throw new Error("The original learning evidence was not found.");
  if (typeof text !== "string" || !text.trim() || text.length > 20000)
    throw new Error("Write a correction of up to 20,000 characters.");
  return evidence(
    original.session_id as string | null,
    {
      type: "correction",
      corrects: id,
      text: text.trim(),
      provenance: { kind: "learner-correction" },
    },
    original.concept_id as string | null,
  );
}
export function reviewCards() {
  return database()
    .db.prepare("SELECT * FROM review_cards ORDER BY due")
    .all()
    .map((r) => ({
      ...JSON.parse(String(r.json)),
      id: r.id,
      conceptId: r.concept_id,
      due: r.due,
    }));
}
export function addReview(
  conceptId: string,
  title: string,
  prompt: string,
  answer: string,
  now = new Date(),
) {
  const existing = database()
    .db.prepare("SELECT id FROM review_cards WHERE concept_id=?")
    .get(conceptId);
  if (existing) return existing;
  const id = randomUUID(),
    card = scheduler.newCard({ now }),
    data = {
      id,
      conceptId,
      title,
      prompt,
      answer,
      card,
      scheduler: "ts-fsrs@6/FSRS-7",
      retention: 0.9,
    };
  database()
    .db.prepare(
      "INSERT INTO review_cards(id,concept_id,due,json) VALUES(?,?,?,?)",
    )
    .run(id, conceptId, now.toISOString(), JSON.stringify(data));
  return data;
}
export function rateReview(
  id: string,
  grade: number,
  now = new Date(),
  expectedDue?: string,
  attempt?: string,
) {
  if (![1, 2, 3, 4].includes(grade))
    throw new Error("Choose Again, Hard, Good, or Easy.");
  return database().transaction(() => {
    const row = database()
      .db.prepare("SELECT json,due FROM review_cards WHERE id=?")
      .get(id);
    if (!row) throw new Error("Review item not found");
    if (expectedDue && row.due !== expectedDue)
      throw new Error(
        "This review has already been scheduled. Refresh the queue.",
      );
    const data = JSON.parse(String(row.json));
    const card = data.card;
    for (const key of [
      "due",
      "dueAt",
      "lastReview",
      "lastReviewAt",
      "last_review",
      "reviewedAt",
    ])
      if (card[key]) card[key] = new Date(card[key]);
    const result = scheduler.review({
      card,
      grade: grade as 1 | 2 | 3 | 4,
      now,
    });
    data.card = result.card;
    const due = new Date(
      (result.card as any).dueAt ?? (result.card as any).due ?? now,
    );
    database()
      .db.prepare("UPDATE review_cards SET due=?,json=? WHERE id=?")
      .run(due.toISOString(), JSON.stringify(data), id);
    database()
      .db.prepare(
        "INSERT INTO review_logs(id,card_id,json,created_at) VALUES(?,?,?,?)",
      )
      .run(
        randomUUID(),
        id,
        JSON.stringify({ grade, now, result }),
        now.toISOString(),
      );
    evidence(
      null,
      { type: "review", cardId: id, grade, result, attempt },
      data.conceptId,
    );
    return { ...data, due: due.toISOString() };
  });
}
export function snoozeReview(id: string, now = new Date()) {
  database()
    .db.prepare("UPDATE review_cards SET due=? WHERE id=?")
    .run(new Date(now.getTime() + 86400000).toISOString(), id);
}
export async function previewImport(
  files: { id?: string; name: string; bytes: Uint8Array }[],
) {
  if (
    files.length > 32 ||
    files.reduce((n, f) => n + f.bytes.length, 0) > 256 * 1024 * 1024
  )
    throw new Error("Import up to 32 files and 256 MB per batch.");
  const out = [];
  for (const file of files) {
    try {
      if (file.bytes.length > 32 * 1024 * 1024)
        throw new Error("File exceeds the 32 MB import limit.");
      const digest = hash(file.bytes),
        ext = path.extname(file.name).toLowerCase();
      let pages: { page: number; text: string }[] = [];
      if ([".txt", ".md", ".markdown", ".csv", ".json", ".html"].includes(ext))
        pages = [{ page: 1, text: new TextDecoder().decode(file.bytes) }];
      else if (ext === ".pdf") {
        const pdfjs = await loadPdfjs();
        const task = pdfjs.getDocument({
          ...pdfOptions(),
          data: new Uint8Array(file.bytes),
          useSystemFonts: true,
        });
        const pdf = await task.promise;
        try {
          if (pdf.numPages > 200)
            throw new Error("Preview supports up to 200 pages per PDF.");
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const c = await page.getTextContent();
            pages.push({
              page: i,
              text: c.items.map((x: any) => x.str ?? "").join(" "),
            });
          }
        } finally {
          await task.destroy();
        }
      } else if (![".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext))
        throw new Error("Use text, Markdown, PDF, PNG, JPEG, WebP, or GIF.");
      let processingNote: string | undefined;
      if (pages.length === 0 || pages.some((p) => !p.text.trim())) {
        try {
          const recognized = await recognizeText(file.bytes, ext);
          if (recognized.length) {
            const byPage = new Map(pages.map((p) => [p.page, p]));
            for (const page of recognized)
              if (!byPage.get(page.page)?.text.trim())
                byPage.set(page.page, page);
            pages = [...byPage.values()].sort((a, b) => a.page - b.page);
          }
        } catch (e) {
          processingNote =
            "On-device text recognition was unavailable. The original is preserved for a vision-capable learning model.";
        }
      }
      const duplicate = database().get("asset", digest) !== null;
      out.push({
        id: file.id ?? randomUUID(),
        name: path.basename(file.name),
        digest,
        ext,
        bytes: file.bytes.length,
        pages,
        text: pages.map((p) => p.text).join("\n\n"),
        duplicate,
        image: [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext),
        needsVision: pages.length === 0 || pages.some((p) => !p.text.trim()),
        status: "ready",
        processingNote,
        anchors: pages.map((p) => ({
          source: digest,
          page: p.page,
          method: (p as any).method ?? "text",
          lines: (p as any).lines ?? [],
        })),
      });
    } catch (e) {
      out.push({
        id: file.id ?? randomUUID(),
        name: file.name,
        status: "error",
        error: (e as Error).message,
      });
    }
  }
  return out;
}
export function commitImport(item: any, bytes: Uint8Array) {
  if (
    !/^[a-f0-9]{64}$/.test(item.digest) ||
    ![
      ".txt",
      ".md",
      ".markdown",
      ".csv",
      ".json",
      ".html",
      ".pdf",
      ".png",
      ".jpg",
      ".jpeg",
      ".webp",
      ".gif",
    ].includes(item.ext) ||
    item.name !== path.basename(item.name)
  )
    throw new Error("Invalid material metadata; preview the file again.");
  if (hash(bytes) !== item.digest)
    throw new Error("The selected file changed; preview it again.");
  const existing = database().get<any>("asset", item.digest);
  if (existing && existing.ext !== item.ext)
    throw new Error(
      "This material is already saved with a different file type. Inspect the existing source.",
    );
  const directory = path.join(database().directory, "assets");
  fs.mkdirSync(directory, { recursive: true });
  const name = item.digest + item.ext;
  try {
    fs.writeFileSync(path.join(directory, name), bytes, { flag: "wx" });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    if (hash(fs.readFileSync(path.join(directory, name))) !== item.digest)
      throw new Error("An existing material failed its integrity check.");
  }
  const data = {
    ...item,
    path: "assets/" + name,
    importedAt: new Date().toISOString(),
  };
  if (existing) {
    data.id = existing.id;
    data.name = existing.name;
    data.importedAt = existing.importedAt;
  }
  database().put("asset", item.digest, data);
  database().index("asset", item.digest, data.name, data.text);
  return data;
}
/** Render only content-addressed library assets; never follow a path from an imported record. */
export async function materialPage(id: string, pageNumber: number) {
  const asset = database().get<any>("asset", id);
  if (
    !asset ||
    !/^[a-f0-9]{64}$/.test(id) ||
    asset.digest !== id ||
    !/^\.(pdf|png|jpg|jpeg|webp|gif|txt|md|markdown|csv|json|html)$/.test(
      asset.ext,
    )
  )
    throw new Error("Material not found");
  if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > 200)
    throw new Error("Invalid source page");
  const file = path.join(database().directory, "assets", id + asset.ext),
    bytes = fs.readFileSync(file);
  if (hash(bytes) !== id) throw new Error("Source integrity check failed");
  const page = asset.pages?.find((p: any) => p.page === pageNumber) ?? {
    page: pageNumber,
    text: "",
  };
  let image: string | undefined;
  if (asset.ext === ".pdf") {
    const pdfjs = await loadPdfjs(),
      task = pdfjs.getDocument({
        ...pdfOptions(),
        data: new Uint8Array(bytes),
      });
    try {
      const pdf = await task.promise;
      if (pageNumber > pdf.numPages) throw new Error("Page not found");
      const source = await pdf.getPage(pageNumber),
        natural = source.getViewport({ scale: 1 }),
        viewport = source.getViewport({
          scale: Math.min(1.5, 1600 / Math.max(natural.width, natural.height)),
        });
      const { createCanvas } = await import("@napi-rs/canvas"),
        canvas = createCanvas(
          Math.ceil(viewport.width),
          Math.ceil(viewport.height),
        );
      await source.render({
        canvas: canvas as any,
        canvasContext: canvas.getContext("2d") as any,
        viewport,
      }).promise;
      image =
        "data:image/png;base64," +
        canvas.toBuffer("image/png").toString("base64");
    } finally {
      await task.destroy();
    }
  } else if (asset.image)
    image =
      "data:" +
      (
        {
          ".png": "image/png",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".webp": "image/webp",
          ".gif": "image/gif",
        } as Record<string, string>
      )[asset.ext] +
      ";base64," +
      bytes.toString("base64");
  return {
    ...page,
    image,
    text: page.text,
    anchor: asset.anchors?.find((p: any) => p.page === pageNumber),
  };
}
export async function createBackup(): Promise<Uint8Array> {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-backup-"));
  try {
    const file = path.join(temp, "library.sqlite");
    database().snapshot(file);
    const entries: Record<string, Uint8Array> = {
      "library.sqlite": new Uint8Array(fs.readFileSync(file)),
    };
    for (const dir of ["assets", "prompts"]) {
      const walk = (folder: string, relative: string) => {
        if (!fs.existsSync(folder)) return;
        for (const f of fs.readdirSync(folder, { withFileTypes: true })) {
          if (f.isSymbolicLink()) continue;
          const p = path.join(folder, f.name),
            r = relative + "/" + f.name;
          if (f.isDirectory()) walk(p, r);
          else entries[r] = new Uint8Array(fs.readFileSync(p));
        }
      };
      walk(path.join(database().directory, dir), dir);
    }
    const manifest = {
      version: 1,
      app: "CoquiLearn",
      createdAt: new Date().toISOString(),
      files: Object.fromEntries(
        Object.entries(entries).map(([k, v]) => [
          k,
          { bytes: v.length, sha256: hash(v) },
        ]),
      ),
    };
    entries["manifest.json"] = strToU8(JSON.stringify(manifest));
    const archive = zipSync(entries, { level: 6 });
    stageBackup(archive, path.join(temp, "verification"));
    return archive;
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}
/** In-process compatibility adapter for isolated storage tests. The desktop host quiesces/restarts the utility process. */
export function restoreBackup(bytes: Uint8Array) {
  const directory = database().directory;
  if (path.basename(directory) !== "library")
    throw new Error("Use the host restore boundary for this data directory.");
  const transaction = prepareRestore(path.dirname(directory), bytes);
  closeDatabase();
  try {
    transaction.install();
    database();
    transaction.commit();
    return { restored: true, records: transaction.records };
  } catch (error) {
    closeDatabase();
    transaction.rollback();
    database();
    throw error;
  }
}

export function captureDeletion() {
  const db2 = database();
  const id = randomUUID();
  const data = {
    records: db2.db.prepare("SELECT * FROM records").all(),
    ledgers: db2.db.prepare("SELECT * FROM ledgers").all(),
    preferences: db2.db.prepare("SELECT * FROM preferences").all(),
  };
  db2.db
    .prepare("INSERT INTO tombstones(id,json,created_at) VALUES(?,?,?)")
    .run(id, JSON.stringify(data), /* @__PURE__ */ new Date().toISOString());
  return id;
}

/** Compact a deletion snapshot to this action's removed rows before exposing Undo. */
export function finalizeDeletion(id: string, removedSources: string[] = []) {
  const d = database(),
    row = d.db.prepare("SELECT json FROM tombstones WHERE id=?").get(id);
  if (!row) return;
  const before = JSON.parse(String(row.json));
  const records = before.records.filter(
    (r: any) => r.deleted_at === null && !d.get(r.kind, r.id),
  );
  const ledgers = before.ledgers.filter(
    (r: any) =>
      !d.db
        .prepare("SELECT 1 FROM ledgers WHERE kind=? AND json=?")
        .get(r.kind, r.json),
  );
  const currentNodes = new Set(d.ledger<any>("nodes").map((n) => n.id));
  const deletedNodeIds = [
    ...new Set<string>(
      before.ledgers
        .filter((r: any) => r.kind === "nodes")
        .map((r: any) => JSON.parse(r.json).id),
    ),
  ].filter((id) => !currentNodes.has(id));
  const positionsBefore = JSON.parse(
      before.preferences.find((r: any) => r.id === "positions")?.json ?? "{}",
    ),
    positionsNow = d.preference<Record<string, unknown>>("positions") ?? {};
  const positions = Object.fromEntries(
    Object.entries(positionsBefore).filter(
      ([id]) => !Object.hasOwn(positionsNow, id),
    ),
  );
  for (const nodeId of deletedNodeIds)
    d.setPreference("deleted-node:" + nodeId, id);
  for (const record of records)
    d.setPreference("deleted-record:" + record.kind + ":" + record.id, id);
  for (const sourceId of removedSources)
    d.setPreference("deleted-source:" + sourceId, id);
  d.db.prepare("UPDATE tombstones SET json=? WHERE id=?").run(
    JSON.stringify({
      records,
      ledgers,
      positions,
      deletedNodeIds,
      finalized: true,
    }),
    id,
  );
}
/** The mutation and its completed Undo record form one durable SQLite action. */
export function commitDeletion<T extends { ok: boolean }>(
  action: () => T,
  removedSources: string[] = [],
): T & { undoId?: string } {
  return database().transaction(() => {
    const undoId = captureDeletion();
    const result = action();
    if (!result.ok) {
      database().db.prepare("DELETE FROM tombstones WHERE id=?").run(undoId);
      return result;
    }
    finalizeDeletion(undoId, removedSources);
    return { ...result, undoId };
  });
}
export function undoDeletion(id: string) {
  const d = database(),
    r = d.db.prepare("SELECT json FROM tombstones WHERE id=?").get(id);
  if (!r) throw new Error("Undo record not found");
  const snap = JSON.parse(String(r.json));
  if (!snap.finalized)
    throw new Error(
      "This deletion did not finish. Reopen the library before restoring it.",
    );
  d.transaction(() => {
    for (const row of snap.records) {
      const current = d.db
        .prepare("SELECT deleted_at,json FROM records WHERE kind=? AND id=?")
        .get(row.kind, row.id);
      let restored = false;
      if (!current) {
        d.put(row.kind, row.id, JSON.parse(row.json));
        restored = true;
      } else if (current.deleted_at !== null) {
        const owner = d.preference<string>(
          "deleted-record:" + row.kind + ":" + row.id,
        );
        if (owner && owner !== id) continue;
        d.db
          .prepare("UPDATE records SET deleted_at=NULL WHERE kind=? AND id=?")
          .run(row.kind, row.id);
        restored = true;
      }
      if (restored && row.kind === "chat") {
        if (d.preference("deleted-source:" + row.id) === id)
          d.db
            .prepare("DELETE FROM preferences WHERE id=?")
            .run("deleted-source:" + row.id);
        const record = JSON.parse(String(current?.json ?? row.json));
        d.index(
          "chat",
          row.id,
          record.title,
          JSON.stringify(record.messages ?? []),
        );
      }
    }
    for (const nodeId of snap.deletedNodeIds ?? []) {
      const key = "deleted-node:" + nodeId;
      if (d.preference(key) === id)
        d.db.prepare("DELETE FROM preferences WHERE id=?").run(key);
    }
    // An earlier Undo may depend on a node/source still deleted by a later action.
    // Retain those assertions across restart, without resurrecting the other action.
    type LedgerRow = { kind: string; json: string };
    const queue: LedgerRow[] = [
      ...(d.preference<LedgerRow[]>("undo-deferred-ledgers") ?? []),
      ...snap.ledgers,
    ];
    const deferred = new Map<string, LedgerRow>();
    const alive = new Set(d.ledger<any>("nodes").map((n) => n.id));
    const sourceBlocked = (sourceId: string) =>
      !!d.preference("deleted-source:" + sourceId);
    for (const row of queue.sort(
      (a, b) => Number(b.kind === "nodes") - Number(a.kind === "nodes"),
    )) {
      let value = JSON.parse(row.json);
      const blockedNode =
        row.kind === "nodes" && d.preference("deleted-node:" + value.id);
      const blockedChain =
        row.kind === "chains" &&
        (!alive.has(value.conclusion) ||
          !value.premises.every((nodeId: string) => alive.has(nodeId)));
      const points = value.provenance as
        { chatId: string; messageId: string }[] | undefined;
      const allowed = points?.filter((p) => !sourceBlocked(p.chatId));
      const blockedSource = points
        ? allowed!.length !== points.length
        : value.chatId && sourceBlocked(value.chatId);
      if (blockedNode || blockedChain || blockedSource)
        deferred.set(row.kind + ":" + row.json, row);
      if (
        blockedNode ||
        blockedChain ||
        (blockedSource && (!points || !allowed!.length))
      )
        continue;
      if (blockedSource) value = { ...value, provenance: allowed };
      const json = JSON.stringify(value);
      if (
        !d.db
          .prepare("SELECT 1 FROM ledgers WHERE kind=? AND json=?")
          .get(row.kind, json)
      )
        d.append(row.kind, value);
      if (row.kind === "nodes") {
        alive.add(value.id);
        d.index("concept", value.id, value.name, value.statement);
      }
    }
    for (const chain of d.ledger<any>("chains"))
      if (
        chain.premises.length > 1 &&
        alive.has(chain.conclusion) &&
        chain.premises.every((nodeId: string) => alive.has(nodeId))
      )
        alive.add(chain.id);
    const positionCandidates = {
      ...(d.preference<Record<string, unknown>>("undo-deferred-positions") ??
        {}),
      ...snap.positions,
    };
    d.setPreference("positions", {
      ...Object.fromEntries(
        Object.entries(positionCandidates).filter(([nodeId]) =>
          alive.has(nodeId),
        ),
      ),
      ...(d.preference("positions") ?? {}),
    });
    d.setPreference(
      "undo-deferred-positions",
      Object.fromEntries(
        Object.entries(positionCandidates).filter(
          ([nodeId]) => !alive.has(nodeId),
        ),
      ),
    );
    d.setPreference("undo-deferred-ledgers", [...deferred.values()]);
    d.bumpGraphRevision();
    d.db.prepare("DELETE FROM tombstones WHERE id=?").run(id);
  });
  return { restored: true };
}
export function undoHistory(
  offset = 0,
): import("../contracts/index.ts").UndoHistory {
  const start = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
  const rows = database()
    .db.prepare(
      "SELECT id,json,created_at FROM tombstones WHERE json_extract(json,'$.finalized')=1 ORDER BY created_at DESC,rowid DESC LIMIT 26 OFFSET ?",
    )
    .all(start);
  const actions = rows.flatMap((row) => {
    const snapshot = JSON.parse(String(row.json));
    if (!snapshot.finalized) return [];
    const chats = snapshot.records.filter(
      (r: { kind: string }) => r.kind === "chat",
    );
    const concepts = new Set(snapshot.deletedNodeIds ?? []).size;
    return [
      {
        id: String(row.id),
        title: chats.length
          ? (JSON.parse(chats[0].json).title ?? "Deleted session")
          : concepts + (concepts === 1 ? " deleted idea" : " deleted ideas"),
        createdAt: String(row.created_at),
        sessions: chats.length,
        concepts,
      },
    ];
  });
  return {
    items: actions.slice(0, 25),
    nextOffset: start + 25,
    hasMore: actions.length > 25,
  };
}
