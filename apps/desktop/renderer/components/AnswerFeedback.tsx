import { Check, X } from "lucide-react";
import { RichText } from "./RichText.tsx";
import type { QuestionAnswerData } from "../../../../packages/engine/src/core/question-core.ts";
export function AnswerFeedback({ answer }: { answer: QuestionAnswerData }) {
  const options = answer.options ?? [];
  return (
    <details className="answered-question">
      <summary>
        {answer.correct === false ? <X size={16} /> : <Check size={16} />}
        <RichText text={answer.questionText} />
      </summary>
      {answer.dismissed ? (
        <p className="caption">Set aside for now</p>
      ) : (
        <>
          <p className="caption">
            {answer.dontKnow
              ? "I did not know yet"
              : answer.correct === true
                ? "Correct"
                : answer.correct === false
                  ? "Revisit this reasoning"
                  : "Response recorded"}
            {answer.confidence !== undefined
              ? " · Stated confidence " + answer.confidence + "%"
              : ""}
          </p>
          {options.length > 0 && (
            <ul className="feedback-options">
              {options.map((o) => {
                const selected = answer.answers?.some(
                    (a: any) => a.index === o.index,
                  ),
                  correct = answer.correctIndices?.includes(o.index);
                return (
                  <li
                    key={o.index}
                    className={
                      correct
                        ? "answer-correct"
                        : selected && answer.correct === false
                          ? "answer-revisit"
                          : ""
                    }
                  >
                    {correct ? (
                      <Check size={14} />
                    ) : selected ? (
                      <X size={14} />
                    ) : (
                      <span className="feedback-space" />
                    )}
                    <span>
                      <RichText text={o.label} />
                      {selected ? " · Your answer" : ""}
                      {correct ? " · Correct answer" : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {answer.text && <RichText text={answer.text} />}
          {answer.other && <p>Something else: {answer.other}</p>}
          <details data-user-thinking>
            <summary>Your thinking</summary>
            <RichText
              text={
                answer.thinking ?? answer.note ?? "No reasoning note was added."
              }
            />
          </details>
          {answer.readingThinking && (
            <details data-user-thinking>
              <summary>Thinking while reading</summary>
              <RichText text={answer.readingThinking} />
            </details>
          )}
          {(answer.explanation || answer.committed) && (
            <details>
              <summary>
                {answer.committed ? "Committed explanation" : "Why"}
              </summary>
              <RichText text={answer.explanation ?? answer.committed ?? ""} />
            </details>
          )}
        </>
      )}
    </details>
  );
}
