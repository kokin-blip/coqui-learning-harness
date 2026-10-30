import { _electron as electron } from "playwright";
import fs from "node:fs";
import assert from "node:assert/strict";
import crypto from "node:crypto";
const executable = process.env.COQUI_EXECUTABLE;
if (!executable) throw new Error("Set COQUI_EXECUTABLE");
const app = await electron.launch({ executablePath: executable, args: [] });
let page, draftRestore;
const sentinel = "Reconnect acceptance keeps this unsent draft.";
const report = { at: new Date().toISOString(), packaged: true, checks: [] };
const check = (s) => {
  report.checks.push(s);
  console.log("PASS", s);
};
const rpc = async (path, method = "GET", body) =>
  page.evaluate((r) => window.coqui.request(r), {
    path,
    method,
    body,
    ...(method === "GET" ? {} : { operationId: crypto.randomUUID() }),
  });
const hash = (v) =>
  crypto.createHash("sha256").update(JSON.stringify(v)).digest("hex");
try {
  page = await app.firstWindow();
  await page
    .getByRole("heading", { name: "Your understanding, connected." })
    .waitFor();
  const con = await page.evaluate(() => window.coqui.host("connections"));
  const id =
    con.chatgpt.activeAccountId ??
    con.chatgpt.accounts.find((a) => a.active)?.id ??
    con.chatgpt.accounts.find((a) => a.connected)?.id;
  assert.ok(id, "Working account required");
  const list = (await rpc("/api/chats")).body.chats;
  assert.ok(list.length);
  const chatId = list[0].id;
  const before = (await rpc("/api/chats/" + chatId)).body;
  assert.equal(before.turnInFlight, false);
  const messages = hash(before.messages);
  const draftBefore = (await rpc("/coqui/draft?id=" + chatId)).body;
  draftRestore = { chatId, draftBefore };
  await rpc("/coqui/draft?id=" + chatId, "PUT", {
    ...draftBefore,
    text: sentinel,
  });
  const out = await page.evaluate(
    (id) => window.coqui.host("chatgpt", { op: "logout", id }),
    id,
  );
  assert.ok(!out?.error, JSON.stringify(out?.error));
  const disconnected = await page.evaluate(() =>
    window.coqui.host("connections"),
  );
  assert.equal(
    disconnected.chatgpt.accounts.some((a) => a.connected && a.id === id),
    false,
  );
  check(
    "Explicit log out disconnects ChatGPT while retaining its registration for reconnect",
  );
  const catalog = (await rpc("/api/models")).body;
  assert.equal(
    catalog.models.some((m) => m.provider === "chatgpt"),
    false,
  );
  const refused = await rpc("/api/chat", "POST", {
    chatId,
    input: {
      type: "text",
      text: "This disconnected acceptance request must be refused before input persistence.",
    },
  });
  assert.ok(refused.status >= 400);
  assert.equal(
    hash((await rpc("/api/chats/" + chatId)).body.messages),
    messages,
  );
  check(
    "Disconnected inference is refused before input persistence without API billing fallback",
  );
  assert.equal((await rpc("/coqui/draft?id=" + chatId)).body.text, sentinel);
  check("Lesson history and unsent draft survive disconnect");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const signed = await page.evaluate(
    (id) => window.coqui.host("chatgpt", { op: "login", id }),
    id,
  );
  assert.ok(!signed?.error, JSON.stringify(signed?.error));
  console.log(
    "CHATGPT_RECONNECT_OPEN: complete sign-in and consent in your system browser.",
  );
  let connected = false;
  const deadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < deadline) {
    const c = await page.evaluate(() => window.coqui.host("connections"));
    if (!c.chatgpt.pending && c.chatgpt.accounts.some((a) => a.connected)) {
      connected = true;
      break;
    }
    if (!c.chatgpt.pending && c.chatgpt.error) throw new Error(c.chatgpt.error);
    await page.waitForTimeout(1000);
  }
  assert.ok(connected, "Browser sign-in not completed within ten minutes");
  const next = (await rpc("/api/models")).body;
  assert.ok(next.models.some((m) => m.provider === "chatgpt"));
  check("Browser reconnect restores account-specific ChatGPT catalog");
  assert.equal(
    hash((await rpc("/api/chats/" + chatId)).body.messages),
    messages,
  );
  assert.equal((await rpc("/coqui/draft?id=" + chatId)).body.text, sentinel);
  check("Reconnect preserves the exact committed lesson and unsent draft");
  await rpc("/coqui/draft?id=" + chatId, "PUT", draftBefore);
  report.passed = true;
  console.log("CHATGPT_RECONNECT_COMPLETE");
} catch (error) {
  report.failure = error.message;
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (draftRestore && page) {
    try {
      const current = (await rpc("/coqui/draft?id=" + draftRestore.chatId))
        .body;
      if (current.text === sentinel)
        await rpc(
          "/coqui/draft?id=" + draftRestore.chatId,
          "PUT",
          draftRestore.draftBefore,
        );
    } catch {}
  }
  fs.writeFileSync(
    "artifacts/implementation/chatgpt-live-reconnect.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  await app.close();
}
