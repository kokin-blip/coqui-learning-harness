import { GraphUsage } from "./UsageDetails.tsx";
import { ChainBrowser } from "./ChainBrowser.tsx";
import { useEffect, useRef, useState } from "react";
import {
  Maximize2,
  Minus,
  Plus,
  List,
  Network,
  SlidersHorizontal,
} from "lucide-react";
import { GraphCanvasRenderer } from "../../../../packages/engine/components/graph-canvas.ts";
import { DEFAULT_RENDER_SETTINGS } from "../../../../packages/engine/src/core/render-settings.ts";
import { fuzzyScore } from "../../../../packages/engine/src/core/fuzzy.ts";
import { api } from "../api.ts";
export function KnowledgeMap({
  graph,
  onSelect,
  selected,
  picks = [],
  onPicks,
  onDelete,
  notify,
  onSource,
  rendering = true,
  selectMode = false,
  onDone,
}: {
  graph: any;
  onSource?: (id: string, messageId?: string) => void;
  rendering?: boolean;
  onSelect: (v: any) => void;
  selected: any;
  picks?: any[];
  onPicks?: (v: any[]) => void;
  onDelete?: (ids: string[]) => void;
  notify?: (s: string) => void;
  selectMode?: boolean;
  onDone?: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null),
    renderer = useRef<GraphCanvasRenderer | null>(null),
    latest = useRef({ graph, onSelect });
  latest.current = { graph, onSelect };
  const [list, setList] = useState(!rendering),
    [query, setQuery] = useState(""),
    [settings, setSettings] = useState(DEFAULT_RENDER_SETTINGS),
    [options, setOptions] = useState(false),
    [costs, setCosts] = useState<any>(null),
    [positions, setPositions] = useState<any[]>([]);
  const nodes = graph?.nodes ?? [],
    propositions = graph?.propositions ?? nodes,
    edges = graph?.edges ?? [];
  useEffect(() => {
    if (!rendering) setList(true);
  }, [rendering]);
  useEffect(() => {
    void api("/api/graph/render-settings").then((s) => {
      if (s) setSettings(s);
    });
  }, []);
  useEffect(() => {
    const worker = new Worker(new URL("../graph.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.postMessage(graph);
    worker.onmessage = ({ data }) => setPositions(data);
    return () => worker.terminate();
  }, [graph]);
  useEffect(() => {
    if (!canvas.current || !nodes.length || list) return;
    let stored = null;
    try {
      stored = JSON.parse(
        localStorage.getItem("coqui.graph.camera.v1") ?? "null",
      );
    } catch {}
    const view = new GraphCanvasRenderer(
      canvas.current,
      {
        onSelect: (id) =>
          latest.current.onSelect(
            latest.current.graph.nodes.find((n: any) => n.id === id),
          ),
        onContext: (id) => {
          if (id)
            latest.current.onSelect(
              latest.current.graph.nodes.find((n: any) => n.id === id),
            );
        },
        onStageClick: () => latest.current.onSelect(null),
        onCameraMove: (camera) =>
          localStorage.setItem("coqui.graph.camera.v1", JSON.stringify(camera)),
        onCommit: (p) =>
          void api("/coqui/positions", "PUT", { positions: p }).catch((e) =>
            notify?.(e.message),
          ),
      },
      stored,
    );
    renderer.current = view;
    view.setSettings(settings);
    return () => {
      view.destroy();
      renderer.current = null;
    };
  }, [list, nodes.length === 0]);
  const update = () => {
    const view = renderer.current;
    if (!view || !positions.length) return;
    const style = getComputedStyle(document.documentElement);
    view.setData({
      nodes: positions.map((n) => ({
        id: n.id,
        x: n.x,
        y: n.y,
        label: n.name,
      })),
      edges,
      logicalEdges: graph.logicalEdges ?? edges,
      impLinks: graph.impLinks ?? [],
      clusters: graph.clusters ?? [],
      colors: {
        node: style.getPropertyValue("--accent").trim(),
        edge: style.getPropertyValue("--line").trim(),
        label: style.getPropertyValue("--muted").trim(),
        hoverText: style.getPropertyValue("--ink").trim(),
      },
      fontFamily: getComputedStyle(document.body).fontFamily,
    });
  };
  useEffect(() => {
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-transparency"],
    });
    return () => observer.disconnect();
  }, [positions, list, graph]);
  useEffect(() => {
    renderer.current?.setSettings(settings);
  }, [settings, list]);
  useEffect(() => {
    const visible = query.trim()
      ? new Set<string>(
          propositions
            .filter(
              (n: any) =>
                fuzzyScore(query, n.name, n.statement, ...(n.aliases ?? [])) !==
                null,
            )
            .map((n: any) => n.id),
        )
      : null;
    if (visible)
      for (const link of graph.impLinks ?? [])
        if (
          visible.has(link.conclusion) &&
          link.premises.every((id: string) => visible.has(id))
        )
          visible.add(link.id);
    renderer.current?.setVisible(visible);
    if (visible && selected && !visible.has(selected.id)) onSelect(null);
  }, [query, list, graph]);
  const save = async (next: any) => {
    setSettings(next);
    setSettings(await api("/api/graph/render-settings", "PUT", next));
  };
  return (
    <section className="map-surface glass mist">
      <div className="map-toolbar">
        <div className="segmented">
          <button
            aria-pressed={!list}
            disabled={!rendering}
            onClick={() => setList(false)}
          >
            <Network size={15} />
            Knowledge map
          </button>
          <button aria-pressed={list} onClick={() => setList(true)}>
            <List size={15} />
            Reasoning chains
          </button>
        </div>
        <input
          aria-label="Search propositions"
          placeholder="Search propositions"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button
          className="text-button"
          aria-label="Map display and physics"
          aria-expanded={options}
          onClick={() => setOptions(!options)}
        >
          <SlidersHorizontal size={17} />
        </button>
      </div>
      {options && (
        <div className="map-options glass mist">
          <h3>Map display</h3>
          {[
            ["nodeSize", "Node size"],
            ["edgeWidth", "Line weight"],
            ["arrowLength", "Arrowheads"],
            ["labelSize", "Label size"],
            ["labelZoom", "Label zoom gate"],
            ["clusterLabelSize", "Region labels"],
          ].map(([key, label]) => (
            <label key={key} className="setting-row">
              <span>{label}</span>
              <input
                type="number"
                step="any"
                value={(settings as any)[key]}
                onChange={(e) =>
                  void save({ ...settings, [key]: Number(e.target.value) })
                }
              />
            </label>
          ))}
          <label className="setting-row">
            <span>Show region labels</span>
            <input
              type="checkbox"
              checked={settings.clusterLabels}
              onChange={(e) =>
                void save({ ...settings, clusterLabels: e.target.checked })
              }
            />
          </label>
          <label className="setting-row">
            <span>Show cluster regions</span>
            <input
              type="checkbox"
              checked={settings.regions.enabled}
              onChange={(e) =>
                void save({
                  ...settings,
                  regions: { ...settings.regions, enabled: e.target.checked },
                })
              }
            />
          </label>
          {[
            ["dilation", "Region extent"],
            ["blur", "Region softness"],
            ["edgeAlpha", "Region opacity"],
          ].map(([key, label]) => (
            <label className="setting-row" key={key}>
              <span>{label}</span>
              <input
                type="number"
                step="any"
                value={(settings.regions as any)[key]}
                onChange={(e) =>
                  void save({
                    ...settings,
                    regions: {
                      ...settings.regions,
                      [key]: Number(e.target.value),
                    },
                  })
                }
              />
            </label>
          ))}
          <h3>Motion and inference</h3>
          <label className="setting-row">
            <span>Inference layout</span>
            <select
              value={settings.physics.depthMode}
              onChange={(e) =>
                void save({
                  ...settings,
                  physics: { ...settings.physics, depthMode: e.target.value },
                })
              }
            >
              <option value="off">Free</option>
              <option value="vertical">Vertical depth</option>
              <option value="radial">Radial depth</option>
            </select>
          </label>
          {[
            ["chargeStrength", "Repulsion"],
            ["linkStrength", "Edge attraction"],
            ["linkDistance", "Edge length"],
            ["gravity", "Central pull"],
            ["clusterPull", "Cluster pull"],
            ["velocityDecay", "Friction"],
            ["depthStrength", "Depth strength"],
            ["depthSpacing", "Depth spacing"],
            ["depthBaseRadius", "Inner radius"],
          ].map(([key, label]) => (
            <label className="setting-row" key={key}>
              <span>{label}</span>
              <input
                type="number"
                step="any"
                value={(settings.physics as any)[key]}
                onChange={(e) =>
                  void save({
                    ...settings,
                    physics: {
                      ...settings.physics,
                      [key]: Number(e.target.value),
                    },
                  })
                }
              />
            </label>
          ))}
          <button onClick={() => void save(DEFAULT_RENDER_SETTINGS)}>
            Reset map settings
          </button>
          <button onClick={() => setOptions(false)}>Done</button>
        </div>
      )}
      {!nodes.length ? (
        <div className="empty-map">
          <Network size={38} strokeWidth={1.2} />
          <h2>Your ideas will connect here.</h2>
          <p>
            Start a learning session or import material.
            <br />
            The map grows from the explanations you explore.
          </p>
        </div>
      ) : list ? (
        <ChainBrowser
          graph={graph}
          query={query}
          picks={picks}
          onPicks={(v) => onPicks?.(v)}
          onSelect={onSelect}
          onSource={(id, messageId) => onSource?.(id, messageId)}
        />
      ) : (
        <canvas
          ref={canvas}
          className="knowledge-canvas"
          tabIndex={0}
          aria-label="Knowledge map. Use arrow keys to pan and plus or minus to zoom. The reasoning list provides access to all concepts."
          onKeyDown={(e) => {
            const directions: Record<string, [number, number]> = {
              ArrowLeft: [32, 0],
              ArrowRight: [-32, 0],
              ArrowUp: [0, 32],
              ArrowDown: [0, -32],
            };
            if (directions[e.key]) {
              e.preventDefault();
              renderer.current?.panBy(...directions[e.key]);
            }
            if (e.key === "+") renderer.current?.zoomBy(1.2);
            if (e.key === "-") renderer.current?.zoomBy(1 / 1.2);
          }}
        />
      )}
      <div className="map-footer">
        <button
          className="text-button caption"
          onClick={() => void api("/api/graph/costs").then(setCosts)}
        >
          <i className="status-dot" />
          {propositions.length} connected ideas · Usage
        </button>
        {list && (
          <span className="caption">
            {graph?.chains?.length ?? 0} chains ·{" "}
            {Object.keys(graph?.sessions ?? {}).length} sessions ·{" "}
            {Object.keys(graph?.fileSources ?? {}).length} files
          </span>
        )}
        {(picks.length > 0 || selectMode) && (
          <div className="inline-actions">
            <span className="caption">{picks.length} chosen</span>
            <button onClick={() => onPicks?.([])}>Clear</button>
            {selectMode ? (
              <button onClick={onDone}>Done choosing</button>
            ) : (
              <button
                className="danger"
                onClick={() => onDelete?.(picks.map((n) => n.id))}
              >
                Delete chosen
              </button>
            )}
          </div>
        )}
        <div className="glass lens map-zoom">
          <button
            aria-label="Zoom out"
            onClick={() => renderer.current?.zoomBy(1 / 1.2)}
          >
            <Minus size={16} />
          </button>
          <button
            aria-label="Reset map view"
            onClick={() => renderer.current?.fit()}
          >
            <Maximize2 size={16} />
          </button>
          <button
            aria-label="Zoom in"
            onClick={() => renderer.current?.zoomBy(1.2)}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
      {costs && (
        <div className="map-options glass mist">
          <h3>Knowledge extraction usage</h3>
          <GraphUsage value={costs} />
          <button onClick={() => setCosts(null)}>Done</button>
        </div>
      )}
    </section>
  );
}
