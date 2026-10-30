import type { AssistantMessage } from "@earendil-works/pi-ai";
import type { LhMessage } from "./native-messages.ts";
import type { CallUsage } from "./contracts/chat.ts";
/** Pi-normalized cache buckets are disjoint from fresh input. Reasoning is inside output. */
export function callContextTokens(usage: CallUsage | undefined): number | null {
  if (!usage) return null;
  const buckets = [
    usage.inputTokens,
    usage.outputTokens,
    usage.cacheReadTokens,
    usage.cacheWriteTokens,
  ];
  if (
    buckets.some((v) => typeof v !== "number" || !Number.isFinite(v) || v < 0)
  )
    return null;
  const total = (buckets as number[]).reduce((a, b) => a + b, 0);
  return total > 0 ? total : null;
}

/** Latest completed conversation measurement, never a request-size estimate.
 * Ordered compaction markers invalidate every earlier reading. Live callers
 * must exclude assistant slots that have not received message_end.
 * Reasoning is already inside output; totalTokens is deliberately not used.
 */
export function measuredContextTokens(
  messages: readonly LhMessage[],
  incompleteIds: ReadonlySet<string> = new Set(),
): number | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]!;
    if (message.role === "custom" && message.customType === "compaction")
      return null;
    if (message.role !== "assistant" || incompleteIds.has(message.id)) continue;
    const assistant = message as AssistantMessage;
    if (!["stop", "length", "toolUse"].includes(assistant.stopReason)) continue;
    const usage = assistant.usage;
    if (!usage) continue;
    const buckets = [
      usage.input,
      usage.output,
      usage.cacheRead,
      usage.cacheWrite,
    ];
    if (buckets.some((value) => !Number.isFinite(value) || value < 0)) continue;
    const tokens = buckets.reduce((sum, value) => sum + value, 0);
    if (tokens > 0) return tokens;
  }
  return null;
}
