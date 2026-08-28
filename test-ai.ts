// ─────────────────────────────────────────────────────────────────────────────
// PathCraft AI – Standalone Orchestration Layer Test
//
// Run with:
//   npx tsx --env-file=.env.local test-ai.ts
// ─────────────────────────────────────────────────────────────────────────────

import { generateRoadmap } from "./lib/ai/generate-roadmap";
import { rerouteRoadmap } from "./lib/ai/reroute-roadmap";
import { generateQuiz } from "./lib/ai/generate-quiz";

// ── Utility ──────────────────────────────────────────────────────────────────

function section(title: string) {
  console.log("\n" + "═".repeat(60));
  console.log(`  ${title}`);
  console.log("═".repeat(60));
}

function step(label: string) {
  console.log(`\n▶ ${label}`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // ── STEP 1: Generate Roadmap ──────────────────────────────────────────────
  section("STEP 1 · generateRoadmap");

  const roadmapInput = {
    goal: "Junior Frontend Developer",
    existingSkills: ["HTML", "Basic CSS"],
    weeklyHours: 10,
    timelineWeeks: 4,
  };

  step(`Calling generateRoadmap with input: ${JSON.stringify(roadmapInput)}`);
  const roadmap = await generateRoadmap(roadmapInput);

  console.log("\n📋 Roadmap Title      :", roadmap.title);
  console.log("🎯 Target Role        :", roadmap.targetRole);
  console.log("⏱  Total Hours        :", roadmap.totalEstimatedHours, "h");
  console.log("🗂  Nodes Count        :", roadmap.nodes.length);
  console.log("🔗 Edges Count        :", roadmap.edges.length);

  const firstNode = roadmap.nodes[0];
  console.log("\n── First Node (full JSON) ──────────────────────────────");
  console.log(JSON.stringify(firstNode, null, 2));

  // Safety check: ensure node-2 exists for the reroute step
  const node2 = roadmap.nodes.find((n) => n.id === "node-2");
  if (!node2) {
    console.warn(
      '\n⚠  "node-2" not found in the generated roadmap.',
      "The reroute step will use the second node in the list instead."
    );
  }
  const stuckNodeId = node2 ? "node-2" : roadmap.nodes[1]?.id ?? roadmap.nodes[0].id;

  // ── STEP 2: Reroute Roadmap ───────────────────────────────────────────────
  section("STEP 2 · rerouteRoadmap");

  step(
    `Simulating stuck learner on "${stuckNodeId}" with context: "Trouble understanding Promises"`
  );

  const rerouted = await rerouteRoadmap({
    currentGraph: roadmap,
    stuckNodeId,
    userProblemContext: "Trouble understanding Promises",
  });

  const injectedBridges = rerouted.nodes.filter((n) => n.type === "bridge");
  console.log(`\n🌉 Bridge node(s) injected: ${injectedBridges.length}`);

  injectedBridges.forEach((bridge, i) => {
    console.log(`\n  Bridge ${i + 1}:`);
    console.log(`    id              : ${bridge.id}`);
    console.log(`    title           : ${bridge.title}`);
    console.log(`    estimatedHours  : ${bridge.estimatedHours} h`);
    console.log(`    whyRecommended  : ${bridge.whyRecommended}`);
    console.log(`    searchKeywords  : ${bridge.searchKeywords.join(", ")}`);
    console.log(`    prerequisites   : ${bridge.prerequisites.join(", ") || "none"}`);
  });

  // Show the rewired edges around the stuck node
  const bridgeIds = new Set(injectedBridges.map((b) => b.id));
  const rewiredEdges = rerouted.edges.filter(
    (e) => bridgeIds.has(e.source) || bridgeIds.has(e.target)
  );

  console.log(`\n🔗 Rewired edges involving bridge node(s):`);
  rewiredEdges.forEach((edge) => {
    console.log(`    ${edge.source}  →  ${edge.target}  (${edge.id})`);
  });

  console.log(`\n⏱  Updated Total Hours: ${rerouted.totalEstimatedHours} h`);
  console.log(`🗂  Updated Nodes Count: ${rerouted.nodes.length}`);

  // ── STEP 3: Generate Quiz ─────────────────────────────────────────────────
  section("STEP 3 · generateQuiz");

  step(
    `Generating quiz for first node: "${firstNode.title}" (level: ${firstNode.level})`
  );

  const quiz = await generateQuiz(firstNode.id, firstNode.title, firstNode.level);

  console.log(`\n📝 Quiz for node: ${quiz.nodeId}`);
  quiz.questions.forEach((q, i) => {
    console.log(`\n  Q${i + 1}: ${q.question}`);
    q.options.forEach((opt, j) => {
      const marker = j === q.answerIndex ? "✅" : "  ";
      console.log(`    ${marker} ${j}. ${opt}`);
    });
    console.log(`  💡 ${q.explanation}`);
  });

  section("ALL TESTS PASSED ✓");
}

main().catch((err) => {
  console.error("\n❌ Test failed:", err);
  process.exit(1);
});
