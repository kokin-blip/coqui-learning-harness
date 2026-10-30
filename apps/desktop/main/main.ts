import {
  ARTIFACT_CSP,
  ARTIFACT_POLICY_VERSION,
  artifactDocument,
} from "../../../packages/engine/src/core/artifact-policy.ts";
import {
  app,
  BrowserWindow,
  ipcMain,
  utilityProcess,
  Menu,
  dialog,
  shell,
  nativeTheme,
  systemPreferences,
  protocol,
  net,
  clipboard,
} from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import { pathToFileURL } from "node:url";
import { randomUUID } from "node:crypto";
import {
  prepareRestore,
  recoverRestore,
} from "../../../packages/storage/restore.ts";
import { createVault } from "./vault.ts";
import { createChatGPT } from "../../../packages/engine/electron/chatgpt.cjs";
import { chatGPTControl } from "../../../packages/engine/electron/chatgpt-ipc.cjs";
import {
  createSubscriptions,
  loadSubscriptionSDK,
} from "../../../packages/engine/electron/subscriptions.cjs";
import { subscriptionControl } from "../../../packages/engine/electron/subscription-ipc.cjs";
import type { DesktopRequest } from "../../../packages/contracts/index.ts";
const fixture = process.argv.includes("--fixture");
const dev = !app.isPackaged;
app.setName("CoquiLearn");
const override = process.env.COQUI_DATA_DIR;
const userRoot =
  override ??
  path.join(
    app.getPath("appData"),
    "CoquiLearn" + (fixture ? "-fixture" : dev ? "-dev" : ""),
  );
app.setPath("userData", userRoot);
function log(value: unknown) {
  try {
    const dir = path.join(userRoot, "logs");
    fsSync.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const file = path.join(dir, "main.log");
    if (fsSync.existsSync(file) && fsSync.statSync(file).size > 5 * 1024 * 1024)
      fsSync.renameSync(file, file + ".previous");
    fsSync.appendFileSync(
      file,
      new Date().toISOString() + " " + String(value) + "\n",
      { mode: 0o600 },
    );
  } catch {}
}
process.on("uncaughtException", (error) => {
  log(error.stack ?? error.message);
  publish("host-error", {
    error: "A desktop error was recorded. Your library is saved.",
  });
});
protocol.registerSchemesAsPrivileged([
  {
    scheme: "coqui-artifact",
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
  {
    scheme: "coqui",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);
const lock = app.requestSingleInstanceLock();
if (!lock) app.quit();
let win: BrowserWindow | undefined,
  child: Electron.UtilityProcess | undefined,
  chatgpt: any,
  native: any,
  vault: ReturnType<typeof createVault>;
const calls = new Map<
  string,
  { resolve: (v: any) => void; reject: (e: Error) => void }
>();
let restoring = false,
  serviceSuspended = false;
let quitting = false,
  restarts = 0;
const importGrants = new Map<string, string>();
async function readImport(id: string) {
  const file = importGrants.get(id);
  if (!file) throw new Error("Choose this source file again.");
  try {
    const stat = await fs.stat(file);
    if (stat.size > 32 * 1024 * 1024) throw new Error("File exceeds 32 MB");
    return {
      id,
      name: path.basename(file),
      base64: (await fs.readFile(file)).toString("base64"),
    };
  } catch (error) {
    return { id, name: path.basename(file), error: (error as Error).message };
  }
}
const artifactPages = new Map<string, string>();
let hostSequence = 0,
  serviceEpoch = randomUUID(),
  stateCursor = 0;
let readyResolve: () => void;
let readyReject: (e: Error) => void;
let ready = new Promise<void>((resolve, reject) => {
  readyResolve = resolve;
  readyReject = reject;
});
const post = (v: any) => child?.postMessage(v);
const publish = (type: string, data: any) =>
  win?.webContents.send("coqui:event", {
    type,
    data,
    sequence: ++hostSequence,
    serviceEpoch,
    cursor: stateCursor,
  });
const animationSettings = () => ({
  reduceMotion: systemPreferences.getAnimationSettings().prefersReducedMotion,
  reduceTransparency: nativeTheme.prefersReducedTransparency,
  dark: nativeTheme.shouldUseDarkColors,
});
async function request(input: DesktopRequest, internal = false) {
  if (restoring && !internal)
    throw new Error("The library is being restored. Please wait.");
  await ready;
  return new Promise<any>((resolve, reject) => {
    const id = randomUUID();
    const timer = setTimeout(() => {
      calls.delete(id);
      reject(
        new Error(
          "The learning service did not respond. Your saved work is retained.",
        ),
      );
    }, 90000);
    calls.set(id, {
      resolve: (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      reject: (e) => {
        clearTimeout(timer);
        reject(e);
      },
    });
    post({ type: "request", id, request: input });
  });
}
async function privateOperation(op: string, f: any) {
  if (op === "vault.read") return vault.read(f.key);
  if (op === "vault.write") return vault.write(f.key, f.value);
  if (op === "subscription") {
    const { channel, op: action, fields } = f;
    if (channel === "lh:chatgpt") {
      if (action === "status")
        return { status: await chatgpt.status(), ...chatgpt.stamp() };
      if (action === "models") return chatgpt.models();
      if (action === "lease") return chatgpt.lease(fields.background, fields);
    }
    if (channel === "lh:subscriptions") {
      if (action === "snapshot" || action === "status")
        return native.snapshot();
      if (action === "lease")
        return native.lease(fields.scope, fields.background);
    }
  }
  throw new Error("Unknown private operation");
}
async function startService() {
  serviceEpoch = randomUUID();
  ready = new Promise<void>((resolve, reject) => {
    readyResolve = resolve;
    readyReject = reject;
  });
  void ready.catch(() => {});
  child = utilityProcess.fork(
    path.join(app.getAppPath(), "dist/engine/service.mjs"),
    [],
    {
      serviceName: "CoquiLearn learning service",
      env: {
        ...process.env,
        COQUI_DATA_DIR: path.join(userRoot, "library"),
        LH_DATA_DIR: path.join(userRoot, "library"),
        COQUI_APP_PATH: app.getAppPath(),
        COQUI_FIXTURE_MODE: fixture ? "1" : "0",
        COQUI_MAINTENANCE: restoring ? "1" : "0",
        COQUI_RESOURCE_ROOT: path.join(app.getAppPath(), "dist/engine"),
        NODE_ENV: fixture ? "test" : dev ? "development" : "production",
      },
      stdio: "pipe",
    },
  );
  child.on("message", async (packet) => {
    if (packet.type === "ready") {
      stateCursor = packet.cursor ?? 0;
      readyResolve();
      publish("service-ready", {});
      return;
    }
    if (packet.type === "event") {
      stateCursor = packet.event.cursor ?? stateCursor;
      win?.webContents.send("coqui:event", {
        ...packet.event,
        sequence: ++hostSequence,
        serviceEpoch,
        cursor: stateCursor,
      });
      return;
    }
    if (packet.type === "response") {
      const p = calls.get(packet.id);
      calls.delete(packet.id);
      p?.resolve(packet.value);
      return;
    }
    if (packet.type === "private") {
      try {
        post({
          type: "private-result",
          id: packet.id,
          value: await privateOperation(packet.op, packet.fields),
        });
      } catch (e) {
        post({
          type: "private-result",
          id: packet.id,
          error: (e as Error).message,
        });
      }
    }
  });
  child.on("exit", () => {
    const e = new Error(
      "The learning service stopped. Your work is saved; reconnecting…",
    );
    readyReject(e);
    for (const p of calls.values()) p.reject(e);
    calls.clear();
    if (!quitting && !serviceSuspended) {
      publish("service-error", { error: e.message });
      if (restarts++ < 3) setTimeout(() => void startService(), 500);
      else
        publish("service-error", {
          error:
            "The learning service could not restart. Reopen CoquiLearn to resume your saved work.",
        });
    }
  });
  child.stderr?.on("data", (b) => {
    log(b.toString());
    try {
      process.stderr.write(b);
    } catch {}
  });
  child.stdout?.on("data", (b) => {
    log(b.toString());
    try {
      process.stdout.write(b);
    } catch {}
  });
}
function trusted(event: Electron.IpcMainInvokeEvent) {
  return (
    !!win &&
    event.sender === win.webContents &&
    event.senderFrame === win.webContents.mainFrame
  );
}
async function stopService() {
  serviceSuspended = true;
  const running = child;
  if (!running) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      if (running.pid)
        try {
          process.kill(running.pid, "SIGKILL");
        } catch {}
    }, 5000);
    running.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    running.kill();
  });
  child = undefined;
}
async function host(action: string, p: any) {
  if (action === "artifact.register") {
    if (typeof p.html !== "string" || p.html.length > 3 * 1024 * 1024)
      throw new Error("Invalid demonstration");
    if (
      p.policyVersion !== undefined &&
      p.policyVersion !== ARTIFACT_POLICY_VERSION
    )
      throw new Error(
        "This demonstration requires verification with the current application policy. Ask for a repaired demonstration.",
      );
    const id = randomUUID();
    artifactPages.set(id, artifactDocument(p.html, id));
    return {
      url: "coqui-artifact://" + id + "/index.html",
      token: id,
      policyVersion: ARTIFACT_POLICY_VERSION,
    };
  }
  if (action === "artifact.release") {
    artifactPages.delete(new URL(p.url).hostname);
    return { ok: true };
  }
  if (action === "clipboard") {
    if (typeof p.text !== "string" || p.text.length > 8 * 1024 * 1024)
      throw new Error("This source is too large to copy.");
    clipboard.writeText(p.text);
    return { copied: true };
  }
  if (action === "environment")
    return {
      version: app.getVersion(),
      ...animationSettings(),
      fixture,
      zoom: win?.webContents.getZoomFactor() ?? 1,
    };
  if (action === "connections")
    return { chatgpt: await chatgpt.status(), native: await native.status() };
  if (action === "chatgpt") {
    const result = await chatGPTControl(p, chatgpt);
    publish("connections-changed", {});
    if (result?.error) publish("host-error", { error: result.error });
    return result;
  }
  if (action === "subscription") {
    void subscriptionControl(p, native)
      .then(() => publish("connections-changed", {}))
      .catch((e: Error) => publish("host-error", { error: e.message }));
    return { started: true };
  }
  if (action === "claude.login") {
    const result = await dialog.showMessageBox(win!, {
      message: "Connect Claude Code",
      detail:
        "CoquiLearn uses your unmodified Claude Code installation. Complete sign-in in Terminal, then return here.",
      buttons: ["Open Terminal", "Cancel"],
      defaultId: 0,
      cancelId: 1,
    });
    if (result.response === 0) {
      const dir = path.join(userRoot, "launchers");
      await fs.mkdir(dir, { recursive: true });
      const file = path.join(dir, "Connect Claude Code.command");
      await fs.writeFile(file, "#!/bin/zsh\nclaude auth login\n", {
        mode: 0o700,
      });
      await shell.openPath(file);
    }
    return { ok: true };
  }
  if (action === "open") {
    const url = new URL(p.url);
    if (!["https:", "http:"].includes(url.protocol))
      throw new Error("Unsupported link");
    await shell.openExternal(url.href);
    return { ok: true };
  }
  if (action === "file.pick") {
    const r = await dialog.showOpenDialog(win!, {
      properties: ["openFile", "multiSelections"],
    });
    return r.canceled ? [] : r.filePaths;
  }
  if (action === "file.validate") {
    if (
      !Array.isArray(p.paths) ||
      p.paths.length > 64 ||
      p.paths.some((v: unknown) => typeof v !== "string" || v.length > 8192)
    )
      throw new Error("Choose up to 64 local files.");
    const paths: string[] = [],
      errors: { name: string; reason: string }[] = [];
    for (const value of p.paths) {
      try {
        if (
          !path.isAbsolute(value) ||
          /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(value)
        )
          throw new Error("Choose a single-line absolute file path.");
        if (!(await fs.stat(value)).isFile())
          throw new Error("Choose a file rather than a folder.");
        paths.push(value);
      } catch (error) {
        errors.push({
          name: path.basename(value),
          reason: (error as Error).message,
        });
      }
    }
    return { paths, errors };
  }
  if (action === "import.retry") return readImport(p.id);
  if (action === "import.pick") {
    const r = await dialog.showOpenDialog(win!, {
      properties: ["openFile", "multiSelections"],
      filters: [
        {
          name: "Learning material",
          extensions: [
            "txt",
            "md",
            "markdown",
            "pdf",
            "png",
            "jpg",
            "jpeg",
            "webp",
            "gif",
            "csv",
            "json",
            "html",
          ],
        },
      ],
    });
    if (r.canceled) return [];
    if (r.filePaths.length > 32)
      throw new Error("Choose up to 32 files per import.");
    const sizes = await Promise.all(
      r.filePaths.map((file) =>
        fs.stat(file).then(
          (s) => s.size,
          () => 0,
        ),
      ),
    );
    if (sizes.reduce((a, b) => a + b, 0) > 256 * 1024 * 1024)
      throw new Error(
        "Choose a smaller batch: imports support up to 256 MB at once.",
      );
    const files = [];
    for (const file of r.filePaths) {
      const id = randomUUID();
      importGrants.set(id, file);
      files.push(await readImport(id));
    }
    return files;
  }
  if (action === "backup.save") {
    const r = await dialog.showSaveDialog(win!, {
      defaultPath:
        "CoquiLearn-" + new Date().toISOString().slice(0, 10) + ".coqui",
      filters: [{ name: "CoquiLearn backup", extensions: ["coqui"] }],
    });
    if (r.canceled || !r.filePath) return { cancelled: true };
    const data = await request({ path: "/coqui/backup" });
    if (data.status !== 200 || typeof data.body?.base64 !== "string")
      throw new Error(data.body?.error ?? "The backup could not be verified. The previous file is retained.");
    const temporary = r.filePath + ".pending-" + randomUUID();
    try {
      const file = await fs.open(temporary, "wx", 0o600);
      try { await file.writeFile(Buffer.from(data.body.base64, "base64")); await file.sync(); }
      finally { await file.close(); }
      await fs.rename(temporary, r.filePath);
      const folder = await fs.open(path.dirname(r.filePath), "r");
      try { await folder.sync(); } finally { await folder.close(); }
    } finally { await fs.rm(temporary, { force: true }); }
    return { saved: true };
  }
  if (action === "backup.restore") {
    const r = await dialog.showOpenDialog(win!, {
      properties: ["openFile"],
      filters: [{ name: "CoquiLearn backup", extensions: ["coqui"] }],
    });
    if (r.canceled) return { cancelled: true };
    const check = await dialog.showMessageBox(win!, {
      type: "question",
      message: "Restore this CoquiLearn backup?",
      detail:
        "The current library will be replaced. A recovery backup will be saved first. Provider connections stay on this Mac.",
      buttons: ["Cancel", "Restore"],
      defaultId: 0,
      cancelId: 0,
    });
    if (check.response !== 1) return { cancelled: true };
    if (restoring) throw new Error("A restore is already running.");
    restoring = true;
    let transaction: ReturnType<typeof prepareRestore> | undefined;
    try {
      const admission = await request(
        { path: "/coqui/restore/check", method: "POST" },
        true,
      );
      if (admission.status !== 200 || !admission.body?.ready)
        throw new Error(admission.body?.error ?? "The library is busy.");
      const current = await request({ path: "/coqui/backup" }, true);
      const dir = path.join(userRoot, "recovery");
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(
        path.join(dir, "before-restore-" + Date.now() + ".coqui"),
        Buffer.from(current.body.base64, "base64"),
      );
      transaction = prepareRestore(userRoot, await fs.readFile(r.filePaths[0]));
      await stopService();
      transaction.install();
      await startService();
      await ready;
      await request({ path: "/coqui/state" }, true);
      const verification = await request(
        { path: "/coqui/restore/verify" },
        true,
      );
      if (verification.body.records !== transaction.records)
        throw new Error("Restored record verification failed.");
      transaction.commit();
      publish("library-restored", {});
      return {
        status: 200,
        body: { restored: true, records: transaction.records },
      };
    } catch (error) {
      if (transaction) {
        await stopService();
        transaction.rollback();
        await startService();
        await ready;
      } else
        await request(
          { path: "/coqui/restore/resume", method: "POST" },
          true,
        ).catch(() => {});
      throw error;
    } finally {
      await request(
        { path: "/coqui/restore/resume", method: "POST" },
        true,
      ).catch(() => {});
      restoring = false;
      serviceSuspended = false;
      publish("service-ready", {});
    }
  }
  if (action === "export") {
    const r = await dialog.showSaveDialog(win!, {
      defaultPath: (p.title || "Learning session") + (p.extension ?? ".md"),
    });
    if (!r.canceled && r.filePath) await fs.writeFile(r.filePath, p.text);
    return { saved: !r.canceled };
  }
  if (action === "updates") {
    const response = await fetch(
      "https://api.github.com/repos/kokin-blip/coqui-learning-harness/releases/latest",
      { headers: { Accept: "application/vnd.github+json" } },
    );
    if (response.status === 404)
      return { available: false, current: app.getVersion() };
    if (!response.ok)
      throw new Error("Release information is unavailable. Try again later.");
    const r = await response.json();
    return {
      available:
        r.tag_name !== app.getVersion() &&
        r.tag_name !== "v" + app.getVersion(),
      version: r.tag_name,
      url: r.html_url,
    };
  }
  throw new Error("Unknown desktop action");
}
// LearnHarness's explicit native zoom ladder; keep the traffic-light gutter physical-sized.
const ZOOM_LADDER = [0.75, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];
function applyZoom(factor: number) {
  win?.webContents.setZoomFactor(factor);
  publish("zoom-changed", { factor });
}
function stepZoom(direction: number) {
  const current = win?.webContents.getZoomFactor() ?? 1;
  const next =
    direction > 0
      ? ZOOM_LADDER.find((z) => z > current + 0.001)
      : [...ZOOM_LADDER].reverse().find((z) => z < current - 0.001);
  applyZoom(next ?? (direction > 0 ? 2 : 0.75));
}
async function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 880,
    minHeight: 640,
    title: "CoquiLearn",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 14, y: 15 },
    backgroundColor: "#00000000",
    vibrancy: "under-window",
    webPreferences: {
      preload: path.join(app.getAppPath(), "dist/desktop/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.webContents.session.setPermissionRequestHandler(
    (contents, permission, callback, details) => {
      callback(
        contents === win?.webContents &&
          (permission === "local-fonts" ||
            (permission === "media" &&
              (
                ("mediaTypes" in details ? details.mediaTypes : []) as string[]
              )?.every((t: string) => t === "audio") === true)),
      );
    },
  );
  win.webContents.session.setPermissionCheckHandler(
    (contents, permission) =>
      contents === win?.webContents &&
      (permission === "media" || permission === "local-fonts"),
  );
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown" || !(input.meta || input.control) || input.alt)
      return;
    if (["=", "+", "-", "0"].includes(input.key)) {
      event.preventDefault();
      if (input.key === "0") applyZoom(1);
      else stepZoom(input.key === "-" ? -1 : 1);
    }
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (!(
      url.startsWith("coqui://app/") ||
      (dev && url.startsWith("http://127.0.0.1:5173/"))
    ))
      e.preventDefault();
  });
  const url = process.env.COQUI_DEV_URL;
  if (url) await win.loadURL(url);
  else await win.loadURL("coqui://app/index.html");
  win.on("closed", () => {
    win = undefined;
  });
}
app
  .whenReady()
  .then(async () => {
    vault = createVault(path.join(userRoot, "credentials"));
    const onChat = (packet?: any) => {
      post({ type: "subscription-packet", channel: "lh:chatgpt", packet });
      publish("connections-changed", {});
    };
    chatgpt = createChatGPT({
      store: vault.store("chatgpt"),
      openExternal: (url: string) => shell.openExternal(url),
      onChange: onChat,
    });
    native = createSubscriptions({
      directory: path.join(userRoot, "credentials"),
      stores: {
        "github-copilot": {
          read: async () =>
            (await vault.read("copilot")) ?? {
              version: 1,
              allowBackgroundUse: true,
            },
          write: (v: any) => vault.write("copilot", v),
        },
        xai: {
          read: async () =>
            (await vault.read("grok")) ?? {
              version: 1,
              allowBackgroundUse: true,
            },
          write: (v: any) => vault.write("grok", v),
        },
      },
      loadSDK: () => loadSubscriptionSDK(app.getAppPath()),
      openExternal: (url: string) => shell.openExternal(url),
      onChange: (snapshot: any) => {
        post({
          type: "subscription-packet",
          channel: "lh:subscriptions",
          packet: { channel: "lh:subscriptions", op: "changed", snapshot },
        });
        publish("connections-changed", {});
      },
    });
    protocol.handle("coqui-artifact", (req) => {
      const html = artifactPages.get(new URL(req.url).hostname);
      return html
        ? new Response(html, {
            headers: {
              "Content-Type": "text/html; charset=utf-8",
              "Content-Security-Policy": ARTIFACT_CSP,
            },
          })
        : new Response("Demonstration unavailable", { status: 404 });
    });
    protocol.handle("coqui", (req) => {
      const url = new URL(req.url),
        base = path.join(app.getAppPath(), "dist/renderer");
      const file = path.resolve(base, "." + decodeURIComponent(url.pathname));
      if (
        url.hostname !== "app" ||
        !(file === base || file.startsWith(base + path.sep))
      )
        return new Response("Not found", { status: 404 });
      return net.fetch(pathToFileURL(file).href);
    });
    ipcMain.handle("coqui:request", (event, input) => {
      if (!trusted(event)) throw new Error("Untrusted window");
      if (
        [
          "/coqui/backup",
          "/coqui/restore",
          "/coqui/restore/check",
          "/coqui/restore/resume",
        ].includes(new URL(input.path, "http://coqui").pathname)
      )
        throw new Error("Use the native backup controls.");
      return request(input);
    });
    ipcMain.handle("coqui:host", (event, { action, payload }) => {
      if (!trusted(event)) throw new Error("Untrusted window");
      return host(action, payload);
    });
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        {
          label: "CoquiLearn",
          submenu: [
            { role: "about" },
            {
              label: "Settings…",
              accelerator: "CmdOrCtrl+,",
              click: () => publish("navigate", { view: "settings" }),
            },
            { type: "separator" },
            { role: "services" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { role: "quit" },
          ],
        },
        {
          label: "File",
          submenu: [
            {
              label: "New Session",
              accelerator: "CmdOrCtrl+N",
              click: () => publish("navigate", { view: "new" }),
            },
            {
              label: "Import Material…",
              accelerator: "CmdOrCtrl+O",
              click: () => publish("navigate", { view: "import" }),
            },
            { type: "separator" },
            { role: "close" },
          ],
        },
        { role: "editMenu" },
        {
          label: "View",
          submenu: [
            { role: "reload" },
            { role: "forceReload" },
            { role: "toggleDevTools" },
            { type: "separator" },
            {
              label: "Actual Size",
              accelerator: "CmdOrCtrl+0",
              click: () => applyZoom(1),
            },
            {
              label: "Zoom In",
              accelerator: "CmdOrCtrl+Plus",
              click: () => stepZoom(1),
            },
            {
              label: "Zoom Out",
              accelerator: "CmdOrCtrl+-",
              click: () => stepZoom(-1),
            },
            { type: "separator" },
            { role: "togglefullscreen" },
          ],
        },
        { role: "windowMenu" },
      ]),
    );
    recoverRestore(userRoot);
    await startService();
    await createWindow();
    nativeTheme.on("updated", () =>
      publish("appearance-system", animationSettings()),
    );
  })
  .catch((e) => {
    dialog.showErrorBox("CoquiLearn could not start", String(e));
    app.quit();
  });
app.on("second-instance", () => {
  win?.show();
  win?.focus();
});
app.on("activate", () => {
  if (!win) void createWindow();
});
app.on("window-all-closed", () => {});
app.on("before-quit", () => {
  quitting = true;
  chatgpt?.close();
  native?.close();
  child?.kill();
});
