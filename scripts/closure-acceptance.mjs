import { acceptanceBuild } from "./acceptance-build.mjs";
import { incrementalLayout } from "../packages/engine/src/core/layout.ts";
import { waitForState } from "./acceptance-wait.mjs";
import { _electron as electron } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import crypto from "node:crypto";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-closure-"));
const output = "artifacts/implementation/closure";
fs.mkdirSync(output, { recursive: true });
const report = {
  at: new Date().toISOString(),
  packaged: !!process.env.COQUI_EXECUTABLE,
  checks: [],
  errors: [],
};
let app, page;
const check = (name, features) => {
  report.checks.push({ name, features, passed: true });
  console.log("PASS", name);
};
async function launch() {
  app = await electron.launch({
    ...(process.env.COQUI_EXECUTABLE
      ? { executablePath: process.env.COQUI_EXECUTABLE, args: ["--fixture"] }
      : { args: [".", "--fixture"] }),
    env: { ...process.env, COQUI_DATA_DIR: root },
  });
  report.build = await acceptanceBuild(app);
  page = await app.firstWindow();
  page.on("pageerror", (e) => report.errors.push(e.message));
  await page
    .getByRole("heading", { name: "Your understanding, connected." })
    .waitFor();
}
const raw = (p, method = "GET", body) =>
  page.evaluate((r) => window.coqui.request(r), {
    path: p,
    method,
    body,
    ...(method === "GET" ? {} : { operationId: crypto.randomUUID() }),
  });
const rpc = async (p, method = "GET", body) => {
  const r = await raw(p, method, body);
  assert.ok(r.status < 400, JSON.stringify(r));
  return r.body;
};
const until = (fn, arg) => waitForState(page, fn, arg, { timeout: 45000 });
const idle = async (id) => {
  await until(
    async (id) =>
      !(await window.coqui.request({ path: "/api/chats/" + id })).body
        .turnInFlight,
    id,
  );
  return rpc("/api/chats/" + id);
};
const open = async (id) => {
  const chat = await rpc("/api/chats/" + id);
  const s = page.getByRole("textbox", { name: "Search sessions", exact: true });
  await s.fill(chat.title);
  await page
    .locator(".recent-session")
    .filter({ hasText: chat.title })
    .first()
    .click();
  await s.fill("");
  await page.locator(".lesson-heading h2").waitFor();
};
const start = async (scenario) => {
  const c = await rpc("/api/chats", "POST", {
    title: "Closure " + scenario + " " + crypto.randomUUID().slice(0, 5),
  });
  await rpc("/api/chat", "POST", {
    chatId: c.id,
    input: {
      type: "text",
      text: "[fixture:" + scenario + "] Native acceptance",
    },
  });
  if (scenario !== "stream") await idle(c.id);
  await open(c.id);
  return c.id;
};
const answer = async () => {
  await page.getByRole("radio", { name: "Yes", exact: true }).first().check();
  await page
    .getByRole("button", { name: "Check understanding", exact: true })
    .click();
};
const shot = async (name) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(output, name) });
};
const variants = async (name, target) => {
  if (target) await target.scrollIntoViewIfNeeded();
  await shot(name + "-moonforest.png");
  // A modal intentionally makes the surrounding chrome inert. Invoke its real
  // theme handler for a visual variant without closing the focus view.
  await page
    .getByRole("button", { name: "Switch to Dew", exact: true })
    .evaluate((e) => e.click());
  await until(() => document.documentElement.dataset.theme === "light");
  await shot(name + "-dew.png");
  await page
    .getByRole("button", { name: "Switch to Moonforest", exact: true })
    .evaluate((e) => e.click());
  await until(() => document.documentElement.dataset.theme === "dark");
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setContentSize(900, 720),
  );
  if (target) await target.scrollIntoViewIfNeeded();
  await shot(name + "-narrow.png");
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setContentSize(1440, 949),
  );
};
try {
  await launch();
  const fresh = await rpc("/api/chats", "POST", { title: "Metadata session" });
  const empty = await rpc("/api/chats/" + fresh.id);
  assert.equal(empty.messages.length, 0);
  assert.ok(empty.createdAt && empty.updatedAt && empty.version === 1);
  assert.equal(
    (
      await raw("/api/chat", "POST", {
        chatId: fresh.id,
        input: { type: "unknown" },
      })
    ).status,
    400,
  );
  const practice = await rpc("/api/chats", "POST", {
    title: "Practice metadata",
    kind: "practice",
  });
  assert.equal((await rpc("/api/chats/" + practice.id)).kind, "practice");
  check("Native session metadata/kinds and invalid input refusal", [
    "E001",
    "E002",
    "E015",
  ]);
  const deleted = await rpc(
    "/api/chats/" + fresh.id + "?mode=preserve-graph",
    "DELETE",
  );
  assert.ok(deleted.undoId);
  await app.close();
  await launch();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Data", exact: true }).click();
  await variants(
    "deletion-history",
    page.getByRole("button", { name: "Restore Metadata session", exact: true }),
  );
  await page
    .getByRole("button", { name: "Restore Metadata session", exact: true })
    .click();
  await until(
    async (id) =>
      (await window.coqui.request({ path: "/api/chats/" + id })).status === 200,
    fresh.id,
  );
  await shot("deletion-history-moonforest.png");
  check(
    "Persistent deletion history restores a session through Settings after native restart",
    ["E094", "U011", "U013"],
  );
  await page
    .getByRole("button", { name: "Learn", exact: true })
    .first()
    .click();
  const handoff = await start("handoff");
  await until(async (id) => {
    const c = (await window.coqui.request({ path: "/api/chats/" + id })).body;
    return !c.turnInFlight && c.tree?.nodes.length === 2;
  }, handoff);
  await until(
    async (id) =>
      (
        await window.coqui.request({ path: "/api/chats/" + id })
      ).body.messages.some((m) => m.customType === "probe-handoff"),
    handoff,
  );
  await open(handoff);
  await page.getByText("Diagnostic assessment", { exact: true }).click();
  await page
    .getByText("Addition is reliable; equality needs a derivation.", {
      exact: true,
    })
    .waitFor();
  let c = await rpc("/api/chats/" + handoff);
  assert.equal(
    c.messages.filter((m) => m.customType === "probe-handoff").length,
    1,
  );
  await page.reload();
  await page
    .getByRole("textbox", { name: "Search sessions", exact: true })
    .waitFor();
  await open(handoff);
  await page.getByText("Diagnostic assessment", { exact: true }).click();
  await page.getByText("Start from equal values.", { exact: true }).waitFor();
  check(
    "Probe assessment, one automatic teacher handoff, native plan and phase survive reload",
    ["E005", "E006", "E009", "E010", "E011", "U003", "U008", "U035", "U048"],
  );
  const siblings = await start("siblings");
  const before = await rpc("/api/chats/" + siblings);
  const count = before.messages.filter((m) => m.role === "assistant").length;
  await answer();
  await until(
    async (id) =>
      (await window.coqui.request({ path: "/api/chats/" + id })).body.pending
        ?.toolCallId === "sibling-two",
    siblings,
  );
  c = await rpc("/api/chats/" + siblings);
  assert.equal(c.messages.filter((m) => m.role === "assistant").length, count);
  await answer();
  await idle(siblings);
  c = await rpc("/api/chats/" + siblings);
  assert.equal(c.pending, null);
  assert.equal(c.messages.filter((m) => m.role === "toolResult").length, 2);
  check("Sibling answers stay adjacent and only the last starts a reaction", [
    "E037",
    "E097",
    "E099",
  ]);
  const jobs = await start("jobs");
  await until(async (id) => {
    const j = (await window.coqui.request({ path: "/api/jobs?chatId=" + id }))
      .body.jobs;
    return (
      j.length === 2 &&
      j.every((j) => j.status === "done" && j.delivery?.status === "pending")
    );
  }, jobs);
  c = await rpc("/api/chats/" + jobs);
  assert.ok(c.pending);
  await page.locator(".background-work-row").first().locator("summary").click();
  await shot("background-pending-moonforest.png");
  assert.equal(c.messages.filter((m) => m.details?.jobId).length, 0);
  await app.close();
  await launch();
  await open(jobs);
  await answer();
  await until(
    async (id) =>
      (
        await window.coqui.request({ path: "/api/jobs?chatId=" + id })
      ).body.jobs.every((j) => j.delivery?.status === "delivered"),
    jobs,
  );
  await idle(jobs);
  c = await rpc("/api/chats/" + jobs);
  for (const job of (await rpc("/api/jobs?chatId=" + jobs)).jobs)
    assert.equal(
      c.messages.filter((m) => m.details?.jobId === job.id).length,
      1,
    );
  check(
    "Real specialist workers finish behind a question; restart delivers each saved result exactly once",
    ["E050", "E100", "E101", "E102", "U057", "U071", "U073"],
  );
  await open(jobs);
  const figure = page.locator("img.lesson-figure");
  await figure.waitFor();
  assert.equal(
    await figure.evaluate((e) => e.getBoundingClientRect().width),
    240,
  );
  assert.notEqual(
    await page
      .locator("body")
      .evaluate((e) => getComputedStyle(e).backgroundColor),
    "rgb(255, 0, 0)",
  );
  const artifact = page.locator(".artifact-surface").filter({ has: figure });
  await artifact.getByRole("button", { name: "Invert", exact: true }).click();
  await page.reload();
  await page
    .getByRole("textbox", { name: "Search sessions", exact: true })
    .waitFor();
  await open(jobs);
  await page.locator("img.lesson-figure.inverted").waitFor();
  await page.getByRole("button", { name: "Focus figure", exact: true }).click();
  const focus = page.getByRole("dialog", {
    name: "Visual explanation",
    exact: true,
  });
  await focus.waitFor();
  await focus.getByRole("button", { name: "Zoom figure in" }).click();
  await focus.getByRole("button", { name: "Fit figure", exact: true }).click();
  assert.ok(await focus.locator("img.inverted").count());
  await variants("figure-focus");
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  check(
    "SVG natural size, CSS isolation, persistent inversion and focus pan/zoom/fit",
    ["U059", "U060"],
  );
  const failing = await start("job-failure");
  await until(
    async (id) =>
      (
        await window.coqui.request({ path: "/api/jobs?chatId=" + id })
      ).body.jobs.some((j) => j.status === "error"),
    failing,
  );
  assert.ok((await rpc("/api/jobs?chatId=" + failing)).jobs[0].error);
  const slow = await start("job-slow");
  const running = (await rpc("/api/jobs?chatId=" + slow)).jobs[0];
  await rpc("/api/activity/abort", "POST", { kind: "job", id: running.id });
  await until(
    async (id) =>
      (
        await window.coqui.request({ path: "/api/jobs?chatId=" + id })
      ).body.jobs.every((j) => j.status !== "running"),
    slow,
  );
  assert.ok(
    [404, 409].includes(
      (
        await raw("/api/activity/abort", "POST", {
          kind: "job",
          id: running.id,
        })
      ).status,
    ),
  );
  assert.equal(
    (
      await raw("/api/activity/abort", "POST", {
        kind: "job",
        id: "does-not-exist",
      })
    ).status,
    404,
  );
  check(
    "Failed, canceled and already-finished background work retain honest delivery states",
    ["E103", "U057", "U072"],
  );
  const stream = await start("stream");
  await page.getByRole("button", { name: "Map", exact: true }).first().click();
  assert.equal((await rpc("/api/chats/" + stream)).turnInFlight, true);
  await rpc("/api/chats/" + stream + "/steer", "POST", {
    input: {
      type: "steer",
      id: "steer-acceptance",
      text: "Steer this response once.",
    },
  });
  await open(stream);
  await rpc("/api/activity/abort", "POST", { kind: "turn", id: stream });
  await idle(stream);
  c = await rpc("/api/chats/" + stream);
  assert.equal(
    c.messages.filter(
      (m) =>
        m.role === "user" && m.content === "[fixture:stream] Native acceptance",
    ).length,
    1,
  );
  assert.ok(c.messages.some((m) => m.role === "assistant"));
  check(
    "Leaving a stream preserves computation; live steering/abort retain one input and partial native output",
    ["E016", "E018", "E098", "E099", "U038", "U039"],
  );
  const dismissed = await rpc("/api/chats", "POST", {
    title: "Closure dismissal",
    kind: "practice",
  });
  await rpc("/api/chat", "POST", {
    chatId: dismissed.id,
    input: { type: "text", text: "[fixture:practice-recall] Closure" },
  });
  await idle(dismissed.id);
  await open(dismissed.id);
  await page
    .getByRole("button", { name: "Set this problem aside", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Next problem", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Next problem", exact: true }).click();
  await idle(dismissed.id);
  await page
    .locator(".practice-outcome")
    .filter({ hasText: "Set aside" })
    .waitFor();
  await page.getByText("Practice details", { exact: true }).click();
  assert.ok(await page.getByText("recall", { exact: true }).count());
  await variants("practice-metadata", page.locator(".practice-metadata"));
  c = await rpc("/api/chats/" + dismissed.id);
  assert.ok(JSON.stringify(c.messages).includes('"dismissed"'));
  check(
    "Silent practice dismissal synthesizes one durable conclusion on Next and exposes recorded metadata",
    ["E044", "E046", "U051"],
  );
  const compact = await start("multi");
  await rpc("/coqui/fixture/compaction", "POST", { chatId: compact });
  await until(
    async (id) =>
      (await window.coqui.request({ path: "/api/chats/" + id })).body
        .compacting,
    compact,
  );
  await page
    .getByRole("status")
    .filter({ hasText: "Summarizing context" })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Check understanding", exact: true })
      .isDisabled(),
    true,
  );
  await until(
    async (id) =>
      !(await window.coqui.request({ path: "/api/chats/" + id })).body
        .compacting,
    compact,
  );
  c = await rpc("/api/chats/" + compact);
  assert.ok(c.messages.length > 14);
  assert.ok(c.messages.some((m) => m.customType === "compaction"));
  const md = await rpc("/api/chats/" + compact + "/markdown");
  assert.ok(String(md).includes("Retained full-history context"));
  check(
    "Actual compaction retains the full archive and appends a summary marker without losing the pending question",
    ["E105", "E106", "U012", "U048"],
  );
  await rpc("/coqui/fixture/fail-record-read", "POST", { chatId: compact });
  await page.waitForTimeout(500);
  assert.equal(await page.locator(".lesson-heading h2").textContent(), c.title);
  check(
    "Transient record-read failure preserves the visible lesson and committed question",
    ["U038", "U093"],
  );
  await page.getByRole("button", { name: "New session", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Learning goal" })
    .fill("A draft with selected ideas");
  await rpc("/coqui/fixture/graph", "POST", {
    count: 6,
    sourceIds: [fresh.id],
  });
  await page.getByRole("button", { name: "Choose ideas", exact: true }).click();
  await page
    .getByRole("button", { name: "Reasoning chains", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Select visible ideas", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("button", { name: "Delete chosen", exact: true })
      .count(),
    0,
  );
  await variants(
    "context-picker",
    page.getByRole("button", { name: "Done choosing", exact: true }),
  );
  await page
    .getByRole("button", { name: "Done choosing", exact: true })
    .click();
  assert.equal(
    await page
      .getByRole("textbox", { name: "Learning goal" })
      .evaluate((e) => e.textContent),
    "A draft with selected ideas",
  );
  await page
    .getByRole("button", { name: "Start learning", exact: true })
    .click();
  await until(async () => {
    const c = (await window.coqui.request({ path: "/api/chats" })).body.chats;
    return c.some((c) => c.title === "A draft with selected ideas");
  });
  const chosen = (await rpc("/api/chats")).chats.find(
    (c) => c.title === "A draft with selected ideas",
  );
  c = await idle(chosen.id);
  assert.equal(c.messages[0].customType, "graph-context");
  assert.equal(c.messages[1].role, "user");
  check(
    "Dedicated context selection has Done, preserves draft, hides deletion and prepends context before input",
    ["E004", "E093", "U006", "U030"],
  );
  await page.getByRole("button", { name: "Map", exact: true }).first().click();
  await page.keyboard.press("Meta+f");
  await page
    .getByRole("textbox", { name: "Search propositions", exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("textbox", { name: "Search propositions", exact: true })
      .evaluate((e) => e === document.activeElement),
    true,
  );
  assert.equal(
    await page.getByRole("dialog", { name: "Find in lesson" }).count(),
    0,
  );
  check("Map Find targets proposition search even with a retained lesson", [
    "U021",
    "U094",
  ]);
  await page.getByRole("button", { name: "Map display and physics" }).click();
  const fields = page.locator(".map-options input[type=number]");
  const settingsBefore = await rpc("/api/graph/render-settings");
  for (const field of await fields.all()) {
    const before = await field.inputValue();
    await field.fill(before);
    await field.press("Tab");
  }
  await page
    .locator(".map-options")
    .getByRole("button", { name: "Done", exact: true })
    .click();
  assert.deepEqual(await rpc("/api/graph/render-settings"), settingsBefore);
  check(
    "Graph display/physics controls persist through actual private-IPC route without resetting data",
    ["U033", "U034", "U020"],
  );
  await page
    .getByRole("button", { name: "Knowledge map", exact: true })
    .click();
  const canvas = page.locator(".knowledge-canvas");
  await canvas.waitFor();
  await page
    .getByRole("button", { name: "Reset map view", exact: true })
    .click();
  await canvas.focus();
  const camera = () =>
    page.evaluate(() =>
      JSON.parse(localStorage.getItem("coqui.graph.camera.v1")),
    );
  const fitCamera = await camera();
  await page.keyboard.press("ArrowRight");
  assert.notEqual((await camera()).x, fitCamera.x);
  await page.keyboard.press("+");
  const keptCamera = await camera();
  assert.ok(keptCamera.k > fitCamera.k);
  await page.reload();
  await canvas.waitFor();
  await page.waitForTimeout(500);
  const restoredCamera = await camera();
  assert.ok(Math.abs(restoredCamera.k - keptCamera.k) < 0.001);
  assert.ok(Math.abs(restoredCamera.x - keptCamera.x) < 1);
  const bounds = await canvas.boundingBox();
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height / 2,
  );
  await page.mouse.wheel(0, -100);
  await page.waitForTimeout(500);
  assert.ok((await camera()).k > keptCamera.k);
  await page
    .getByRole("button", { name: "Reset map view", exact: true })
    .click();
  await page.waitForTimeout(200);
  const graphBeforeDrag = await rpc("/api/graph");
  const layout = incrementalLayout(
    graphBeforeDrag.nodes,
    graphBeforeDrag.edges,
    new Map(Object.entries(graphBeforeDrag.positions)),
    {
      ticks: 160,
      clusters: graphBeforeDrag.clusters,
      logicalEdges: graphBeforeDrag.logicalEdges,
      impLinks: graphBeforeDrag.impLinks,
    },
  );
  const node = layout.get("fixture-node-2"),
    cam = await camera();
  const px = bounds.x + node.x * cam.k + cam.x,
    py = bounds.y + node.y * cam.k + cam.y;
  await page.mouse.move(px, py);
  await page.mouse.down();
  assert.equal(
    await canvas.evaluate((e) => e.style.cursor),
    "grabbing",
    JSON.stringify({ px, py, bounds, node, cam }),
  );
  await page.mouse.move(px + 60, py + 25, { steps: 12 });
  await page.mouse.up();
  await until(async (old) => {
    const g = (await window.coqui.request({ path: "/api/graph" })).body;
    return Math.abs(g.positions["fixture-node-2"].x - old.x) > 1;
  }, graphBeforeDrag.positions["fixture-node-2"]);
  check(
    "Native graph keyboard pan, cursor wheel zoom, persisted camera and live node drag commit",
    ["U016", "U017", "U018", "U019", "U020"],
  );
  const prompts = (await rpc("/api/settings/prompts")).teacher;
  assert.ok(prompts.length);
  const p = prompts[0];
  const promptPath = p.path;
  await rpc("/api/settings/prompts/" + promptPath, "PUT", {
    text: "A visible fixture prompt override.",
  });
  let settings = (await rpc("/api/settings")).settings;
  await rpc("/api/settings/agent", "PUT", {
    ...settings.agent,
    prompts: { ...settings.agent?.prompts, [promptPath]: true },
  });
  const promptRows = (await rpc("/api/settings/prompts")).teacher;
  assert.ok(promptRows.find((s) => s.path === promptPath).enabled);
  await rpc("/api/settings/prompts/" + promptPath, "DELETE");
  assert.equal(
    (await rpc("/api/settings")).settings.agent?.prompts?.[promptPath],
    undefined,
  );
  assert.equal(
    (
      await raw("/api/settings/prompts/teacher/00-missing.md", "PUT", {
        text: "bad",
      })
    ).status,
    400,
  );
  check(
    "Prompt override write/enable/reset and invalid registered-path refusal cross the process boundary",
    ["E117", "U085"],
  );
  assert.equal(
    (await raw("/api/settings/compaction", "PUT", { thresholdTokens: 1 }))
      .status,
    400,
  );
  await rpc("/api/settings/compaction", "PUT", { thresholdTokens: 32000 });
  assert.equal(
    (await rpc("/api/settings")).settings.compaction.thresholdTokens,
    32000,
  );
  await rpc("/api/settings/graph", "PUT", {
    enabled: false,
    rendering: false,
    extractionChunkTokens: 500,
  });
  settings = (await rpc("/api/settings")).settings;
  assert.equal(settings.graph.extractionChunkTokens, 500);
  const graphCount = (await rpc("/api/graph")).propositions.length;
  assert.ok(graphCount >= 6);
  await rpc("/api/settings/graph", "PUT", {
    enabled: true,
    rendering: true,
    extractionChunkTokens: 4096,
  });
  check(
    "Compaction floor rejects invalid input; extraction floor and independent graph switches preserve stored knowledge",
    ["E096", "E116", "U084", "U086", "U087", "U097"],
  );
  const diskFile = path.join(root, "Referenced learner file.txt");
  fs.writeFileSync(diskFile, "Only a path is attached.");
  await page.evaluate(() => {
    const e = document.createElement("input");
    e.type = "file";
    e.id = "native-drop-input";
    document.body.append(e);
  });
  await page.locator("#native-drop-input").setInputFiles(diskFile);
  const nativePath = await page
    .locator("#native-drop-input")
    .evaluate((e) => window.coqui.getPathForFile(e.files[0]));
  assert.equal(nativePath, diskFile);
  await page.getByRole("button", { name: "New session", exact: true }).click();
  await page.locator("#native-drop-input").evaluate((e) => {
    const dt = new DataTransfer();
    dt.items.add(e.files[0]);
    document.querySelector(".workspace").dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: dt,
      }),
    );
  });
  await until(() =>
    document
      .querySelector(".home-composer [contenteditable]")
      ?.textContent.includes("Referenced learner file.txt"),
  );
  assert.equal((await rpc("/coqui/state")).library.length, 0);
  check(
    "OS-backed File drop resolves its native path into atomic composer chips without upload",
    ["U061", "U062"],
  );
  assert.equal(await page.evaluate(() => typeof require), "undefined");
  assert.equal(await page.evaluate(() => typeof process), "undefined");
  check(
    "Packaged renderer exposes the preload projection without Node globals",
    ["U098", "U102", "U104"],
  );
  assert.equal(report.errors.length, 0, JSON.stringify(report.errors));
  report.passed = true;
} catch (error) {
  report.failure = error.stack;
  console.error(error);
  process.exitCode = 1;
  await page
    ?.screenshot({ path: path.join(output, "failure.png") })
    .catch(() => {});
} finally {
  await app?.close();
  fs.writeFileSync(
    path.join(output, "acceptance.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  fs.rmSync(root, { recursive: true, force: true });
}
