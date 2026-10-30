# CoquiLearn 0.2.2 verification

Packaging correction for Apple Silicon/macOS 26. Tested on macOS 26.6.1 (25G76), Electron 44.10.0 and packaged Node 24.22.1. Learning-engine and renderer behavior are unchanged from 0.2.1; this release changes signing, native executable packaging, version metadata and release checks.

Final application payload SHA-256: `0fb20951a91e23d623d0c2a4e615b2a89bd6b78bb6aca5af5966c2d3e16fef0f`. Final DMG SHA-256: `33775d4b6848f20210a12d286c31ec95e8abc27b1a05f1318ed2799a21a20549`. Corresponding source and commit are recorded in the release build manifest.

## Signing defect and correction

The 0.2.1 download matched its published checksum, but the application had no `_CodeSignature/CodeResources` envelope. Apple’s tools rejected it with “code has no resources but signature indicates they must be present.” `identity:null` had skipped signing after Electron was packaged. Local functional tests did not establish downloaded-app launchability.

0.2.2 uses explicit ad-hoc signing with `forceCodeSigning`. An after-sign hook checks the complete resource seal and deep/strict nested signatures. The OCR executable is explicitly unpacked and signed; native modules are individually verified. The distribution gate extracts the actual ZIP and mounts/verifies the actual DMG, comparing their app payloads and signatures. A native regression test reproduces a missing seal, accepts a properly signed fixture, then rejects a tampered resource.

## Actual Chrome download and Gatekeeper test

The exact corrected DMG was downloaded using Chrome from a loopback test origin. Its byte count/checksum matched the release file, and `hdiutil verify` passed. The copied app retained Chrome quarantine metadata. `codesign --verify --deep --strict` passed for that app, and `syspolicy_check distribution` no longer reported a Codesign Error.

Gatekeeper’s default assessment **rejected** the app because it is ad-hoc signed and has no notarization ticket. This is retained as the actual result, not relabeled as an automatic Gatekeeper pass. No valid Developer ID signing identity is installed on the build Mac.

During the first-launch test, the user reported that the app opened successfully. The running app was observed under App Translocation with version 0.2.2 and the exact release payload hash. Its saved equality lesson rendered. Chrome quarantine remained, and `spctl --status` reported assessments enabled. The exact approval-button sequence was not captured. This verifies a successful approved preview launch on this Mac; it does not establish automatic trust or a clean-Mac result.

Evidence: [`downloaded-dmg-acceptance.json`](../../artifacts/implementation/downloaded-dmg-acceptance.json), [`signature-acceptance.json`](../../artifacts/implementation/signature-acceptance.json). The standard per-app approval instructions are documented by [Apple](https://support.apple.com/en-us/102445). Developer ID signing/notarization remains necessary for normal trusted distribution without an override.

## Executed release checks

| Check | Actual result |
| --- | --- |
| TypeScript | Pass |
| Coqui regression, including real signature/tamper and native OCR tests | 55 passed, zero failed |
| Packaged runtime/recovery | 21 passed |
| Packaged question/plan/chain/import parity | 19 passed |
| Packaged closure/recovery | 19 passed |
| Clean-account setup | 3 passed |
| Isolated ZIP installation/manual replacement, 0.2.1→0.2.2 | 3 passed; same Mac, not clean-machine evidence |
| App/ZIP/DMG signature and native OCR distribution gate | 3 passed; complete seals and nested signatures, matching archived payloads and real OCR execution |
| Browser-download integrity | Passed with real Chrome quarantine retained |
| Default Gatekeeper trust | Rejected as unnotarized; no broken-signature error |
| Approved downloaded-app launch | User success report plus observed exact-version/payload App Translocation launch |
| 1,000-proposition/333-implication graph with scripted stream | 600 frame intervals: median 8.3 ms, p95 9.3 ms, maximum 11.2 ms; zero above 16.7 ms; no long tasks |

The first runtime acceptance attempt passed 18 checks and timed out during a screenshot while the host was under disk pressure. After old generated build copies were removed, the complete sequential native runner passed all six lanes. The incomplete attempt was not counted as a pass.

Fresh evidence is under `artifacts/implementation/`: `coqui-tests.tap`, `packaged-acceptance.json`, `parity/acceptance.json`, `closure/acceptance.json`, `setup-acceptance.json`, `distribution-acceptance.json`, `signature-acceptance.json`, `downloaded-dmg-acceptance.json` and `performance/streaming-graph.json`. The four application acceptance reports and profile record the exact final payload hash. The short profile uses a display above 60 Hz; compositor/GPU dropped frames and long-term memory stability are not measured.

The unchanged engine retains the 1,462-assertion passing regression baseline from 0.2.1; that whole suite was not rerun for this packaging-only change. Existing ChatGPT live teaching/practice/extraction/demo/SVG/PDF/research/reconnect evidence is retained from the prior builds. Other providers’ live checks remain deferred by the user. Current package checks exercise native resource loading, background jobs, persistence, backup/restore and recovery through the signed application.

## Release boundary

This is an **ad-hoc-signed, unnotarized preview**, not a Developer ID/notarized release. The invalid resource-seal defect is fixed. Install instructions describe per-app approval, without global Gatekeeper disablement or quarantine removal.

The 233 overlapping catalog entries remain tracked in the [ledger](../planning/completion-checklist.json) and [assertion index](../planning/parity-evidence.json): 189 automated contract closures, seven prompt-policy closures, eight ChatGPT-live closures, 12 fixture-verified/user-deferred live entries, 14 manual acceptance entries, one deferred web/dev entry and two approved distribution differences. Manual accessibility/native lifecycle/permissions and clean-Mac installation remain separate acceptance work. Prompt-policy parity and successful rendering do not establish empirical learning efficacy or factual accuracy.

The previous [0.2.1 verification](https://github.com/kokin-blip/coqui-learning-harness/blob/v0.2.1/docs/implementation/verification.md) remains available as historical evidence; its downloaded-app signing gap is corrected here. AGPL attribution and pinned LearnHarness 0.4.0 `dc4c398` remain intact.
