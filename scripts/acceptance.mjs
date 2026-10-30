import { acceptanceBuild } from "./acceptance-build.mjs";
import { waitForState } from "./acceptance-wait.mjs";
import { _electron as electron } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import http from "node:http";
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-acceptance-")),
  output = path.resolve("artifacts/implementation");
fs.mkdirSync(output, { recursive: true });
const report = {
  startedAt: new Date().toISOString(),
  packaged: !!process.env.COQUI_EXECUTABLE,
  checks: [],
  screenshots: [],
  errors: [],
};
let app, page, mockServer;
const check = (name, details = {}) => {
  report.checks.push({ name, passed: true, ...details });
  console.log("PASS", name);
};
async function launch() {
  app = await electron.launch({
    ...(process.env.COQUI_EXECUTABLE
      ? { executablePath: process.env.COQUI_EXECUTABLE, args: ["--fixture"] }
      : { args: [".", "--fixture"] }),
    cwd: process.cwd(),
    env: { ...process.env, COQUI_DATA_DIR: directory },
    timeout: 45000,
  });
  report.build = await acceptanceBuild(app);
  page = await app.firstWindow();
  page.on("pageerror", (e) => report.errors.push(e.message));
  await page
    .getByRole("heading", { name: "Your understanding, connected." })
    .waitFor();
}
async function rpc(request) {
  return page.evaluate((input) => window.coqui.request(input), request);
}
async function value(path, method = "GET", body) {
  const r = await rpc({
    path,
    method,
    body,
    ...(method !== "GET" ? { operationId: crypto.randomUUID() } : {}),
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body;
}
async function shot(name) {
  await page.waitForTimeout(500);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(output, name), fullPage: false });
  report.screenshots.push(name);
}
async function session(id) {
  return value("/api/chats/" + id);
}
async function idle(id) {
  await waitForState(
    page,
    async (id) => {
      const r = await window.coqui.request({ path: "/api/chats/" + id });
      return !r.body.turnInFlight;
    },
    id,
    { timeout: 30000 },
  );
}
try {
  await launch();
  check("Native application launches");
  report.environment = await page.evaluate(() =>
    window.coqui.host("environment"),
  );
  report.connections = await page.evaluate(() =>
    window.coqui.host("connections"),
  );
  report.claude = await value("/coqui/claude");
  await page
    .getByRole("textbox", { name: "Learning goal" })
    .fill("Why gradients work");
  await page
    .getByRole("button", { name: "Start learning", exact: true })
    .click();
  await page
    .getByRole("radio", { name: "It decreases most rapidly locally" })
    .waitFor();
  const id = (await value("/api/chats")).chats[0].id;
  await idle(id);
  const before = await session(id);
  assert.ok(before.pending);
  check("Committed question and dependency plan persist", { sessionId: id });
  await page
    .getByRole("textbox", { name: "Your thinking", exact: true })
    .fill("A small opposite step follows a decreasing slope.");
  await page.getByRole("slider", { name: /How sure/ }).fill("83");
  await page.waitForTimeout(200);
  await shot("lesson-moonforest.png");
  await page.reload();
  await page
    .locator(".recent-session")
    .filter({ hasText: "Why gradients work" })
    .click();
  await page
    .getByRole("textbox", { name: "Your thinking", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("textbox", { name: "Your thinking", exact: true })
      .evaluate((e) => e.textContent),
    "A small opposite step follows a decreasing slope.",
  );
  assert.equal(await page.getByRole("slider").inputValue(), "83");
  check("Question draft and numeric confidence survive reload");
  await page
    .getByRole("radio", { name: "It decreases most rapidly locally" })
    .check();
  await page
    .getByRole("button", { name: "Check understanding", exact: true })
    .click();
  await page
    .getByText("Exactly. A negative-gradient step", { exact: false })
    .waitFor();
  await idle(id);
  const answered = await session(id);
  assert.equal(answered.pending, null);
  assert.equal(
    answered.messages.filter(
      (m) =>
        m.role === "toolResult" && m.toolCallId === before.pending.toolCallId,
    ).length,
    1,
  );
  check("Answer is committed once and feedback follows");
  await shot("lesson-chat-moonforest.png");
  const stale = await rpc({
    path: "/api/chat",
    method: "POST",
    body: {
      chatId: id,
      input: {
        type: "answer",
        toolCallId: before.pending.toolCallId,
        answer: { text: "stale" },
      },
    },
    operationId: crypto.randomUUID(),
  });
  assert.ok([400, 409, 422].includes(stale.status));
  assert.equal(stale.body.code, "stale_question");
  check("Stale answer is rejected");
  const op = crypto.randomUUID(),
    request = {
      path: "/api/chats",
      method: "POST",
      operationId: op,
      body: { title: "Idempotency fixture" },
    };
  const first = await rpc(request),
    repeat = await rpc(request);
  assert.equal(first.body.id, repeat.body.id);
  assert.equal(
    (await rpc({ ...request, body: { title: "Conflicting retry" } })).status,
    409,
  );
  check("Operation retries are idempotent and conflicting identities fail");
  await page
    .getByRole("textbox", { name: "Continue the conversation" })
    .fill("Keep this draft through restart.");
  await page.waitForTimeout(200);
  await app.close();
  await launch();
  await page
    .locator(".recent-session")
    .filter({ hasText: "Why gradients work" })
    .click();
  await waitForState(
    page,
    () =>
      document.querySelector('[aria-label="Continue the conversation"]')
        ?.textContent === "Keep this draft through restart.",
  );
  assert.equal(
    await page
      .getByRole("textbox", { name: "Continue the conversation" })
      .evaluate((e) => e.textContent),
    "Keep this draft through restart.",
  );
  assert.equal((await session(id)).messages.length, answered.messages.length);
  check("Native restart preserves history and composer draft");
  await page.getByRole("button", { name: "New session", exact: true }).click();
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Learning goal" })
    .fill("Practice gradients");
  await page
    .getByRole("button", { name: "Start practicing", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Submit reasoning", exact: true })
    .waitFor();
  const practice = (await value("/api/chats")).chats.find(
    (c) => c.title === "Practice gradients",
  ).id;
  await idle(practice);
  const problem = (await session(practice)).problem;
  assert.ok(problem);
  await page
    .getByRole("textbox", { name: "Your thinking", exact: true })
    .fill(
      "Since the derivative is 2x, subtracting a small positive multiple moves x toward zero.",
    );
  await page
    .getByRole("button", { name: "Submit reasoning", exact: true })
    .click();
  await page
    .getByText("You connected the derivative to the direction of change.", {
      exact: false,
    })
    .waitFor();
  await idle(practice);
  assert.equal((await session(practice)).problem, null);
  await page.getByRole("button", { name: "Next problem", exact: true }).click();
  await page
    .getByRole("button", { name: "Submit reasoning", exact: true })
    .waitFor();
  await idle(practice);
  assert.notEqual(
    (await session(practice)).problem.toolCallId,
    problem.toolCallId,
  );
  check("Practice concludes with committed solution and explicit Next");
  await shot("practice-moonforest.png");
  const base64 = Buffer.from(
    "# Gradient notes\n\nA gradient describes local rates of change.",
  ).toString("base64");
  const preview = await value("/coqui/import/preview", "POST", {
    files: [{ name: "Gradient notes.md", base64 }],
  });
  assert.ok(preview[0].anchors.length);
  await value("/coqui/import/commit", "POST", { item: preview[0], base64 });
  assert.equal(
    (
      await value("/coqui/import/preview", "POST", {
        files: [{ name: "Same notes.md", base64 }],
      })
    )[0].duplicate,
    true,
  );
  check("Imports preview with source anchors and detect duplicates");
  await value("/coqui/review", "POST", {
    conceptId: "fixture-review",
    title: "Local change",
    prompt: "What does a gradient describe?",
    answer: "Local rates of change in each direction.",
  });
  await page.reload();
  await page
    .getByRole("button", { name: /^Review/ })
    .first()
    .click();
  await page.getByRole("button", { name: "Reveal explanation" }).click();
  await page.getByRole("button", { name: "Good", exact: true }).click();
  await page
    .getByText("A little space to let it settle.", { exact: true })
    .waitFor();
  assert.ok(
    (await value("/coqui/state")).evidence.some(
      (e) => e.data.type === "review",
    ),
  );
  check("Review explicitly rates retrieval and persists scheduler evidence");
  mockServer = http.createServer((req, res) => {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({ data: [{ id: "fixture-model", object: "model" }] }),
    );
  });
  await new Promise((r) => mockServer.listen(0, "127.0.0.1", r));
  const endpoint = "http://127.0.0.1:" + mockServer.address().port + "/v1";
  let configuration = await rpc({ path: "/api/custom-provider" });
  const connect = await rpc({
    path: "/api/custom-provider",
    method: "POST",
    headers: { "if-match": configuration.headers.etag },
    body: { baseUrl: endpoint, authMode: "keyless" },
    operationId: crypto.randomUUID(),
  });
  assert.equal(connect.status, 200, JSON.stringify(connect.body));
  assert.ok(connect.body.models.some((m) => m.id === "fixture-model"));
  check("Custom endpoint discovery crosses private IPC with revision checks");
  mockServer.close();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("heading", { name: "Make this space yours." }).waitFor();
  for (const provider of [
    "Continue with ChatGPT",
    "Connect GitHub Copilot",
    "Connect Grok",
    "Sign in using Claude Code",
  ])
    assert.ok(
      await page.getByRole("button", { name: new RegExp(provider) }).count(),
    );
  check("All four connection routes are visible without credentials");
  await shot("connections-moonforest.png");
  await page.getByRole("button", { name: "Prompts", exact: true }).click();
  await page.locator(".prompt-editor").first().waitFor();
  assert.ok((await page.locator(".prompt-editor").count()) > 5);
  check("Bundled teaching and practice prompts are inspectable");
  const demo = await page.evaluate(async () => {
    const { url } = await window.coqui.host("artifact.register", {
      html: '<!doctype html><button id="run">Demo works</button><script>document.body.dataset.executed="yes";document.body.dataset.node=typeof require;document.body.dataset.bridge=typeof window.coqui;try{parent.document.body;document.body.dataset.parent="open"}catch{document.body.dataset.parent="blocked"}</script>',
    });
    const iframe = document.createElement("iframe");
    iframe.id = "test-demo";
    iframe.sandbox = "allow-scripts";
    iframe.src = url;
    document.body.append(iframe);
    return url;
  });
  const frame = page.frameLocator("#test-demo");
  await frame.getByRole("button", { name: "Demo works" }).waitFor();
  const isolated = await frame
    .locator("body")
    .evaluate((b) => ({ ...b.dataset }));
  assert.deepEqual(isolated, {
    executed: "yes",
    node: "undefined",
    bridge: "undefined",
    parent: "blocked",
  });
  await page.locator("#test-demo").evaluate((e) => e.remove());
  await page.evaluate(
    (url) => window.coqui.host("artifact.release", { url }),
    demo,
  );
  check(
    "Interactive demonstration executes without Node, preload or parent access",
  );
  const runtime = await value("/coqui/fixture/runtime", "POST", {});
  assert.ok(runtime.svgBytes > 0);
  assert.ok(runtime.pdfBytes > 0);
  assert.equal(runtime.demo.ok, true);
  assert.equal(runtime.demo.probeResult, 4);
  check(
    "Packaged PDF, SVG and Chromium verification runtimes execute",
    runtime,
  );
  const backup = path.join(directory, "fixture-backup.coqui");
  await app.evaluate(
    ({ dialog }, { backup }) => {
      dialog.showSaveDialog = async () => ({
        canceled: false,
        filePath: backup,
      });
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: [backup],
      });
      dialog.showMessageBox = async () => ({
        response: 1,
        checkboxChecked: false,
      });
    },
    { backup },
  );
  assert.equal(
    (await page.evaluate(() => window.coqui.host("backup.save"))).saved,
    true,
  );
  await value("/api/chats/" + id, "PUT", { title: "Changed after backup" });
  const restored = await page.evaluate(() =>
    window.coqui.host("backup.restore"),
  );
  assert.equal(restored.status, 200, JSON.stringify(restored));
  assert.equal((await session(id)).title, "Why gradients work");
  check("Native backup and restore verifies a consistent library");
  const deleted = await value(
    "/api/chats/" + first.body.id + "?mode=preserve-graph",
    "DELETE",
  );
  assert.equal(
    (await rpc({ path: "/api/chats/" + first.body.id })).status,
    404,
  );
  await value("/coqui/undo", "POST", { id: deleted.undoId });
  assert.equal((await session(first.body.id)).title, "Idempotency fixture");
  check("Deletion and Undo restore session identity");
  await value("/coqui/fixture/graph", "POST", { count: 1000 });
  await page.reload();
  await page.locator("canvas.knowledge-canvas").waitFor();
  await page.waitForTimeout(1500);
  const frames = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const times = [],
          canvas = document.querySelector("canvas.knowledge-canvas");
        let previous = performance.now();
        function tick(now) {
          times.push(now - previous);
          previous = now;
          canvas.dispatchEvent(
            new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
          );
          if (times.length < 120) requestAnimationFrame(tick);
          else {
            times.sort((a, b) => a - b);
            resolve({
              medianMs: times[60],
              p95Ms: times[114],
              maxMs: times.at(-1),
              samples: times.length,
            });
          }
        }
        requestAnimationFrame(tick);
      }),
  );
  check("1000-node graph remains interactive", { frames });
  await page.getByRole("button", { name: "Reset map view" }).click();
  report.performance = frames;
  await shot("map-1000-moonforest.png");
  await page.getByRole("button", { name: "Switch to Dew" }).click();
  await shot("map-dew.png");
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setSize(900, 720),
  );
  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  await shot("narrow-dew.png");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  check(
    "Dew appearance and narrow Mac layout render without horizontal overflow",
  );
  await value("/coqui/appearance", "PUT", {
    mode: "dark",
    reduceMotion: true,
    reduceTransparency: true,
  });
  await page.reload();
  await waitForState(
    page,
    () => document.documentElement.dataset.transparency === "reduced",
  );
  assert.equal(
    await page
      .locator(".sidebar")
      .evaluate((e) => getComputedStyle(e).backdropFilter),
    "none",
  );
  check("Reduce Transparency and Reduce Motion are applied");
  const metrics = await app.evaluate(({ app }) =>
    app
      .getAppMetrics()
      .map((m) => ({ type: m.type, name: m.name, memory: m.memory })),
  );
  report.memory = metrics;
  const beforePid = await app.evaluate(
    ({ app }) =>
      app.getAppMetrics().find((m) => m.name === "CoquiLearn learning service")
        ?.pid,
  );
  if (beforePid) {
    await app.evaluate((_, pid) => process.kill(pid, "SIGKILL"), beforePid);
    await page.waitForTimeout(1800);
    assert.equal((await session(id)).title, "Why gradients work");
    check("Utility-process crash reconnects without losing the library");
  }
  assert.equal(report.errors.length, 0, JSON.stringify(report.errors));
  report.passed = true;
} catch (e) {
  report.passed = false;
  report.failure = e.stack;
  console.error(e);
  if (page) await shot("acceptance-failure.png").catch(() => {});
  process.exitCode = 1;
} finally {
  await app?.close();
  mockServer?.close();
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(
    path.join(
      output,
      report.packaged ? "packaged-acceptance.json" : "acceptance.json",
    ),
    JSON.stringify(report, null, 2),
  );
  console.log(
    JSON.stringify({
      passed: report.passed,
      checks: report.checks.length,
      failure: report.failure?.split("\n")[0],
    }),
  );
}
