import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import {
  artifactDocument,
  artifactMessage,
  ARTIFACT_CSP,
} from "../packages/engine/src/core/artifact-policy.ts";
const { providerDiagnostic, responseDiagnostic, terminalRefreshCodes } =
  createRequire(import.meta.url)(
    "../packages/engine/src/core/provider-diagnostic.cjs",
  );

test("Artifact bridge rejects forged channels/nonces and bounds untrusted sizes and errors", () => {
  const packet = {
    channel: "coqui-artifact",
    token: "own-frame",
    type: "height",
    height: 9000,
  };
  assert.equal(artifactMessage(packet, "other-frame"), null);
  assert.equal(
    artifactMessage({ ...packet, channel: "host" }, "own-frame"),
    null,
  );
  assert.equal(artifactMessage({ ...packet, height: NaN }, "own-frame"), null);
  assert.equal(
    artifactMessage(
      { ...packet, type: "open", url: "https://example.com" },
      "own-frame",
    ),
    null,
  );
  assert.equal((artifactMessage(packet, "own-frame") as any).height, 2400);
  assert.equal(
    (artifactMessage({ ...packet, height: -10 }, "own-frame") as any).height,
    80,
  );
  assert.equal(
    (
      artifactMessage(
        { ...packet, type: "error", message: "x".repeat(900) },
        "own-frame",
      ) as any
    ).message.length,
    512,
  );
});
test("The same CSP and instrumentation precede authored scripts in full and fragment artifacts", () => {
  for (const html of [
    "<html><head><script>window.authored=true</script></head><body>Demo</body></html>",
    "<script>window.authored=true</script>",
  ]) {
    const doc = artifactDocument(html, "nonce-123");
    assert.ok(
      doc.indexOf("Content-Security-Policy") < doc.indexOf("window.authored"),
    );
    assert.ok(doc.includes(ARTIFACT_CSP));
    assert.match(doc, /ResizeObserver/);
    assert.match(doc, /nonce-123/);
  }
  assert.throws(() => artifactDocument("demo", "</script>"), /identity/);
  assert.match(ARTIFACT_CSP, /connect-src 'none'/);
  assert.match(ARTIFACT_CSP, /frame-src 'none'/);
});
test("Provider diagnostics distinguish quota, eligibility, capability, permission, expiry and temporary service failures", () => {
  const examples = [
    [429, "subscription_sharing_usage_limit_exceeded", "quota", false],
    [403, "subscription_sharing_user_not_eligible", "eligibility", false],
    [400, "subscription_sharing_unsupported_capability", "unsupported", false],
    [403, "chatpass_v2_scope_not_authorized", "permission", false],
    [401, "invalid_grant", "expired", false],
    [503, "subscription_sharing_usage_unavailable", "unavailable", true],
  ];
  for (const [status, code, category, retryable] of examples) {
    const d = providerDiagnostic(status, code, "req_123", "error");
    assert.equal(d.category, category);
    assert.equal(d.retryable, retryable);
    assert.equal(d.requestId, "req_123");
  }
  assert.ok(terminalRefreshCodes.has("refresh_token_reused"));
  assert.equal(
    terminalRefreshCodes.has("subscription_sharing_usage_unavailable"),
    false,
  );
});
test("Diagnostics retain machine identifiers and body shape without accepting credential-like values", () => {
  const d = responseDiagnostic(
    new Response("", { status: 400, headers: { "x-request-id": "req_safe" } }),
    { error: { code: "unsupported" } },
  );
  assert.equal(d.code, "unsupported");
  assert.equal(d.bodyShape, "error");
  assert.equal(
    providerDiagnostic(400, "sk-secret", "eyJtoken").code,
    undefined,
  );
  assert.equal(
    providerDiagnostic(400, "sk-secret", "eyJtoken").requestId,
    undefined,
  );
  assert.equal(
    providerDiagnostic(400, "private learner text", "bad\nheader").code,
    undefined,
  );
});
