import { _electron as electron } from "playwright";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
const executable = process.env.COQUI_EXECUTABLE;
if (!executable)
  throw new Error("Set COQUI_EXECUTABLE to the packaged application binary");
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-runtime-"));
const app = await electron.launch({
  executablePath: executable,
  args: [],
  env: { ...process.env, COQUI_DATA_DIR: directory },
});
try {
  const page = await app.firstWindow();
  await page
    .getByRole("heading", { name: "Your understanding, connected." })
    .waitFor({ timeout: 30000 });
  const environment = await page.evaluate(() =>
    window.coqui.host("environment"),
  );
  assert.equal(environment.fixture, false);
  console.log("Packaged production app ready");
  const result = await Promise.race([
    app.evaluate(async ({ app }) => {
      const { createRequire, registerHooks } =
        process.getBuiltinModule("node:module");
      const path = process.getBuiltinModule("node:path");
      const { pathToFileURL } = process.getBuiltinModule("node:url");
      const resolve = createRequire(
        path.join(app.getAppPath(), "package.json"),
      );
      const names = [
        "@earendil-works/pi-ai",
        "@earendil-works/pi-ai/providers/github-copilot",
        "@earendil-works/pi-ai/providers/xai",
      ];
      const modules = [];
      for (const name of names) {
        const hook = registerHooks({
          resolve(specifier, context, next) {
            return next(
              specifier,
              specifier === name
                ? { ...context, conditions: [...context.conditions, "import"] }
                : context,
            );
          },
        });
        let file;
        try {
          file = resolve.resolve(name);
        } finally {
          hook.deregister();
        }
        const vm = process.getBuiltinModule("node:vm");
        const sdk = await vm.runInThisContext(
          "import(" + JSON.stringify(pathToFileURL(file).href) + ")",
          {
            importModuleDynamically:
              vm.constants.USE_MAIN_CONTEXT_DEFAULT_LOADER,
          },
        );
        modules.push({ name, loaded: true, exports: Object.keys(sdk) });
      }
      return {
        packaged: app.isPackaged,
        node: process.versions.node,
        electron: process.versions.electron,
        modules,
      };
    }),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error("SDK import timed out")),
        30000,
      ).unref(),
    ),
  ]);
  result.fixture = environment.fixture;
  assert.equal(result.packaged, true);
  assert.equal(result.modules.length, 3);
  assert.ok(result.modules.every((m) => m.loaded));
  assert.ok(result.modules[0].exports.includes("createModels"));
  assert.ok(result.modules[1].exports.includes("githubCopilotProvider"));
  assert.ok(result.modules[2].exports.includes("xaiProvider"));
  fs.writeFileSync(
    "artifacts/implementation/packaged-runtime.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result));
} finally {
  await app.close();
}
