import type {
  ProblemInput,
  ConcludeInput,
} from "../../../../packages/engine/src/agent/tools/practice.ts";

export function PracticeMetadata({
  problem,
  conclusion,
  concepts = [],
}: {
  problem?: Partial<ProblemInput>;
  conclusion: Partial<ConcludeInput>;
  concepts?: { id: string; name: string }[];
}) {
  return (
    <details className="practice-metadata">
      <summary>Practice details</summary>
      <dl>
        {problem?.mode && (
          <>
            <dt>Mode</dt>
            <dd>{problem.mode}</dd>
          </>
        )}
        {!!problem?.target?.length && (
          <>
            <dt>Target ideas</dt>
            <dd>
              {problem.target
                .map((id) => concepts.find((c) => c.id === id)?.name ?? id)
                .join(", ")}
            </dd>
          </>
        )}
        {conclusion.rung !== undefined && (
          <>
            <dt>Hint rung</dt>
            <dd>{conclusion.rung ?? "No hints"}</dd>
          </>
        )}
        {conclusion.missClass !== undefined && (
          <>
            <dt>Miss classification</dt>
            <dd>{conclusion.missClass ?? "No miss recorded"}</dd>
          </>
        )}
        {conclusion.retest !== undefined && (
          <>
            <dt>Retest</dt>
            <dd>{conclusion.retest ? "Requested" : "Not requested"}</dd>
          </>
        )}
      </dl>
    </details>
  );
}
