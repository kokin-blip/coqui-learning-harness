# Install the unsigned macOS preview

Target: Apple Silicon, macOS 26. Version 0.2.2. The app is ad-hoc signed with a verified resource seal; no Developer ID signature or notarization is included. This is a development preview; see the build-specific verification report for open acceptance.

1. Verify the downloaded ZIP/DMG against `SHA256SUMS` (`shasum -a 256 -c SHA256SUMS` when all listed files are present).
2. Open `CoquiLearn-0.2.2-arm64.dmg` and copy CoquiLearn to Applications, or unzip `CoquiLearn-0.2.2-arm64-mac.zip` and move the app there.
3. Open CoquiLearn. For this unnotarized preview, macOS may require System Settings → Privacy & Security → Open Anyway after the first launch attempt. The missing-resource-seal defect in 0.2.1 is corrected; this does not make the preview Apple-notarized.
4. In Settings → Connections, Continue with ChatGPT in your system browser (or select another supported connection). Choose explicit Strong/Cheap/Vision models; one compatible model can fill multiple roles. Saving setup retains the draft and does not send automatically.

Claude Code requires the user's unmodified installation, at least 2.1.259, with its own login. CoquiLearn does not install or update it. Search/dictation can require separate service keys. Failed subscription requests do not silently fall back to API billing.

## Data and replacement

Production data is under `~/Library/Application Support/CoquiLearn/library`; encrypted credentials are owned by Electron main outside the library. Development and fixture roots are separate. LearnHarness data is separate. Settings → Data exports a consistent database/assets/prompt archive without credentials; verify restoration before relying on a backup. Moving a backup to another Mac requires reconnecting accounts.

For updates, back up, quit CoquiLearn, manually replace the application in Applications, then reopen. Keep the old app until the library opens successfully. Never move a database between incompatible future/older formats; this build refuses future schemas before changing their file bytes. Automatic installation is deferred. A clean-machine install/replacement remains a manual release gate.

The bundled offline reader is documented in `skills/coquilearn/SKILL.md` and at `CoquiLearn.app/Contents/Resources/app.asar/dist/skills/coquilearn/SKILL.md`. It needs no running UI or provider.

## Build from corresponding source

Unzip `CoquiLearn-0.2.2-source.zip`, use Node24+ and Xcode command-line tools, then `npm ci`, `npm run build`, `npm run desktop:dist`. `npm start -- --fixture` uses a separate scripted library. Native source and engine tests are `npm test` and `npm run test:engine`; fixture results do not establish external-service behavior.

The app, source, checksums, build manifest and instructions are supplied together. License: AGPL-3.0-only with upstream attribution retained.
