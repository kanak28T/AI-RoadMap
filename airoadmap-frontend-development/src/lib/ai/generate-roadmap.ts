// PathCraft AI – Roadmap Generation (Kanak's layer)
import { generateText } from "ai";
import { groq, GROQ_MODEL } from "./groq-client";
import { z } from "zod";

const RoadmapSubTopicSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  recommendation: z.enum(["recommended", "alternative"]).optional(),
});

const RoadmapNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["standard", "milestone", "bridge"]),
  level: z.enum(["Prerequisite", "Core", "Advanced"]),
  estimatedHours: z.number().positive(),
  whyRecommended: z.string(),
  searchKeywords: z.array(z.string()).min(1).max(5),
  prerequisites: z.array(z.string()),
  subTopics: z.array(RoadmapSubTopicSchema).max(4).optional(),
});

const RoadmapEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
});

const GeneratedRoadmapSchema = z.object({
  title: z.string(),
  targetRole: z.string(),
  totalEstimatedHours: z.number().positive(),
  nodes: z.array(RoadmapNodeSchema).min(3),
  edges: z.array(RoadmapEdgeSchema),
});

export type GeneratedRoadmap = z.infer<typeof GeneratedRoadmapSchema>;

export interface GenerateRoadmapInput {
  goal: string;
  existingSkills: string[];
  weeklyHours: number;
  timelineWeeks: number;
  roadmapType?: "personalized" | "course-focused";
}

function buildFallbackRoadmap(input: GenerateRoadmapInput): GeneratedRoadmap {
  const goalTitle = input.goal.trim() || "Learning Roadmap";
  const skills = input.existingSkills?.length ? input.existingSkills.join(", ") : "beginner";

  const nodes = [
    {
      id: "node-1",
      title: "Foundation Setup",
      type: "standard" as const,
      level: "Prerequisite" as const,
      estimatedHours: 4,
      whyRecommended: `Build a reliable starting point for ${goalTitle} while recognizing your current background in ${skills}.`,
      searchKeywords: ["learning roadmap", "foundations", "setup"],
      prerequisites: [],
      subTopics: [
        { id: "topic-1-1", title: "Environment and workflow", description: "Set up your editor, tools, and study rhythm.", recommendation: "recommended" as const },
      ],
    },
    {
      id: "node-2",
      title: "Core Concepts",
      type: "standard" as const,
      level: "Core" as const,
      estimatedHours: 8,
      whyRecommended: `Master the essential concepts required to progress confidently toward ${goalTitle}.`,
      searchKeywords: [goalTitle.toLowerCase(), "core concepts", "fundamentals"],
      prerequisites: ["node-1"],
      subTopics: [
        { id: "topic-2-1", title: "Key concepts", description: "Learn the main ideas and vocabulary behind the subject.", recommendation: "recommended" as const },
      ],
    },
    {
      id: "node-3",
      title: "Build a Practice Project",
      type: "milestone" as const,
      level: "Core" as const,
      estimatedHours: 10,
      whyRecommended: `Apply your knowledge on a hands-on project that demonstrates progress toward ${goalTitle}.`,
      searchKeywords: ["project", "practice", "portfolio"],
      prerequisites: ["node-2"],
      subTopics: [
        { id: "topic-3-1", title: "Project planning", description: "Translate concepts into a practical build plan.", recommendation: "recommended" as const },
      ],
    },
    {
      id: "node-4",
      title: "Advanced Practice",
      type: "standard" as const,
      level: "Advanced" as const,
      estimatedHours: 8,
      whyRecommended: `Go beyond the basics to strengthen the skills that separate a beginner from a capable practitioner.`,
      searchKeywords: ["advanced practice", "real-world skills", "optimization"],
      prerequisites: ["node-3"],
      subTopics: [
        { id: "topic-4-1", title: "Scaling and optimization", description: "Improve reliability, performance, and maintainability.", recommendation: "recommended" as const },
      ],
    },
    {
      id: "node-5",
      title: "Portfolio Milestone",
      type: "milestone" as const,
      level: "Advanced" as const,
      estimatedHours: 6,
      whyRecommended: `Finish with a polished output you can use for portfolio proof and future interviews.`,
      searchKeywords: ["portfolio", "showcase", "final milestone"],
      prerequisites: ["node-4"],
      subTopics: [
        { id: "topic-5-1", title: "Final polish", description: "Document your work and improve the quality of your final deliverable.", recommendation: "recommended" as const },
      ],
    },
  ];

  const edges = [
    { id: "edge-node-1-node-2", source: "node-1", target: "node-2" },
    { id: "edge-node-2-node-3", source: "node-2", target: "node-3" },
    { id: "edge-node-3-node-4", source: "node-3", target: "node-4" },
    { id: "edge-node-4-node-5", source: "node-4", target: "node-5" },
  ];

  return {
    title: `${goalTitle} Roadmap`,
    targetRole: goalTitle,
    totalEstimatedHours: nodes.reduce((sum, node) => sum + node.estimatedHours, 0),
    nodes,
    edges,
  };
}

/** Extract the first valid JSON object/array block from a string */
function extractJson(text: string): string {
  // Find the outermost { ... } block
  const start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON object found in response");

  let depth = 0;
  let end = -1;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end === -1) throw new Error("Unbalanced JSON in response");
  return text.slice(start, end + 1);
}

export async function generateRoadmap(
  input: GenerateRoadmapInput
): Promise<GeneratedRoadmap> {
  if (!process.env.GROQ_API_KEY?.trim()) {
    console.warn("[generateRoadmap] GROQ_API_KEY is missing; using built-in fallback roadmap.");
    return buildFallbackRoadmap(input);
  }

  const { goal, existingSkills, weeklyHours, timelineWeeks, roadmapType = "personalized" } = input;
  const totalAvailableHours = weeklyHours * timelineWeeks;
  const skillList = existingSkills.length > 0 ? existingSkills.join(", ") : "none";

  const pathStyle = roadmapType === "course-focused"
    ? "a course-focused curriculum: prioritize concrete courses, frameworks, and tool choices at each stage"
    : "a personalized curriculum: adapt prerequisites and pacing to the learner's existing skills";

  const prompt = `You are an expert curriculum designer. Generate ${pathStyle} as a single JSON object.

GOAL: ${goal}
EXISTING SKILLS (skip these): ${skillList}
AVAILABLE TIME: ${weeklyHours} hours/week × ${timelineWeeks} weeks = ${totalAvailableHours} total hours

Return ONLY valid JSON matching this exact structure:
{
  "title": "string",
  "targetRole": "string",
  "totalEstimatedHours": number,
  "nodes": [
    {
      "id": "node-1",
      "title": "string",
      "type": "standard" | "milestone" | "bridge",
      "level": "Prerequisite" | "Core" | "Advanced",
      "estimatedHours": number,
      "whyRecommended": "string",
      "searchKeywords": ["keyword1", "keyword2", "keyword3"],
      "prerequisites": [],
      "subTopics": [
        {
          "id": "topic-1-1",
          "title": "string",
          "description": "string",
          "recommendation": "recommended" | "alternative"
        }
      ]
    }
  ],
  "edges": [
    { "id": "edge-node-1-node-2", "source": "node-1", "target": "node-2" }
  ]
}

Rules:
- Generate 5-8 nodes total. Include at least 1 milestone node.
- Add 0-4 granular subTopics to each node when useful. Use alternatives for side-by-side framework/tool choices.
- DAG only — NO cycles in edges.
- Total estimatedHours across all nodes ≤ ${totalAvailableHours}.
- First node has empty prerequisites array.
- Edge IDs format: "edge-SOURCE-TARGET".
- Return ONLY the JSON object, no explanation, no markdown, no code fences.`;

  let lastError: Error | null = null;

  // Up to 3 attempts
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const { text } = await generateText({
        model: groq(GROQ_MODEL),
        prompt,
        maxOutputTokens: 3000,
        temperature: attempt === 1 ? 0.3 : 0.1, // lower temp on retry
      });

      const jsonStr = extractJson(text);
      const parsed = JSON.parse(jsonStr);
      const validated = GeneratedRoadmapSchema.parse(parsed);

      // Derive total from actual node hours
      const derivedTotal = validated.nodes.reduce(
        (sum, node) => sum + node.estimatedHours, 0
      );
      return { ...validated, totalEstimatedHours: derivedTotal };

    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[generateRoadmap] attempt ${attempt} failed:`, lastError.message);
      if (attempt < 3) await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }

  console.warn("[generateRoadmap] Falling back to a deterministic roadmap after AI validation failures.");
  return buildFallbackRoadmap(input);
}
