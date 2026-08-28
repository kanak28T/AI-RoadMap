import dagre from 'dagre';
import { Node, Edge } from '@xyflow/react';
import { NODE_DIMENSIONS, DAGRE_CONFIG } from './constants';
import type { RoadmapNode, RoadmapEdge } from '@/types';

export function getLayoutedElements(
  nodes: RoadmapNode[],
  edges: RoadmapEdge[]
): Node[] {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph(DAGRE_CONFIG);

  // Add nodes to dagre graph with dimensions
  nodes.forEach((node) => {
    const dimensions = node.type === 'milestone' 
      ? NODE_DIMENSIONS.milestone 
      : NODE_DIMENSIONS.standard;
    
    dagreGraph.setNode(node.id, {
      width: dimensions.width,
      height: dimensions.height,
    });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Map to React Flow nodes with positions
  return nodes.map((node) => {
    const dagreNode = dagreGraph.node(node.id);
    const dimensions = node.type === 'milestone' 
      ? NODE_DIMENSIONS.milestone 
      : NODE_DIMENSIONS.standard;

    return {
      id: node.id,
      type: 'custom',
      data: node,
      position: {
        x: dagreNode.x - dimensions.width / 2,
        y: dagreNode.y - dimensions.height / 2,
      },
    };
  });
}
