import { useEffect, useState } from "react";
import type { ImportPreview } from "../../../../packages/contracts/index.ts";
import { api } from "../api.ts";
import { Dialog } from "./Dialog.tsx";
export function SourceViewer({
  source,
  saved,
  onClose,
}: {
  source: ImportPreview;
  saved: boolean;
  onClose: () => void;
}) {
  const [page, setPage] = useState(source.pages?.[0]?.page ?? 1),
    [render, setRender] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    setRender(null);
    setError("");
    if (!saved) return;
    let current = true;
    void api(`/coqui/material/page?id=${source.digest}&page=${page}`)
      .then((v) => {
        if (current) setRender(v);
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [source.digest, page, saved]);
  const text =
      render?.text ?? source.pages?.find((p) => p.page === page)?.text ?? "",
    anchor = render?.anchor ?? source.anchors?.find((p) => p.page === page);
  return (
    <Dialog title={source.name} onClose={onClose} className="source-viewer">
      <div className="inline-actions">
        <label>
          Source page{" "}
          <select
            aria-label="Source page"
            value={page}
            onChange={(e) => setPage(Number(e.target.value))}
          >
            {(source.pages?.length
              ? source.pages
              : [{ page: 1, text: "" }]
            ).map((p) => (
              <option key={p.page} value={p.page}>
                {p.page}
              </option>
            ))}
          </select>
        </label>
        <span className="caption">{anchor?.method ?? "Original source"}</span>
      </div>
      {source.processingNote && (
        <p className="caption">{source.processingNote}</p>
      )}
      <div className="source-page-content">
        {render?.image && (
          <img src={render.image} alt={source.name + ", page " + page} />
        )}
        {text ? (
          <pre className="source-transcription">{text}</pre>
        ) : (
          <p className="caption">
            No text was recognized on this page. The original file is preserved.
          </p>
        )}
      </div>
      {anchor && (
        <details>
          <summary>Source anchor</summary>
          <p className="caption">
            Content {source.digest?.slice(0, 12)} · Page {page} ·{" "}
            {anchor.method}
          </p>
          {anchor.lines.length > 0 && (
            <p className="caption">
              {anchor.lines.length} recognized lines retain confidence and
              normalized bounds.
            </p>
          )}
        </details>
      )}
      {error && (
        <p role="alert" className="inline-error">
          {error}
        </p>
      )}
    </Dialog>
  );
}
