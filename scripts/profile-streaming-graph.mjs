import { acceptanceBuild } from "./acceptance-build.mjs";
import { waitForState } from "./acceptance-wait.mjs";
import { _electron as electron } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
const root = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-profile-"));
fs.mkdirSync("artifacts/implementation/performance", { recursive: true });
const report = {
  at: new Date().toISOString(),
  packaged: !!process.env.COQUI_EXECUTABLE,
  stream: "scripted native engine stream",
  targetFrameMs: 16.7,
};
const app = await electron.launch({
  ...(process.env.COQUI_EXECUTABLE
    ? { executablePath: process.env.COQUI_EXECUTABLE, args: ["--fixture"] }
    : { args: [".", "--fixture"] }),
  env: { ...process.env, COQUI_DATA_DIR: root },
});
const percentile = (xs, p) =>
  [...xs].sort((a, b) => a - b)[
    Math.min(xs.length - 1, Math.floor(xs.length * p))
  ];
try {
  report.build = await acceptanceBuild(app);
  const page = await app.firstWindow();
  await page
    .getByRole("heading", { name: "Your understanding, connected." })
    .waitFor();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const request = async (path, method = "GET", body) => {
    const r = await page.evaluate((r) => window.coqui.request(r), {
      path,
      method,
      body,
      ...(method === "GET" ? {} : { operationId: crypto.randomUUID() }),
    });
    assert.ok(r.status < 400, JSON.stringify(r));
    return r.body;
  };
  await request("/coqui/fixture/graph", "POST", { count: 1000 });
  await page
    .getByRole("textbox", { name: "Learning goal" })
    .fill("[fixture:stream] Explain gradients while I explore the graph.");
  await page
    .getByRole("button", { name: "Start learning", exact: true })
    .click();
  await waitForState(
    page,
    () => document.querySelector(".message.assistant")?.textContent.length > 30,
  );
  const chatId = (await request("/api/chats")).chats[0].id;
  assert.equal((await request("/api/chats/" + chatId)).turnInFlight, true);
  await page.getByRole("button", { name: "Map", exact: true }).first().click();
  const canvas = page.locator(".knowledge-canvas");
  await canvas.waitFor();
  await canvas.focus();
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Performance.enable");
  await cdp.send("Tracing.start", {
    categories:
      "devtools.timeline,v8,blink.user_timing,disabled-by-default-devtools.timeline.frame",
    transferMode: "ReturnAsStream",
  });
  const complete = new Promise((resolve) =>
    cdp.once("Tracing.tracingComplete", resolve),
  );
  const sampling = page.evaluate(
    () =>
      new Promise((resolve) => {
        const frames = [],
          latencies = [],
          longTasks = [];
        let previous = performance.now(),
          started = previous;
        const onKey = (e) => {
          latencies.push(performance.now() - e.timeStamp);
        };
        window.addEventListener("keydown", onKey, true);
        const observer = new PerformanceObserver((list) => {
          for (const e of list.getEntries())
            longTasks.push({ at: e.startTime, duration: e.duration });
        });
        observer.observe({ type: "longtask", buffered: false });
        const tick = (now) => {
          performance.mark("coqui-profile-frame");
          frames.push(now - previous);
          previous = now;
          if (now - started < 5000) requestAnimationFrame(tick);
          else {
            observer.disconnect();
            window.removeEventListener("keydown", onKey, true);
            resolve({ frames, latencies, longTasks, elapsed: now - started });
          }
        };
        requestAnimationFrame(tick);
      }),
  );
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press(i % 2 ? "ArrowLeft" : "ArrowRight");
    await page.waitForTimeout(40);
  }
  const sampled = await sampling;
  await cdp.send("Tracing.end");
  const { stream } = await complete;
  let trace = "";
  for (;;) {
    const r = await cdp.send("IO.read", { handle: stream });
    trace += r.data;
    if (r.eof) break;
  }
  await cdp.send("IO.close", { handle: stream });
  fs.mkdirSync("artifacts/implementation/performance", { recursive: true });
  fs.writeFileSync(
    "artifacts/implementation/performance/streaming-graph.trace.json",
    trace,
  );
  const events = JSON.parse(trace).traceEvents ?? [];
  const main = events.find(
    (e) =>
      e.ph === "M" &&
      e.name === "thread_name" &&
      e.args?.name === "CrRendererMain",
  );
  const markers = events
    .filter((e) => e.name === "coqui-profile-frame" && e.ph === "I")
    .map((e) => e.ts)
    .sort((a, b) => a - b);
  if (!markers.length)
    markers.push(
      ...events
        .filter((e) => e.name === "coqui-profile-frame")
        .map((e) => e.ts)
        .sort((a, b) => a - b),
    );
  const spans = events
    .filter(
      (e) =>
        e.ph === "X" &&
        e.dur &&
        e.tid === main?.tid &&
        [
          "FunctionCall",
          "EventDispatch",
          "FireAnimationFrame",
          "UpdateLayoutTree",
          "Layout",
          "Paint",
          "PrePaint",
          "Layerize",
          "MinorGC",
          "MajorGC",
        ].includes(e.name),
    )
    .map((e) => [e.ts, e.ts + e.dur])
    .sort((a, b) => a[0] - b[0]);
  const union = [];
  for (const span of spans) {
    const last = union.at(-1);
    if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
    else union.push([...span]);
  }
  const frameWork = markers
    .slice(1)
    .map(
      (end, i) =>
        union.reduce(
          (sum, [a, b]) =>
            sum + Math.max(0, Math.min(b, end) - Math.max(a, markers[i])),
          0,
        ) / 1000,
    );
  const frameMedian = percentile(sampled.frames, 0.5);
  Object.assign(report, {
    propositions: 1000,
    implicationNodes: 333,
    streamStillRunning: (await request("/api/chats/" + chatId)).turnInFlight,
    elapsedMs: sampled.elapsed,
    frameIntervals: {
      samples: sampled.frames.length,
      medianMs: frameMedian,
      p95Ms: percentile(sampled.frames, 0.95),
      maxMs: Math.max(...sampled.frames),
      over16_7ms: sampled.frames.filter((x) => x > 16.7).length,
      estimatedMissedDisplayFrames: sampled.frames.reduce(
        (n, x) => n + Math.max(0, Math.round(x / frameMedian) - 1),
        0,
      ),
    },
    inputDelay: {
      samples: sampled.latencies.length,
      medianMs: percentile(sampled.latencies, 0.5),
      p95Ms: percentile(sampled.latencies, 0.95),
      maxMs: Math.max(...sampled.latencies),
      measurement: "DOM keydown handler minus native event timestamp",
    },
    mainThreadFrameWork: {
      samples: frameWork.length,
      p95Ms: percentile(frameWork, 0.95),
      maxMs: frameWork.length ? Math.max(...frameWork) : null,
      measurement:
        "Union of JS, GC, event, style, layout and paint spans between instrumented RAF markers; compositor/GPU work is separate",
    },
    traceDroppedFrameEvents: events.some((e) => e.name === "DroppedFrame")
      ? events.filter((e) => e.name === "DroppedFrame").length
      : null,
    longTasks: sampled.longTasks,
    chromiumMetrics: (await cdp.send("Performance.getMetrics")).metrics.filter(
      (m) =>
        [
          "JSHeapUsedSize",
          "JSHeapTotalSize",
          "Nodes",
          "Documents",
          "TaskDuration",
          "ScriptDuration",
          "LayoutDuration",
        ].includes(m.name),
    ),
    memory: await app.evaluate(({ app }) =>
      app
        .getAppMetrics()
        .map((m) => ({ type: m.type, name: m.name, memory: m.memory })),
    ),
    errors,
  });
  assert.equal(report.streamStillRunning, true);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.failure = error.stack;
  console.error(error);
  process.exitCode = 1;
} finally {
  await app.close();
  fs.writeFileSync(
    "artifacts/implementation/performance/streaming-graph.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  fs.rmSync(root, { recursive: true, force: true });
}
