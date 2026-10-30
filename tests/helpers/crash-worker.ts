import fs from "node:fs";
import path from "node:path";
const directory = process.argv[2]!,
  phase = process.argv[3]!;
process.env.COQUI_DATA_DIR = directory;
process.env.LH_DATA_DIR = directory;
process.env.NODE_ENV = "test";
const { chatStore } = await import("../../packages/engine/src/store/chats.ts");
const { graphStore } = await import("../../packages/engine/src/store/graph.ts");
const { jobStore } = await import("../../packages/engine/src/store/jobs.ts");
const { database } = await import("../../packages/storage/index.ts");
const stop = () => process.kill(process.pid, "SIGKILL");
if (phase.startsWith("restore-")) {
  const { prepareRestore, recoverRestore } =
    await import("../../packages/storage/restore.ts");
  if (phase === "restore-recover") {
    recoverRestore(directory);
    process.exit(0);
  }
  const { CoquiDatabase } = await import("../../packages/storage/index.ts");
  const { zipSync, strToU8 } = await import("fflate");
  const { createHash } = await import("node:crypto");
  const donor = new CoquiDatabase(path.join(directory, "donor"));
  donor.put("chat", "replacement", {
    id: "replacement",
    title: "Replacement",
    version: 1,
    messages: [],
  });
  donor.close();
  const entries: Record<string, Uint8Array> = {
    "library.sqlite": fs.readFileSync(
      path.join(directory, "donor/coquilearn.sqlite"),
    ),
    "assets/test.txt": strToU8("new asset"),
    "prompts/test.txt": strToU8("new prompt"),
  };
  entries["manifest.json"] = strToU8(
    JSON.stringify({
      version: 1,
      app: "CoquiLearn",
      files: Object.fromEntries(
        Object.entries(entries).map(([name, bytes]) => [
          name,
          {
            bytes: bytes.length,
            sha256: createHash("sha256").update(bytes).digest("hex"),
          },
        ]),
      ),
    }),
  );
  const transaction = prepareRestore(directory, zipSync(entries));
  if (phase === "restore-prepared") stop();
  transaction.install((point) => {
    if (phase === "restore-" + point) stop();
  });
  throw new Error("Crash checkpoint not reached");
} else if (phase.startsWith("merge-")) {
  const { mergeFindings } =
    await import("../../packages/engine/src/core/graph.ts");
  const chat = chatStore.createChat("Atomic graph crash");
  fs.writeFileSync(
    path.join(directory, "case.json"),
    JSON.stringify({ chatId: chat.id }),
  );
  for (const [name, point] of [
    ["appendNode", "merge-after-node"],
    ["appendChain", "merge-after-chain"],
    ["appendCoverage", "merge-after-coverage"],
  ] as const) {
    const original = graphStore[name] as (v: any) => void;
    (graphStore as any)[name] = (value: any) => {
      original(value);
      if (phase === point) stop();
    };
  }
  mergeFindings(
    chat.id,
    {
      propositions: [
        { id: "a", name: "A", statement: "A", aliases: [] },
        { id: "b", name: "B", statement: "B", aliases: [] },
      ],
      chains: [{ premises: ["a"], conclusion: "b" }],
    },
    { links: [] },
    { chatStore, graphStore },
    {
      foldedAt: new Date().toISOString(),
      coverage: [
        {
          chatId: chat.id,
          fp: "batch-complete",
          tokens: 20,
          foldedAt: new Date().toISOString(),
        },
      ],
    },
  );
  stop();
} else if (phase === "input-after-save") {
  const { fixtureTurn } = await import("../../packages/engine/fixture.ts");
  const chat = chatStore.createChat("Input crash boundary");
  fs.writeFileSync(
    path.join(directory, "case.json"),
    JSON.stringify({ chatId: chat.id }),
  );
  const save = chatStore.saveTurnInput!;
  chatStore.saveTurnInput = (id, messages) => {
    save(id, messages);
    stop();
  };
  await fixtureTurn({
    chatId: chat.id,
    input: { type: "text", text: "A learner input saved exactly once." },
  });
} else if (phase === "input-recover") {
  const { chatId } = JSON.parse(
    fs.readFileSync(path.join(directory, "case.json"), "utf8"),
  );
  const { interruptedTurn } =
    await import("../../packages/engine/src/core/interrupted-turn.ts");
  const result = interruptedTurn(chatStore.getChat(chatId)!);
  chatStore.saveMessages(chatId, result.messages);
  database().setPreference("turn-state:" + chatId, { state: "interrupted" });
  const { fixtureTurn } = await import("../../packages/engine/fixture.ts");
  await (await fixtureTurn({ chatId, input: { type: "retry" } })).arrayBuffer();
  const deadline = Date.now() + 5000;
  while (
    Date.now() < deadline &&
    !chatStore
      .getChat(chatId)!
      .messages.some(
        (m: any) =>
          m.role === "assistant" &&
          m.content?.some(
            (c: any) => c.type === "toolCall" && c.name === "quiz",
          ),
      )
  )
    await new Promise((r) => setTimeout(r, 10));
} else if (phase === "worker-before-delivery") {
  const { createFauxCore, fauxAssistantMessage } =
    await import("@earendil-works/pi-ai");
  const { createJobRunner } =
    await import("../../packages/engine/src/agent/subagents/runner.ts");
  const chat = chatStore.createChat("Completed worker crash");
  const job = jobStore.createJob({
    chatId: chat.id,
    toolCallId: "one-dispatch",
    kind: "research",
    input: { question: "A fixture question" },
  });
  fs.writeFileSync(
    path.join(directory, "case.json"),
    JSON.stringify({ chatId: chat.id, jobId: job.id }),
  );
  const faux = createFauxCore({});
  faux.setResponses([fauxAssistantMessage("A durable, completed result.")]);
  await createJobRunner({
    chatStore,
    jobStore,
    deliver: async () => {
      stop();
    },
    engineFor: () => ({ model: faux.getModel(), streamFn: faux.streamSimple }),
  }).runJob(job.id);
} else if (phase === "worker-recover") {
  const { chatId } = JSON.parse(
    fs.readFileSync(path.join(directory, "case.json"), "utf8"),
  );
  const { setTurnRunner, recoverStaleJobs, noteSteersDurable } =
    await import("../../packages/engine/src/server/jobs.ts");
  setTurnRunner(async (id, input) => {
    if (input.type !== "steers") return 500;
    chatStore.saveMessages(id, [
      ...chatStore.getChat(id)!.messages,
      ...input.steers,
    ]);
    noteSteersDurable(id, chatStore.getChat(id)!.messages);
    return 200;
  });
  recoverStaleJobs();
  const deadline = Date.now() + 5000;
  while (
    Date.now() < deadline &&
    jobStore.listJobs(chatId).some((j) => j.delivery?.status === "pending")
  )
    await new Promise((r) => setTimeout(r, 10));
  if (jobStore.listJobs(chatId).some((j) => j.delivery?.status === "pending"))
    throw new Error("Delivery stayed pending");
}
database().close();
