import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { verifyMacOSSignature } from "./macos-signature.mjs";
const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const filename = `CoquiLearn-${version}-arm64.dmg`;
const download =
  process.argv[2] ?? path.join(os.homedir(), "Downloads", filename);
const hash = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const quarantine = (file) =>
  execFileSync("/usr/bin/xattr", ["-p", "com.apple.quarantine", file], {
    encoding: "utf8",
  }).trim();
const digest = hash(download);
assert.equal(
  digest,
  hash(path.join("release", filename)),
  "Browser-downloaded DMG must be byte-identical to release",
);
const browserQuarantine = quarantine(download);
assert.match(
  browserQuarantine,
  /Chrome|Safari/,
  "A real browser download is required",
);
execFileSync("/usr/bin/hdiutil", ["verify", download], { stdio: "pipe" });
const root = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-gatekeeper-"));
const mount = path.join(root, "DMG"),
  install = path.join(root, "Applications"),
  app = path.join(install, "CoquiLearn.app");
fs.mkdirSync(mount);
fs.mkdirSync(install);
try {
  execFileSync(
    "/usr/bin/hdiutil",
    ["attach", "-readonly", "-nobrowse", "-mountpoint", mount, download],
    { stdio: "pipe" },
  );
  execFileSync("/usr/bin/ditto", [path.join(mount, "CoquiLearn.app"), app]);
} finally {
  execFileSync("/usr/bin/hdiutil", ["detach", mount], { stdio: "pipe" });
}
const appQuarantine = quarantine(app);
const signature = verifyMacOSSignature(app);
const run = (command, args) => {
  const r = spawnSync(command, args, { encoding: "utf8", timeout: 120000 });
  if (r.error) throw r.error;
  return { exitCode: r.status, output: r.stdout + r.stderr };
};
const gatekeeper = run("/usr/sbin/spctl", [
  "--assess",
  "--type",
  "execute",
  "--verbose=4",
  app,
]);
const policy = run("/usr/bin/syspolicy_check", ["distribution", app]);
assert.doesNotMatch(policy.output, /Codesign Error|code has no resources/i);
const report = {
  version,
  at: new Date().toISOString(),
  dmgSha256: digest,
  browserQuarantine,
  appQuarantine,
  signature,
  gatekeeper,
  policy,
  integrityPassed: true,
  defaultGatekeeperAccepted: gatekeeper.exitCode === 0,
  manualApproval: { verified: false },
  environment:
    "Existing macOS host; real Chrome download from loopback test origin, isolated Applications/profile. Not a clean-Mac result.",
};
fs.writeFileSync(
  "artifacts/implementation/downloaded-dmg-acceptance.json",
  JSON.stringify(report, null, 2) + "\n",
);
fs.writeFileSync(
  "out/gatekeeper-test.json",
  JSON.stringify({ root, app, profile: path.join(root, "profile") }, null, 2),
);
console.log(
  JSON.stringify({
    app,
    profile: path.join(root, "profile"),
    integrityPassed: true,
    defaultGatekeeperAccepted: report.defaultGatekeeperAccepted,
    gatekeeper,
    policy,
  }),
);
