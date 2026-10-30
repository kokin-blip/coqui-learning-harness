import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { zipSync, unzipSync } from "fflate";

const root = process.cwd(),
  version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const release = path.join(root, "release");
const revision = spawnSync("git", ["rev-parse", "--verify", "HEAD"], {
  cwd: root,
  encoding: "utf8",
});
const worktree = spawnSync("git", ["status", "--porcelain"], {
  cwd: root,
  encoding: "utf8",
});
const gitCommit =
  revision.status === 0 && worktree.status === 0 && !worktree.stdout.trim()
    ? revision.stdout.trim()
    : null;
fs.mkdirSync(release, { recursive: true });
const entries = {},
  hashes = [];
const excluded = new Set([
  "node_modules",
  ".git",
  "CoquiLearn.iconset",
  "references",
  "__pycache__",
]);
const sha = (value) => crypto.createHash("sha256").update(value).digest("hex");
function visit(relative) {
  const absolute = path.join(root, relative),
    stat = fs.statSync(absolute);
  if (relative.split(path.sep).some((p) => excluded.has(p))) return;
  if (stat.isDirectory()) {
    for (const name of fs.readdirSync(absolute).sort())
      visit(path.join(relative, name));
    return;
  }
  const name = path.basename(relative);
  if (
    name === ".DS_Store" ||
    name.startsWith(".env") ||
    name === "acceptance-failure.png" ||
    /\.(db|sqlite|pem|key)$/.test(name)
  )
    return;
  const bytes = fs.readFileSync(absolute);
  entries[`CoquiLearn-${version}/${relative.split(path.sep).join("/")}`] = [
    bytes,
    { mtime: stat.mtime, attrs: (stat.mode & 0xffff) << 16, os: 3 },
  ];
  hashes.push(`${relative}\0${sha(bytes)}`);
}
for (const name of [
  "apps",
  "packages",
  "scripts",
  "skills",
  "tests",
  "docs",
  "artifacts",
  "DESIGN.md",
  "PRODUCT.md",
  "README.md",
  "NOTICE",
  "LICENSE",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "vite.config.ts",
  "electron-builder.yml",
  ".npmrc",
  ".gitignore",
  "design-qa.md",
  ".impeccable/design.json",
  ".impeccable/review",
])
  visit(name);
const archive = zipSync(entries, { level: 9 });
const restored = unzipSync(archive);
assert.equal(Object.keys(restored).length, Object.keys(entries).length);
for (const name of [
  "LICENSE",
  "NOTICE",
  "package-lock.json",
  "scripts/build.mjs",
  "DESIGN.md",
])
  assert.ok(restored[`CoquiLearn-${version}/${name}`]);
assert.ok(
  !Object.keys(restored).some(
    (n) =>
      n.includes("/references/") ||
      n.includes("/node_modules/") ||
      n.includes("/.env"),
  ),
);
const sourceName = `CoquiLearn-${version}-source.zip`;
fs.writeFileSync(path.join(release, sourceName), archive);
const files = [
  `CoquiLearn-${version}-arm64-mac.zip`,
  `CoquiLearn-${version}-arm64.dmg`,
  sourceName,
];
const artifacts = files.map((file) => {
  const data = fs.readFileSync(path.join(release, file));
  return { file, bytes: data.length, sha256: sha(data) };
});
fs.writeFileSync(
  path.join(release, "SHA256SUMS"),
  artifacts.map((a) => `${a.sha256}  ${a.file}\n`).join(""),
);
const acceptance = JSON.parse(
  fs.readFileSync("artifacts/implementation/packaged-acceptance.json", "utf8"),
);
const parity = JSON.parse(
  fs.readFileSync("artifacts/implementation/parity/acceptance.json", "utf8"),
);
const setup = JSON.parse(
  fs.readFileSync("artifacts/implementation/setup-acceptance.json", "utf8"),
);
const closure = JSON.parse(
  fs.readFileSync("artifacts/implementation/closure/acceptance.json", "utf8"),
);
const checklist = JSON.parse(
  fs.readFileSync("docs/planning/completion-checklist.json", "utf8"),
);
const appPayloadSha256 = sha(
  fs.readFileSync(
    path.join(release, "mac-arm64/CoquiLearn.app/Contents/Resources/app.asar"),
  ),
);
const signature = JSON.parse(
  fs.readFileSync("artifacts/implementation/signature-acceptance.json", "utf8"),
);
const downloaded = JSON.parse(
  fs.readFileSync(
    "artifacts/implementation/downloaded-dmg-acceptance.json",
    "utf8",
  ),
);
assert.equal(signature.version, version);
assert.equal(signature.passed, true);
assert.equal(signature.appPayloadSha256, appPayloadSha256);
assert.equal(downloaded.version, version);
assert.equal(downloaded.integrityPassed, true);
assert.equal(
  downloaded.dmgSha256,
  artifacts.find((a) => a.file.endsWith(".dmg")).sha256,
);
assert.ok(
  downloaded.defaultGatekeeperAccepted || downloaded.manualApproval?.verified,
  "Downloaded app must pass Gatekeeper or have an explicitly verified preview approval flow",
);
for (const report of [acceptance, parity, closure, setup]) {
  assert.equal(report.passed, true);
  assert.equal(report.packaged, true);
  assert.equal(report.build?.version, version);
  assert.equal(report.build?.appPayloadSha256, appPayloadSha256);
}
const providers = JSON.parse(
  fs.readFileSync(
    "artifacts/implementation/provider-verification.json",
    "utf8",
  ),
);
const engineSummary = fs.readFileSync(
  "artifacts/implementation/upstream-suite-summary.log",
  "utf8",
);
const engine = JSON.parse(engineSummary.trim().split("\n").at(-1));
const coquiSummary = fs.readFileSync(
  "artifacts/implementation/coqui-tests.tap",
  "utf8",
);
const coqui = {
  passedTests: Number(coquiSummary.match(/^# pass (\d+)$/m)?.[1]),
  failedTests: Number(coquiSummary.match(/^# fail (\d+)$/m)?.[1]),
};
assert.ok(engine.passedTests > 0 && engine.failedSuites === 0);
assert.ok(coqui.passedTests > 0 && coqui.failedTests === 0);
assert.equal(acceptance.passed, true);
assert.equal(acceptance.packaged, true);
assert.equal(parity.passed, true);
assert.equal(parity.packaged, true);
assert.equal(setup.passed, true);
assert.equal(setup.packaged, true);
fs.writeFileSync(
  path.join(release, "build-manifest.json"),
  JSON.stringify(
    {
      product: "CoquiLearn",
      version,
      channel: "unsigned-development-preview",
      builtAt: new Date().toISOString(),
      platform: "darwin",
      arch: "arm64",
      minimumMacOS: "26.0",
      upstreamCommit: "dc4c398d5167865b84b0ccb3ec809eb88bf8f65f",
      gitCommit,
      sourceTreeSha256: sha(hashes.sort().join("\n")),
      appPayloadSha256,
      license: "AGPL-3.0-only",
      packagedAcceptance: {
        passed: acceptance.passed,
        checks: acceptance.checks.length,
      },
      expandedPackagedAcceptance: {
        passed: parity.passed,
        checks: parity.checks.length,
      },
      cleanAccountSetup: { passed: setup.passed, checks: setup.checks.length },
      closureAcceptance: {
        passed: closure.passed,
        checks: closure.checks.length,
      },
      catalogStatusCounts: checklist.statusCounts,
      engineRegression: engine,
      coquiTests: coqui,
      liveProviderVerification: providers,
      macOSSigning: signature.bundle,
      notarized: downloaded.notarized,
      downloadedGatekeeper: {
        defaultAccepted: downloaded.defaultGatekeeperAccepted,
        manualApprovalVerified: downloaded.manualApproval?.verified ?? false,
        browser: "Chrome",
        quarantineRetained:
          downloaded.manualApproval?.quarantineRetained ?? false,
      },
      fullMacOSParityRelease: false,
      openAcceptance: [
        "Other external provider/service live checks explicitly deferred by user",
        "Manual VoiceOver/system microphone/native lifecycle",
        "Clean macOS install/manual replacement",
        "14 manual acceptance rows; see completion-checklist.json",
      ],
      artifacts,
    },
    null,
    2,
  ) + "\n",
);
fs.copyFileSync(
  "docs/implementation/installation.md",
  path.join(release, "INSTALL.md"),
);
console.log(
  `Archived and verified ${hashes.length} source files. Private references and credentials excluded.`,
);
