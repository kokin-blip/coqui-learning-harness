import type {
  GraphCostSummary,
  StageCost,
} from "../../../../packages/engine/src/core/cost-summary.ts";
import { cliContextWindowOf } from "../../../../packages/engine/src/core/native-messages.ts";
import { subscriptionLabel } from "../../../../packages/engine/src/core/prices.ts";
export function GraphUsage({ value }: { value: GraphCostSummary }) {
  const hasPriced = Object.values(value.stages).some(
    (s) => s.runs > s.unpricedRuns + (s.subscriptionRuns ?? 0),
  );
  const stageLabel = (stage: StageCost) =>
    !stage.runs
      ? "No runs"
      : [
          stage.runs > stage.unpricedRuns + (stage.subscriptionRuns ?? 0)
            ? `$${stage.dollars.toFixed(4)}`
            : null,
          stage.subscriptionRuns
            ? `${stage.subscriptionProviders?.join(", ") ?? "Subscription"} plan`
            : null,
          stage.unpricedRuns ? "Unpriced" : null,
        ]
          .filter(Boolean)
          .join(" · ");
  return (
    <>
      {hasPriced && (
        <p className="caption">
          Recorded API estimates: ${value.totalDollars.toFixed(4)}
        </p>
      )}
      {!!value.unpricedRuns && (
        <p className="caption">
          Cost unavailable for {value.unpricedRuns} unpriced runs.
        </p>
      )}
      {!!value.subscriptionRuns && (
        <p className="caption">
          {value.subscriptionProviders?.join(", ")} plan ·{" "}
          {value.subscriptionRuns} stage runs. Plan allowance is managed by the
          provider.
        </p>
      )}
      <table className="usage-table">
        <thead>
          <tr>
            <th>Stage</th>
            <th>Runs</th>
            <th>Input</th>
            <th>Output</th>
            <th>Usage</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(value.stages).map(([key, s]) => (
            <tr key={key}>
              <th>{key === "audit" ? "Identity audit" : "Extraction"}</th>
              <td>{s.runs}</td>
              <td>{s.tokens.inputTokens?.toLocaleString() ?? "—"}</td>
              <td>{s.tokens.outputTokens?.toLocaleString() ?? "—"}</td>
              <td>{stageLabel(s)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h4>Recent runs</h4>
      {value.runs.length ? (
        value.runs.map((r) => (
          <details className="usage-run" key={r.startedAt + ":" + r.title}>
            <summary>{r.title}</summary>
            <p className="caption">
              {new Date(r.at).toLocaleString()} ·{" "}
              {(r.durationMs / 1000).toFixed(1)} seconds ·{" "}
              {[
                r.dollars !== null ? `$${r.dollars.toFixed(4)}` : null,
                r.subscriptionRuns
                  ? `${r.subscriptionProviders?.join(", ") ?? "Subscription"} plan`
                  : null,
                r.dollars === null && (r.subscriptionRuns ?? 0) < 2
                  ? "Unpriced"
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {r.merged && (
              <p className="caption">
                Merged changes recorded with source provenance.
              </p>
            )}
          </details>
        ))
      ) : (
        <p className="caption">No extraction runs recorded yet.</p>
      )}
    </>
  );
}
export function SessionUsage({
  session,
  contextTokens,
  contextWindow,
}: {
  session: any;
  contextTokens?: number | null;
  contextWindow?: number;
}) {
  const p = session.pricing;
  const hasPriced = Object.values(p?.turnCosts ?? {}).some(
    (v) => typeof v === "number",
  );
  const cliWindow = cliContextWindowOf(session.messages ?? []);
  const effectiveWindow =
    session.settings?.model?.provider === "claude-code"
      ? cliWindow?.model === `claude-code:${session.settings.model.id}`
        ? cliWindow.tokens
        : undefined
      : contextWindow;
  return (
    <details className="usage-details">
      <summary>Usage and context</summary>
      {p?.subscription > 0 && (
        <p>
          {p.subscriptionProviders?.join(", ")} plan · {p.subscription} requests
        </p>
      )}
      {session.settings?.model?.provider === "claude-code" && (
        <p>Claude Code account usage</p>
      )}
      {hasPriced && <p>Recorded API estimates: ${Number(p.cost).toFixed(4)}</p>}
      {!!p?.unpriced && (
        <p>Cost unavailable for {p.unpriced} unpriced calls.</p>
      )}
      <dl>
        <dt>Saved messages</dt>
        <dd>{session.messages?.length ?? 0}</dd>
        <dt>Last context</dt>
        <dd>
          {contextTokens?.toLocaleString() ?? "Not yet reported"} /{" "}
          {effectiveWindow?.toLocaleString() ?? "Unknown window"}
        </dd>
      </dl>
      <details>
        <summary>Call history</summary>
        {(session.turns ?? []).map((t: any) => (
          <section className="usage-run" key={t.id}>
            <p className="caption">
              {t.model} ·{" "}
              {subscriptionLabel(t.model) ??
                (t.model?.startsWith("claude-code:")
                  ? "Claude Code account"
                  : p?.turnCosts?.[t.id] == null
                    ? "Unpriced"
                    : "$" + p.turnCosts[t.id].toFixed(4))}
            </p>
            {(t.steps ?? []).map((s: any, i: number) => (
              <p className="caption" key={i}>
                Call {i + 1}: {s.inputTokens?.toLocaleString() ?? "—"} input ·{" "}
                {s.outputTokens?.toLocaleString() ?? "—"} output ·{" "}
                {s.cacheReadTokens?.toLocaleString() ?? "—"} cached ·{" "}
                {s.reasoningTokens?.toLocaleString() ?? "—"} thinking
              </p>
            ))}
          </section>
        ))}
      </details>
      <p className="caption">
        Subscription use does not estimate plan allowance or an API charge.
      </p>
    </details>
  );
}
