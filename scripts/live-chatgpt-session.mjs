import { acceptanceBuild } from "./acceptance-build.mjs";
import { _electron as electron } from "playwright";
import fs from "node:fs";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { probeHandoffOwed } from "../packages/engine/src/core/continuation-recovery.ts";
import {
  buildAnswer,
  normalizeOptions,
  shuffleOptions,
  seededRandom,
  resolveCorrect,
} from "../packages/engine/src/core/question-core.ts";
const executable = process.env.COQUI_EXECUTABLE;
if (!executable) throw new Error("Set COQUI_EXECUTABLE");
const app = await electron.launch({ executablePath: executable, args: [] });
const build = await acceptanceBuild(app);
const page = await app.firstWindow();
await page
  .getByRole("heading", { name: "Your understanding, connected." })
  .waitFor();
const request = async (path, method = "GET", body) => {
  const r = await page.evaluate((r) => window.coqui.request(r), {
    path,
    method,
    body,
    ...(method === "GET" ? {} : { operationId: crypto.randomUUID() }),
  });
  if (r.status >= 400) throw new Error(JSON.stringify(r.body));
  return r.body;
};
const file = "out/chatgpt-live-run.json";
let run = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
let priorBackground;
try {
  const action = process.argv[2] ?? "start";
  if (["extract", "demo", "visual", "pdf", "research"].includes(action)) {
    const status = await page.evaluate(() =>
      window.coqui.host("chatgpt", { op: "status" }),
    );
    priorBackground = status.allowBackgroundUse;
    const consent = await page.evaluate(() =>
      window.coqui.host("chatgpt", { op: "consent", enabled: true }),
    );
    if (consent?.error) throw new Error(JSON.stringify(consent.error));
  }
  if (action === "start") {
    const catalog = await request("/api/models");
    const model =
      catalog.models.find(
        (m) => m.provider === "chatgpt" && m.id === "gpt-6.1-sol",
      ) ?? catalog.models.find((m) => m.provider === "chatgpt");
    if (!model) throw new Error("No available ChatGPT model");
    const settings = (await request("/api/settings")).settings ?? {};
    const m = { provider: "chatgpt", id: model.id };
    await request("/api/settings/models", "PUT", {
      ...settings.models,
      strong: { ...settings.models?.strong, model: m },
      cheap: { ...settings.models?.cheap, model: m },
      vision: { ...settings.models?.vision, model: m },
    });
    await page.evaluate(() =>
      window.coqui.host("chatgpt", { op: "acknowledge" }),
    );
    const chat = await request("/api/chats", "POST", {
      title: "Live acceptance · equality",
      kind: "teach",
    });
    run = {
      chatId: chat.id,
      model: model.id,
      startedAt: new Date().toISOString(),
    };
    fs.writeFileSync(file, JSON.stringify(run, null, 2));
    await request("/api/chat", "POST", {
      chatId: chat.id,
      input: {
        type: "text",
        text: "I want to understand why adding the same number to both sides of an equation preserves equality. I know basic arithmetic. Please keep this lesson short and focused; avoid external research or demonstrations unless I request them.",
      },
    });
  } else if (action === "practice") {
    if (!run.lessonId) run.lessonId = run.chatId;
    const chat = await request("/api/chats", "POST", {
      title: "Live acceptance · equality practice",
      kind: "practice",
    });
    run.practiceId = chat.id;
    run.chatId = chat.id;
    fs.writeFileSync(file, JSON.stringify(run, null, 2));
    await request("/api/chat", "POST", {
      chatId: chat.id,
      input: {
        type: "text",
        text: "Pose one short self-contained mental-arithmetic problem about preserving equality by adding the same value. This is a brief CoquiLearn practice acceptance run. Wait for my reasoning, then conclude it and wait for explicit Next. No external research or generated artifacts.",
      },
    });
  } else if (action === "think") {
    const chat = await request("/api/chats/" + run.chatId);
    if (!chat.problem) throw new Error("No active problem");
    await request("/api/chat", "POST", {
      chatId: run.chatId,
      input: {
        type: "thinking",
        problemCallId: chat.problem.toolCallId,
        text: process.argv[3],
      },
    });
  } else if (action === "answer") {
    await request("/api/chat", "POST", {
      chatId: run.chatId,
      input: JSON.parse(process.argv[3]),
    });
  } else if (action === "respond") {
    const chat = await request("/api/chats/" + run.chatId),
      p = chat.pending;
    if (!p) throw new Error("No pending question");
    const kind = ["probe", "quiz"].includes(p.tool)
      ? "quiz"
      : ["recall", "explain"].includes(p.tool)
        ? "explain"
        : "ask";
    const options =
      kind === "quiz"
        ? shuffleOptions(
            normalizeOptions(p.input.options ?? []),
            seededRandom(p.toolCallId),
          )
        : normalizeOptions(p.input.options ?? []);
    const q = {
      id: p.toolCallId,
      kind,
      question: p.input.question,
      questionType: p.input.type,
      options,
      mode: options.length
        ? p.input.multiSelect
          ? "multi-select"
          : "single-select"
        : "text",
      correctIndices:
        kind === "quiz"
          ? resolveCorrect(p.input.correctAnswer, options).indices
          : undefined,
      explanation: p.input.explanation,
      committedAnswer: p.input.correctAnswer,
    };
    const answer = buildAnswer(q, JSON.parse(process.argv[3]), p.tool);
    await request("/api/chat", "POST", {
      chatId: run.chatId,
      input: { type: "answer", toolCallId: p.toolCallId, answer },
    });
  } else if (action === "extract") {
    run.chatId = run.lessonId ?? run.chatId;
    fs.writeFileSync(file, JSON.stringify(run, null, 2));
    await request("/api/graph/coverage/extract", "POST", {
      chatId: run.chatId,
    });
  } else if (action === "demo") {
    run.chatId = run.lessonId ?? run.chatId;
    fs.writeFileSync(file, JSON.stringify(run, null, 2));
    await request("/api/chat", "POST", {
      chatId: run.chatId,
      input: {
        type: "text",
        text: "Please create one tiny interactive demonstration of preserving equality: two equal counters, a button that adds one to BOTH, and Reset. Use the demonstration tool and its verification. Make it self-contained HTML with no external libraries, research, or network calls. This is a brief acceptance test; finish once it is delivered.",
      },
    });
  } else if (["visual", "pdf", "research"].includes(action)) {
    run.chatId = run.lessonId ?? run.chatId;
    fs.writeFileSync(file, JSON.stringify(run, null, 2));
    const brief =
      action === "visual"
        ? "For a brief CoquiLearn acceptance check, use the visual tool to create one small static SVG number line with ticks 0, 1, 2 and a rightward arrow from 0 to 1 labeled +1. Use the maker render/vision inspection loop. Keep it self-contained; no research, demonstration, questions or additional tasks. Finish once delivered."
        : action === "pdf"
          ? "For a brief CoquiLearn acceptance check, use the PDF specialist to inspect the local PDF at " +
            JSON.stringify(
              process.cwd() +
                "/packages/engine/tests/fixtures/sample-3page.pdf",
            ) +
            ". Extract one short fact from each page and cite the page numbers; render page 1 for visual inspection. This is a local test document. No research, questions or other tasks. Finish once the cited brief is delivered."
          : "For a brief CoquiLearn acceptance check, use the research tool with this complete brief: fetch https://www.rfc-editor.org/rfc/rfc2606.txt and explain, in two sentences, what example.com is reserved for, citing the source. No web search is required; use web_fetch on that supplied primary source. No questions, visuals or other jobs. Finish once the cited brief is delivered.";
    await request("/api/chat", "POST", {
      chatId: run.chatId,
      input: { type: "text", text: brief },
    });
  } else if (action === "say") {
    assert.equal(
      (await request("/api/chats/" + run.chatId)).settings?.model?.provider,
      "chatgpt",
      "Final smoke must use ChatGPT plan",
    );
    await request("/api/chat", "POST", {
      chatId: run.chatId,
      input: { type: "text", text: process.argv[3] },
    });
  } else if (action === "read" || action === "inspect-demo") {
  } else throw new Error("Unknown action");
  const deadline =
    Date.now() +
    (["extract", "demo", "visual", "pdf", "research"].includes(action)
      ? 300000
      : 120000);
  let chat;
  let work;
  while (Date.now() < deadline) {
    chat = await request("/api/chats/" + run.chatId);
    work = await request("/api/jobs?chatId=" + run.chatId);
    const extraction = await request("/api/graph/status");
    if (
      !chat.turnInFlight &&
      chat.extractionAction?.state !== "running" &&
      !probeHandoffOwed(chat) &&
      !work.jobs.some(
        (j) => j.status === "running" || j.delivery?.status === "pending",
      ) &&
      !extraction.runs.some((r) => r.chatId === run.chatId)
    )
      break;
    await page.waitForTimeout(1000);
  }
  assert.equal(
    chat.turnInFlight,
    false,
    "Live turn must settle before reporting success",
  );
  assert.ok(!chat.turnError, "Live turn failed: " + chat.turnError);
  const messages = chat.messages ?? [];
  const last = messages.slice(-5).map((m) => ({
    role: m.role,
    content:
      typeof m.content === "string"
        ? m.content
        : m.content?.map((c) =>
            c.type === "text"
              ? { type: c.type, text: c.text }
              : c.type === "toolCall"
                ? {
                    type: c.type,
                    id: c.id,
                    name: c.name,
                    arguments: c.arguments,
                  }
                : c.type === "thinking"
                  ? { type: "thinking", omitted: true }
                  : { type: c.type },
          ),
    toolName: m.toolName,
    toolCallId: m.toolCallId,
    details: m.role === "toolResult" ? m.details : undefined,
    errorMessage: m.errorMessage,
  }));
  let ui;
  if (action === "inspect-demo") {
    const title = (await request("/api/chats/" + run.lessonId)).title;
    await page
      .getByRole("textbox", { name: "Search sessions", exact: true })
      .fill(title);
    await page
      .locator(".recent-session")
      .filter({
        has: page.locator("span").filter({
          hasText: new RegExp(
            "^" + title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$",
          ),
        }),
      })
      .click();
    const frame = page.frameLocator("iframe.lesson-artifact").first();
    await frame
      .getByRole("button", { name: "Reset", exact: true })
      .waitFor({ timeout: 30000 });
    await frame.getByRole("button", { name: "Reset", exact: true }).click();
    const initial = await frame.locator("body").innerText();
    await frame
      .getByRole("button", { name: "Add one to BOTH", exact: true })
      .click();
    const incremented = await frame.locator("body").innerText();
    assert.notEqual(incremented, initial);
    await frame.getByRole("button", { name: "Reset", exact: true }).click();
    assert.equal(await frame.locator("body").innerText(), initial);
    const isolation = await frame.locator("body").evaluate(() => ({
      node: typeof require,
      bridge: typeof window.coqui,
      opaque: location.origin,
    }));
    assert.equal(isolation.node, "undefined");
    assert.equal(isolation.bridge, "undefined");
    ui = { addAndReset: true, isolation };
    await page.screenshot({
      path: "artifacts/implementation/chatgpt-live-demo.png",
    });
  }
  const graph = await request("/api/graph");
  const evidence = {
    at: new Date().toISOString(),
    stage: action,
    build,
    ui,
    model: run.model,
    turnInFlight: chat.turnInFlight,
    phase: chat.phase,
    pending: chat.pending,
    problem: chat.problem,
    tree: chat.tree,
    coverage: chat.coverage,
    extractionAction: chat.extractionAction,
    graph: {
      propositions: graph.propositions?.length,
      chains: graph.chains?.length,
    },
    jobs: work?.jobs,
    messages: last,
  };
  fs.appendFileSync(
    "artifacts/implementation/chatgpt-live-session.jsonl",
    JSON.stringify(evidence) + "\n",
  );
  console.log(JSON.stringify(evidence));
} finally {
  if (priorBackground === false)
    await page.evaluate(() =>
      window.coqui.host("chatgpt", { op: "consent", enabled: false }),
    );
  await app.close();
}
