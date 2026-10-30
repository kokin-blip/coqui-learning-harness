import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const suites = [
  "question-tools",
  "question-core",
  "plan-tree",
  "plan-blocks",
  "pan-zoom",
  "specialist-loops",
  "pending-authority",
  "graph",
  "graph-tools",
  "graph-context",
  "provider-events",
  "tool-toggles-bridge",
  "settings-store",
  "extraction",
  "practice-agents",
  "practice-record",
  "practice-heal",
  "practice-flow",
  "jobs",
  "job-delivery-recovery",
  "turn-recovery",
  "tool-heal",
  "tool-parts",
  "claude-code-stream",
  "claude-code-transcript",
  "claude-code-tool-bridge",
  "claude-code-installation",
  "subscription-auth",
  "subscription-stream",
  "subscription-background",
  "chatgpt-auth",
  "chatgpt-request-cycle",
  "chatgpt-stream",
  "chatgpt-background",
  "chatgpt-catalog",
  "coverage",
  "session-core",
  "session-markdown",
  "markdown-export",
  "session-clusters",
  "clusters",
  "graph-canvas",
  "layout",
  "render-settings",

  "settings-resolution",
  "dictation-language",
  "dictation-warm",
  "dictation-preference",
  "dictation-flow",
  "file-paths",
  "path-input",
  "fuzzy",
  "read-tool",
  "fs-tools",
  "pdf-ops",
  "pdf-reader",
  "pdf-native-render",
  "svg-native-render",
  "image-processing",
  "headless-png",
  "tool-abort",
  "search",
  "web-search",
  "researcher-pdf",
  "send-to-user",
  "probe-done",
  "compaction",
  "context-usage",
  "cost-summary",
  "pricing-native-parity",
  "provider-neutral-agents",
  "model-catalog",
  "claude-code-provider",
  "claude-code-harness",
  "claude-code-opt-in",
  "custom-endpoint",
  "custom-provider-route",
  "custom-provider-boundaries",

  "settings-body",
  "settings",
  "title-from-prompt",
  "call-ids",
  "chat-flow",
  "chat-store-events",
  "turn-liveness",
];
let failed = 0,
  passed = 0;
fs.mkdirSync("artifacts/implementation/tests", { recursive: true });
const subset = process.env.COQUI_TEST_SUBSET?.split(",").filter(Boolean);
if (subset?.some((name) => !suites.includes(name)))
  throw new Error("Unknown requested test suite");
for (const suite of suites.filter((name) => !subset || subset.includes(name))) {
  let file = path.resolve("packages/engine/tests/" + suite + ".test.ts");
  if (!fs.existsSync(file)) file = file + "x";
  if (!fs.existsSync(file)) continue;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-engine-test-"));
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "--test", "--test-reporter=tap", file],
    {
      cwd: path.resolve("packages/engine"),
      env: { ...process.env, NODE_ENV: "test", LH_DATA_DIR: dir },
      encoding: "utf8",
      timeout: 60000,
      maxBuffer: 8 * 1024 * 1024,
    },
  );
  const log = (result.stdout ?? "") + (result.stderr ?? "");
  fs.writeFileSync("artifacts/implementation/tests/" + suite + ".log", log);
  const count = Number(log.match(/# tests (\d+)/)?.[1] ?? 0);
  console.log(
    `${result.status === 0 ? "PASS" : "FAIL"} ${suite}: ${count} tests`,
  );
  if (result.status === 0) passed += count;
  else {
    failed++;
    console.log(log.slice(-1500));
  }
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log(JSON.stringify({ passedTests: passed, failedSuites: failed }));
process.exitCode = failed ? 1 : 0;
