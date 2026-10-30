import { useEffect, useRef, useState } from "react";
import { Copy, Check, Maximize2, Minus, Plus, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { transformMathDelimiters } from "../../../../packages/engine/src/core/math-delims.ts";
import { FilePathChip } from "../../../../packages/engine/components/file-path-chip.tsx";
import { host } from "../api.ts";
function CopySource({
  text,
  label = "Copy source",
}: {
  text: string;
  label?: string;
}) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="copy-source"
      aria-label={label}
      onClick={() =>
        void host("clipboard", { text }).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1300);
        })
      }
    >
      {done ? <Check size={14} /> : <Copy size={14} />}
      <span>{done ? "Copied" : label}</span>
    </button>
  );
}
function Diagram({ source }: { source: string }) {
  const [svg, setSvg] = useState(""),
    [error, setError] = useState(""),
    [expanded, setExpanded] = useState(false),
    [scale, setScale] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [theme, setTheme] = useState(document.documentElement.dataset.theme);
  const dialog = useRef<HTMLDialogElement>(null),
    drag = useRef<any>(null);
  useEffect(() => {
    const observer = new MutationObserver(() =>
      setTheme(document.documentElement.dataset.theme),
    );
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let active = true;
    void import("mermaid")
      .then(async ({ default: m }) => {
        m.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: theme === "dark" ? "dark" : "neutral",
          fontFamily: "-apple-system, sans-serif",
        });
        const { svg } = await m.render(
          "diagram-" + crypto.randomUUID(),
          source,
        );
        if (active) {
          setSvg(svg);
          setError("");
        }
      })
      .catch((e) => {
        if (active) setError(e.message ?? "The diagram could not be rendered.");
      });
    return () => {
      active = false;
    };
  }, [source, theme]);
  useEffect(() => {
    if (expanded) dialog.current?.showModal();
  }, [expanded]);
  return (
    <div className="diagram-surface">
      <div className="source-toolbar">
        <CopySource text={source} label="Copy Mermaid" />
        <button
          className="text-button"
          onClick={() => {
            setExpanded(true);
            setScale(1);
            setPan({ x: 0, y: 0 });
          }}
        >
          <Maximize2 size={14} />
          Focus diagram
        </button>
      </div>
      {svg ? (
        <div
          className="diagram"
          aria-label="Lesson diagram"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <pre>{source}</pre>
      )}
      {error && (
        <details className="inline-error">
          <summary>Diagram rendering needs attention</summary>
          <pre>{error}</pre>
        </details>
      )}
      {expanded && (
        <dialog
          ref={dialog}
          className="diagram-dialog glass mist"
          aria-label="Diagram focus"
          onCancel={() => setExpanded(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") e.stopPropagation();
          }}
        >
          <div className="source-toolbar">
            <button
              onClick={() => setScale((s) => Math.max(0.2, s / 1.2))}
              aria-label="Zoom diagram out"
            >
              <Minus size={16} />
            </button>
            <button
              onClick={() => {
                setScale(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              Fit
            </button>
            <button
              onClick={() => setScale((s) => Math.min(6, s * 1.2))}
              aria-label="Zoom diagram in"
            >
              <Plus size={16} />
            </button>
            <CopySource text={source} />
            <button
              aria-label="Close diagram"
              onClick={() => setExpanded(false)}
            >
              <X size={17} />
            </button>
          </div>
          <div
            className="diagram-focus"
            onPointerDown={(e) => {
              drag.current = { x: e.clientX, y: e.clientY };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (drag.current) {
                const previous = drag.current;
                setPan((p) => ({
                  x: p.x + e.clientX - previous.x,
                  y: p.y + e.clientY - previous.y,
                }));
                drag.current = { x: e.clientX, y: e.clientY };
              }
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onWheel={(e) =>
              setScale((s) =>
                Math.max(0.2, Math.min(6, s * Math.exp(-e.deltaY * 0.001))),
              )
            }
          >
            <div
              style={{
                transform: `translate(${pan.x}px,${pan.y}px) scale(${scale})`,
              }}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>
        </dialog>
      )}
    </div>
  );
}
function plain(node: any): string {
  return node.type === "text"
    ? node.value
    : (node.children ?? []).map(plain).join("");
}
function tex(node: any): string | undefined {
  if (
    node.tagName === "annotation" &&
    node.properties?.encoding === "application/x-tex"
  )
    return plain(node);
  for (const child of node.children ?? []) {
    const result = tex(child);
    if (result) return result;
  }
}
function markdownEnhancements() {
  return (tree: any) => {
    function walk(node: any) {
      if (node.type === "blockquote") {
        const paragraph = node.children?.[0],
          first = paragraph?.children?.[0];
        const match =
          first?.type === "text" &&
          /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*/.exec(first.value);
        if (match) {
          first.value = first.value.slice(match[0].length);
          node.data = {
            hName: "aside",
            hProperties: {
              className: ["markdown-alert", "alert-" + match[1].toLowerCase()],
            },
          };
          node.children.unshift({
            type: "paragraph",
            data: { hProperties: { className: ["alert-title"] } },
            children: [
              {
                type: "strong",
                children: [
                  {
                    type: "text",
                    value: match[1][0] + match[1].slice(1).toLowerCase(),
                  },
                ],
              },
            ],
          });
        }
      }
      if (node.type === "paragraph")
        node.children = node.children.flatMap((child: any) =>
          child.type === "text" && child.value.includes("\n")
            ? child.value
                .split("\n")
                .flatMap((value: string, i: number) => [
                  ...(i ? [{ type: "break" }] : []),
                  { type: "text", value },
                ])
            : [child],
        );
      for (const child of node.children ?? []) walk(child);
    }
    walk(tree);
  };
}
export function RichText({ text }: { text: string }) {
  const content = transformMathDelimiters(text);
  return (
    <div className="prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath, markdownEnhancements]}
        rehypePlugins={[[rehypeKatex, { trust: false, strict: "warn" }]]}
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              onClick={(e) => {
                e.preventDefault();
                if (href && /^https?:/.test(href))
                  void host("open", { url: href });
              }}
            >
              {children}
            </a>
          ),
          pre: ({ node, children }) => (
            <div className="source-block">
              <CopySource
                text={plain(node?.children?.[0] ?? {})}
                label="Copy code"
              />
              <pre>{children}</pre>
            </div>
          ),
          table: ({ node, children }) => (
            <div className="source-block table-source">
              <CopySource
                text={content.slice(
                  node?.position?.start.offset,
                  node?.position?.end.offset,
                )}
                label="Copy table"
              />
              <div className="table-scroll">
                <table>{children}</table>
              </div>
            </div>
          ),
          span: ({ node, className, children, ...props }) =>
            className?.split(" ").includes("katex-display") ? (
              <span className="equation-source">
                <span {...props} className={className}>
                  {children}
                </span>
                <CopySource text={tex(node) ?? ""} label="Copy TeX" />
              </span>
            ) : (
              <span {...props} className={className}>
                {children}
              </span>
            ),
          code: ({ className, children, ...props }) =>
            className === "language-mermaid" ? (
              <Diagram source={String(children)} />
            ) : !className &&
              /^(\/|~\/|[a-z]:[\\/])/i.test(String(children)) ? (
              <FilePathChip path={String(children)} />
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
