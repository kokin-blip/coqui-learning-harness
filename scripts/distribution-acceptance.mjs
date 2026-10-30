import { waitForState } from "./acceptance-wait.mjs";
import { _electron as electron } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import crypto from "node:crypto";
const currentVersion = JSON.parse(
  fs.readFileSync("package.json", "utf8"),
).version;
const previousVersion = "0.2.1";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-install-"));
const install = path.join(root, "Temporary Applications");
fs.mkdirSync(install);
const profile = path.join(root, "profile");
const report = {
  at: new Date().toISOString(),
  environment:
    "Existing macOS26 host; isolated temporary installation/profile, NOT a clean-machine result",
  checks: [],
};
let app, page;
const launch = async () => {
  app = await electron.launch({
    executablePath: path.join(
      install,
      "CoquiLearn.app/Contents/MacOS/CoquiLearn",
    ),
    args: ["--fixture"],
    env: { ...process.env, COQUI_DATA_DIR: profile },
  });
  page = await app.firstWindow();
  await page
    .getByRole("heading", { name: "Your understanding, connected." })
    .waitFor();
  return app.evaluate(({ app }) => app.getVersion());
};
const rpc = async (p, method = "GET", body) => {
  const r = await page.evaluate((r) => window.coqui.request(r), {
    path: p,
    method,
    body,
    ...(method === "GET" ? {} : { operationId: crypto.randomUUID() }),
  });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body;
};
try {
  execFileSync("/usr/bin/ditto", [
    "-x",
    "-k",
    `release/CoquiLearn-${previousVersion}-arm64-mac.zip`,
    install,
  ]);
  assert.equal(await launch(), previousVersion);
  const chat = await rpc("/api/chats", "POST", {
    title: "Manual replacement keeps this lesson",
  });
  await rpc("/api/chat", "POST", {
    chatId: chat.id,
    input: {
      type: "text",
      text: "Why does a negative gradient lower a function?",
    },
  });
  await waitForState(
    page,
    async (id) =>
      !!(await window.coqui.request({ path: "/api/chats/" + id })).body.pending,
    chat.id,
  );
  const before = await rpc("/api/chats/" + chat.id);
  await rpc("/coqui/draft?id=" + chat.id, "PUT", {
    text: "This unsent draft must survive manual replacement.",
  });
  await app.close();
  app = null;
  fs.rmSync(path.join(install, "CoquiLearn.app"), { recursive: true });
  execFileSync("/usr/bin/ditto", [
    "-x",
    "-k",
    `release/CoquiLearn-${currentVersion}-arm64-mac.zip`,
    install,
  ]);
  assert.equal(await launch(), currentVersion);
  report.checks.push(
    "ZIP extracts and launches from a temporary Applications directory with spaces",
  );
  const after = await rpc("/api/chats/" + chat.id);
  assert.equal(after.id, before.id);
  assert.equal(after.title, before.title);
  assert.equal(after.messages.length, before.messages.length);
  assert.equal(after.pending.toolCallId, before.pending.toolCallId);
  report.checks.push(
    `Manual ${previousVersion}→${currentVersion} replacement preserves session identity, native history and committed question`,
  );
  assert.equal(
    (await rpc("/coqui/draft?id=" + chat.id)).text,
    "This unsent draft must survive manual replacement.",
  );
  report.checks.push("Unsent draft survives replacing the application bundle");
  report.passed = true;
  console.log(JSON.stringify(report));
} catch (error) {
  report.failure = error.stack;
  console.error(error);
  process.exitCode = 1;
} finally {
  await app?.close();
  fs.writeFileSync(
    "artifacts/implementation/distribution-acceptance.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  fs.rmSync(root, { recursive: true, force: true });
}
