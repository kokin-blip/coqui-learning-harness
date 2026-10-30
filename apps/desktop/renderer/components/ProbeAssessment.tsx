import { parseProbeDoneInput } from "../../../../packages/engine/src/core/tool-parts.ts";
import { RichText } from "./RichText.tsx";
export function ProbeAssessment({ input }: { input: unknown }) {
  const value = parseProbeDoneInput(input);
  if (!value) return null;
  return (
    <details className="probe-assessment">
      <summary>Diagnostic assessment</summary>
      {value.assessment.summary && <RichText text={value.assessment.summary} />}
      <dl>
        {value.assessment.strands.map((s, i) => (
          <div key={i}>
            <dt>{s.strand}</dt>
            <dd>
              <RichText text={s.assessment} />
            </dd>
          </div>
        ))}
      </dl>
    </details>
  );
}
