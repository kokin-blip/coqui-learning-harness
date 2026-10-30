import { useEffect, useRef, useState } from "react";
import { Minus, Plus, Scan } from "lucide-react";
import { Dialog } from "./Dialog.tsx";
import {
  fitGraphView,
  fitZoomFor,
  zoomedGraphView,
  type Viewport,
} from "../../../../packages/engine/components/pan-zoom.ts";

export function FigureFocus({
  source,
  title,
  inverted,
  onClose,
}: {
  source: string;
  title: string;
  inverted: boolean;
  onClose: () => void;
}) {
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; view: Viewport } | null>(null);
  const [image, setImage] = useState({ w: 600, h: 400 });
  const [size, setSize] = useState({ w: 800, h: 500 });
  const [view, setView] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const floor = fitZoomFor(image, size);
  const fit = () => setView(fitGraphView(image, size, floor));
  const zoom = (factor: number, focus = { x: size.w / 2, y: size.h / 2 }) =>
    setView((v) => zoomedGraphView(v, factor, floor, focus, image, size));
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setSize({ w: entry.contentRect.width, h: entry.contentRect.height }),
    );
    if (stage.current) observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);
  useEffect(fit, [image.w, image.h, size.w, size.h]);
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const box = el.getBoundingClientRect();
      zoom(Math.exp(-event.deltaY * 0.002), {
        x: event.clientX - box.left,
        y: event.clientY - box.top,
      });
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [image.w, image.h, size.w, size.h, floor]);
  return (
    <Dialog title={title} onClose={onClose} className="figure-focus">
      <div className="inline-actions">
        <button aria-label="Zoom figure out" onClick={() => zoom(1 / 1.25)}>
          <Minus size={16} />
        </button>
        <span className="caption">{Math.round(view.zoom * 100)}%</span>
        <button aria-label="Zoom figure in" onClick={() => zoom(1.25)}>
          <Plus size={16} />
        </button>
        <button onClick={fit}>
          <Scan size={16} />
          Fit figure
        </button>
      </div>
      <div
        ref={stage}
        className="plan-focus-stage figure-focus-stage"
        tabIndex={0}
        aria-label="Figure canvas. Drag to pan, scroll to zoom, zero to fit."
        onPointerDown={(e) => {
          drag.current = { x: e.clientX, y: e.clientY, view };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (drag.current)
            setView({
              ...drag.current.view,
              x: drag.current.view.x + e.clientX - drag.current.x,
              y: drag.current.view.y + e.clientY - drag.current.y,
            });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onKeyDown={(e) => {
          if (e.key === "0") {
            e.preventDefault();
            fit();
          }
          if (["+", "=", "-"].includes(e.key)) {
            e.preventDefault();
            zoom(e.key === "-" ? 1 / 1.25 : 1.25);
          }
          const delta: Record<string, [number, number]> = {
            ArrowLeft: [30, 0],
            ArrowRight: [-30, 0],
            ArrowUp: [0, 30],
            ArrowDown: [0, -30],
          };
          if (delta[e.key]) {
            e.preventDefault();
            const [x, y] = delta[e.key];
            setView((v) => ({ ...v, x: v.x + x, y: v.y + y }));
          }
        }}
      >
        <img
          src={source}
          alt={title}
          className={inverted ? "inverted" : ""}
          draggable={false}
          onLoad={(e) =>
            setImage({
              w: e.currentTarget.naturalWidth,
              h: e.currentTarget.naturalHeight,
            })
          }
          style={{
            width: image.w,
            height: image.h,
            transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
          }}
        />
      </div>
    </Dialog>
  );
}
