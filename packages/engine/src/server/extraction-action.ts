import { database } from "../../../storage/index.ts";
import { chatStore } from "../store/chats.ts";
import { graphStore } from "../store/graph.ts";
import { coverageOf } from "../core/coverage.ts";
import { emit } from "../core/events.ts";
import type { ExtractionAction } from "../../../contracts/index.ts";

export const extractionAction = (chatId: string) =>
  database().preference<ExtractionAction>("extraction-action:" + chatId);
/** Manual requests keep a durable outcome even if refusal happens before the stage registry exists. */
export function launchExtraction(chatId: string, run: () => Promise<unknown>) {
  const chat = chatStore.getChat(chatId);
  if (!chat) throw new Error("Session not found");
  const initial = coverageOf(chat.messages, graphStore.readCoverage(), chatId);
  const fingerprints = new Set(
    initial.uncovered.map((i) => initial.slots[i]!.fp),
  );
  const startedAt = new Date().toISOString();
  const save = (value: ExtractionAction) => {
    database().setPreference("extraction-action:" + chatId, value);
    emit("record-changed", { chatId });
  };
  save({ state: "running", startedAt });
  void Promise.resolve()
    .then(run)
    .then(
      () => {
        const current = chatStore.getChat(chatId);
        if (!current) return;
        const coverage = coverageOf(
          current.messages,
          graphStore.readCoverage(),
          chatId,
        );
        const remaining = coverage.uncovered.filter((i) =>
          fingerprints.has(coverage.slots[i]!.fp),
        ).length;
        save({
          state: remaining ? "partial" : "completed",
          startedAt,
          finishedAt: new Date().toISOString(),
          remaining,
          message: remaining
            ? "Some passages remain uncovered. Completed batches are saved; retry to process the rest."
            : "Extraction completed.",
        });
      },
      (error) =>
        save({
          state: "failed",
          startedAt,
          finishedAt: new Date().toISOString(),
          message:
            error instanceof Error
              ? error.message
              : "Extraction failed. Saved coverage is unchanged.",
        }),
    );
}
