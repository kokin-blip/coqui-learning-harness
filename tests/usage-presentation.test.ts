import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  GraphUsage,
  SessionUsage,
} from "../apps/desktop/renderer/components/UsageDetails.tsx";
import { PracticeMetadata } from "../apps/desktop/renderer/components/PracticeMetadata.tsx";
const render = (session: any, contextWindow = 1_000_000) =>
  renderToStaticMarkup(createElement(SessionUsage, { session, contextWindow }));
test("Unpriced and plan-only usage never implies a zero-dollar estimate; known free and mixed API usage do", () => {
  assert.doesNotMatch(
    render({ pricing: { cost: 0, unpriced: 1, turnCosts: { a: null } } }),
    /\$0\.0000/,
  );
  assert.doesNotMatch(
    render({
      pricing: {
        cost: 0,
        subscription: 1,
        subscriptionProviders: ["ChatGPT"],
        turnCosts: { a: null },
      },
    }),
    /\$0\.0000/,
  );
  assert.match(
    render({ pricing: { cost: 0, turnCosts: { a: 0 } } }),
    /\$0\.0000/,
  );
  assert.match(
    render({
      pricing: {
        cost: 0.1234,
        unpriced: 1,
        subscription: 1,
        turnCosts: { a: 0.1234, b: null },
      },
    }),
    /\$0\.1234/,
  );
  for (const subscription of [false, true, "mixed"]) {
    const stage = {
      runs: subscription === "mixed" ? 2 : 1,
      dollars: 0,
      unpricedRuns: subscription === "mixed" ? 1 : subscription ? 0 : 1,
      subscriptionRuns: subscription ? 1 : 0,
      tokens: {
        inputTokens: undefined,
        outputTokens: undefined,
        cacheReadTokens: undefined,
        cacheWriteTokens: undefined,
        reasoningTokens: undefined,
      },
    };
    const html = renderToStaticMarkup(
      createElement(GraphUsage, {
        value: {
          stages: { extraction: stage, audit: stage },
          totalDollars: 0,
          unpricedRuns: subscription === "mixed" ? 1 : subscription ? 0 : 1,
          subscriptionRuns: subscription ? 2 : 0,
          runs: [],
        },
      }),
    );
    assert.doesNotMatch(html, /\$0\.0000/);
  }
});
test("Claude context uses the latest matching effective CLI window and never borrows the catalog maximum", () => {
  const settings = { model: { provider: "claude-code", id: "sonnet" } };
  const message = {
    role: "assistant",
    provider: "claude-code",
    model: "sonnet",
    cliContextWindow: 200_000,
  };
  assert.match(render({ settings, messages: [message] }), /200,000/);
  for (const messages of [
    [],
    [{ ...message, cliContextWindow: undefined }],
    [message, { ...message, model: "opus" }],
    [message, { role: "custom", customType: "compaction" }],
  ]) {
    const html = render({ settings, messages });
    assert.match(html, /Unknown window/);
    assert.doesNotMatch(html, /1,000,000/);
  }
});
test("Practice metadata resolves target identity and preserves unknown historical fields", () => {
  const html = renderToStaticMarkup(
    createElement(PracticeMetadata, {
      problem: { mode: "recall", target: ["idea"] },
      conclusion: { rung: "R2", missClass: null, retest: true },
      concepts: [{ id: "idea", name: "Equality" }],
    }),
  );
  assert.match(html, /Equality/);
  assert.match(html, /R2/);
  assert.match(html, /Requested/);
  assert.doesNotMatch(
    renderToStaticMarkup(createElement(PracticeMetadata, { conclusion: {} })),
    /No hints|No miss recorded|Not requested/,
  );
});
