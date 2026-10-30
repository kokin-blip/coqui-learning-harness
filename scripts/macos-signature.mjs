import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";

/** Integrity is separate from Developer ID trust/notarization. Both matter. */
export function verifyMacOSSignature(appPath) {
  const seal = path.join(appPath, "Contents/_CodeSignature/CodeResources");
  if (!fs.existsSync(seal))
    throw new Error("Missing macOS bundle resource seal: " + appPath);
  execFileSync(
    "/usr/bin/codesign",
    ["--verify", "--deep", "--strict", "--verbose=2", appPath],
    { stdio: "pipe" },
  );
  // codesign emits its display metadata on stderr.
  const display = spawnSync(
    "/usr/bin/codesign",
    ["--display", "--verbose=4", appPath],
    { encoding: "utf8" },
  );
  if (display.status !== 0)
    throw new Error(display.stderr || "Cannot read code signature");
  const details = display.stdout + display.stderr;
  const identifier = details.match(/^Identifier=(.+)$/m)?.[1];
  if (identifier !== "com.coquilearn.desktop")
    throw new Error("Unexpected signed bundle identity: " + identifier);
  if (!/^Sealed Resources[= ]version=2 /m.test(details))
    throw new Error("Missing version-2 resource envelope");
  if (/flags=.*linker-signed/.test(details))
    throw new Error("Unsealed linker signature survived packaging");
  const nativeFiles = [];
  function verifyNative(directory) {
    if (!fs.existsSync(directory)) return;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) verifyNative(file);
      else if (entry.isFile()) {
        const fd = fs.openSync(file, "r");
        const header = Buffer.alloc(4);
        try {
          fs.readSync(fd, header, 0, 4, 0);
        } finally {
          fs.closeSync(fd);
        }
        if (
          [
            "feedface",
            "cefaedfe",
            "feedfacf",
            "cffaedfe",
            "cafebabe",
            "bebafeca",
            "cafebabf",
            "bfbafeca",
          ].includes(header.toString("hex"))
        ) {
          execFileSync("/usr/bin/codesign", ["--verify", "--strict", file], {
            stdio: "pipe",
          });
          nativeFiles.push(path.relative(appPath, file));
        }
      }
    }
  }
  verifyNative(path.join(appPath, "Contents/Resources/app.asar.unpacked"));
  return {
    identifier,
    kind: /^Signature=adhoc$/m.test(details) ? "ad-hoc" : "certificate",
    teamIdentifier: details.match(/^TeamIdentifier=(.+)$/m)?.[1] ?? null,
    cdhash: details.match(/^CDHash=(.+)$/m)?.[1],
    resourceSealSha256: crypto
      .createHash("sha256")
      .update(fs.readFileSync(seal))
      .digest("hex"),
    verified: true,
    nativeFiles,
  };
}
