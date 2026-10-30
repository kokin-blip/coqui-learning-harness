import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";

/** SQLite is owned by the learning process. No database handle crosses IPC. */
export class CoquiDatabase {
  readonly db: DatabaseSync;
  constructor(readonly directory: string) {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path.join(directory, "coquilearn.sqlite"));
    const version = this.db.prepare("PRAGMA user_version").get() as {
      user_version: number;
    };
    if (version.user_version > 1) {
      this.db.close();
      throw new Error("This library needs a newer version of CoquiLearn.");
    }
    this.db.exec(
      "PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000",
    );
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS records (kind TEXT NOT NULL, id TEXT NOT NULL, json TEXT NOT NULL, deleted_at TEXT, PRIMARY KEY(kind,id));
      CREATE TABLE IF NOT EXISTS ledgers (sequence INTEGER PRIMARY KEY, kind TEXT NOT NULL, json TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS ledger_kind ON ledgers(kind,sequence);
      CREATE TABLE IF NOT EXISTS preferences (id TEXT PRIMARY KEY, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS operations (id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, state TEXT NOT NULL, json TEXT, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS events (sequence INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, json TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS evidence (id TEXT PRIMARY KEY, session_id TEXT, concept_id TEXT, json TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS review_cards (id TEXT PRIMARY KEY, concept_id TEXT NOT NULL UNIQUE, due TEXT NOT NULL, json TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS review_logs (id TEXT PRIMARY KEY, card_id TEXT NOT NULL, json TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS tombstones (id TEXT PRIMARY KEY, json TEXT NOT NULL, created_at TEXT NOT NULL);
      CREATE VIRTUAL TABLE IF NOT EXISTS search_index USING fts5(kind UNINDEXED, id UNINDEXED, title, body);
      PRAGMA user_version=1;
    `);
  }
  get<T>(kind: string, id: string, includeDeleted = false): T | null {
    const row = this.db
      .prepare(
        `SELECT json FROM records WHERE kind=? AND id=? ${includeDeleted ? "" : "AND deleted_at IS NULL"}`,
      )
      .get(kind, id) as { json: string } | undefined;
    return row ? JSON.parse(row.json) : null;
  }
  put(kind: string, id: string, value: unknown) {
    this.db
      .prepare(
        "INSERT INTO records(kind,id,json) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET json=excluded.json",
      )
      .run(kind, id, JSON.stringify(value));
  }
  all<T>(kind: string): T[] {
    return (
      this.db
        .prepare(
          "SELECT json FROM records WHERE kind=? AND deleted_at IS NULL ORDER BY rowid",
        )
        .all(kind) as { json: string }[]
    ).map((r) => JSON.parse(r.json));
  }
  remove(kind: string, id: string) {
    this.db
      .prepare("DELETE FROM search_index WHERE kind=? AND id=?")
      .run(kind, id);
    return Number(
      this.db
        .prepare(
          "UPDATE records SET deleted_at=? WHERE kind=? AND id=? AND deleted_at IS NULL",
        )
        .run(new Date().toISOString(), kind, id).changes,
    );
  }
  preference<T>(id: string): T | null {
    const row = this.db
      .prepare("SELECT json FROM preferences WHERE id=?")
      .get(id) as { json: string } | undefined;
    return row ? JSON.parse(row.json) : null;
  }
  setPreference(id: string, value: unknown) {
    this.db
      .prepare(
        "INSERT INTO preferences(id,json) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET json=excluded.json",
      )
      .run(id, JSON.stringify(value));
  }
  bumpGraphRevision() {
    this.setPreference(
      "graph-revision",
      Math.max(
        (this.preference<number>("graph-revision") ?? 0) + 1,
        Date.now(),
      ),
    );
  }
  append(kind: string, value: unknown) {
    this.transaction(() => {
      this.db
        .prepare("INSERT INTO ledgers(kind,json) VALUES(?,?)")
        .run(kind, JSON.stringify(value));
      this.bumpGraphRevision();
    });
  }
  ledger<T>(kind: string): T[] {
    return (
      this.db
        .prepare("SELECT json FROM ledgers WHERE kind=? ORDER BY sequence")
        .all(kind) as { json: string }[]
    ).map((r) => JSON.parse(r.json));
  }
  rewrite(kind: string, values: unknown[]) {
    this.transaction(() => {
      this.db.prepare("DELETE FROM ledgers WHERE kind=?").run(kind);
      for (const v of values) this.append(kind, v);
      this.bumpGraphRevision();
    });
  }
  transaction<T>(fn: () => T): T {
    const nested = this.db.isTransaction;
    const savepoint = "coqui_" + randomUUID().replaceAll("-", "");
    this.db.exec(nested ? `SAVEPOINT ${savepoint}` : "BEGIN IMMEDIATE");
    try {
      const value = fn();
      this.db.exec(nested ? `RELEASE ${savepoint}` : "COMMIT");
      return value;
    } catch (e) {
      this.db.exec(
        nested ? `ROLLBACK TO ${savepoint}; RELEASE ${savepoint}` : "ROLLBACK",
      );
      throw e;
    }
  }
  index(kind: string, id: string, title: string, body: string) {
    this.db
      .prepare("DELETE FROM search_index WHERE kind=? AND id=?")
      .run(kind, id);
    this.db
      .prepare("INSERT INTO search_index(kind,id,title,body) VALUES(?,?,?,?)")
      .run(kind, id, title, body);
  }
  search(query: string) {
    if (!query.trim()) return [];
    const literal = '"' + query.replaceAll('"', '""') + '"';
    return this.db
      .prepare(
        "SELECT kind,id,title,snippet(search_index,3,'','','…',28) AS excerpt FROM search_index WHERE search_index MATCH ? LIMIT 60",
      )
      .all(literal);
  }
  recordEvent(type: string, value: unknown) {
    const r = this.db
      .prepare("INSERT INTO events(type,json,created_at) VALUES(?,?,?)")
      .run(type, JSON.stringify(value), new Date().toISOString());
    return Number(r.lastInsertRowid);
  }
  eventsAfter(sequence: number) {
    return this.db
      .prepare(
        "SELECT sequence,type,json FROM events WHERE sequence>? ORDER BY sequence LIMIT 1000",
      )
      .all(sequence)
      .map((r) => ({
        sequence: Number(r.sequence),
        type: r.type,
        data: JSON.parse(String(r.json)),
      }));
  }
  snapshot(file: string) {
    this.db.exec("VACUUM main INTO \'" + file.replaceAll("\'", "\'\'") + "\'");
    const b = fs.readFileSync(file);
    return {
      sha256: createHash("sha256").update(b).digest("hex"),
      bytes: b.length,
    };
  }
  close() {
    this.db.close();
  }
}
let instance: CoquiDatabase | undefined;
export function database() {
  return (instance ??= new CoquiDatabase(
    process.env.COQUI_DATA_DIR ??
      process.env.LH_DATA_DIR ??
      path.resolve("data"),
  ));
}

/** Only the host restore boundary closes/replaces a library. */
export function closeDatabase() {
  if (instance) {
    instance.close();
    instance = undefined;
  }
}
