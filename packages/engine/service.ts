import { configureConnectionBackgroundPolicy } from "./src/agent/subscription-connections.ts";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { database } from "../storage/index.ts";
import * as library from "../storage/library.ts";
import {
  configureWebSubscriptionRuntime,
  publishWebSubscriptionPacket,
} from "./src/agent/subscription-runtime.ts";
import { configureSecretStore, flushSecrets } from "./src/store/auth.ts";
import { subscribe, emit } from "./src/core/events.ts";
import { projectView } from "./src/core/view.ts";
import {
  danglingQuestionOf,
  activeProblemOf,
} from "./src/core/native-messages.ts";
import { routes } from "./routes.generated.ts";
import type { DesktopRequest, DesktopResponse } from "../contracts/index.ts";
let maintenance = process.env.COQUI_MAINTENANCE === "1";
const port = process.parentPort;
const send = (v: unknown) => port.postMessage(v);
const pending = new Map<
  string,
  { resolve: (v: any) => void; reject: (e: Error) => void }
>();
function host(op: string, fields: any = {}) {
  return new Promise<any>((resolve, reject) => {
    const id = randomUUID();
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("Desktop connection timed out."));
    }, 45000);
    pending.set(id, {
      resolve: (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      reject: (e) => {
        clearTimeout(timer);
        reject(e);
      },
    });
    send({ type: "private", id, op, fields });
  });
}
configureWebSubscriptionRuntime((channel, op, fields) =>
  host("subscription", { channel, op, fields }),
);
configureConnectionBackgroundPolicy(
  (provider) =>
    !maintenance &&
    (provider !== "claude-code" ||
      database().preference<any>("background-policy")?.[provider] !== false),
);
let sequence = 0;
let stateCursor = Number(
  (
    database()
      .db.prepare("SELECT coalesce(max(sequence),0) AS n FROM events")
      .get() as any
  ).n,
);
function event(type: string, data: any, streamId?: string) {
  const packet = {
    type,
    data,
    streamId,
    sequence: ++sequence,
    cursor: stateCursor,
  };
  send({ type: "event", event: packet });
}
subscribe((e) => {
  if (e.type === "turn-started")
    database().setPreference("turn-state:" + e.chatId, {
      state: "running",
      at: new Date().toISOString(),
    });
  if (e.type === "turn-settled" && e.chatId) {
    database().setPreference("turn-state:" + e.chatId, { state: "settled" });
    recordLearningEvidence(e.chatId);
    void recoverTeacherHandoff(e.chatId);
  }
  stateCursor = database().recordEvent(e.type, e);
  event(e.type, e);
});
async function recoverTeacherHandoff(chatId: string) {
  if (maintenance) return;
  const record = database().get<any>("chat", chatId);
  if (!record) return;
  const { probeHandoffOwed } =
    await import("./src/core/continuation-recovery.ts");
  const { isTurnRunning } = await import("./src/server/turn-liveness.ts");
  if (!isTurnRunning(chatId) && probeHandoffOwed(record)) {
    const { deliverJobResult } = await import("./src/server/jobs.ts");
    const { buildProbeHandoffSteer } =
      await import("./src/core/contracts/jobs.ts");
    void deliverJobResult(buildProbeHandoffSteer(chatId)).catch(() => {});
  }
}
function recordLearningEvidence(chatId: string) {
  const record = database().get<any>("chat", chatId);
  if (!record) return;
  const at = (timestamp: any) =>
    new Date(
      typeof timestamp === "number" ? timestamp : record.updatedAt,
    ).toISOString();
  for (const message of record.messages) {
    if (message.role === "toolResult" && message.details?.questionText)
      library.evidenceOnce(
        "answer:" + chatId + ":" + message.toolCallId,
        chatId,
        {
          type: "attempt",
          input: { answer: message.details },
          messageId: message.id,
          provenance: {
            kind: "committed-question",
            toolCallId: message.toolCallId,
          },
        },
        message.details.answeredAt ?? at(message.timestamp),
      );
    if (message.customType === "practice-thinking")
      library.evidenceOnce(
        "thinking:" + chatId + ":" + message.id,
        chatId,
        {
          type: message.details.text
            .toLowerCase()
            .includes("least revealing hint")
            ? "hint-request"
            : "thinking",
          input: { text: message.details.text },
          messageId: message.id,
          problemCallId: message.details.problemCallId,
          provenance: { kind: "learner" },
        },
        at(message.timestamp),
      );
  }
  // Feedback stays distinct from knowledge assertions and retains its author provenance.
  for (const view of projectView(record.messages)) {
    const source = record.messages.find((m: any) => m.id === view.id);
    for (const [i, part] of view.parts.entries())
      if (part.type === "tool-conclude")
        library.evidenceOnce(
          "outcome:" + chatId + ":" + view.id + ":" + i,
          chatId,
          {
            type: "feedback",
            feedback: (part.input as any)?.verdict,
            committedSolution: part.reveal,
            messageId: view.id,
            provenance: {
              provider: source?.provider,
              model: source?.model,
              kind: "practice-outcome",
            },
          },
          at(source?.timestamp),
        );
  }
}
const schema = z.object({
  path: z
    .string()
    .max(2048)
    .regex(/^\/(api|coqui)\//),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
  body: z.unknown().optional(),
  headers: z.object({ "if-match": z.string().max(200).optional() }).optional(),
  operationId: z.string().max(128).optional(),
});
const streams = new Map<string, ReadableStreamDefaultReader<Uint8Array>>();
let fixtureReadFailure: string | undefined;
async function streamResponse(
  response: Response,
  streamId: string,
  chatId?: string,
) {
  const reader = response.body!.getReader();
  streams.set(streamId, reader);
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let end;
      while ((end = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, end).trim();
        buffer = buffer.slice(end + 1);
        if (line.startsWith("data:")) {
          const text = line.slice(5).trim();
          if (text === "[DONE]") continue;
          try {
            event("stream", { chatId, event: JSON.parse(text) }, streamId);
          } catch {}
        }
      }
    }
  } finally {
    event("stream-end", { chatId }, streamId);
    streams.delete(streamId);
    reader.releaseLock();
  }
}
async function extra(req: DesktopRequest): Promise<any | undefined> {
  const url = new URL(req.path, "http://coqui.local"),
    method = req.method ?? "GET",
    body = req.body as any;
  switch (url.pathname) {
    case "/coqui/stream/cancel":
      await streams.get(body.streamId)?.cancel();
      return { ok: true };
    case "/coqui/graph/delete": {
      if (
        !Array.isArray(body.ids) ||
        !body.ids.length ||
        body.ids.length > 1000 ||
        body.ids.some((id: any) => typeof id !== "string")
      )
        throw new Error("Choose the ideas to delete.");
      const { deleteGraphNode } = await import("./src/server/graph.ts");
      return library.commitDeletion(() => {
          for (const id of new Set<string>(body.ids)) {
            const outcome = deleteGraphNode(id, false);
            if (!outcome.ok) throw new Error(outcome.error);
          }
          return { ok: true, deleted: new Set(body.ids).size };
      });
    }
    case "/coqui/fixture/runtime": {
      if (process.env.COQUI_FIXTURE_MODE !== "1") return undefined;
      const { realHeadless } =
        await import("./src/agent/subagents/headless.ts");
      const svg = await realHeadless.renderSvg(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="green"/></svg>',
      );
      const pdf = await realHeadless.renderPdfPages(
        path.join(
          process.env.COQUI_RESOURCE_ROOT!,
          "fixtures/sample-3page.pdf",
        ),
        [1],
      );
      const demo = await realHeadless.runDemo(
        "<!doctype html><script>window.result=2+2</script>",
        { settleMs: 30, probe: "window.result" },
      );
      return { svgBytes: svg.length, pdfBytes: pdf[0]?.png.length, demo };
    }
    case "/coqui/fixture/compaction": {
      if (process.env.COQUI_FIXTURE_MODE !== "1") return undefined;
      if (typeof body.chatId !== "string") throw new Error("Choose a fixture session.");
      return (await import("./fixture.ts")).fixtureCompaction(body.chatId);
    }
    case "/coqui/fixture/fail-record-read": {
      if (process.env.COQUI_FIXTURE_MODE !== "1") return undefined;
      if (typeof body.chatId !== "string") throw new Error("Choose a fixture session.");
      fixtureReadFailure = body.chatId;
      setTimeout(() => import("./src/core/events.ts").then(({ emit }) => emit("record-changed", { chatId: body.chatId })), 0);
      return { armed: true };
    }
    case "/coqui/fixture/graph": {
      if (process.env.COQUI_FIXTURE_MODE !== "1") return undefined;
      const { graphStore } = await import("./src/store/graph.ts");
      const count = Math.max(3, Math.min(1000, body.count ?? 1000)),
        propositions = count;
      database().transaction(() => {
        const positions: Record<string, { x: number; y: number }> = {};
        for (let i = 0; i < propositions; i++) {
          const id = "fixture-node-" + i;
          graphStore.appendNode({
            id,
            name: "Concept " + i,
            statement: "Fixture proposition " + i,
            aliases: [],
            createdAt: new Date().toISOString(),
            provenance: Array.isArray(body.sourceIds)
              ? body.sourceIds
                  .filter(
                    (id: unknown) =>
                      typeof id === "string" && database().get("chat", id),
                  )
                  .map((chatId: string) => ({
                    chatId,
                    messageId: "fixture-source",
                  }))
              : [],
          });
          positions[id] = {
            x: ((i % 30) - 15) * 200,
            y: (Math.floor(i / 30) - 11) * 110,
          };
        }
        for (let i = 0; i < Math.floor(count / 3); i++) {
          const id = "arg_fixture_" + i,
            from = "fixture-node-" + 3 * i,
            to = "fixture-node-" + (3 * i + 2);
          graphStore.appendChain({
            id,
            premises: [from, "fixture-node-" + (3 * i + 1)],
            conclusion: to,
            createdAt: new Date().toISOString(),
            provenance: Array.isArray(body.sourceIds)
              ? body.sourceIds
                  .filter(
                    (id: unknown) =>
                      typeof id === "string" && database().get("chat", id),
                  )
                  .map((chatId: string) => ({
                    chatId,
                    messageId: "fixture-source",
                  }))
              : [],
          });
          positions[id] = {
            x: (positions[from].x + positions[to].x) / 2,
            y: positions[from].y,
          };
        }
        graphStore.writePositions(positions);
      });
      emit("activity-changed", {});
      return { count };
    }
    case "/coqui/background":
      if (body.provider !== "claude-code" || typeof body.enabled !== "boolean")
        throw new Error("Choose a supported connection.");
      database().setPreference("background-policy", {
        ...(database().preference("background-policy") ?? {}),
        [body.provider]: body.enabled,
      });
      return { ok: true };
    case "/coqui/state":
      return {
        library: database()
          .all<any>("asset")
          .map((a) => ({
            ...a,
            absolutePath: path.join(database().directory, a.path),
          })),
        shortcuts: database().preference("shortcuts") ?? {},
        review: library.reviewCards(),
        backgroundPolicy: database().preference("background-policy") ?? {},
        evidence: library.evidenceHistory(),
        appearance: database().preference("appearance") ?? {
          mode: "system",
          reduceMotion: false,
          reduceTransparency: false,
        },
        cursor: stateCursor,
        fixture: process.env.COQUI_FIXTURE_MODE === "1",
      };
    case "/coqui/shortcuts":
      if (method === "PUT") database().setPreference("shortcuts", body);
      return database().preference("shortcuts") ?? {};
    case "/coqui/positions":
      database().transaction(() => {
        database().setPreference("positions", body.positions);
        database().bumpGraphRevision();
      });
      return { ok: true };
    case "/coqui/claude":
      return (
        await import("./src/server/claude-code.ts")
      ).claudeCodeInstallationStatus();
    case "/coqui/import/extract": {
      const asset = database().get<any>("asset", body.id);
      if (!asset) throw new Error("Material not found");
      if (!asset.text?.trim())
        throw new Error(
          "This source has no readable text yet. Learn from its original file with a vision-capable model.",
        );
      const { extraction } = await import("./src/server/chat-handler.ts");
      return {
        result: await extraction.importNotes({
          filePath:
            "coqui://source/" +
            asset.digest +
            "/" +
            encodeURIComponent(asset.name),
          text: asset.text,
        }),
      };
    }
    case "/coqui/search":
      return { results: database().search(url.searchParams.get("q") ?? "") };
    case "/coqui/draft": {
      const key = "draft:" + url.searchParams.get("id");
      if (method === "PUT") database().setPreference(key, body);
      return database().preference(key) ?? {};
    }
    case "/coqui/appearance":
      if (method === "PUT") database().setPreference("appearance", body);
      return database().preference("appearance");
    case "/coqui/evidence":
      return library.evidenceHistory(
        url.searchParams.get("session") ?? undefined,
      );
    case "/coqui/evidence/correct":
      return { id: library.correctEvidence(body.id, body.text) };
    case "/coqui/review":
      if (method === "POST")
        return library.addReview(
          body.conceptId,
          body.title,
          body.prompt,
          body.answer,
        );
      return library.reviewCards();
    case "/coqui/review/rate":
      return library.rateReview(
        body.id,
        body.grade,
        new Date(),
        body.expectedDue,
        body.attempt,
      );
    case "/coqui/review/snooze":
      library.snoozeReview(body.id);
      return { ok: true };
    case "/coqui/undo":
      if (method === "GET") return library.undoHistory(Number(url.searchParams.get("offset") ?? 0));
      return library.undoDeletion(body.id);
    case "/coqui/backup":
      return {
        base64: Buffer.from(await library.createBackup()).toString("base64"),
      };
    case "/coqui/restore/check": {
      const { isTurnRunning } = await import("./src/server/turn-liveness.ts");
      const { compactionInFlight } = await import("./src/server/compaction.ts");
      const { activityFeed } = await import("./src/server/observability.ts");
      const activity = activityFeed();
      if (
        database()
          .all<any>("chat")
          .some((c) => isTurnRunning(c.id) || compactionInFlight(c.id)) ||
        activity.jobs.length ||
        activity.extractions.length
      )
        throw new Error(
          "Finish or stop active learning work before restoring a backup.",
        );
      maintenance = true;
      return { ready: true };
    }
    case "/coqui/restore/resume":
      maintenance = false;
      for (const chat of database().all<any>("chat"))
        void recoverTeacherHandoff(chat.id);
      return { resumed: true };
    case "/coqui/restore/verify":
      return {
        records: Number(
          (
            database()
              .db.prepare("SELECT count(*) AS n FROM records")
              .get() as any
          ).n,
        ),
      };
    case "/coqui/material/page":
      return library.materialPage(
        url.searchParams.get("id") ?? "",
        Number(url.searchParams.get("page") ?? 1),
      );
    case "/coqui/import/preview":
      return library.previewImport(
        body.files.map((f: any) => ({
          id: f.id,
          name: f.name,
          bytes: new Uint8Array(Buffer.from(f.base64, "base64")),
        })),
      );
    case "/coqui/import/commit":
      return library.commitImport(
        body.item,
        new Uint8Array(Buffer.from(body.base64, "base64")),
      );
  }
}
async function dispatchInternal(raw: DesktopRequest): Promise<DesktopResponse> {
  const req = schema.parse(raw),
    method = req.method ?? "GET";
  if (req.path.startsWith("/coqui/")) {
    const body = await extra(req);
    return { status: body === undefined ? 404 : 200, body };
  }
  const url = new URL(req.path, "http://coqui.local");
  if (process.env.COQUI_FIXTURE_MODE === "1" && method === "GET" && url.pathname === "/api/chats/" + fixtureReadFailure) {
    fixtureReadFailure = undefined;
    return { status: 503, body: { error: "Scripted temporary record fetch failure", code: "fixture_unavailable" } };
  }
  const r = routes.find((r) => r.pattern.test(url.pathname));
  if (!r) return { status: 404, body: { error: "Unknown action" } };
  const match = url.pathname.match(r.pattern)!;
  const params = Object.fromEntries(
    r.keys.map((k: string, i: number) =>
      k.startsWith("...")
        ? [k.slice(3), decodeURIComponent(match[i + 1]).split("/")]
        : [k, decodeURIComponent(match[i + 1])],
    ),
  );
  const handler = (r.module as any)[method];
  if (!handler) return { status: 405, body: { error: "Method unavailable" } };
  let response: Response;
  if (
    process.env.COQUI_FIXTURE_MODE === "1" &&
    url.pathname === "/api/chat" &&
    method === "POST"
  ) {
    const { fixtureTurn } = await import("./fixture.ts");
    response = await fixtureTurn(req.body as any);
  } else
    response = await handler(
      new Request(url, {
        method,
        headers: {
          "content-type": "application/json",
          origin: "http://coqui.local",
          host: "coqui.local",
          ...req.headers,
        },
        body: method === "GET" ? undefined : JSON.stringify(req.body ?? {}),
      }),
      { params: Promise.resolve(params) },
    );
  try {
    await flushSecrets();
  } catch (error) {
    const { reconcileAuthEnv } = await import("./src/server/keys.ts");
    reconcileAuthEnv();
    throw error;
  }
  let result: DesktopResponse;
  if (response.headers.get("content-type")?.includes("text/event-stream")) {
    const streamId = randomUUID();
    result = { status: response.status, streamId };
    setTimeout(
      () =>
        void streamResponse(
          response,
          streamId,
          params.id ?? (req.body as any)?.chatId,
        ),
      0,
    );
  } else {
    const text = await response.text();
    let body: any;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    if (body && typeof body === "object" && !Array.isArray(body)) {
      if (
        url.pathname === "/api/chat" &&
        !body.code &&
        typeof body.error === "string"
      ) {
        if (response.status === 409 && body.error.includes("already running"))
          body.code = "turn_conflict";
        else if (
          response.status === 400 &&
          body.error.startsWith("answer input targets no pending")
        )
          body.code = "stale_question";
        else if (
          response.status === 400 &&
          body.error.includes("no active problem")
        )
          body.code = "stale_problem";
      }
      if (url.pathname === "/api/jobs" && Array.isArray(body.jobs))
        body.jobs = body.jobs.map(({ result, ...job }: any) => job);
      if (Array.isArray(body.messages)) {
        body.view = projectView(body.messages);
        body.pending = danglingQuestionOf(body.messages);
        body.problem = activeProblemOf(body.messages);
        body.extractionAction = database().preference(
          "extraction-action:" + body.id,
        );
        const attempt = database().preference<any>("turn-state:" + body.id);
        if (attempt?.state === "interrupted" && !body.turnInFlight)
          body.turnError ??=
            "This response was interrupted by an application restart. Your input is saved. Retry when ready.";
        if (method === "GET" && body.id) void recoverTeacherHandoff(body.id);
      }
    }
    result = {
      status: response.status,
      body,
      headers: Object.fromEntries(response.headers),
    };
  }

  if (response.ok && url.pathname === "/api/chat")
    recordLearningEvidence((req.body as any).chatId);
  return result;
}
export async function dispatch(raw: DesktopRequest): Promise<DesktopResponse> {
  const req = schema.parse(raw);
  if (
    maintenance &&
    req.method &&
    req.method !== "GET" &&
    !req.path.startsWith("/coqui/restore/")
  )
    return {
      status: 503,
      body: {
        code: "library_maintenance",
        error: "The library is being restored. Your saved work is retained.",
      },
    };
  if (!req.operationId || req.method === "GET" || !req.method)
    return dispatchInternal(req);
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        path: req.path,
        method: req.method,
        body: req.body,
        headers: req.headers,
      }),
    )
    .digest("hex");
  const operation = database()
    .db.prepare("SELECT * FROM operations WHERE id=?")
    .get(req.operationId);
  if (operation) {
    if (operation.fingerprint !== fingerprint)
      return {
        status: 409,
        body: {
          code: "operation_conflict",
          error:
            "This operation identity was already used for a different action.",
        },
      };
    return operation.json
      ? { ...JSON.parse(String(operation.json)), replayed: true }
      : {
          status: 409,
          body: {
            code: "operation_uncertain",
            error:
              "This action is still running or was interrupted. Inspect its saved state before retrying.",
          },
        };
  }
  database()
    .db.prepare(
      "INSERT INTO operations(id,fingerprint,state,created_at) VALUES(?,?,?,?)",
    )
    .run(req.operationId, fingerprint, "pending", new Date().toISOString());
  try {
    const response = await dispatchInternal({ ...req, operationId: undefined });
    database()
      .db.prepare("UPDATE operations SET state=?,json=? WHERE id=?")
      .run("complete", JSON.stringify(response), req.operationId);
    return response;
  } catch (error) {
    database()
      .db.prepare("UPDATE operations SET state=? WHERE id=?")
      .run("uncertain", req.operationId);
    throw error;
  }
}
port.on("message", async ({ data }: any) => {
  if (data.type === "private-result") {
    const call = pending.get(data.id);
    if (call) {
      pending.delete(data.id);
      data.error
        ? call.reject(new Error(data.error))
        : call.resolve(data.value);
    }
    return;
  }
  if (data.type === "subscription-packet") {
    publishWebSubscriptionPacket(data.channel, data.packet);
    return;
  }
  if (data.type === "request") {
    try {
      send({
        type: "response",
        id: data.id,
        value: await dispatch(data.request),
      });
    } catch (e) {
      send({
        type: "response",
        id: data.id,
        value: { status: 500, body: { error: (e as Error).message } },
      });
    }
  }
});
const secrets = await host("vault.read", { key: "api-keys" });
configureSecretStore(secrets ?? {}, (value) =>
  host("vault.write", { key: "api-keys", value }),
);
// The key manager records these as vault-backed injections, preserving deletion
// semantics and keeping them out of the unmodified Claude Code environment.
const { initAuthEnv } = await import("./src/server/keys.ts");
initAuthEnv();
if (process.env.COQUI_FIXTURE_MODE === "1")
  (await import("./fixture.ts")).configureFixtureRuntime();
for (const row of database()
  .db.prepare(
    "SELECT id,json FROM preferences WHERE id LIKE 'extraction-action:%'",
  )
  .all()) {
  const value = JSON.parse(String(row.json));
  if (value.state === "running")
    database().setPreference(String(row.id), {
      ...value,
      state: "interrupted",
      message:
        "Extraction was interrupted. Completed batches are saved; retry to process uncovered passages.",
    });
}
for (const row of database()
  .db.prepare("SELECT id,json FROM preferences WHERE id LIKE 'turn-state:%'")
  .all()) {
  const value = JSON.parse(String(row.json));
  if (value.state === "running") {
    const id = String(row.id).slice("turn-state:".length);
    const record = database().get<any>("chat", id);
    const recovered = record
      ? (await import("./src/core/interrupted-turn.ts")).interruptedTurn(record)
      : undefined;
    if (record && recovered?.messages !== record.messages)
      database().put("chat", id, { ...record, messages: recovered!.messages });
    database().setPreference(String(row.id), {
      ...value,
      state: recovered?.interrupted ? "interrupted" : "settled",
    });
  }
}
for (const record of database().all<any>("chat")) {
  recordLearningEvidence(record.id);
  void recoverTeacherHandoff(record.id);
}
send({ type: "ready", cursor: stateCursor });
