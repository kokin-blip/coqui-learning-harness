import { artifactMessage } from "../../../../packages/engine/src/core/artifact-policy.ts";
import { useEffect, useRef, useState } from "react";
import { Download, Contrast, ArrowUpRight, Maximize2 } from "lucide-react";
import { FigureFocus } from "./FigureFocus.tsx";
import { api, host, registerArtifact } from "../api.ts";
import { RichText } from "./RichText.tsx";

export function Artifact({
  data,
  sessionId,
  messageId,
  onRepair,
}: {
  data: any;
  sessionId: string;
  messageId: string;
  onRepair?: (text: string) => void;
}) {
  const result = data?.result ?? data;
  const frame = useRef<HTMLIFrameElement>(null);
  const [token, setToken] = useState(""),
    [height, setHeight] = useState(320);
  const [url, setUrl] = useState(""),
    [figureOpen, setFigureOpen] = useState(false),
    [error, setError] = useState(""),
    [inverted, setInverted] = useState(data?.ui?.inverted ?? false);
  useEffect(() => {
    if (!result?.html) return;
    let disposed = false,
      registered = "";
    setError("");
    setHeight(320);
    void registerArtifact(result.html, result.policyVersion)
      .then((r) => {
        registered = r.url;
        if (disposed) void host("artifact.release", { url: registered });
        else {
          setUrl(registered);
          setToken(r.token);
        }
      })
      .catch((e) => setError(e.message));
    return () => {
      disposed = true;
      if (registered) void host("artifact.release", { url: registered });
    };
  }, [result?.html]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source !== frame.current?.contentWindow) return;
      const message = artifactMessage(event.data, token);
      if (!message) return;
      if (message.type === "height") setHeight(message.height);
      else setError(message.message);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [token]);
  if (!result) return null;
  return (
    <figure className="artifact-surface">
      <div className="artifact-caption">
        <span>
          {result.title ??
            (result.svg
              ? "Visual explanation"
              : result.html
                ? "Interactive demonstration"
                : "Source research")}
        </span>
        {(result.html || result.svg) && (
          <div className="inline-actions">
            {result.svg && (
              <button
                className="text-button"
                onClick={() => setFigureOpen(true)}
              >
                <Maximize2 size={15} />
                Focus figure
              </button>
            )}
            <button
              className="text-button"
              aria-pressed={inverted}
              onClick={() => {
                const next = !inverted;
                setInverted(next);
                void api("/api/chats/" + sessionId + "/artifact-ui", "POST", {
                  input: { messageId, inverted: next },
                }).catch((e) => setError(e.message));
              }}
            >
              <Contrast size={15} />
              Invert
            </button>
            <button
              className="text-button"
              onClick={() =>
                void host("export", {
                  title: result.title ?? "Explanation",
                  text: result.html ?? result.svg,
                  extension: result.html ? ".html" : ".svg",
                })
              }
            >
              <Download size={15} />
              Save
            </button>
          </div>
        )}
      </div>
      {result.html ? (
        url ? (
          <iframe
            ref={frame}
            style={{ height }}
            className={"lesson-artifact " + (inverted ? "inverted" : "")}
            sandbox="allow-scripts"
            src={url}
            title={result.title ?? "Interactive explanation"}
          />
        ) : (
          <p role="status">Preparing the verified demonstration…</p>
        )
      ) : result.svg ? (
        <img
          className={
            "lesson-artifact lesson-figure " + (inverted ? "inverted" : "")
          }
          src={"data:image/svg+xml," + encodeURIComponent(result.svg)}
          alt={result.title ?? "Visual explanation"}
        />
      ) : (
        <RichText
          text={
            result.markdown ??
            result.text ??
            result.brief ??
            result.summary ??
            ""
          }
        />
      )}
      {result.notes && (
        <figcaption className="caption">{result.notes}</figcaption>
      )}
      {figureOpen && (
        <FigureFocus
          source={"data:image/svg+xml," + encodeURIComponent(result.svg)}
          title={result.title ?? "Visual explanation"}
          inverted={inverted}
          onClose={() => setFigureOpen(false)}
        />
      )}
      {result.sources?.length > 0 && (
        <ol className="artifact-sources">
          {result.sources.map((s: any, i: number) => (
            <li key={s.url}>
              <button
                className="text-button"
                onClick={() => void host("open", { url: s.url })}
              >
                {i + 1}. {s.title}
                <ArrowUpRight size={13} />
              </button>
            </li>
          ))}
        </ol>
      )}
      {error && (
        <div role="alert" className="inline-error">
          <p>{error}</p>
          {onRepair && (
            <button
              onClick={() =>
                onRepair(
                  "The demonstration “" +
                    (result.title ?? "Interactive explanation") +
                    "” reported this error: " +
                    error +
                    ". Please repair it and verify the updated result.",
                )
              }
            >
              Ask to repair this demonstration
            </button>
          )}
        </div>
      )}
    </figure>
  );
}
