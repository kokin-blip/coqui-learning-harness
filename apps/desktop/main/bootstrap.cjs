// Headless verification uses this app's Chromium, with no preload or learner library.
if (process.argv.includes("--browser-service")) {
  const { app, BrowserWindow } = require("electron");
  const net = require("node:net");
  const fs = require("node:fs"),
    os = require("node:os"),
    path = require("node:path");
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-verifier-"));
  app.setPath("userData", temporary);
  app.on("will-quit", () => {
    try {
      fs.rmSync(temporary, { recursive: true, force: true });
    } catch {}
  });
  app.on("web-contents-created", (_, contents) => {
    contents.setWindowOpenHandler(() => ({ action: "deny" }));
    contents.session.setPermissionRequestHandler((_, __, callback) =>
      callback(false),
    );
  });
  let window;
  const finish = () => app.quit();
  process.on("disconnect", finish);
  (async () => {
    if (!process.channel || !process.connected)
      throw new Error("Browser helper requires its parent process.");
    const port = await new Promise((resolve, reject) => {
      const s = net.createServer();
      s.once("error", reject);
      s.listen(0, "127.0.0.1", () => {
        const p = s.address().port;
        s.close(() => resolve(p));
      });
    });
    app.commandLine.appendSwitch("remote-debugging-address", "127.0.0.1");
    app.commandLine.appendSwitch("remote-debugging-port", String(port));
    await app.whenReady();
    app.dock?.hide();
    window = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
      },
    });
    await window.loadURL("about:blank");
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
      try {
        const r = await fetch(`http://127.0.0.1:${port}/json/version`);
        if (r.ok) {
          console.log(`BROWSER_SERVICE_CDP ${port}`);
          return;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error("Browser helper did not become ready.");
  })().catch((e) => {
    console.error(e.message);
    app.exit(1);
  });
} else require("./main.cjs");
