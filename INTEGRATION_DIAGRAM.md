# PathCraft AI - Visual Integration Diagram

## 🔄 Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                          FRONTEND LAYER                             │
│                        (Priyanshu's Domain)                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────┐                                             │
│  │ Intake Wizard    │ ──────────────────────┐                     │
│  │ (intake-wizard)  │                       │                     │
│  └──────────────────┘                       │                     │
│         │                                    │                     │
│         │ Form Data                          │                     │
│         ↓                                    │                     │
│  ┌──────────────────────────────────────────┴──────────────────┐ │
│  │           Zustand Store (use-roadmap-store.ts)              │ │
│  │                                                              │ │
│  │  State:                                                      │ │
│  │  • roadmapId, nodes, edges                                  │ │
│  │  • selectedNode, completionPercentage                       │ │
│  │                                                              │ │
│  │  Actions:                                                    │ │
│  │  • setRoadmap(), updateNodeStatus()                         │ │
│  │  • selectNode(), addBridgeNodes()                           │ │
│  └──────────────────────────────────────────────────────────────┘ │
│         │                          ↓                               │
│         │                    ┌─────────────────┐                  │
│         │                    │ Canvas + Dagre  │                  │
│         │                    │  Auto-Layout    │                  │
│         │                    └─────────────────┘                  │
│         │                          ↓                               │
│         │              ┌─────────────────────────┐                │
│         │              │  Custom Nodes (3 types) │                │
│         │              │  • Standard             │                │
│         │              │  • Milestone            │                │
│         │              │  • AI Bridge            │                │
│         │              └─────────────────────────┘                │
│         │                          ↓                               │
│         │              ┌─────────────────────────┐                │
│         └──────────────│   Node Drawer (Sheet)   │                │
│                        │  • XAI Explanation      │                │
│                        │  • Resources            │                │
│                        │  • Quiz                 │                │
│                        │  • Stuck Button         │                │
│                        └─────────────────────────┘                │
│                                                                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ HTTP Requests (lib/api.ts)
                             │
┌────────────────────────────┴────────────────────────────────────────┐
│                          API LAYER                                  │
│                        (Sanvi's Domain)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  POST /api/roadmap/generate                                        │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ 1. Receive: { goal, skills, hours, weeks }                  │  │
│  │ 2. Call Kanak's AI service → Raw DAG                        │  │
│  │ 3. Call Reshal's enrichment → Add verified resources        │  │
│  │ 4. Save to PostgreSQL (Roadmap + UserProgress)             │  │
│  │ 5. Return: { roadmapId, nodes, edges }                     │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  POST /api/progress/update                                         │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ 1. Receive: { roadmapId, nodeId, status }                  │  │
│  │ 2. Update UserProgress table                               │  │
│  │ 3. Recalculate completion percentage                        │  │
│  │ 4. Find unlocked child nodes                               │  │
│  │ 5. Return: { completionPercentage, unlockedNodes }         │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  POST /api/roadmap/reroute                                         │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ 1. Receive: { roadmapId, stuckNodeId }                     │  │
│  │ 2. Fetch current graph from DB                             │  │
│  │ 3. Call Kanak's re-routing agent → Bridge nodes            │  │
│  │ 4. Call Reshal's enrichment → Add resources                │  │
│  │ 5. Update Roadmap.nodes and Roadmap.edges                  │  │
│  │ 6. Return: { newNodes, updatedEdges }                      │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  GET /api/quiz/:nodeId                                             │
│  POST /api/quiz/submit                                             │
│                                                                     │
└─────────┬───────────────────────────────────┬────────────────────────┘
          │                                   │
          │ Service Calls                     │ Service Calls
          ↓                                   ↓
┌─────────────────────────────────┐ ┌───────────────────────────────┐
│   KANAK'S AI SERVICES           │ │   RESHAL'S SERVICES           │
│                                 │ │                               │
│  ┌──────────────────────────┐  │ │  ┌─────────────────────────┐ │
│  │ DAG Generator            │  │ │  │ Resource Discovery      │ │
│  │ (generate-roadmap.ts)    │  │ │  │ (resource-discovery.ts) │ │
│  │                          │  │ │  │                         │ │
│  │ • LLM prompt engineering │  │ │  │ • YouTube API           │ │
│  │ • Zod schema validation  │  │ │  │ • GitHub API            │ │
│  │ • Prerequisite ordering  │  │ │  │ • MDN/Docs scraping     │ │
│  │ • XAI explanations       │  │ │  │ • Article sources       │ │
│  └──────────────────────────┘  │ │  └─────────────────────────┘ │
│                                 │ │              ↓                │
│  ┌──────────────────────────┐  │ │  ┌─────────────────────────┐ │
│  │ Re-Routing Engine        │  │ │  │ URL Validator           │ │
│  │ (reroute-roadmap.ts)     │  │ │  │ (link-validator.ts)     │ │
│  │                          │  │ │  │                         │ │
│  │ • Gap analysis           │  │ │  │ • HTTP HEAD/GET checks  │ │
│  │ • Bridge node generation │  │ │  │ • Filter 404s/paywalls  │ │
│  │ • Edge rewiring          │  │ │  │ • Return verified URLs  │ │
│  └──────────────────────────┘  │ │  └─────────────────────────┘ │
│                                 │ │              ↓                │
│  ┌──────────────────────────┐  │ │  ┌─────────────────────────┐ │
│  │ Quiz Generator           │  │ │  │ Upstash Redis Cache     │ │
│  │ (generate-quiz.ts)       │  │ │  │                         │ │
│  │                          │  │ │  │ • Cache by keywords     │ │
│  │ • 3 MCQs per node        │  │ │  │ • 7-day TTL             │ │
│  │ • Conceptual questions   │  │ │  │ • Prevent duplicate API │ │
│  │ • Explanations           │  │ │  │   calls                 │ │
│  └──────────────────────────┘  │ │  └─────────────────────────┘ │
│                                 │ │                               │
│  Uses: OpenAI GPT-4o            │ │  Uses: Axios, Cheerio         │
└─────────────────────────────────┘ └───────────────────────────────┘
                           │
                           │ Database Operations
                           ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      PERSISTENCE LAYER                              │
│                        (Sanvi's Domain)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│                     PostgreSQL + Prisma ORM                         │
│                                                                     │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────────┐  │
│  │  User Table     │  │ Roadmap Table   │  │ UserProgress     │  │
│  │                 │  │                 │  │                  │  │
│  │ • id            │  │ • id            │  │ • roadmapId      │  │
│  │ • email         │  │ • userId        │  │ • nodeId         │  │
│  │ • name          │  │ • title         │  │ • status         │  │
│  │ • createdAt     │  │ • goal          │  │ • quizScore      │  │
│  └─────────────────┘  │ • nodes (JSON)  │  │ • completedAt    │  │
│                       │ • edges (JSON)  │  └──────────────────┘  │
│                       │ • totalHours    │                         │
│                       └─────────────────┘                         │
│                                                                     │
│                       ┌─────────────────────────┐                 │
│                       │ DiagnosticQuiz Table    │                 │
│                       │                         │                 │
│                       │ • roadmapId             │                 │
│                       │ • nodeId                │                 │
│                       │ • questions (JSON)      │                 │
│                       └─────────────────────────┘                 │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Key Integration Points

### 1. **Intake → Generation Flow**

```
User fills form (Frontend)
    ↓
Submit to Zustand store
    ↓
POST /api/roadmap/generate (API Layer)
    ↓
Kanak generates DAG structure
    ↓
Reshal enriches with verified resources
    ↓
Sanvi saves to PostgreSQL
    ↓
Return complete roadmap (JSON)
    ↓
Zustand stores in state
    ↓
Canvas renders with Dagre layout
```

---

### 2. **Node Interaction Flow**

```
User clicks node (Frontend)
    ↓
Zustand.selectNode(nodeId)
    ↓
Drawer opens with node details
    ↓
GET /api/quiz/:nodeId (lazy load)
    ↓
Kanak generates/fetches quiz
    ↓
Display quiz in drawer
    ↓
User submits answers
    ↓
POST /api/quiz/submit
    ↓
Sanvi grades quiz
    ↓
If 100%: Auto-mark COMPLETED
    ↓
POST /api/progress/update
    ↓
Frontend shows confetti 🎉
    ↓
Zustand updates node status
    ↓
Canvas re-renders with new colors
```

---

### 3. **Re-Routing Flow (I'm Stuck)**

```
User clicks "I'm Stuck" button
    ↓
POST /api/roadmap/reroute { stuckNodeId }
    ↓
Sanvi fetches current graph
    ↓
Kanak analyzes prerequisites
    ↓
Kanak generates bridge nodes
    ↓
Reshal adds verified resources
    ↓
Sanvi updates database
    ↓
Return { newNodes, updatedEdges }
    ↓
Zustand.addBridgeNodes()
    ↓
Canvas updates with purple bridge nodes
    ↓
Dagre recalculates layout
    ↓
Smooth animation of graph restructure
```

---

## 🎨 Frontend Component Hierarchy

```
app/
  layout.tsx (Root - provides Zustand context)
    ↓
  page.tsx (Landing/Dashboard)
    ├─→ IntakeWizard (Modal)
    │     ├─→ StepGoal
    │     ├─→ StepSkills
    │     ├─→ StepCommitment
    │     └─→ StepTimeline
    │
    └─→ roadmap/[id]/page.tsx (Roadmap Viewer)
          ├─→ RoadmapCanvas
          │     ├─→ ProgressBar (Top bar)
          │     ├─→ CanvasControls (Zoom, pan)
          │     ├─→ ReactFlow
          │     │     ├─→ CustomNode (Standard variant)
          │     │     ├─→ CustomNode (Milestone variant)
          │     │     ├─→ CustomNode (Bridge variant)
          │     │     └─→ CustomEdge (Bezier)
          │     └─→ MiniMap (Bottom corner)
          │
          └─→ NodeDrawer (Slide-over sheet)
                ├─→ DrawerHeader (Title, badges)
                ├─→ DrawerXAI (Why recommended)
                ├─→ DrawerResources (Verified links)
                ├─→ DrawerQuiz (MCQ questions)
                └─→ StuckButton (Re-route trigger)
```

---

## 🔧 Backend Service Dependencies

```
API Route Handler (Sanvi)
    ↓
┌───────────────────────────────────┐
│ Calls Multiple Services:          │
│                                   │
│ 1. Kanak's AI Service             │
│    • generateDAG()                │
│    • rerouteRoadmap()             │
│    • generateQuiz()               │
│                                   │
│ 2. Reshal's Resource Service      │
│    • discoverResources()          │
│    • verifyURLs()                 │
│    • enrichWithResources()        │
│                                   │
│ 3. Database Operations            │
│    • Prisma Client                │
│    • CRUD operations              │
│    • Aggregate queries            │
└───────────────────────────────────┘
```

---

## 📊 Data Transformation Pipeline

```
User Input (Frontend)
    ↓
{
  goal: "Fullstack Next.js",
  existingSkills: ["JavaScript"],
  weeklyHours: 10,
  targetWeeks: 8
}
    ↓
Kanak's AI (Raw DAG)
    ↓
{
  nodes: [
    { id, title, type, prerequisites, searchKeywords, ... }
  ],
  edges: [...]
}
    ↓
Reshal's Enrichment (Add Resources)
    ↓
{
  nodes: [
    {
      ...node,
      resources: [
        { title, url, source, type, isVerified: true }
      ]
    }
  ]
}
    ↓
Sanvi's Database (Persisted)
    ↓
PostgreSQL Tables:
  Roadmap { nodes: JSONB, edges: JSONB }
  UserProgress { nodeId, status, ... }
    ↓
API Response (Frontend)
    ↓
{
  roadmapId: "rm_abc123",
  title: "Fullstack Next.js Engineer",
  nodes: [...with resources...],
  edges: [...]
}
    ↓
Zustand Store (Frontend State)
    ↓
Canvas Visualization (React Flow + Dagre)
```

---

## 🎯 Critical Integration Checkpoints

### ✅ Checkpoint 1: Types Alignment
**Action**: Ensure TypeScript interfaces match across frontend/backend

```typescript
// Shared types (must be identical)
interface RoadmapNode { ... }
interface Resource { ... }
interface RoadmapEdge { ... }
```

---

### ✅ Checkpoint 2: API Contract Testing
**Action**: Use Postman to test each endpoint independently

```
POST /api/roadmap/generate
  → Returns valid nodes & edges
  → All nodes have resources array
  → Edges reference valid node IDs
```

---

### ✅ Checkpoint 3: Error Handling
**Action**: Frontend gracefully handles backend errors

```typescript
try {
  const response = await generateRoadmap(data);
  useRoadmapStore.getState().setRoadmap(response);
} catch (error) {
  toast.error('Failed to generate roadmap');
  // Rollback to previous state
}
```

---

### ✅ Checkpoint 4: Optimistic Updates
**Action**: UI updates immediately, syncs with backend

```typescript
// Update UI first
updateNodeStatus(nodeId, 'COMPLETED');

// Then sync with backend
await fetch('/api/progress/update', { ... });

// Rollback on error if needed
```

---

## 🚀 Deployment Architecture

```
┌────────────────────────────────────────────────────────┐
│                    Vercel (Frontend)                   │
│  • Static pages                                        │
│  • Server components                                   │
│  • Client-side React                                   │
└────────────────┬───────────────────────────────────────┘
                 │
                 │ HTTPS API Calls
                 ↓
┌────────────────────────────────────────────────────────┐
│              Vercel (Backend API Routes)               │
│  • Serverless functions                               │
│  • Auto-scaling                                        │
└────────┬─────────────────────┬──────────────────┬──────┘
         │                     │                  │
         ↓                     ↓                  ↓
┌──────────────┐    ┌────────────────┐    ┌─────────────┐
│ Neon         │    │ Upstash Redis  │    │ OpenAI API  │
│ PostgreSQL   │    │ (Resource      │    │ (Kanak's    │
│ (Sanvi's DB) │    │  Cache)        │    │  LLM)       │
└──────────────┘    └────────────────┘    └─────────────┘
```

---

## 📞 Communication Protocol

### Frontend ↔ Backend Sync
- **Shared Repository**: Types in `/types/index.ts`
- **API Documentation**: OpenAPI/Swagger spec
- **Testing**: Shared Postman collection

### Daily Standups
- **Blocker Resolution**: Immediate Slack/Discord sync
- **Schema Changes**: Notify all team members
- **Deployment**: Coordinate frontend/backend releases

---

**Last Updated**: 2026-08-28  
**Maintained By**: PathCraft AI Team
