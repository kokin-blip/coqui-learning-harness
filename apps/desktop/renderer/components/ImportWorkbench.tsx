import type { ImportItem } from "../../../../packages/contracts/index.ts";
import { LoaderCircle, RefreshCw } from "lucide-react";
export function ImportWorkbench({
  items,
  onToggle,
  onDuplicate,
  onRetry,
  onInspect,
  onCommit,
  onClose,
}: {
  items: ImportItem[];
  onToggle: (id: string, checked: boolean) => void;
  onDuplicate: (id: string, choice: "reuse" | "update") => void;
  onRetry: (id: string) => void;
  onInspect: (item: ImportItem) => void;
  onCommit: () => void;
  onClose: () => void;
}) {
  const active = items.some(
      (i) => i.phase === "processing" || i.phase === "saving",
    ),
    count = items.filter((i) => i.selected && i.phase === "ready").length;
  return (
    <section
      className="import-preview reading"
      aria-label="Import processing preview"
    >
      <h2>Review your material</h2>
      <p className="caption">
        Choose the files to save. Sources already in your library are reused. Up
        to 32 files per batch, 32 MB per file, and 200 pages per PDF.
      </p>
      {items.map((item) => (
        <article key={item.id} className="import-result">
          <div className="inline-actions">
            <input
              type="checkbox"
              aria-label={"Save " + item.name}
              disabled={
                item.phase !== "ready" ||
                (item.duplicate && item.duplicateChoice !== "update")
              }
              checked={item.selected}
              onChange={(e) => onToggle(item.id, e.target.checked)}
            />
            <strong>{item.name}</strong>
            <span className="pill">
              {item.phase === "saved"
                ? "Saved"
                : item.phase === "processing"
                  ? "Processing"
                  : item.phase === "saving"
                    ? "Saving"
                    : item.phase === "error"
                      ? "Needs attention"
                      : item.duplicate
                        ? "Already saved"
                        : item.needsVision
                          ? "Original preserved · vision needed"
                          : "Ready"}
            </span>
            {["processing", "saving"].includes(item.phase) && (
              <LoaderCircle size={15} className="spin" />
            )}
          </div>
          <p className="caption">
            {item.error ??
              `${item.pages?.length ?? 0} source pages · ${Math.round((item.bytes ?? 0) / 1024)} KB`}
          </p>
          {item.processingNote && (
            <p className="caption">{item.processingNote}</p>
          )}
          {item.duplicate && item.phase === "ready" && (
            <label className="field">
              Already saved material
              <select
                aria-label={"Duplicate choice for " + item.name}
                value={item.duplicateChoice ?? "reuse"}
                onChange={(e) =>
                  onDuplicate(item.id, e.target.value as "reuse" | "update")
                }
              >
                <option value="reuse">Keep existing source</option>
                <option value="update">
                  Update extracted text and anchors
                </option>
              </select>
              <span className="caption">
                The original source identity and shared knowledge are preserved.
              </span>
            </label>
          )}
          {item.text && (
            <p>
              {item.text.slice(0, 240)}
              {item.text.length > 240 ? "…" : ""}
            </p>
          )}
          <div className="inline-actions">
            {item.pages && (
              <button className="text-button" onClick={() => onInspect(item)}>
                {item.duplicate
                  ? "Inspect existing source"
                  : "Inspect source pages"}
              </button>
            )}
            {item.phase === "error" && (
              <button className="text-button" onClick={() => onRetry(item.id)}>
                <RefreshCw size={14} />
                Retry this file
              </button>
            )}
          </div>
        </article>
      ))}
      <div className="inline-actions">
        <button
          className="primary"
          disabled={!count || active}
          onClick={onCommit}
        >
          Save {count || "selected"} {count === 1 ? "file" : "files"}
        </button>
        <button disabled={active} onClick={onClose}>
          {items.some((i) => i.phase === "saved") ? "Done" : "Cancel"}
        </button>
        <span className="caption" role="status">
          {items.filter((i) => i.phase === "saved").length} saved ·{" "}
          {items.filter((i) => i.phase === "error").length} need attention
        </span>
      </div>
    </section>
  );
}
