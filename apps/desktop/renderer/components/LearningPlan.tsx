import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Maximize2, Minus, Plus, Scan } from "lucide-react";
import type {
  PlanTree,
  PlanNodeStatus,
} from "../../../../packages/engine/src/core/contracts/plan.ts";
import type { PlanBlockData } from "../../../../packages/engine/src/core/contracts/chat.ts";
import {
  blockLayout,
  edgePathD,
  wrapTitle,
  NODE_H,
  NODE_W_MIN,
  LINE_H,
  ARROW_HEAD,
} from "../../../../packages/engine/components/plan-geometry.ts";
import {
  fitGraphView,
  fitZoomFor,
  zoomedGraphView,
  type Viewport,
} from "../../../../packages/engine/components/pan-zoom.ts";
import { Dialog } from "./Dialog.tsx";

type DiagramProps = {
  tree: Pick<PlanTree, "nodes" | "edges">;
  statuses?: Map<string, PlanNodeStatus>;
  natural?: boolean;
};
export function PlanDiagram({ tree, statuses, natural }: DiagramProps) {
  const marker = useId().replace(/:/g, ""),
    layout = useMemo(() => blockLayout(tree.nodes, tree.edges), [tree]);
  const pad = 24,
    width = layout.width + pad * 2,
    height = layout.height + pad * 2;
  const color = (id: string) =>
    statuses?.get(id) === "current"
      ? "var(--accent)"
      : statuses?.get(id) === "upcoming"
        ? "var(--muted)"
        : "var(--ink)";
  return (
    <svg
      className="learning-plan-svg"
      viewBox={`${(layout.originX ?? 0) - pad} ${(layout.originY ?? 0) - pad} ${width} ${height}`}
      style={natural ? { width, height } : {}}
      role="img"
      aria-label="Learning dependency plan"
    >
      <defs>
        <marker
          id={marker}
          viewBox="0 0 50.2 104"
          refX="27.2"
          refY="52"
          markerWidth="5.2"
          markerHeight="10.6"
          markerUnits="userSpaceOnUse"
          orient="auto"
        >
          <path d={ARROW_HEAD} fill="var(--muted)" />
        </marker>
      </defs>
      {tree.edges.map((e) => {
        const pts = layout.edgePts.get(`${e.from}->${e.to}`);
        if (!pts) return null;
        return (
          <path
            key={e.from + "->" + e.to}
            d={edgePathD(pts, {
              x: layout.x.get(e.to)!,
              y: layout.y.get(e.to)!,
              w: layout.nodeW.get(e.to) ?? NODE_W_MIN,
              h: layout.nodeH.get(e.to) ?? NODE_H,
            })}
            fill="none"
            stroke="var(--muted)"
            strokeWidth="1"
            markerEnd={`url(#${marker})`}
          />
        );
      })}
      {tree.nodes.map((n) => {
        const w = layout.nodeW.get(n.id) ?? NODE_W_MIN,
          h = layout.nodeH.get(n.id) ?? NODE_H,
          lines = wrapTitle(n.title),
          status = statuses?.get(n.id) ?? "snapshot";
        return (
          <g
            key={n.id}
            data-plan-node={n.id}
            data-status={status}
            transform={`translate(${layout.x.get(n.id)},${layout.y.get(n.id)})`}
          >
            <title>
              {n.title + (status === "snapshot" ? "" : " · " + status)}
            </title>
            <rect
              width={w}
              height={h}
              rx="6"
              fill={
                status === "current" ? "var(--accent-soft)" : "var(--surface)"
              }
              stroke={color(n.id)}
              strokeWidth={status === "current" ? 1.5 : 1}
            />
            {lines.map((line, i) => (
              <text
                key={i}
                x={w / 2}
                y={(h - lines.length * LINE_H) / 2 + 10 + i * LINE_H}
                textAnchor="middle"
                fontSize="11"
                fill={color(n.id)}
              >
                {line}
              </text>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

export function PlanSnapshot({
  data,
  onOpen,
}: {
  data: PlanBlockData;
  onOpen: () => void;
}) {
  const statuses = useMemo(
    () => new Map(data.nodes.map((n) => [n.id, n.status] as const)),
    [data],
  );
  return (
    <button
      className="plan-snapshot"
      aria-label="Open the full learning plan"
      onClick={onOpen}
    >
      <PlanDiagram tree={data} statuses={statuses} natural />
      <span className="caption">
        Learning path snapshot <Maximize2 size={13} />
      </span>
    </button>
  );
}

export function PlanFocus({
  tree,
  statuses,
  onClose,
}: {
  tree: PlanTree;
  statuses: Map<string, PlanNodeStatus>;
  onClose: () => void;
}) {
  const stage = useRef<HTMLDivElement>(null),
    drag = useRef<{ x: number; y: number; view: Viewport } | null>(null);
  const layout = useMemo(() => blockLayout(tree.nodes, tree.edges), [tree]);
  const box = useMemo(
    () => ({ w: layout.width + 48, h: layout.height + 48 }),
    [layout],
  );
  const [size, setSize] = useState({ w: 800, h: 500 }),
    [view, setView] = useState<Viewport>({ zoom: 1, x: 0, y: 0 });
  const floor = fitZoomFor(box, size);
  const fit = () => setView(fitGraphView(box, size, floor));
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      const next = { w: entry.contentRect.width, h: entry.contentRect.height };
      setSize(next);
      setView(fitGraphView(box, next, fitZoomFor(box, next)));
    });
    if (stage.current) observer.observe(stage.current);
    return () => observer.disconnect();
  }, [box]);
  const zoom = (factor: number, focus = { x: size.w / 2, y: size.h / 2 }) =>
    setView((v) => zoomedGraphView(v, factor, floor, focus, box, size));
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoom(Math.exp(-e.deltaY * 0.002), {
        x: e.clientX - r.left,
        y: e.clientY - r.top,
      });
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [size, box, floor]);
  return (
    <Dialog title="Your learning path" onClose={onClose} className="plan-focus">
      <div className="inline-actions plan-focus-controls">
        <button aria-label="Zoom out of plan" onClick={() => zoom(1 / 1.25)}>
          <Minus size={16} />
        </button>
        <span className="caption">{Math.round(view.zoom * 100)}%</span>
        <button aria-label="Zoom into plan" onClick={() => zoom(1.25)}>
          <Plus size={16} />
        </button>
        <button onClick={fit}>
          <Scan size={16} />
          Fit plan
        </button>
        <span className="caption">Current · Visited · Upcoming</span>
      </div>
      <div
        className="plan-focus-stage"
        ref={stage}
        tabIndex={0}
        aria-label="Plan canvas. Drag to pan, scroll to zoom, zero to fit."
        onPointerDown={(e) => {
          if (view.zoom <= floor) return;
          drag.current = { x: e.clientX, y: e.clientY, view };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (d)
            setView({
              ...d.view,
              x: d.view.x + e.clientX - d.x,
              y: d.view.y + e.clientY - d.y,
            });
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={(e) => {
          if (e.key === "0") {
            e.preventDefault();
            fit();
          }
          if (["+", "=", "-"].includes(e.key)) {
            e.preventDefault();
            zoom(e.key === "-" ? 1 / 1.25 : 1.25);
          }
          if (
            ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(
              e.key,
            ) &&
            view.zoom > floor
          ) {
            e.preventDefault();
            setView((v) => ({
              ...v,
              x:
                v.x +
                (e.key === "ArrowLeft" ? 40 : e.key === "ArrowRight" ? -40 : 0),
              y:
                v.y +
                (e.key === "ArrowUp" ? 40 : e.key === "ArrowDown" ? -40 : 0),
            }));
          }
        }}
      >
        <div
          style={{
            transform: `translate(${view.x}px,${view.y}px) scale(${view.zoom})`,
            transformOrigin: "0 0",
            width: box.w,
            height: box.h,
          }}
        >
          <PlanDiagram tree={tree} statuses={statuses} natural />
        </div>
      </div>
      <ol className="sr-only">
        {tree.nodes.map((n) => (
          <li key={n.id}>
            {n.title} · {statuses.get(n.id) ?? "upcoming"}
          </li>
        ))}
      </ol>
    </Dialog>
  );
}
