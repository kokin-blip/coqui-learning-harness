import type { ChatRecord } from "./contracts/chat.ts";
import {
  danglingQuestionOf,
  newMessageId,
  type LhMessage,
} from "./native-messages.ts";
/** A restart cannot recreate an in-flight response. Preserve the input and make Retry eligible. */
export function interruptedTurn(
  record: ChatRecord,
  now = Date.now(),
): { messages: LhMessage[]; interrupted: boolean } {
  const last = record.messages
    .filter((m) => !(m.role === "custom" && m.customType === "plan-block"))
    .at(-1);
  if (!last || danglingQuestionOf(record.messages))
    return { messages: record.messages, interrupted: false };
  if (last.role === "assistant")
    return {
      messages: record.messages,
      interrupted: last.stopReason === "error" || last.stopReason === "aborted",
    };
  const model = record.settings?.model;
  const failure = {
    id: newMessageId(),
    role: "assistant" as const,
    content: [],
    api: "openai-responses",
    provider: model?.provider ?? "coqui-recovery",
    model: model?.id ?? "interrupted",
    usage: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    },
    stopReason: "error" as const,
    errorMessage:
      "This response was interrupted by an application restart. Your input is saved. Retry when ready.",
    timestamp: now,
  };
  return { messages: [...record.messages, failure], interrupted: true };
}
