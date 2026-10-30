import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, ArrowDownUp } from "lucide-react";
import {
  chainGroups,
  type ChainSort,
} from "../../../../packages/engine/components/chain-view.ts";
import type {
  GraphSnapshot,
  GraphNode,
} from "../../../../packages/engine/src/core/contracts/graph.ts";
function Selection({
  ids,
  selected,
  onToggle,
  label,
}: {
  ids: string[];
  selected: Set<string>;
  onToggle: () => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null),
    count = ids.filter((id) => selected.has(id)).length;
  useEffect(() => {
    if (ref.current)
      ref.current.indeterminate = count > 0 && count < ids.length;
  }, [count, ids.length]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      aria-checked={
        count > 0 && count < ids.length ? "mixed" : count === ids.length
      }
      checked={count === ids.length && !!ids.length}
      onClick={(e) => e.stopPropagation()}
      onChange={onToggle}
    />
  );
}
export function ChainBrowser({
  graph,
  query,
  picks,
  onPicks,
  onSelect,
  onSource,
}: {
  graph: GraphSnapshot;
  query: string;
  picks: GraphNode[];
  onPicks: (v: GraphNode[]) => void;
  onSelect: (n: GraphNode) => void;
  onSource: (id: string, messageId?: string) => void;
}) {
  const [sort, setSort] = useState<ChainSort>({ column: "name", direction: 1 }),
    [expanded, setExpanded] = useState<Set<string>>(new Set());
  const groups = useMemo(
      () => chainGroups(graph, query, sort),
      [graph, query, sort],
    ),
    selected = useMemo(() => new Set(picks.map((n) => n.id)), [picks]);
  const toggle = (ids: string[]) => {
    const next = new Set(selected),
      remove = ids.every((id) => next.has(id));
    ids.forEach((id) => (remove ? next.delete(id) : next.add(id)));
    onPicks(graph.propositions.filter((n) => next.has(n.id)));
  };
  const disclosure = (id: string, open: boolean) => {
    if (query.trim()) return;
    setExpanded((old) => {
      const next = new Set(old);
      open ? next.add(id) : next.delete(id);
      return next;
    });
  };
  return (
    <section className="chain-browser" aria-label="Reasoning-chain browser">
      <div className="chain-browser-toolbar">
        <label>
          Sort{" "}
          <select
            aria-label="Sort chains"
            value={sort.column}
            onChange={(e) =>
              setSort({
                column: e.target.value as ChainSort["column"],
                direction: e.target.value === "created" ? -1 : 1,
              })
            }
          >
            <option value="name">Name</option>
            <option value="count">Proposition count</option>
            <option value="created">Created</option>
          </select>
        </label>
        <button
          aria-label="Reverse chain sort order"
          onClick={() =>
            setSort((s) => ({ ...s, direction: s.direction === 1 ? -1 : 1 }))
          }
        >
          <ArrowDownUp size={15} />
          {sort.direction === 1 ? "Ascending" : "Descending"}
        </button>
        <button
          className="text-button"
          onClick={() => toggle([...new Set(groups.flatMap((g) => g.nodeIds))])}
        >
          Select visible ideas
        </button>
      </div>
      {!groups.length && (
        <p className="caption">No reasoning chains match your search.</p>
      )}
      {groups.map((g) => (
        <details
          key={g.id}
          className="chain-source"
          open={!!query.trim() || expanded.has(g.id)}
          onToggle={(e) => disclosure(g.id, e.currentTarget.open)}
        >
          <summary>
            <Selection
              ids={g.nodeIds}
              selected={selected}
              onToggle={() => toggle(g.nodeIds)}
              label={"Select source " + g.label}
            />
            <strong>{g.label}</strong>
            <span className="caption">
              {g.rows.length} chains · {g.nodeIds.length} ideas
            </span>
          </summary>
          <div className="chain-source-meta">
            <span className="caption">
              {g.createdAt ? new Date(g.createdAt).toLocaleDateString() : ""}
            </span>
            {g.sourceId && (
              <button
                className="text-button"
                onClick={() => onSource(g.sourceId!)}
              >
                Open{" "}
                {g.sourceKind === "file" ? "source material" : "source session"}
                <ArrowUpRight size={13} />
              </button>
            )}
          </div>
          {g.rows.map((row) => (
            <details
              key={row.id}
              className="reasoning-chain"
              open={!!query.trim() || expanded.has(row.id)}
              onToggle={(e) => disclosure(row.id, e.currentTarget.open)}
            >
              <summary>
                <Selection
                  ids={row.nodes.map((n) => n.id)}
                  selected={selected}
                  onToggle={() => toggle(row.nodes.map((n) => n.id))}
                  label={"Select chain " + row.name}
                />
                <span>
                  {row.premises.length
                    ? row.premises
                        .map(
                          (id) =>
                            row.nodes.find((n) => n.id === id)?.name ?? id,
                        )
                        .join(" + ") + " → "
                    : ""}
                  <strong>{row.name}</strong>
                </span>
                <small className="caption">{row.nodes.length} ideas</small>
              </summary>
              <div className="chain-propositions">
                {row.nodes.map((n) => (
                  <div className="chain-proposition" key={n.id}>
                    <Selection
                      ids={[n.id]}
                      selected={selected}
                      onToggle={() => toggle([n.id])}
                      label={"Select " + n.name}
                    />
                    <button className="text-button" onClick={() => onSelect(n)}>
                      <strong>{n.name}</strong>
                      <span>{n.statement}</span>
                    </button>
                    <div className="inline-actions">
                      {n.provenance.map((p, i) => (
                        <button
                          key={p.chatId + ":" + i}
                          className="text-button caption"
                          onClick={() => onSource(p.chatId, p.messageId)}
                        >
                          Source {i + 1}
                          <ArrowUpRight size={12} />
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </details>
      ))}
    </section>
  );
}
