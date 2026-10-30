import fs from "node:fs";
import crypto from "node:crypto";

/** Bind observations to the payload actually launched, before any checks run. */
export async function acceptanceBuild(app) {
  const runtime = await app.evaluate(({ app }) => ({
    version: app.getVersion(),
    packaged: app.isPackaged,
    appPath: app.getAppPath(),
    electron: process.versions.electron,
    node: process.versions.node,
  }));
  const { appPath, ...build } = runtime;
  return {
    ...build,
    upstreamCommit: "dc4c398d5167865b84b0ccb3ec809eb88bf8f65f",
    appPayloadSha256: runtime.packaged
      ? crypto
          .createHash("sha256")
          .update(fs.readFileSync(appPath))
          .digest("hex")
      : null,
  };
}
