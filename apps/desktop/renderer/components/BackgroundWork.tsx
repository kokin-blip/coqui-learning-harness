import { subscriptionLabel } from "../../../../packages/engine/src/core/prices.ts";
import { callContextTokens } from "../../../../packages/engine/src/core/context-usage.ts";
import { useEffect, useState } from "react";
import type { JobRecord } from "../../../../packages/engine/src/core/contracts/jobs.ts";
import { DesktopRequestError } from "../operation-recovery.ts";
import { api } from "../api.ts";
type Work = Omit<Partial<JobRecord>, "kind"> & {
  id: string;
  chatId: string;
  kind: string;
  title?: string;
  phase?: string;
  startedAt?: number | string;
  costUsd?: number | null;
  contextLimit?: number | null;
};
const label = (w: Work) =>
  w.status === "running"
    ? (w.phase ?? "Running")
    : w.status === "error"
      ? "Failed"
      : w.delivery?.status === "pending"
        ? "Ready · delivery pending"
        : w.status === "done"
          ? "Completed"
          : "Queued";
export function JobDispatch({
  part,
  jobs,
  onFocus,
}: {
  part: any;
  jobs: JobRecord[];
  onFocus: () => void;
}) {
  const job = jobs.find((j) => j.toolCallId === part.toolCallId),
    kind = part.type.replace("tool-", "");
  return (
    <button className="job-dispatch" onClick={onFocus}>
      <span>
        {
          (
            {
              research: "Research",
              demo: "Interactive demonstration",
              visual: "Visual explanation",
              pdf: "PDF reader",
            } as Record<string, string>
          )[kind]
        }
      </span>
      <span className="caption">
        {job
          ? label(job)
          : part.state === "output-error"
            ? "Could not start"
            : part.state === "input-streaming"
              ? "Preparing"
              : "Dispatched"}
      </span>
    </button>
  );
}
export function BackgroundWork({
  activity,
  jobs,
  onRefresh,
  onSource,
}: {
  activity: Work[];
  jobs: JobRecord[];
  onRefresh: () => Promise<void>;
  onSource: (id: string) => void;
}) {
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!activity.some((w) => w.status === "running")) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [activity.some((w) => w.status === "running")]);
  const started = (w: Work) =>
    new Date(w.createdAt ?? w.startedAt ?? 0).getTime() || 0;
  const cancel = async (work: Work) => {
    try {
      setError("");
      await api("/api/activity/abort", "POST", {
        kind: work.kind === "extraction" ? "extraction" : "job",
        id: work.kind === "extraction" ? work.chatId : work.id,
      });
    } catch (e) {
      if (!(
        e instanceof DesktopRequestError && [404, 409].includes(e.status ?? 0)
      ))
        setError("Cancellation failed: " + (e as Error).message);
    } finally {
      await onRefresh();
    }
  };
  const active = new Map(activity.map((w) => [w.id, w]));
  for (const j of jobs)
    if (j.delivery?.status === "pending" && !active.has(j.id))
      active.set(j.id, j);
  const row = (work: Work) => (
    <details className="background-work-row" key={work.id}>
      <summary>
        <span>{work.title ?? work.kind}</span>
        <small>{label(work)}</small>
      </summary>
      <p className="caption">{work.activity ?? ""}</p>
      <div className="work-meta caption">
        {started(work) > 0 && (
          <span>
            {Math.max(
              0,
              Math.floor(
                ((work.status === "running"
                  ? now
                  : new Date(work.updatedAt ?? now).getTime()) -
                  started(work)) /
                  1000,
              ),
            )}
            s elapsed
          </span>
        )}
        {work.createdAt && (
          <span>Started {new Date(work.createdAt).toLocaleTimeString()}</span>
        )}
        {work.usage && (
          <span>
            {work.usage.model} ·{" "}
            {callContextTokens(work.usage.lastStep)?.toLocaleString() ??
              "Unknown"}{" "}
            context tokens
            {work.contextLimit
              ? " / " + work.contextLimit.toLocaleString()
              : ""}
          </span>
        )}
        {subscriptionLabel(work.usage?.model ?? "") ? (
          <span>{subscriptionLabel(work.usage!.model)}</span>
        ) : (
          work.costUsd != null && (
            <span>Estimated ${work.costUsd.toFixed(4)}</span>
          )
        )}
        {work.delivery?.status === "pending" && (
          <span>
            Saved result waits for a safe delivery point. An open question can
            defer it.
          </span>
        )}
      </div>
      {work.error && (
        <p role="alert" className="inline-error">
          {work.error}
        </p>
      )}
      <div className="inline-actions">
        <button className="text-button" onClick={() => onSource(work.chatId)}>
          Open source
        </button>
        {work.status === "running" && (
          <button onClick={() => void cancel(work)}>Cancel work</button>
        )}
        {work.delivery?.status === "pending" && (
          <button className="text-button" onClick={() => void onRefresh()}>
            Check delivery
          </button>
        )}
      </div>
    </details>
  );
  return (
    <section
      className="inspector-section background-work"
      id="background-work"
      tabIndex={-1}
    >
      <h3>Background work</h3>
      {active.size ? (
        [...active.values()]
          .sort((a, b) => started(a) - started(b) || a.id.localeCompare(b.id))
          .map(row)
      ) : (
        <p className="caption">No background work running.</p>
      )}
      {jobs.some(
        (j) => j.status !== "running" && j.delivery?.status !== "pending",
      ) && (
        <details className="completed-work">
          <summary>Completed work</summary>
          {jobs
            .filter(
              (j) => j.status !== "running" && j.delivery?.status !== "pending",
            )
            .map(row)}
        </details>
      )}
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
    </section>
  );
}
