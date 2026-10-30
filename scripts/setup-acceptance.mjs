import { acceptanceBuild } from "./acceptance-build.mjs";
import { _electron as electron } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-setup-"));
const report = {
  at: new Date().toISOString(),
  packaged: !!process.env.COQUI_EXECUTABLE,
};
const app = await electron.launch({
  ...(process.env.COQUI_EXECUTABLE
    ? { executablePath: process.env.COQUI_EXECUTABLE, args: [] }
    : { args: ["."] }),
  env: { ...process.env, COQUI_DATA_DIR: root },
});
try {
  report.build = await acceptanceBuild(app);
  const page = await app.firstWindow();
  await page.getByRole("textbox", { name: "Learning goal" }).waitFor();
  await page
    .getByRole("textbox", { name: "Learning goal" })
    .fill("Preserve this goal through setup.");
  await page
    .getByRole("button", { name: "Start learning", exact: true })
    .dblclick();
  await page.getByRole("heading", { name: "ChatGPT", exact: true }).waitFor();
  const chats = await page.evaluate(() =>
    window.coqui.request({ path: "/api/chats" }),
  );
  assert.equal(chats.body.chats.length, 0);
  const draft = await page.evaluate(() =>
    window.coqui.request({ path: "/coqui/draft?id=home" }),
  );
  assert.equal(draft.body.text, "Preserve this goal through setup.");
  await page
    .getByRole("button", { name: "Learn", exact: true })
    .first()
    .click();
  await page.getByRole("textbox", { name: "Learning goal" }).waitFor();
  assert.equal(
    await page
      .getByRole("textbox", { name: "Learning goal" })
      .evaluate((e) => e.textContent),
    "Preserve this goal through setup.",
  );
  report.passed = true;
  report.checks = [
    "No empty/orphan session on missing model admission",
    "Double start remains guarded",
    "Goal survives setup and returns without automatic send",
  ];
  console.log(JSON.stringify(report));
} catch (error) {
  report.failure = error.stack;
  console.error(error);
  process.exitCode = 1;
} finally {
  await app.close();
  fs.writeFileSync(
    "artifacts/implementation/setup-acceptance.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  fs.rmSync(root, { recursive: true, force: true });
}
