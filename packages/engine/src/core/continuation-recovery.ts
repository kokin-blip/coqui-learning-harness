import { probeDoneResultIds, type LhMessage } from "./native-messages.ts";
/** A concluded diagnostic's missing handoff is reconstructed from durable facts, not a new learner input. */
export function probeHandoffOwed(record: {
  kind?: string;
  messages: LhMessage[];
}): boolean {
  if (record.kind === "practice") return false;
  const messages = record.messages,
    results = probeDoneResultIds(messages);
  if (
    !results.size ||
    messages.some(
      (m) => m.role === "custom" && m.customType === "probe-handoff",
    )
  )
    return false;
  let index = -1;
  messages.forEach((m, i) => {
    if (results.has(m.id ?? "")) index = i;
  });
  return (
    index >= 0 &&
    !messages
      .slice(index + 1)
      .some(
        (m) =>
          m.role === "user" ||
          (m.role === "custom" && m.customType === "plan-block") ||
          (m.role === "assistant" &&
            m.content.some(
              (c) => c.type === "toolCall" && c.name === "plan_init",
            )),
      )
  );
}
