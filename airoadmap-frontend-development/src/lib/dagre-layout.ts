import dagre from "dagre";
import type { Node } from "@xyflow/react";
import { NODE_DIMENSIONS, DAGRE_CONFIG } from "./constants";
import type { RoadmapEdge } from "@/types";

type RawNode = { id: string; type?: string; [key: string]: unknown };

export function getLayoutedElements(
  nodes: RawNode[],
  edges: RoadmapEdge[]
): Node[] {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph(DAGRE_CONFIG);

  nodes.forEach((node) => {
    const dims =
      node.type === "milestone" ? NODE_DIMENSIONS.milestone : NODE_DIMENSIONS.standard;
    dagreGraph.setNode(node.id, { width: dims.width, height: dims.height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const pos = dagreGraph.node(node.id);
    const dims =
      node.type === "milestone" ? NODE_DIMENSIONS.milestone : NODE_DIMENSIONS.standard;

    return {
      id: node.id,
      type: "custom",
      data: node,
      position: {
        x: pos.x - dims.width / 2,
        y: pos.y - dims.height / 2,
      },
    };
  });
}
