// PathCraft AI – Re-Routing Engine (Kanak's layer)
import { generateText } from "ai";
import { groq, GROQ_MODEL } from "./groq-client";
import { z } from "zod";
import type { GeneratedRoadmap } from "./generate-roadmap";

export interface RoadmapEdge {
  id: string;
  source: string;
  target: string;
}

const BridgeNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  estimatedHours: z.number().positive(),
  whyRecommended: z.string(),
  searchKeywords: z.array(z.string()).min(1).max(5),
});

const ReroutePatchSchema = z.object({
  bridgeNodes: z.array(BridgeNodeSchema).min(1).max(2),
});

export interface RerouteRoadmapInput {
  currentGraph: GeneratedRoadmap;
  stuckNodeId: string;
  userProblemContext?: string;
}

function extractJson(text: string): string {
  const start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON found");
  let depth = 0, end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") { depth--; if (depth === 0) { end = i; break; } }
  }
  if (end === -1) throw new Error("Unbalanced JSON");
  return text.slice(start, end + 1);
}

function getParentIds(edges: RoadmapEdge[], nodeId: string): string[] {
  return edges.filter(e => e.target === nodeId).map(e => e.source);
}

function edgeId(source: string, target: string): string {
  return `edge-${source}-${target}`;
}

export async function rerouteRoadmap(
  input: RerouteRoadmapInput
): Promise<GeneratedRoadmap> {
  const { currentGraph, stuckNodeId, userProblemContext } = input;

  const stuckNode = currentGraph.nodes.find(n => n.id === stuckNodeId);
  if (!stuckNode) throw new Error(`Node "${stuckNodeId}" not found`);

  const parentIds = getParentIds(currentGraph.edges as RoadmapEdge[], stuckNodeId);
  const parentTitles = parentIds
    .map(id => currentGraph.nodes.find(n => n.id === id)?.title ?? id)
    .join(", ");

  const prompt = `You are an adaptive curriculum designer. Generate 1-2 remedial "bridge" topics.

STUCK ON: "${stuckNode.title}" (level: ${stuckNode.level})
PREREQUISITES COVERED: ${parentTitles || "none"}
${userProblemContext ? `LEARNER'S PROBLEM: "${userProblemContext}"` : ""}

Return ONLY valid JSON:
{
  "bridgeNodes": [
    {
      "id": "bridge-slug",
      "title": "string",
      "estimatedHours": 2,
      "whyRecommended": "string",
      "searchKeywords": ["kw1", "kw2", "kw3"]
    }
  ]
}

Rules:
- 1 or 2 bridge nodes only.
- estimatedHours between 1-4 per node.
- IDs must start with "bridge-".
- Return ONLY JSON, no markdown, no code fences.`;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { text } = await generateText({
        model: groq(GROQ_MODEL),
        prompt,
        maxOutputTokens: 800,
        temperature: attempt === 1 ? 0.3 : 0.1,
      });

      const jsonStr = extractJson(text);
      const parsed = JSON.parse(jsonStr);
      const { bridgeNodes } = ReroutePatchSchema.parse(parsed);

      const bridges = bridgeNodes.map((b, index) => ({
        id: b.id,
        title: b.title,
        type: "bridge" as const,
        level: stuckNode.level,
        estimatedHours: b.estimatedHours,
        whyRecommended: b.whyRecommended,
        searchKeywords: b.searchKeywords,
        prerequisites: index === 0 ? parentIds : [bridgeNodes[index - 1].id],
      }));

      const currentEdges = currentGraph.edges as RoadmapEdge[];
      const removedEdgeIds = new Set(
        currentEdges
          .filter(e => e.target === stuckNodeId && parentIds.includes(e.source))
          .map(e => e.id)
      );
      const retainedEdges = currentEdges.filter(e => !removedEdgeIds.has(e.id));

      const newEdges: RoadmapEdge[] = [];
      if (bridges.length === 1) {
        for (const pid of parentIds) {
          newEdges.push({ id: edgeId(pid, bridges[0].id), source: pid, target: bridges[0].id });
        }
        newEdges.push({ id: edgeId(bridges[0].id, stuckNodeId), source: bridges[0].id, target: stuckNodeId });
      } else {
        for (const pid of parentIds) {
          newEdges.push({ id: edgeId(pid, bridges[0].id), source: pid, target: bridges[0].id });
        }
        newEdges.push({ id: edgeId(bridges[0].id, bridges[1].id), source: bridges[0].id, target: bridges[1].id });
        newEdges.push({ id: edgeId(bridges[1].id, stuckNodeId), source: bridges[1].id, target: stuckNodeId });
      }

      const lastBridgeId = bridges[bridges.length - 1].id;
      const updatedNodes = currentGraph.nodes.map(node =>
        node.id !== stuckNodeId ? node : {
          ...node,
          prerequisites: [...node.prerequisites.filter(p => !parentIds.includes(p)), lastBridgeId],
        }
      );

      const stuckIndex = updatedNodes.findIndex(n => n.id === stuckNodeId);
      const nodesWithBridges = [
        ...updatedNodes.slice(0, stuckIndex),
        ...bridges,
        ...updatedNodes.slice(stuckIndex),
      ];

      return {
        ...currentGraph,
        nodes: nodesWithBridges,
        edges: [...retainedEdges, ...newEdges] as GeneratedRoadmap["edges"],
        totalEstimatedHours: nodesWithBridges.reduce((s, n) => s + n.estimatedHours, 0),
      };

    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[rerouteRoadmap] attempt ${attempt} failed:`, lastError.message);
      if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }

  throw lastError ?? new Error("Failed to reroute after 3 attempts");
}
