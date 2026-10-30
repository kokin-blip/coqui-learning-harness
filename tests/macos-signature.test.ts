import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { verifyMacOSSignature } from "../scripts/macos-signature.mjs";

test(
  "macOS release check rejects the unsealed bundle regression and detects post-signing tampering",
  { skip: process.platform !== "darwin" },
  () => {
    const root = fs.mkdtempSync(
      path.join(os.tmpdir(), "coqui-signature-test-"),
    );
    const app = path.join(root, "CoquiLearn.app");
    try {
      fs.mkdirSync(path.join(app, "Contents/MacOS"), { recursive: true });
      fs.mkdirSync(path.join(app, "Contents/Resources"));
      fs.copyFileSync(
        "/usr/bin/true",
        path.join(app, "Contents/MacOS/CoquiLearn"),
      );
      fs.writeFileSync(
        path.join(app, "Contents/Info.plist"),
        '<?xml version="1.0"?><plist version="1.0"><dict><key>CFBundleIdentifier</key><string>com.coquilearn.desktop</string><key>CFBundleExecutable</key><string>CoquiLearn</string><key>CFBundlePackageType</key><string>APPL</string></dict></plist>',
      );
      const resource = path.join(app, "Contents/Resources/lesson.txt");
      fs.writeFileSync(resource, "Committed lesson");
      assert.throws(
        () => verifyMacOSSignature(app),
        /Missing macOS bundle resource seal/,
      );
      execFileSync(
        "/usr/bin/codesign",
        ["--force", "--sign", "-", "--timestamp=none", app],
        { stdio: "pipe" },
      );
      assert.equal(verifyMacOSSignature(app).kind, "ad-hoc");
      fs.writeFileSync(resource, "Changed after signing");
      assert.throws(() => verifyMacOSSignature(app));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  },
);
