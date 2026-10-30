import { _electron as electron } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-layout-")),
  out = path.resolve(".impeccable/review");
fs.mkdirSync(out, { recursive: true });
let app;
try {
  app = await electron.launch({
    ...(process.env.COQUI_EXECUTABLE
      ? { executablePath: process.env.COQUI_EXECUTABLE, args: ["--fixture"] }
      : { args: [".", "--fixture"] }),
    cwd: process.cwd(),
    env: { ...process.env, COQUI_DATA_DIR: directory },
    timeout: 45000,
  });
  const page = await app.firstWindow();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page
    .getByRole("heading", { name: "Your understanding, connected." })
    .waitFor();
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setContentSize(1512, 949),
  );
  await page.waitForTimeout(500);
  const capture = async (name) => {
    await page.waitForTimeout(550);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(out, name) });
  };
  await page
    .getByRole("textbox", { name: "Learning goal" })
    .fill("Why gradients work");
  await page
    .getByRole("button", { name: "Start learning", exact: true })
    .click();
  await page
    .getByRole("radio", { name: "It decreases most rapidly locally" })
    .waitFor();
  await capture("desktop-question.png");
  await page
    .getByRole("radio", { name: "It decreases most rapidly locally" })
    .check();
  await page
    .getByRole("textbox", { name: "Your thinking", exact: true })
    .fill("A small opposite step lowers the value.");
  await page
    .getByRole("button", { name: "Check understanding", exact: true })
    .click();
  await page
    .getByText("Exactly. A negative-gradient step", { exact: false })
    .waitFor();
  await capture("desktop.png");
  const selectors = {
    rail: ".app-rail",
    sidebar: ".sidebar",
    header: ".app-titlebar",
    reading: ".lesson-document",
    transcript: ".transcript-scroll",
    composer: ".lesson-input",
    inspector: ".lesson-inspector",
  };
  const metrics = await page.evaluate(
    (selectors) => ({
      viewport: {
        width: innerWidth,
        height: innerHeight,
        dpr: devicePixelRatio,
      },
      regions: Object.fromEntries(
        Object.entries(selectors).map(([name, selector]) => {
          const el = document.querySelector(selector),
            rect = el.getBoundingClientRect(),
            style = getComputedStyle(el);
          return [
            name,
            {
              x: rect.x,
              y: rect.y,
              width: rect.width,
              height: rect.height,
              padding: style.padding,
              fontSize: style.fontSize,
            },
          ];
        }),
      ),
      prose: {
        fontSize: getComputedStyle(
          document.querySelector(".message.assistant .prose"),
        ).fontSize,
        lineHeight: getComputedStyle(
          document.querySelector(".message.assistant .prose"),
        ).lineHeight,
      },
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    }),
    selectors,
  );
  assert.equal(metrics.horizontalOverflow, false);
  await page
    .getByRole("button", { name: "Composer model", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Search composer model" })
    .fill("claude sonnet");
  await capture("model-picker.png");
  metrics.modelPopover = await page.evaluate(() => {
    const trigger = document.querySelector(
      ".composer-model-control .model-picker-trigger",
    );
    const panel = document.querySelector(".model-picker-popover");
    const a = trigger.getBoundingClientRect(),
      b = panel.getBoundingClientRect();
    return {
      gap: a.top - b.bottom,
      fontSize: getComputedStyle(trigger).fontSize,
      viewportClamped:
        b.left >= 16 &&
        b.right <= innerWidth - 16 &&
        b.top >= 16 &&
        b.bottom <= innerHeight - 16,
    };
  });
  assert.ok(Math.abs(metrics.modelPopover.gap - 8) < 1);
  assert.equal(metrics.modelPopover.fontSize, "12px");
  assert.equal(metrics.modelPopover.viewportClamped, true);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Switch to Dew" }).click();
  await capture("desktop-dew.png");
  await page.getByRole("button", { name: "Switch to Moonforest" }).click();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("heading", { name: "Make this space yours." }).waitFor();
  await capture("connections.png");
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0].setContentSize(900, 720),
  );
  await capture("narrow.png");
  metrics.narrowComposer = await page.evaluate(() => {
    const model = document
      .querySelector(".composer-model-control")
      .getBoundingClientRect();
    const mic = document.querySelector(
      ".lesson-input-footer .microphone-button, .lesson-input-footer .dictation-button",
    );
    const footer = document
      .querySelector(".lesson-input-footer")
      .getBoundingClientRect();
    return {
      width: innerWidth,
      modelLeft: model.left,
      modelRight: model.right,
      footerRight: footer.right,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  assert.equal(metrics.narrowComposer.horizontalOverflow, false);
  assert.ok(
    metrics.narrowComposer.modelRight <= metrics.narrowComposer.footerRight,
  );
  await page.getByRole("button", { name: "Toggle sidebar" }).click();
  await capture("narrow-sidebar.png");
  fs.writeFileSync(
    path.join(out, "layout-metrics.json"),
    JSON.stringify({ ...metrics, errors }, null, 2),
  );
  assert.equal(errors.length, 0, JSON.stringify(errors));
  console.log(JSON.stringify(metrics));
} finally {
  await app?.close();
}
