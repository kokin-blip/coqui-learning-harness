import { test } from "node:test";
import assert from "node:assert/strict";
import { callContextTokens } from "../packages/engine/src/core/context-usage.ts";
test("Background context includes disjoint caches, excludes double-counted reasoning and preserves unknown accounting", () => {
  const usage = {
    inputTokens: 20,
    outputTokens: 10,
    cacheReadTokens: 80,
    cacheWriteTokens: 5,
    reasoningTokens: 8,
  };
  assert.equal(callContextTokens(usage), 115);
  assert.equal(
    callContextTokens({ ...usage, cacheReadTokens: undefined }),
    null,
  );
  assert.equal(callContextTokens(undefined), null);
});
import { chainGroups } from "../packages/engine/components/chain-view.ts";
import { blockLayout } from "../packages/engine/components/plan-geometry.ts";
import { probeHandoffOwed } from "../packages/engine/src/core/continuation-recovery.ts";
import { newHandoffMessage } from "../packages/engine/src/core/native-messages.ts";
import { interruptedTurn } from "../packages/engine/src/core/interrupted-turn.ts";
import {
  retryDrops,
  inputAppends,
} from "../packages/engine/src/core/input-events.ts";
import {
  OperationRegistry,
  EventCursor,
} from "../apps/desktop/renderer/operation-recovery.ts";
const node = (
  id: string,
  name: string,
  birth: string,
  aliases: string[] = [],
) => ({
  id,
  name,
  statement: name,
  aliases,
  createdAt: "2026-10-29T00:00:00Z",
  provenance: [{ chatId: birth, messageId: "m" }],
});

test("A process death after write-ahead input yields an explicit retry without duplicating the input", () => {
  const record: any = {
    settings: { model: { provider: "chatgpt", id: "available-model" } },
    messages: [
      {
        id: "input",
        role: "user",
        content: "Saved learner input",
        timestamp: 1,
      },
    ],
  };
  const recovered = interruptedTurn(record, 10);
  assert.equal(recovered.interrupted, true);
  assert.equal(recovered.messages.length, 2);
  const drops = retryDrops(recovered.messages);
  assert.equal(drops.size, 1);
  assert.equal(
    inputAppends({ ...record, messages: recovered.messages }, { type: "retry" })
      .length,
    0,
  );
  assert.equal(
    interruptedTurn({ ...record, messages: recovered.messages }, 11).messages
      .length,
    2,
  );
  assert.equal(
    interruptedTurn({
      ...record,
      messages: [
        { id: "success", role: "assistant", content: [], stopReason: "stop" },
      ],
    }).interrupted,
    false,
  );
});
test("Chain hierarchy uses conclusion birth, retains singletons, ranks aliases, and sorts deterministically", () => {
  const propositions = [
    node("a", "Input", "first"),
    node("b", "Result", "second", ["hidden alias"]),
    node("c", "Isolated", "first"),
  ];
  const graph: any = {
    propositions,
    chains: [{ id: "argument", premises: ["a"], conclusion: "b" }],
    sessions: { first: "A source", second: "B source" },
    fileSources: {},
  };
  const groups = chainGroups(graph, "", { column: "name", direction: 1 });
  assert.equal(groups.length, 2);
  assert.equal(groups[0].rows[0].conclusion, "c");
  assert.equal(groups[1].rows[0].id, "argument");
  assert.deepEqual(groups[1].nodeIds, ["a", "b"]);
  const found = chainGroups(graph, "hidden alias", {
    column: "created",
    direction: -1,
  });
  assert.equal(found.length, 1);
  assert.equal(found[0].sourceId, "second");
  assert.equal(found[0].rows[0].id, "argument");
  assert.deepEqual(
    chainGroups(graph, "missing", { column: "name", direction: 1 }),
    [],
  );
});
test("Plan geometry keeps prerequisites above dependents and ignores dangling endpoints", () => {
  const nodes = [
      { id: "basis", title: "Same value" },
      { id: "step", title: "Apply one defined operation" },
      { id: "goal", title: "Equality is preserved" },
    ],
    edges = [
      { from: "basis", to: "step" },
      { from: "step", to: "goal" },
      { from: "ghost", to: "goal" },
    ];
  const a = blockLayout(nodes, edges),
    b = blockLayout(nodes, edges);
  assert.ok(a.y.get("basis")! < a.y.get("step")!);
  assert.ok(a.y.get("step")! < a.y.get("goal")!);
  assert.equal(a.edgePts.has("ghost->goal"), false);
  assert.deepEqual([...a.x], [...b.x]);
  assert.ok(a.width > 0 && a.height > 0);
});
test("Transport retry identities survive registry recreation and never persist learner text", async () => {
  let saved = "";
  const storage = {
    getItem: () => saved || null,
    setItem: (_: string, v: string) => {
      saved = v;
    },
  };
  const input = {
    path: "/api/chat",
    method: "POST" as const,
    body: {
      chatId: "one",
      input: { type: "text", text: "private learner draft" },
    },
  };
  const a = await new OperationRegistry(storage).identity(input),
    b = await new OperationRegistry(storage).identity(input);
  assert.equal(a.id, b.id);
  assert.ok(!saved.includes("private learner"));
  const registry = new OperationRegistry(storage);
  registry.settle(a.key, a.id);
  const c = await registry.identity(input);
  assert.notEqual(a.id, c.id);
});
test("Event gaps and service generations resync while duplicate/stale packets are ignored", () => {
  const cursor = new EventCursor();
  assert.deepEqual(
    cursor.observe({
      type: "state",
      sequence: 10,
      serviceEpoch: "first",
      cursor: 12,
    }),
    { stale: false, resync: false },
  );
  assert.equal(
    cursor.observe({
      type: "state",
      sequence: 12,
      serviceEpoch: "first",
      cursor: 13,
    }).resync,
    true,
  );
  assert.equal(
    cursor.observe({
      type: "state",
      sequence: 11,
      serviceEpoch: "first",
      cursor: 12,
    }).stale,
    true,
  );
  assert.equal(
    cursor.observe({
      type: "state",
      sequence: 13,
      serviceEpoch: "second",
      cursor: 13,
    }).resync,
    true,
  );
});
test("Restart reconstructs a missing diagnostic handoff exactly until it is durably delivered", () => {
  const messages: any[] = [
    {
      id: "call",
      role: "assistant",
      content: [
        { type: "toolCall", id: "probe", name: "probe_done", arguments: {} },
      ],
    },
    {
      id: "result",
      role: "toolResult",
      toolCallId: "probe",
      toolName: "probe_done",
      content: [{ type: "text", text: "Recorded" }],
      details: { ok: true },
      isError: false,
    },
    {
      id: "closing",
      role: "assistant",
      content: [{ type: "text", text: "The teacher will take over." }],
    },
  ];
  assert.equal(probeHandoffOwed({ messages }), true);
  assert.equal(probeHandoffOwed({ kind: "practice", messages }), false);
  assert.equal(
    probeHandoffOwed({ messages: [...messages, newHandoffMessage("one")] }),
    false,
  );
  assert.equal(
    probeHandoffOwed({
      messages: [
        ...messages,
        { id: "new-input", role: "user", content: "Continue" },
      ],
    }),
    false,
  );
});
