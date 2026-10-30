import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { verifyMacOSSignature } from "./macos-signature.mjs";
import { createCanvas } from "@napi-rs/canvas";

const version = JSON.parse(fs.readFileSync("package.json", "utf8")).version;
const root = fs.mkdtempSync(path.join(os.tmpdir(), "coqui-package-signature-"));
const report = {
  version,
  at: new Date().toISOString(),
  notarized: false,
  checks: [],
};
const appName = "CoquiLearn.app";
const source = path.resolve("release/mac-arm64", appName);
const payloadHash = (app) =>
  crypto
    .createHash("sha256")
    .update(fs.readFileSync(path.join(app, "Contents/Resources/app.asar")))
    .digest("hex");
const expected = payloadHash(source);
let mount;
try {
  report.bundle = verifyMacOSSignature(source);
  assert.ok(
    report.bundle.nativeFiles.some((file) => file.endsWith("/coqui-ocr")),
    "The native OCR executable must be unpacked and signed",
  );
  const zip = path.resolve(`release/CoquiLearn-${version}-arm64-mac.zip`);
  const extracted = path.join(root, "ZIP");
  execFileSync("/usr/bin/ditto", ["-x", "-k", zip, extracted]);
  report.zip = verifyMacOSSignature(path.join(extracted, appName));
  assert.equal(payloadHash(path.join(extracted, appName)), expected);
  report.checks.push("ZIP retains complete bundle and nested signatures");
  const image = createCanvas(1000, 200);
  const ctx = image.getContext("2d");
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, 1000, 200);
  ctx.fillStyle = "black";
  ctx.font = "44px Helvetica";
  ctx.fillText("CoquiLearn preserves equality", 40, 110);
  const sample = path.join(root, "ocr.png");
  fs.writeFileSync(sample, image.toBuffer("image/png"));
  const ocr = JSON.parse(
    execFileSync(
      path.join(
        extracted,
        appName,
        "Contents/Resources/app.asar.unpacked/dist/engine/native/coqui-ocr",
      ),
      [sample],
      { encoding: "utf8", timeout: 60000 },
    ),
  );
  assert.match(ocr.map((page) => page.text).join("\n"), /preserves equality/i);
  report.checks.push(
    "Signed native OCR helper executes and recognizes the generated sample from the extracted ZIP",
  );
  const dmg = path.resolve(`release/CoquiLearn-${version}-arm64.dmg`);
  execFileSync("/usr/bin/hdiutil", ["verify", dmg], { stdio: "pipe" });
  mount = path.join(root, "DMG");
  fs.mkdirSync(mount);
  execFileSync(
    "/usr/bin/hdiutil",
    ["attach", "-readonly", "-nobrowse", "-mountpoint", mount, dmg],
    { stdio: "pipe" },
  );
  report.dmg = verifyMacOSSignature(path.join(mount, appName));
  assert.equal(payloadHash(path.join(mount, appName)), expected);
  report.checks.push(
    "DMG checksum, bundle seal and nested signatures verify after mounting",
  );
  report.appPayloadSha256 = expected;
  report.passed = true;
} finally {
  if (mount)
    execFileSync("/usr/bin/hdiutil", ["detach", mount], { stdio: "pipe" });
  fs.rmSync(root, { recursive: true, force: true });
  fs.mkdirSync("artifacts/implementation", { recursive: true });
  fs.writeFileSync(
    "artifacts/implementation/signature-acceptance.json",
    JSON.stringify(report, null, 2) + "\n",
  );
}
console.log(JSON.stringify(report));
