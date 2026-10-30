import { test, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-ports-"));
process.env.COQUI_DATA_DIR = dir;
process.env.LH_DATA_DIR = dir;
const { chatStore } = await import("../packages/engine/src/store/chats.ts");
const { jobStore } = await import("../packages/engine/src/store/jobs.ts");
const { graphStore } = await import("../packages/engine/src/store/graph.ts");
const { database } = await import("../packages/storage/index.ts");
const { captureDeletion, finalizeDeletion, undoDeletion } =
  await import("../packages/storage/library.ts");
after(() => {
  database().close();
  fs.rmSync(dir, { recursive: true, force: true });
});
test("Adapted ChatStore keeps native history, numeric confidence and immutable activity order on rename", () => {
  const chat = chatStore.createChat("Gradient");
  chatStore.saveMessages(chat.id, [
    {
      role: "user",
      id: "user-1",
      content: "Why gradients?",
      timestamp: 0,
    } as any,
  ]);
  const first = chatStore.getChat(chat.id)!;
  chatStore.renameChat(chat.id, "Why gradients work");
  assert.equal(chatStore.getChat(chat.id)!.updatedAt, first.updatedAt);
  assert.equal(
    chatStore.listChats().find((c) => c.id === chat.id)!.messageCount,
    1,
  );
});
test("Job dispatch is deduplicated by session and call identity", () => {
  const create = jobStore.createJob;
  const a = create({
    kind: "research",
    chatId: "session",
    toolCallId: "tool-1",
    input: { brief: "Test" },
  });
  const b = create({
    kind: "research",
    chatId: "session",
    toolCallId: "tool-1",
    input: { brief: "Test" },
  });
  assert.equal(a.id, b.id);
  assert.equal(jobStore.listJobs("session").length, 1);
});
test("Graph ledger replacement is atomic and does not conflate evidence with propositions", () => {
  graphStore.appendCoverage({
    chatId: "one",
    fp: "committed",
    tokens: 12,
    foldedAt: new Date().toISOString(),
  });
  assert.throws(() =>
    database().transaction(() => {
      graphStore.rewriteLedgers({ coverage: [] });
      throw new Error("failed merge");
    }),
  );
  assert.equal(graphStore.readCoverage()[0]!.fp, "committed");
});
test("Deleted sessions disappear from search and can be restored without overwriting newer records", () => {
  const c = chatStore.createChat("Recoverable history");
  const undo = captureDeletion();
  chatStore.deleteChat(c.id);
  finalizeDeletion(undo);
  assert.equal(chatStore.getChat(c.id), null);
  assert.equal(database().search("Recoverable").length, 0);
  const newer = chatStore.createChat("New work");
  undoDeletion(undo);
  assert.ok(chatStore.getChat(c.id));
  assert.ok(chatStore.getChat(newer.id));
});

test("Undoing an earlier deletion does not resurrect a later independent deletion", () => {
  const a = chatStore.createChat("First deletion"),
    b = chatStore.createChat("Second deletion");
  const first = captureDeletion();
  chatStore.deleteChat(a.id);
  finalizeDeletion(first);
  const second = captureDeletion();
  chatStore.deleteChat(b.id);
  finalizeDeletion(second);
  undoDeletion(first);
  assert.ok(chatStore.getChat(a.id));
  assert.equal(chatStore.getChat(b.id), null);
  undoDeletion(second);
  assert.ok(chatStore.getChat(b.id));
});

test("Vault-backed API keys retain file provenance and are removed from the inference environment on disconnect", async () => {
  const { configureSecretStore, flushSecrets } =
    await import("../packages/engine/src/store/auth.ts");
  const { initAuthEnv, keyStatuses, deleteKey } =
    await import("../packages/engine/src/server/keys.ts");
  const { authEnvRecord } =
    await import("../packages/engine/src/core/auth-env.ts");
  const key = "TAVILY_API_KEY";
  delete process.env[key];
  authEnvRecord().realEnv.delete(key);
  authEnvRecord().fillGap.delete(key);
  let stored: any;
  configureSecretStore(
    { [key]: "tvly-test-only-never-used" },
    async (value) => {
      stored = value;
    },
  );
  initAuthEnv();
  assert.equal(keyStatuses().find((k) => k.id === key)?.source, "file");
  deleteKey(key);
  await flushSecrets();
  assert.equal(process.env[key], undefined);
  assert.equal(stored[key], undefined);
});

test("Failed credential persistence rolls back the inference environment", async () => {
  const { configureSecretStore, flushSecrets } =
    await import("../packages/engine/src/store/auth.ts");
  const { initAuthEnv, saveKey, reconcileAuthEnv } =
    await import("../packages/engine/src/server/keys.ts");
  const { authEnvRecord } =
    await import("../packages/engine/src/core/auth-env.ts");
  const key = "TAVILY_API_KEY";
  delete process.env[key];
  authEnvRecord().realEnv.delete(key);
  authEnvRecord().fillGap.delete(key);
  configureSecretStore({ [key]: "tvly-previous-test-only" }, async () => {
    throw new Error("Vault unavailable");
  });
  initAuthEnv();
  assert.equal(saveKey(key, "tvly-" + "x".repeat(32)).ok, true);
  await assert.rejects(flushSecrets(), /Vault unavailable/);
  reconcileAuthEnv();
  assert.equal(process.env[key], "tvly-previous-test-only");
  configureSecretStore({}, async () => {});
  delete process.env[key];
  authEnvRecord().fillGap.delete(key);
});

test("Overlapping node deletion undos restore a chain once all endpoints return, including after restart", async () => {
  const { deleteGraphNode } =
    await import("../packages/engine/src/server/graph.ts");
  const { getGraph } = await import("../packages/engine/src/core/graph.ts");
  const { closeDatabase } = await import("../packages/storage/index.ts");
  const prefix = crypto.randomUUID();
  const a = prefix + "a",
    b = prefix + "b";
  for (const id of [a, b])
    graphStore.appendNode({
      id,
      name: id,
      statement: id,
      aliases: [],
      createdAt: new Date().toISOString(),
      provenance: [],
    });
  graphStore.appendChain({
    id: prefix + "chain",
    premises: [a],
    conclusion: b,
    createdAt: new Date().toISOString(),
    provenance: [],
  });
  const first = captureDeletion();
  assert.ok(deleteGraphNode(a).ok);
  finalizeDeletion(first);
  const second = captureDeletion();
  assert.ok(deleteGraphNode(b).ok);
  finalizeDeletion(second);
  closeDatabase();
  undoDeletion(first);
  assert.ok(graphStore.readNodes().some((n) => n.id === a));
  assert.ok(!graphStore.readNodes().some((n) => n.id === b));
  assert.ok(!graphStore.readChains().some((n) => n.id === prefix + "chain"));
  closeDatabase();
  undoDeletion(second);
  assert.ok(
    graphStore.readChains().some((n) => n.id === prefix + "chain"),
    "earlier deferred chain must survive until its other endpoint is restored",
  );
});

test("A failed session deletion rolls back graph, jobs, record and Undo together", async () => {
  const { deleteChatSession } =
    await import("../packages/engine/src/server/chats.ts");
  const chat = chatStore.createChat("Atomic deletion failure");
  const node = {
    id: crypto.randomUUID(),
    name: "Atomic node",
    statement: "Must survive",
    aliases: [],
    createdAt: new Date().toISOString(),
    provenance: [{ chatId: chat.id, messageId: "source" }],
  };
  graphStore.appendNode(node);
  graphStore.appendCoverage({
    chatId: chat.id,
    fp: "before",
    tokens: 10,
    foldedAt: new Date().toISOString(),
  });
  const job = jobStore.createJob({
    chatId: chat.id,
    toolCallId: "finished",
    kind: "research",
  });
  jobStore.updateJob(job.id, { status: "done" });
  const tombstones = database()
    .db.prepare("SELECT count(*) AS n FROM tombstones")
    .get()!.n;
  database().db.exec(
    `CREATE TEMP TRIGGER refuse_deletion BEFORE UPDATE OF deleted_at ON records WHEN OLD.id='${chat.id}' BEGIN SELECT RAISE(ABORT,'injected deletion failure'); END;`,
  );
  try {
    await assert.rejects(
      () => deleteChatSession(chat.id, "delete-nodes"),
      /injected deletion failure/,
    );
  } finally {
    database().db.exec("DROP TRIGGER refuse_deletion");
  }
  assert.ok(chatStore.getChat(chat.id));
  assert.ok(
    graphStore.readNodes().some((n) => n.id === node.id),
    "graph survives failed deletion",
  );
  assert.ok(graphStore.readCoverage().some((c) => c.chatId === chat.id));
  assert.ok(jobStore.getJob(job.id));
  assert.equal(
    database().db.prepare("SELECT count(*) AS n FROM tombstones").get()!.n,
    tombstones,
  );
});

test("Saved turn input and recovery intent are atomic even before turn-started notification", () => {
  const chat = chatStore.createChat("Write-ahead intent");
  const input = {
    id: "atomic-input",
    role: "user",
    content: "Persist before inference",
    timestamp: Date.now(),
  } as any;
  chatStore.saveTurnInput!(chat.id, [input]);
  assert.equal(
    database().preference<any>("turn-state:" + chat.id)?.state,
    "running",
  );
  assert.equal(chatStore.getChat(chat.id)!.messages[0]!.id, input.id);
});

test("Undoing source A while source B remains deleted does not resurrect B provenance or nodes", async () => {
  const { deleteChatSession } =
    await import("../packages/engine/src/server/chats.ts");
  const a = chatStore.createChat("Source undo A"),
    b = chatStore.createChat("Source undo B");
  const shared = crypto.randomUUID(),
    onlyB = crypto.randomUUID();
  for (const [id, chatId, name] of [
    [shared, a.id, "Shared identity"],
    [shared, b.id, "B phrasing"],
    [onlyB, b.id, "B only"],
  ])
    graphStore.appendNode({
      id,
      name,
      statement: name,
      aliases: [],
      createdAt: new Date().toISOString(),
      provenance: [{ chatId, messageId: chatId }],
    });
  const first = await deleteChatSession(a.id, "delete-nodes");
  assert.ok(first.ok && first.undoId);
  const second = await deleteChatSession(b.id, "delete-nodes");
  assert.ok(second.ok && second.undoId);
  undoDeletion(first.undoId!);
  assert.ok(chatStore.getChat(a.id));
  assert.equal(chatStore.getChat(b.id), null);
  assert.ok(!graphStore.readNodes().some((n) => n.id === onlyB));
  assert.ok(
    !graphStore
      .readNodes()
      .some((n) => n.provenance.some((p) => p.chatId === b.id)),
  );
  undoDeletion(second.undoId!);
  assert.ok(graphStore.readNodes().some((n) => n.id === onlyB));
  assert.ok(
    graphStore
      .readNodes()
      .some(
        (n) => n.id === shared && n.provenance.some((p) => p.chatId === a.id),
      ),
  );
  assert.ok(
    graphStore
      .readNodes()
      .some(
        (n) => n.id === shared && n.provenance.some((p) => p.chatId === b.id),
      ),
  );
});

test("A thousand-session library retains newer edits, overlapping Undo and search after restart", async () => {
 const {closeDatabase}=await import('../packages/storage/index.ts');
 const prefix='Scale '+crypto.randomUUID();const ids:string[]=[];
 database().transaction(()=>{for(let i=0;i<1000;i++){const c=chatStore.createChat(prefix+' '+i);chatStore.saveMessages(c.id,[{id:'input-'+i,role:'user',content:'A durable learner explanation '+i,timestamp:i} as any]);ids.push(c.id);}});
 const first=captureDeletion();for(const id of ids.slice(0,100))chatStore.deleteChat(id);finalizeDeletion(first);
 const second=captureDeletion();for(const id of ids.slice(100,200))chatStore.deleteChat(id);finalizeDeletion(second);
 chatStore.renameChat(ids[250]!,'Newer edit stays');closeDatabase();undoDeletion(first);
 assert.ok(ids.slice(0,100).every(id=>chatStore.getChat(id)));
 assert.ok(ids.slice(100,200).every(id=>!chatStore.getChat(id)));
 assert.equal(chatStore.getChat(ids[250]!)!.title,'Newer edit stays');
 assert.ok(database().search(prefix+' 0').some(r=>r.id===ids[0]));
 closeDatabase();undoDeletion(second);assert.ok(ids.every(id=>chatStore.getChat(id)));
 assert.equal(database().db.prepare('PRAGMA integrity_check').get()!.integrity_check,'ok');
});

test("Graph deletion removes stale concept search entries while shared-source identity stays searchable", async () => {
 const {deleteGraphNode}=await import('../packages/engine/src/server/graph.ts');
 const {deleteChatSession}=await import('../packages/engine/src/server/chats.ts');
 const a=chatStore.createChat('Search source A'),b=chatStore.createChat('Search source B');
 const first=crypto.randomUUID(), shared=crypto.randomUUID();
 for(const [id,name,chatId,aliases] of [[first,'Deleted search identity',a.id,[]],[shared,'Shared search identity',a.id,['Removed phrasing unique']],[shared,'Still shared',b.id,['Surviving wording unique']]] as const)graphStore.appendNode({id,name,statement:name,aliases:[...aliases],createdAt:new Date().toISOString(),provenance:[{chatId,messageId:'origin'}]});
 assert.ok(database().search('Deleted search identity').some(r=>r.id===first));
 const removed=deleteGraphNode(first);assert.ok(removed.ok);assert.ok(!database().search('Deleted search identity').some(r=>r.id===first));
 await deleteChatSession(a.id,'delete-nodes');
 assert.ok(database().search('Shared search identity').some(r=>r.id===shared));
 assert.ok(!database().search('Removed phrasing unique').some(r=>r.id===shared));
 assert.ok(database().search('Surviving wording unique').some(r=>r.id===shared));
});
