import { useState } from "react";
import { api } from "../api.ts";
import { RichText } from "./RichText.tsx";
export function EvidenceHistory({
  items,
  refresh,
  open,
  notify,
}: {
  items: any[];
  refresh: () => Promise<void>;
  open: (id: string, anchor?: string) => Promise<void>;
  notify: (s: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null),
    [text, setText] = useState("");
  return (
    <section className="evidence-history">
      <h2>Your learning evidence</h2>
      {items.length ? (
        items.slice(0, 100).map((e) => {
          const data = e.data,
            answer = data.input?.answer ?? data.answer;
          return (
            <details key={e.id}>
              <summary>
                {(
                  {
                    review: "Retrieval review",
                    correction: "Your correction",
                    feedback: "Teacher feedback",
                    "hint-request": "Hint requested",
                    thinking: "Practice reasoning",
                    attempt: "Learning attempt",
                  } as any
                )[data.type] ?? "Learning attempt"}
                <span className="caption">
                  {new Date(e.created_at).toLocaleString()}
                </span>
              </summary>
              {answer?.questionText && <h3>{answer.questionText}</h3>}
              <RichText
                text={
                  answer?.text ??
                  answer?.answers?.map((a: any) => a.label).join(", ") ??
                  data.input?.text ??
                  data.attempt ??
                  data.text ??
                  data.feedback ??
                  ""
                }
              />
              {answer?.thinking && (
                <>
                  <p className="caption">Your reasoning</p>
                  <RichText text={answer.thinking} />
                </>
              )}
              {answer?.readingThinking && (
                <>
                  <p className="caption">Thinking while reading</p>
                  <RichText text={answer.readingThinking} />
                </>
              )}
              {answer?.confidence !== undefined && (
                <p className="caption">
                  Stated confidence: {answer.confidence}%
                </p>
              )}
              {answer?.explanation && (
                <details>
                  <summary>Committed feedback</summary>
                  <RichText text={answer.explanation} />
                </details>
              )}
              {data.provenance && (
                <p className="caption">
                  {data.provenance.provider ?? data.provenance.kind}
                  {data.provenance.model ? " · " + data.provenance.model : ""}
                </p>
              )}
              <div className="inline-actions">
                {e.session_id && (
                  <button
                    className="text-button"
                    onClick={() => void open(e.session_id, data.messageId)}
                  >
                    Open source session
                  </button>
                )}
                <button
                  className="text-button"
                  onClick={() => {
                    setEditing(e.id);
                    setText("");
                  }}
                >
                  Add a correction
                </button>
              </div>
              {editing === e.id && (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void api("/coqui/evidence/correct", "POST", {
                      id: e.id,
                      text,
                    })
                      .then(async () => {
                        setEditing(null);
                        setText("");
                        await refresh();
                      })
                      .catch((e) => notify(e.message));
                  }}
                >
                  <label className="field">
                    Your correction
                    <textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      required
                    />
                  </label>
                  <div className="inline-actions">
                    <button type="submit" disabled={!text.trim()}>
                      Save correction
                    </button>
                    <button type="button" onClick={() => setEditing(null)}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </details>
          );
        })
      ) : (
        <p className="caption">
          Your attempts and reasoning will appear here as you learn.
        </p>
      )}
    </section>
  );
}
