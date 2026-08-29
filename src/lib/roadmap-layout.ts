import type { Edge, Node } from '@xyflow/react';
import type { RoadmapData, RoadmapEdge, RoadmapNode, RoadmapSubTopic } from '@/types';

export interface SpineModule extends RoadmapNode {
  subTopics?: RoadmapSubTopic[];
}

export interface RoadmapLayoutInput {
  spineModules: SpineModule[];
  edges?: RoadmapEdge[];
}

export interface RoadmapLayoutResult {
  nodes: Node[];
  edges: Edge[];
}

const SPINE_X = 320;
const RIGHT_X = 600;
const SPINE_GAP = 180;
const SUBTOPIC_GAP = 72;
const SPINE_WIDTH = 220;
const SUBTOPIC_WIDTH = 200;

function subTopicRecommendation(topic: RoadmapSubTopic) {
  if (topic.isRecommended || topic.type === 'recommended') return 'recommended' as const;
  if (topic.isAlternative || topic.type === 'alternative') return 'alternative' as const;
  return topic.recommendation;
}

export function computeRoadmapGraph(data: RoadmapData): RoadmapLayoutResult {
  const spineModules = data.spine ?? data.nodes;
  const nodes: Node[] = [];
  // Keep the first module below the floating progress header.
  let spineY = 190;

  spineModules.forEach((module) => {
    nodes.push({
      id: module.id,
      type: module.type === 'bridge' ? 'bridgeNode' : 'spineNode',
      position: { x: SPINE_X, y: spineY },
      data: module as unknown as Record<string, unknown>,
      draggable: true,
    });

    const subTopics = module.subTopics ?? [];
    subTopics.forEach((topic, topicIndex) => {
      nodes.push({
        id: topic.id,
        type: 'subTopicNode',
        position: { x: RIGHT_X, y: spineY + topicIndex * SUBTOPIC_GAP },
        data: {
          ...topic,
          recommendation: subTopicRecommendation(topic),
          parentId: module.id,
        },
        draggable: true,
      });
    });

    spineY += Math.max(SPINE_GAP, subTopics.length * SUBTOPIC_GAP + 30);
  });

  const flowEdges: Edge[] = data.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'default',
    style: { stroke: '#0F172A', strokeWidth: 2 },
  }));

  spineModules.forEach((module) => {
    (module.subTopics ?? []).forEach((topic) => {
      flowEdges.push({
        id: `edge-${module.id}-${topic.id}`,
        source: module.id,
        target: topic.id,
        type: 'default',
        style: { stroke: '#64748B', strokeWidth: 1.5, strokeDasharray: '4 4' },
      });
    });
  });

  return { nodes, edges: flowEdges };
}

export function getRoadmapLayout({ spineModules, edges = [] }: RoadmapLayoutInput): RoadmapLayoutResult {
  return computeRoadmapGraph({
    roadmapId: '',
    title: '',
    totalEstimatedHours: 0,
    nodes: spineModules,
    edges,
  });
}

export function getLegacyRoadmapLayout(nodes: RoadmapNode[], edges: RoadmapEdge[]): RoadmapLayoutResult {
  return getRoadmapLayout({ spineModules: nodes, edges });
}

export { SPINE_X, RIGHT_X, SPINE_WIDTH, SUBTOPIC_WIDTH, SUBTOPIC_GAP };