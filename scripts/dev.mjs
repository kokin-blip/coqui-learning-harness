import { spawn } from "node:child_process";
const build = spawn(process.execPath, ["scripts/build.mjs"], {
  stdio: "inherit",
});
await new Promise((resolve, reject) =>
  build.on("exit", (c) =>
    c === 0 ? resolve() : reject(new Error("Build failed")),
  ),
);
const vite = spawn("node_modules/.bin/vite", ["--config", "vite.config.ts"], {
  stdio: "inherit",
});
const app = spawn(
  "node_modules/.bin/electron",
  [".", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    env: { ...process.env, COQUI_DEV_URL: "http://127.0.0.1:5173/" },
  },
);
app.on("exit", () => vite.kill());
process.on("SIGINT", () => {
  app.kill();
  vite.kill();
});
