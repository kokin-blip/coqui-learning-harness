/** Adapted grouping/search rules from LearnHarness 0.4.0 chain-table.tsx (AGPL-3.0-only). */
import type { GraphSnapshot, GraphNode } from "../src/core/contracts/graph.ts";
import { chainsForSelection, type ReasoningChain } from "../src/core/chains.ts";
import { fuzzyScore } from "../src/core/fuzzy.ts";
export type ChainSort = {
  column: "name" | "count" | "created";
  direction: 1 | -1;
};
export type ChainRow = ReasoningChain & {
  nodes: GraphNode[];
  name: string;
  createdAt: string;
  score: number;
};
export type ChainGroup = {
  id: string;
  sourceId: string | null;
  label: string;
  sourceKind: "session" | "file" | "unknown";
  rows: ChainRow[];
  nodeIds: string[];
  createdAt: string;
  score: number;
};
export function chainGroups(
  graph: GraphSnapshot,
  query: string,
  sort: ChainSort,
): ChainGroup[] {
  const nodes = graph.propositions ?? [],
    byId = new Map(nodes.map((n) => [n.id, n])),
    groups = new Map<string, ChainGroup>();
  const compareName = (a: string, b: string) =>
    a.localeCompare(b, "en", { sensitivity: "base", numeric: true }) ||
    a.localeCompare(b, "en");
  for (const chain of chainsForSelection(nodes, graph.chains ?? [])) {
    const members = [...chain.premises, chain.conclusion]
      .map((id) => byId.get(id))
      .filter((n): n is GraphNode => !!n);
    const scores = members
      .map((n) => fuzzyScore(query, n.name, n.statement, ...(n.aliases ?? [])))
      .filter((s): s is number => s !== null);
    if (query.trim() && !scores.length) continue;
    const conclusion = byId.get(chain.conclusion),
      sourceId = conclusion?.provenance[0]?.chatId ?? null,
      id = sourceId ?? "unattributed";
    let group = groups.get(id);
    if (!group) {
      const file = sourceId ? graph.fileSources?.[sourceId] : undefined;
      group = {
        id,
        sourceId,
        label: sourceId
          ? (graph.sessions?.[sourceId] ??
            (file
              ? decodeURIComponent(file.split("/").at(-1) ?? file)
              : "Unattributed material"))
          : "Unattributed material",
        sourceKind:
          sourceId && graph.sessions?.[sourceId]
            ? "session"
            : file
              ? "file"
              : "unknown",
        rows: [],
        nodeIds: [],
        createdAt: "",
        score: 0,
      };
      groups.set(id, group);
    }
    const row = {
      ...chain,
      nodes: members,
      name: conclusion?.name ?? chain.id,
      createdAt:
        members
          .map((n) => n.createdAt)
          .sort()
          .at(-1) ?? "",
      score: Math.max(0, ...scores),
    };
    group.rows.push(row);
    group.nodeIds = [
      ...new Set([...group.nodeIds, ...members.map((n) => n.id)]),
    ];
    if (row.createdAt > group.createdAt) group.createdAt = row.createdAt;
    group.score = Math.max(group.score, row.score);
  }
  const cmp = (
    a: {
      name: string;
      count: number;
      createdAt: string;
      score: number;
      id: string;
    },
    b: typeof a,
  ) =>
    (query.trim() ? b.score - a.score : 0) ||
    (sort.column === "count"
      ? (a.count - b.count) * sort.direction
      : sort.column === "created"
        ? a.createdAt.localeCompare(b.createdAt) * sort.direction
        : compareName(a.name, b.name) * sort.direction) ||
    compareName(a.name, b.name) ||
    a.id.localeCompare(b.id);
  const list = [...groups.values()];
  for (const group of list)
    group.rows.sort((a, b) =>
      cmp({ ...a, count: a.nodes.length }, { ...b, count: b.nodes.length }),
    );
  return list.sort((a, b) =>
    cmp(
      { ...a, name: a.label, count: a.nodeIds.length },
      { ...b, name: b.label, count: b.nodeIds.length },
    ),
  );
}
