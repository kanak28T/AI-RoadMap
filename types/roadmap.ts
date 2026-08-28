// ─────────────────────────────────────────────────────────────────────────────
// PathCraft AI – Core domain types for the AI Orchestration Layer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A single learning node inside a generated roadmap DAG.
 *
 * - "standard"  – ordinary skill/topic node
 * - "milestone" – checkpoint that gates downstream progress
 * - "bridge"    – remedial node injected by the reroute engine to unblock a
 *                 learner who is stuck
 */
export interface RoadmapNode {
  /** Unique identifier used as the node key in the DAG. */
  id: string;

  /** Human-readable title shown in the UI (e.g. "Async/Await in JavaScript"). */
  title: string;

  /** Structural role of this node in the learning graph. */
  type: "standard" | "milestone" | "bridge";

  /** Difficulty / curriculum tier. */
  level: "Prerequisite" | "Core" | "Advanced";

  /** Realistic time-to-complete estimate in hours. */
  estimatedHours: number;

  /**
   * Explainable-AI rationale: one or two sentences connecting the learner's
   * current background to why this node matters for their target role.
   */
  whyRecommended: string;

  /**
   * Three targeted search keywords the resource-scraper layer can use to
   * surface high-quality learning materials for this node.
   */
  searchKeywords: string[];

  /**
   * IDs of nodes that must be completed before this node is unlocked.
   * Empty array means the node has no prerequisites (root node).
   */
  prerequisites: string[];
}

/**
 * A directed edge in the roadmap DAG.
 * The edge means: complete `source` before starting `target`.
 */
export interface RoadmapEdge {
  /** Unique identifier for this edge (e.g. `"edge-node1-node2"`). */
  id: string;

  /** ID of the prerequisite node. */
  source: string;

  /** ID of the dependent node. */
  target: string;
}

/**
 * The full artefact produced by the roadmap-generation pipeline.
 * Nodes + edges form a topologically valid DAG.
 */
export interface GeneratedRoadmap {
  /** Display title for the roadmap (e.g. "From Python Dev to ML Engineer"). */
  title: string;

  /** The role the learner is working towards. */
  targetRole: string;

  /** Sum of `estimatedHours` across all nodes; used for progress dashboards. */
  totalEstimatedHours: number;

  /** Ordered (topological) list of learning nodes. */
  nodes: RoadmapNode[];

  /** Directed edges that define prerequisite relationships between nodes. */
  edges: RoadmapEdge[];
}

/**
 * A lightweight diagnostic quiz tied to a single roadmap node.
 * Three MCQs help the learner (and the system) gauge readiness.
 */
export interface DiagnosticQuiz {
  /** The roadmap node this quiz assesses. */
  nodeId: string;

  questions: Array<{
    /** The question stem shown to the learner. */
    question: string;

    /** Four answer choices (index 0–3). */
    options: string[];

    /** Zero-based index of the correct answer inside `options`. */
    answerIndex: number;

    /**
     * Short explanation shown after the learner answers, clarifying why the
     * correct answer is right (and common misconceptions are wrong).
     */
    explanation: string;
  }>;
}
