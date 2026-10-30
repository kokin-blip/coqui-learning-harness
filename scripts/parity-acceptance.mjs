import { acceptanceBuild } from "./acceptance-build.mjs";
import { waitForState } from "./acceptance-wait.mjs";
import { _electron as electron } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import crypto from "node:crypto";
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-parity-"));
const output = path.resolve("artifacts/implementation/parity");
fs.mkdirSync(output, { recursive: true });
const report = {
  at: new Date().toISOString(),
  packaged: !!process.env.COQUI_EXECUTABLE,
  checks: [],
  errors: [],
};
let app, page;
const check = (name, details = {}) => {
  report.checks.push({ name, passed: true, ...details });
  console.log("PASS", name);
};
const launch = async () => {
  app = await electron.launch({
    ...(process.env.COQUI_EXECUTABLE
      ? { executablePath: process.env.COQUI_EXECUTABLE, args: ["--fixture"] }
      : { args: [".", "--fixture"] }),
    cwd: process.cwd(),
    env: { ...process.env, COQUI_DATA_DIR: directory },
  });
  report.build = await acceptanceBuild(app);
  page = await app.firstWindow();
  page.on("pageerror", (e) => report.errors.push(e.message));
  await page
    .getByRole("heading", { name: "Your understanding, connected." })
    .waitFor();
};
const request = async (p, method = "GET", body) => {
  const r = await page.evaluate((r) => window.coqui.request(r), {
    path: p,
    method,
    body,
    ...(method === "GET" ? {} : { operationId: crypto.randomUUID() }),
  });
  assert.ok(r.status < 400, JSON.stringify(r));
  return r.body;
};
const idle = async (id) => {
  await waitForState(
    page,
    async (id) =>
      !(await window.coqui.request({ path: "/api/chats/" + id })).body
        .turnInFlight,
    id,
    { timeout: 30000 },
  );
  return request("/api/chats/" + id);
};
const open = async (title) => {
  const search = page.getByRole("textbox", {
    name: "Search sessions",
    exact: true,
  });
  await search.fill(title);
  await page.locator(".recent-session").filter({ hasText: title }).click();
  await search.fill("");
};
const start = async (scenario) => {
  await page.getByRole("button", { name: "New session", exact: true }).click();
  await page
    .locator(".home-composer .segmented")
    .getByRole("button", { name: "Learn", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Learning goal" })
    .fill("[fixture:" + scenario + "] " + scenario);
  await page
    .getByRole("button", { name: "Start learning", exact: true })
    .click();
  await waitForState(
    page,
    async (scenario) =>
      (await window.coqui.request({ path: "/api/chats" })).body.chats.some(
        (c) => c.title.includes("[fixture:" + scenario + "]"),
      ),
    scenario,
  );
  const chats = await request("/api/chats");
  const id = chats.chats.find((c) =>
    c.title.includes("[fixture:" + scenario + "]"),
  ).id;
  await idle(id);
  return id;
};
const shot = async (name) => {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(output, name) });
};
const variants = async (name, target) => {
  await page
    .getByRole("button", { name: "Switch to Dew", exact: true })
    .click();
  if (target) await target.scrollIntoViewIfNeeded();
  await shot(name + "-dew.png");
  await page
    .getByRole("button", { name: "Switch to Moonforest", exact: true })
    .click();
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
  for (const scenario of [
    "multi",
    "probe",
    "explain",
    "recall",
    "ask",
    "ask-choice",
    "ask-multi",
  ]) {
    const id = await start(scenario);
    let before = await request("/api/chats/" + id);
    assert.ok(before.pending, JSON.stringify(before.messages.at(-1)));
    if (scenario === "explain") {
      assert.equal(
        await page
          .getByRole("textbox", { name: "Your answer", exact: true })
          .count(),
        0,
      );
      await page
        .getByRole("textbox", { name: "Thinking while reading", exact: true })
        .fill("Read before revealing this check.");
      await page
        .getByRole("button", { name: "Check your understanding", exact: true })
        .click();
    }
    if (["multi", "probe", "ask-multi"].includes(scenario)) {
      await page
        .getByRole("checkbox", {
          name: scenario === "ask-multi" ? "Examples" : "Two",
          exact: true,
        })
        .check();
      await page
        .getByRole("checkbox", {
          name: scenario === "ask-multi" ? "Derivations" : "Four",
          exact: true,
        })
        .check();
    } else if (scenario === "ask-choice")
      await page.getByRole("radio", { name: "Examples", exact: true }).check();
    else
      await page
        .getByRole("textbox", { name: "Your answer", exact: true })
        .fill(
          "Combining equal inputs with equal additions preserves equality.",
        );
    await page
      .getByRole("textbox", { name: "Your thinking", exact: true })
      .fill("A separately recorded reasoning trace.");
    if (["multi", "probe"].includes(scenario))
      await page.getByRole("slider", { name: /How sure/ }).fill("87");
    await page
      .getByRole("button", {
        name: scenario.startsWith("ask")
          ? "Continue"
          : ["explain", "recall"].includes(scenario)
            ? "Share explanation"
            : "Check understanding",
        exact: true,
      })
      .click();
    const after = await idle(id);
    assert.equal(after.pending, null);
    const committed = after.messages.find(
      (m) =>
        m.role === "toolResult" && m.toolCallId === before.pending.toolCallId,
    );
    assert.ok(committed?.details);
    assert.equal(
      committed.details.thinking,
      "A separately recorded reasoning trace.",
    );
    if (["multi", "probe"].includes(scenario)) {
      assert.equal(committed.details.correct, true);
      assert.equal(committed.details.confidence, 87);
    }
    if (scenario === "explain")
      assert.equal(
        committed.details.readingThinking,
        "Read before revealing this check.",
      );
    check("Native question variant: " + scenario, { sessionId: id });
  }
  await page.locator(".lesson-heading h2").click();
  await page.keyboard.press("Meta+t");
  assert.equal(
    await page
      .locator("details[data-user-thinking]")
      .evaluateAll((es) => es.length > 0 && es.every((e) => e.open)),
    true,
  );
  await page.keyboard.press("Meta+t");
  assert.equal(
    await page
      .locator("details[data-user-thinking]")
      .evaluateAll((es) => es.every((e) => !e.open)),
    true,
  );
  check(
    "Global learner-thinking shortcut expands and collapses recorded reasoning",
  );
  const uncertain = await start("uncertain");
  await page
    .getByRole("radio", {
      name: "It decreases most rapidly locally",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "I don’t know yet", exact: true })
    .click();
  const unknown = (await idle(uncertain)).messages
    .filter((m) => m.role === "toolResult" && m.details?.questionText)
    .at(-1).details;
  assert.equal(unknown.dontKnow, true);
  assert.equal(unknown.correct, false);
  assert.equal(unknown.confidence, undefined);
  assert.equal(unknown.answers.length, 0);
  const otherId = await start("ask-choice");
  await page.getByRole("radio", { name: "Examples", exact: true }).check();
  await page
    .getByRole("radio", { name: "Something else", exact: true })
    .check();
  await page
    .getByRole("textbox", { name: "Other response", exact: true })
    .fill("A visual approach");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  const other = (await idle(otherId)).messages
    .filter((m) => m.role === "toolResult" && m.details?.questionText)
    .at(-1).details;
  assert.equal(other.other, "A visual approach");
  assert.equal(other.answers.length, 0);
  check(
    "I-don’t-know omits confidence/selection; single-choice Other replaces a listed choice",
  );
  for (const [mode, outcome, label] of [
    ["recall", "solvedWithHints", "Solved with hints"],
    ["discrimination", "movedOn", "Moved on"],
    ["composition", "surrendered", "Surrendered"],
  ]) {
    await page
      .getByRole("button", { name: "New session", exact: true })
      .click();
    await page.getByRole("button", { name: "Practice", exact: true }).click();
    await page
      .getByRole("textbox", { name: "Learning goal" })
      .fill("[fixture:practice-" + mode + "] " + outcome);
    await page
      .getByRole("button", { name: "Start practicing", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Submit reasoning", exact: true })
      .waitFor();
    const id = (await request("/api/chats")).chats.find((c) =>
      c.title.endsWith(outcome),
    ).id;
    await idle(id);
    assert.equal((await request("/api/chats/" + id)).problem.input.mode, mode);
    await page
      .getByRole("textbox", { name: "Your thinking", exact: true })
      .fill("[outcome:" + outcome + "] A practice attempt.");
    await page
      .getByRole("button", { name: "Submit reasoning", exact: true })
      .click();
    await page.getByText(label, { exact: true }).waitFor();
    await idle(id);
    assert.equal((await request("/api/chats/" + id)).problem, null);
    await page
      .getByRole("button", { name: "Next problem", exact: true })
      .waitFor();
  }
  check(
    "Practice recall/discrimination/composition render hinted, moved-on and surrendered outcomes and pause for Next",
  );
  await start("rich");
  await page.locator(".diagram svg").waitFor();
  for (const [label, expected] of [
    ["Copy code", "const count = 2;"],
    ["Copy table", "| Term | Meaning |"],
    ["Copy TeX", "a+b=b+a"],
    ["Copy Mermaid", "graph LR"],
  ]) {
    await page
      .getByRole("button", { name: label, exact: true })
      .first()
      .click();
    const copied = await app.evaluate(({ clipboard }) => clipboard.readText());
    assert.ok(copied.includes(expected), label + ": " + copied);
  }
  assert.equal(await page.locator(".markdown-alert.alert-note").count(), 1);
  await page
    .getByRole("button", { name: "Focus diagram", exact: true })
    .click();
  await page
    .getByRole("dialog", { name: "Diagram focus", exact: true })
    .waitFor();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Meta+f");
  await page.locator("#transcript-find").fill("const count");
  await page.getByText("1 of 1 matches", { exact: true }).waitFor();
  await page.locator("#transcript-find").press("Enter");
  await page.locator("#transcript-find").press("Shift+Enter");
  await page.locator("#transcript-find").press("Escape");
  assert.equal(await page.locator("#transcript-find").count(), 0);
  await page.keyboard.press("Meta+Shift+m");
  await page
    .getByRole("textbox", { name: "Search composer model", exact: true })
    .waitFor();
  await page.keyboard.press("Escape");
  check(
    "Markdown, alerts, code/table/TeX/Mermaid copying, diagram focus, literal Find and model shortcut",
  );
  const planId = await start("plan");
  await page
    .getByRole("button", { name: "Open the full learning plan", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Your learning path",
    exact: true,
  });
  await dialog.waitFor();
  await dialog.getByRole("button", { name: "Zoom into plan" }).click();
  await dialog.getByRole("button", { name: "Fit plan", exact: true }).click();
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").count(), 0);
  await request("/api/chat", "POST", {
    chatId: planId,
    input: { type: "text", text: "[fixture:rewrite] Update the plan" },
  });
  await idle(planId);
  await open("[fixture:plan]");
  await waitForState(
    page,
    () => document.querySelectorAll(".plan-snapshot").length === 2,
  );
  const snapshots = await page.locator(".plan-snapshot").allTextContents();
  assert.ok(snapshots[0].includes("Adding equal amounts"));
  assert.ok(snapshots[1].includes("Substitution"));
  check(
    "Plan rewrite preserves frozen snapshots; focus view supports zoom, fit and one Escape",
  );
  const snapshot = page.locator(".plan-snapshot").last();
  await snapshot.scrollIntoViewIfNeeded();
  assert.ok(
    (await snapshot.locator(".learning-plan-svg").boundingBox()).height <= 260,
  );
  await shot("plans-moonforest.png");
  await variants("plans", snapshot);
  for (let i = 0; i < 56; i++)
    await request("/api/chats", "POST", {
      title: "History " + String(i).padStart(2, "0"),
      kind: i % 2 ? "practice" : "teach",
    });
  await page.reload();
  await page.getByRole("textbox", { name: "Search sessions" }).waitFor();
  assert.equal(await page.locator(".recent-session").count(), 50);
  await page.getByRole("button", { name: /Show older/ }).click();
  assert.ok((await page.locator(".recent-session").count()) > 50);
  await page
    .getByRole("combobox", { name: "Session kind" })
    .selectOption("practice");
  await page.reload();
  await page.getByRole("textbox", { name: "Search sessions" }).waitFor();
  assert.equal(
    await page.getByRole("combobox", { name: "Session kind" }).inputValue(),
    "practice",
  );
  await page
    .getByRole("textbox", { name: "Search sessions" })
    .fill("History 03");
  await page.getByRole("textbox", { name: "Search sessions" }).press("Enter");
  await page
    .locator(".lesson-heading h2")
    .filter({ hasText: "History 03" })
    .waitFor();
  await page.keyboard.press("F2");
  const title = page.locator("#session-title");
  await title.fill("Renamed with F2");
  await title.press("Enter");
  await waitForState(page, async () =>
    (await window.coqui.request({ path: "/api/chats" })).body.chats.some(
      (c) => c.title === "Renamed with F2",
    ),
  );
  assert.equal(
    (await request("/api/chats")).chats.some(
      (c) => c.title === "Renamed with F2",
    ),
    true,
  );
  await page
    .getByRole("combobox", { name: "Session kind" })
    .selectOption("all");
  check(
    "Paginated history, persisted kind filter, keyboard search and F2 rename",
  );
  const sourceA = await request("/api/chats", "POST", { title: "Source A" }),
    sourceB = await request("/api/chats", "POST", { title: "Source B" });
  await request("/coqui/fixture/graph", "POST", {
    count: 90,
    sourceIds: [sourceA.id, sourceB.id],
  });
  await page.getByRole("button", { name: "Map", exact: true }).first().click();
  await page
    .getByRole("button", { name: "Reasoning chains", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Select visible ideas", exact: true })
    .click();
  await page.getByText("90 chosen", { exact: true }).waitFor();
  const countBefore = (await request("/api/chats")).chats.length;
  await page
    .getByRole("textbox", { name: "Learning goal" })
    .fill("A context with too many ideas");
  await page
    .getByRole("button", { name: "Start learning", exact: true })
    .click();
  assert.equal((await request("/api/chats")).chats.length, countBefore);
  await page.getByText("90 chosen", { exact: true }).waitFor();
  await page
    .getByRole("combobox", { name: "Sort chains" })
    .selectOption("count");
  await page
    .getByRole("textbox", { name: "Search propositions" })
    .fill("Concept 8");
  assert.ok((await page.locator(".chain-source[open]").count()) > 0);
  await page.getByRole("textbox", { name: "Search propositions" }).fill("");
  await page.locator(".home-context-validation").waitFor();
  assert.equal(await page.locator(".notice").count(), 0);
  await shot("chains-moonforest.png");
  await variants("chains");
  await page
    .getByRole("button", { name: "Delete chosen", exact: true })
    .click();
  await page.getByRole("button", { name: "Delete ideas", exact: true }).click();
  await waitForState(
    page,
    async () =>
      !(await window.coqui.request({ path: "/api/graph" })).body.propositions
        .length,
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await waitForState(
    page,
    async () =>
      (await window.coqui.request({ path: "/api/graph" })).body.propositions
        .length === 90,
  );
  const removed = await request(
    "/api/chats/" + sourceA.id + "?mode=delete-nodes",
    "DELETE",
  );
  assert.ok(removed.undoId);
  assert.equal((await request("/api/graph")).propositions.length, 90);
  await request("/coqui/undo", "POST", { id: removed.undoId });
  check(
    "Chain hierarchy/search/sort, selection over 64, bulk deletion/Undo and shared-source preservation",
  );
  const bytes = Buffer.from(
    "# Source\n\nTraceable imported material.",
  ).toString("base64");
  const preview = await request("/coqui/import/preview", "POST", {
    files: [
      { id: "text-one", name: "Source.md", base64: bytes },
      {
        id: "bad-pdf",
        name: "Broken.pdf",
        base64: Buffer.from("not a pdf").toString("base64"),
      },
    ],
  });
  assert.equal(preview[0].id, "text-one");
  assert.equal(preview[1].id, "bad-pdf");
  assert.ok(preview[1].error);
  const saved = await request("/coqui/import/commit", "POST", {
    item: preview[0],
    base64: bytes,
  });
  const source = await request(
    "/coqui/material/page?id=" + saved.digest + "&page=1",
  );
  assert.match(source.text, /Traceable/);
  const [again] = await request("/coqui/import/preview", "POST", {
    files: [{ id: "renamed", name: "Renamed.md", base64: bytes }],
  });
  assert.equal(again.duplicate, true);
  check(
    "Per-file import identities isolate corrupt files, retain source inspection and detect renamed duplicates",
  );
  const selectable = path.join(directory, "Selected.md"),
    unselected = path.join(directory, "Unselected.md"),
    broken = path.join(directory, "Retry.txt");
  fs.writeFileSync(selectable, "Selected source content.");
  fs.writeFileSync(unselected, "Unselected source content.");
  const validated = await page.evaluate(
    (paths) => window.coqui.host("file.validate", { paths }),
    [selectable, directory, "/invalid\npath"],
  );
  assert.deepEqual(validated.paths, [selectable]);
  assert.equal(validated.errors.length, 2);
  await app.evaluate(
    ({ dialog }, paths) => {
      dialog.showOpenDialog = async () => ({
        canceled: false,
        filePaths: paths,
      });
    },
    [selectable, unselected, broken],
  );
  await page
    .getByRole("button", { name: "Library", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Import material", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: "Save Unselected.md", exact: true })
    .uncheck();
  await page.getByRole("button", { name: "Save 1 file", exact: true }).click();
  await page.getByRole("button", { name: "Done", exact: true }).waitFor();
  assert.equal(
    (await request("/coqui/state")).library.some(
      (a) => a.name === "Unselected.md",
    ),
    false,
  );
  fs.writeFileSync(
    broken,
    "A formerly missing file can be retried independently.",
  );
  await page
    .getByRole("button", { name: "Retry this file", exact: true })
    .click();
  await waitForState(page, () => {
    const e = document.querySelector('input[aria-label="Save Retry.txt"]');
    return e && !e.disabled && e.checked;
  });
  await page.getByRole("button", { name: "Save 1 file", exact: true }).click();
  await waitForState(page, async () =>
    (await window.coqui.request({ path: "/coqui/state" })).body.library.some(
      (a) => a.name === "Retry.txt",
    ),
  );
  await shot("import-results-moonforest.png");
  assert.equal(await page.locator(".home-context-validation").count(), 0);
  assert.equal(
    await page
      .locator(".notice")
      .filter({ hasText: "Choose up to 64" })
      .count(),
    0,
  );
  await variants("import-results");
  check(
    "Native picker grants isolate files; selection skips unselected files and per-file retry recovers a missing file",
  );
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Models", exact: true }).click();
  const strong = page.getByRole("combobox", {
      name: "strong thinking",
      exact: true,
    }),
    levels = await strong
      .locator("option")
      .evaluateAll((options) => options.map((o) => o.value).filter(Boolean));
  assert.ok(levels.length);
  await strong.selectOption(levels.at(-1));
  await waitForState(
    page,
    async (level) =>
      (await window.coqui.request({ path: "/api/settings" })).body.settings
        .models.strong.thinkingLevel === level,
    levels.at(-1),
  );
  const role = page.getByRole("combobox", {
      name: "Extraction thinking",
      exact: true,
    }),
    roleLevels = await role
      .locator("option")
      .evaluateAll((options) => options.map((o) => o.value).filter(Boolean));
  assert.ok(roleLevels.length);
  await role.selectOption(roleLevels[0]);
  await waitForState(
    page,
    async (level) =>
      (await window.coqui.request({ path: "/api/settings" })).body.settings
        .agent.models.extractor.thinkingLevel === level,
    roleLevels[0],
  );
  const born = await request("/api/chats", "POST", {
    title: "Saved model preferences",
  });
  assert.equal(
    (await request("/api/chats/" + born.id)).settings.thinkingLevel,
    levels.at(-1),
  );
  assert.equal(
    (await request("/api/chats/" + planId)).settings.thinkingLevel,
    "off",
  );
  check(
    "Strong and independent background thinking preferences persist; existing session preferences remain unchanged",
  );
  // A pending operation remains identifiable after the service dies; committed input is never resubmitted.
  const interruption = (
    await request("/api/chats", "POST", { title: "Interrupted stream" })
  ).id;
  await request("/api/chat", "POST", {
    chatId: interruption,
    input: { type: "text", text: "[fixture:stream] Continue slowly" },
  });
  await waitForState(
    page,
    async (id) =>
      (await window.coqui.request({ path: "/api/chats/" + id })).body
        .turnInFlight,
    interruption,
  );
  const pid = await app.evaluate(
    ({ app }) =>
      app.getAppMetrics().find((m) => m.name === "CoquiLearn learning service")
        ?.pid,
  );
  assert.ok(pid);
  await app.evaluate((_, pid) => process.kill(pid, "SIGKILL"), pid);
  await page.waitForTimeout(2200);
  const interrupted = await request("/api/chats/" + interruption);
  assert.equal(interrupted.turnInFlight, false);
  assert.match(interrupted.turnError, /interrupted/i);
  assert.equal(interrupted.messages.filter((m) => m.role === "user").length, 1);
  await request("/api/chat", "POST", {
    chatId: interruption,
    input: { type: "retry" },
  });
  await idle(interruption);
  assert.equal(
    (await request("/api/chats/" + interruption)).messages.filter(
      (m) => m.role === "user",
    ).length,
    1,
  );
  check(
    "Service death during streaming preserves one input and reports an explicit interrupted response",
  );
  const zooms = [];
  for (let i = 0; i < 5; i++)
    zooms.push(
      await app.evaluate(({ Menu, BrowserWindow }) => {
        Menu.getApplicationMenu()
          .items.find((m) => m.label === "View")
          .submenu.items.find((m) => m.label === "Zoom In")
          .click();
        return BrowserWindow.getAllWindows()[0].webContents.getZoomFactor();
      }),
    );
  assert.deepEqual(
    zooms.map((z) => Math.round(z * 100) / 100),
    [1.1, 1.25, 1.5, 1.75, 2],
  );
  await app.evaluate(({ Menu }) =>
    Menu.getApplicationMenu()
      .items.find((m) => m.label === "View")
      .submenu.items.find((m) => m.label === "Actual Size")
      .click(),
  );
  assert.equal(
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].webContents.getZoomFactor(),
    ),
    1,
  );
  check("Native View zoom follows the audited ladder through 200% and resets");
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.failure = error.stack;
  process.exitCode = 1;
  console.error(error);
  if (page) await shot("failure.png").catch(() => {});
} finally {
  if (app) await app.close();
  fs.writeFileSync(
    path.join(output, "acceptance.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  fs.rmSync(directory, { recursive: true, force: true });
}
