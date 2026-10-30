import { incrementalLayout } from "../../../packages/engine/src/core/layout.ts";
self.onmessage = ({ data }) => {
  const positions = incrementalLayout(
    data.nodes,
    data.edges,
    new Map(Object.entries(data.positions ?? {})),
    {
      ticks: 160,
      clusters: data.clusters,
      logicalEdges: data.logicalEdges,
      impLinks: data.impLinks,
    },
  );
  postMessage(data.nodes.map((n: any) => ({ ...n, ...positions.get(n.id) })));
};
