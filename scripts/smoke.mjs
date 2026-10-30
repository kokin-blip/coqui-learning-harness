import { _electron as electron } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-smoke-"));
const results = [];
let app;
try {
  app = await electron.launch({
    args: [".", "--fixture"],
    cwd: process.cwd(),
    env: { ...process.env, COQUI_DATA_DIR: dir },
    timeout: 30000,
  });
  app.process().stderr.on("data", (b) => process.stderr.write(b));
  const page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");
  page.on("pageerror", (e) => console.error("RENDERER:", e.message));
  await page
    .getByRole("heading", { name: "Your understanding, connected." })
    .waitFor();
  const environment = await page.evaluate(() =>
    window.coqui.host("environment"),
  );
  results.push({ environment });
  const response = await page.evaluate(() =>
    window.coqui.request({ path: "/api/chats" }),
  );
  results.push({ sessions: response });
  await page
    .getByRole("textbox", { name: "Learning goal" })
    .fill("Why gradients work");
  await page
    .getByRole("button", { name: "Start learning", exact: true })
    .click();
  await page.waitForTimeout(2000);
  results.push({
    body: (await page.locator("main").innerText()).slice(0, 2000),
  });
  fs.mkdirSync("artifacts/implementation", { recursive: true });
  await page.screenshot({
    path: "artifacts/implementation/desktop-first.png",
    fullPage: true,
  });
  const pending = await page.evaluate(async () => {
    const c = await window.coqui.request({ path: "/api/chats" });
    const id = c.body.chats[0]?.id;
    return id ? window.coqui.request({ path: "/api/chats/" + id }) : null;
  });
  results.push({ pending });
  console.log(JSON.stringify(results, null, 2));
  fs.writeFileSync(
    "artifacts/implementation/smoke.json",
    JSON.stringify(results, null, 2),
  );
} finally {
  await app?.close();
}
