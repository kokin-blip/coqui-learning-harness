import { execFileSync } from "node:child_process";
import { build as esbuild } from "esbuild";
import { build as vite } from "vite";
import fs from "node:fs";
import path from "node:path";
import "./generate-routes.mjs";
fs.mkdirSync("dist", { recursive: true });
await esbuild({
  entryPoints: ["scripts/history.ts"],
  outfile: "dist/history.mjs",
  platform: "node",
  format: "esm",
  bundle: true,
  packages: "external",
  target: "node24",
});
fs.cpSync("skills/coquilearn", "dist/skills/coquilearn", { recursive: true });
fs.mkdirSync("dist/engine/fixtures", { recursive: true });
fs.copyFileSync(
  "packages/engine/tests/fixtures/sample-3page.pdf",
  "dist/engine/fixtures/sample-3page.pdf",
);
await esbuild({
  entryPoints: ["apps/desktop/main/main.ts"],
  outfile: "dist/desktop/main.cjs",
  platform: "node",
  format: "cjs",
  bundle: true,
  packages: "external",
  external: ["electron"],
  sourcemap: true,
  target: "node24",
});
await esbuild({
  entryPoints: ["apps/desktop/main/preload.ts"],
  outfile: "dist/desktop/preload.cjs",
  platform: "node",
  format: "cjs",
  bundle: true,
  external: ["electron"],
  target: "node24",
});
await esbuild({
  entryPoints: ["packages/engine/service.ts"],
  outfile: "dist/engine/service.mjs",
  platform: "node",
  format: "esm",
  bundle: true,
  packages: "external",
  alias: { "@": path.resolve("packages/engine") },
  banner: {
    js: 'import {createRequire as __createRequire} from "node:module"; const require=__createRequire(import.meta.url);',
  },
  target: "node24",
  sourcemap: true,
});
fs.cpSync(
  "packages/engine/src/agent/prompts",
  "dist/engine/src/agent/prompts",
  { recursive: true },
);
fs.copyFileSync(
  "packages/engine/src/agent/system-prompt.md",
  "dist/engine/src/agent/system-prompt.md",
);
fs.cpSync(
  "packages/engine/src/agent/image-processing",
  "dist/engine/src/agent/image-processing",
  { recursive: true },
);
fs.mkdirSync("dist/engine/native", { recursive: true });
if (process.platform === "darwin")
  execFileSync(
    "xcrun",
    [
      "swiftc",
      "-O",
      "-module-cache-path",
      "/private/tmp/coqui-swift-cache",
      "-target",
      "arm64-apple-macosx26.0",
      "apps/desktop/native/recognize-text.swift",
      "-o",
      "dist/engine/native/coqui-ocr",
    ],
    { stdio: "inherit" },
  );
await vite({ configFile: "vite.config.ts" });

fs.cpSync("apps/desktop/renderer/assets", "dist/renderer/assets", {
  recursive: true,
});

fs.copyFileSync(
  "apps/desktop/main/bootstrap.cjs",
  "dist/desktop/bootstrap.cjs",
);
fs.cpSync("apps/desktop/renderer/worklets", "dist/renderer/worklets", {
  recursive: true,
});
