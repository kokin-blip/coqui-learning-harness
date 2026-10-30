import { PathInput } from "../../../../packages/engine/components/path-input.tsx";
import { useDictationTarget, finishDictation } from "./dictation.tsx";
import { useEffect, useMemo, useState, useRef } from "react";
import { motion } from "motion/react";
import {
  buildAnswer,
  normalizeOptions,
  shuffleOptions,
  seededRandom,
  resolveCorrect,
  normalizeQuizType,
  questionNeedsReveal,
  type QuestionData,
} from "../../../../packages/engine/src/core/question-core.ts";
import { RichText } from "./RichText.tsx";
import { api } from "../api.ts";
/** Display ordering and answer commitments follow LearnHarness question-dock.tsx. */
export function Question({
  pending,
  sessionId,
  onAnswer,
  busy,
  onSkip,
}: {
  pending: any;
  sessionId: string;
  onAnswer: (v: any) => Promise<void>;
  busy: boolean;
  onSkip: () => Promise<void>;
}) {
  const { toolCallId, tool, input } = pending;
  const kind = ["quiz", "probe"].includes(tool)
    ? "quiz"
    : ["explain", "recall"].includes(tool)
      ? "explain"
      : "ask";
  const q = useMemo<QuestionData>(() => {
    const normalized = normalizeOptions(input.options ?? []);
    const options =
      kind === "quiz"
        ? shuffleOptions(normalized, seededRandom(toolCallId))
        : normalized;
    return {
      id: toolCallId,
      kind,
      question: input.question,
      questionType: normalizeQuizType(input.type),
      context: input.details,
      mode: options.length
        ? input.multiSelect
          ? "multi-select"
          : "single-select"
        : "text",
      options,
      correctIndices:
        kind === "quiz"
          ? resolveCorrect(input.correctAnswer, options).indices
          : undefined,
      committedAnswer: kind === "explain" ? input.correctAnswer : undefined,
      explanation: input.explanation,
      createdAt: new Date().toISOString(),
    };
  }, [toolCallId, input, kind]);
  const [draft, setDraft] = useState<any>({
    values: [],
    text: "",
    thinking: "",
    readingThinking: "",
    confidence: 50,
    other: "",
    otherSelected: false,
  });
  const needsReveal = questionNeedsReveal(
    tool,
    input,
    input.nodeId ? "teach" : "probe",
  );
  const edited = useRef(false);
  useEffect(() => {
    edited.current = false;
    void api(
      "/coqui/draft?id=" + encodeURIComponent(sessionId + ":" + toolCallId),
    )
      .then((v) => {
        if (!edited.current) setDraft((d: any) => ({ ...d, ...v }));
      })
      .catch(() => {});
  }, [sessionId, toolCallId]);
  const latest = useRef(draft);
  latest.current = draft;
  const change = (value: any) => {
    edited.current = true;
    const next = { ...latest.current, ...value };
    latest.current = next;
    setDraft(next);
    void api(
      "/coqui/draft?id=" + encodeURIComponent(sessionId + ":" + toolCallId),
      "PUT",
      next,
    );
  };
  useDictationTarget(
    (text) =>
      change(
        needsReveal && !latest.current.revealed
          ? {
              readingThinking:
                latest.current.readingThinking +
                (latest.current.readingThinking ? " " : "") +
                text,
            }
          : q.mode === "text"
            ? {
                text:
                  latest.current.text + (latest.current.text ? " " : "") + text,
              }
            : {
                thinking:
                  latest.current.thinking +
                  (latest.current.thinking ? " " : "") +
                  text,
              },
      ),
    true,
  );
  const submit = async (dontKnow = false) => {
    if (busy) return;
    await finishDictation();
    if (
      !dontKnow &&
      !latest.current.values.length &&
      !latest.current.text.trim() &&
      !(latest.current.otherSelected && latest.current.other.trim())
    )
      return;
    const answer = buildAnswer(
      q,
      {
        ...latest.current,
        values: dontKnow ? [] : latest.current.values,
        text: dontKnow ? undefined : latest.current.text,
        other:
          !dontKnow && latest.current.otherSelected
            ? latest.current.other
            : undefined,
        dontKnow,
      },
      tool,
    );
    await onAnswer({ type: "answer", toolCallId, answer });
  };
  if (needsReveal && !draft.revealed)
    return (
      <section
        className="question reading-check-prelude"
        aria-label="Read before checking"
      >
        <label className="field">
          Thinking while reading
          <PathInput
            aria-label="Thinking while reading"
            value={draft.readingThinking}
            onValueChange={(readingThinking) => change({ readingThinking })}
            placeholder="Capture a thought before checking your understanding…"
          />
        </label>
        <div className="inline-actions">
          <button
            className="primary"
            onClick={() => change({ revealed: true })}
          >
            Check your understanding
          </button>
          <button className="text-button" onClick={() => void onSkip()}>
            Skip for now
          </button>
        </div>
      </section>
    );
  return (
    <section
      className="question"
      aria-label="Current question"
      onKeyDown={(e) => {
        if (e.defaultPrevented || e.nativeEvent.isComposing) return;
        const target = e.target as HTMLElement;
        if (
          e.key === "Enter" &&
          !e.shiftKey &&
          !target.closest("button,summary")
        ) {
          e.preventDefault();
          void submit();
        }
        if (
          ["ArrowDown", "ArrowUp"].includes(e.key) &&
          target.matches('input[type="checkbox"]')
        ) {
          e.preventDefault();
          const rows = [
              ...e.currentTarget.querySelectorAll<HTMLInputElement>(
                ".answer-option input",
              ),
            ],
            i = rows.indexOf(target as HTMLInputElement);
          rows[
            Math.max(
              0,
              Math.min(rows.length - 1, i + (e.key === "ArrowDown" ? 1 : -1)),
            )
          ]?.focus();
        }
      }}
    >
      <div className="question-phase">
        <span className="pill selected">
          {tool === "probe"
            ? "Explore"
            : tool === "recall"
              ? "Recall"
              : q.questionType === "predict"
                ? "Predict"
                : kind === "ask"
                  ? "Your perspective"
                  : "Understanding check"}
        </span>
        <span className="caption">
          {q.mode === "multi-select"
            ? "Choose all that apply"
            : q.mode === "single-select"
              ? "Choose one answer"
              : "Explain in your own words"}
        </span>
      </div>
      <div className="question-prompt" role="heading" aria-level={3}>
        <RichText text={q.question} />
      </div>
      {q.context && <RichText text={q.context} />}
      {q.mode === "text" ? (
        <label className="field">
          Your answer
          <PathInput
            aria-label="Your answer"
            autoFocus
            value={draft.text}
            onValueChange={(value) => change({ text: value })}
            placeholder="Take a moment to work it through…"
          />
        </label>
      ) : (
        <div
          className="answer-options"
          role={q.mode === "multi-select" ? "group" : "radiogroup"}
          aria-label="Answer options"
        >
          {q.options.map((o, i) => (
            <label
              key={o.value}
              className={
                "answer-option " +
                (draft.values.includes(o.value) ? "chosen" : "")
              }
            >
              <input
                type={q.mode === "multi-select" ? "checkbox" : "radio"}
                name={toolCallId}
                value={o.value}
                checked={draft.values.includes(o.value)}
                onChange={() =>
                  change({
                    ...(q.mode === "single-select"
                      ? { otherSelected: false }
                      : {}),
                    values:
                      q.mode === "single-select"
                        ? [o.value]
                        : draft.values.includes(o.value)
                          ? draft.values.filter((v: string) => v !== o.value)
                          : [...draft.values, o.value],
                  })
                }
              />
              <div className="question-option-label">
                <RichText text={o.label} />
                {kind === "ask" && o.description && (
                  <p className="caption">{o.description}</p>
                )}
              </div>
            </label>
          ))}
          {kind === "ask" && (
            <div className="field">
              <label className="answer-option">
                <input
                  type={q.mode === "single-select" ? "radio" : "checkbox"}
                  name={toolCallId}
                  checked={!!draft.otherSelected}
                  onChange={() =>
                    change({
                      otherSelected: !draft.otherSelected,
                      ...(q.mode === "single-select" ? { values: [] } : {}),
                    })
                  }
                />
                <span>Something else</span>
              </label>
              {draft.otherSelected && (
                <input
                  aria-label="Other response"
                  value={draft.other}
                  onChange={(e) => change({ other: e.target.value })}
                />
              )}
            </div>
          )}
        </div>
      )}
      <label className="field thinking">
        Your thinking
        <PathInput
          aria-label="Your thinking"
          value={draft.thinking}
          onValueChange={(value) => change({ thinking: value })}
          placeholder="What led you to your answer?"
        />
      </label>
      <details className="reading-thoughts">
        <summary>Thinking while reading</summary>
        <label className="field">
          <span className="sr-only">Thinking while reading</span>
          <PathInput
            aria-label="Thinking while reading"
            value={draft.readingThinking}
            onValueChange={(value) => change({ readingThinking: value })}
            placeholder="Capture the connections or questions you noticed while reading."
          />
        </label>
      </details>
      <div className="answer-actions">
        {kind === "quiz" && (
          <div className="confidence">
            <label htmlFor="confidence">
              How sure are you? <strong>{draft.confidence}%</strong>
            </label>
            <input
              id="confidence"
              type="range"
              min="0"
              max="100"
              value={draft.confidence}
              onChange={(e) => change({ confidence: Number(e.target.value) })}
            />
          </div>
        )}
        <motion.button
          whileTap={{ scale: 0.985 }}
          className="primary"
          disabled={
            busy ||
            (!draft.values.length &&
              !draft.text.trim() &&
              !(draft.otherSelected && draft.other.trim()))
          }
          onClick={() => void submit()}
        >
          {kind === "ask"
            ? "Continue"
            : kind === "explain"
              ? "Share explanation"
              : "Check understanding"}
        </motion.button>
      </div>
      <button
        className="text-button"
        disabled={busy}
        onClick={() => void submit(true)}
      >
        I don’t know yet
      </button>
      <button
        className="text-button"
        disabled={busy}
        onClick={() => void onSkip()}
      >
        Skip for now
      </button>
    </section>
  );
}
