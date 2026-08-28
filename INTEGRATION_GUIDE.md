# PathCraft AI - Frontend & Backend Integration Guide

## 📋 Project Overview
PathCraft AI is an adaptive, self-healing learning roadmap platform that generates personalized DAG-based learning paths with verified resources.

---

## 🎨 FRONTEND ARCHITECTURE (Priyanshu's Domain)

### **Design System Specifications**

#### Color Palette (Light Theme)
```typescript
// Base Colors
const colors = {
  // Page Canvas
  pageBackground: '#F8FAFC',      // Slate-50 with subtle dot grid
  dotGrid: '#CBD5E1',              // Grid pattern color
  
  // Card Surfaces
  cardBackground: '#FFFFFF',
  cardBorder: '#E2E8F0',           // Slate-200
  
  // Typography
  primaryText: '#0F172A',          // Slate-900
  secondaryText: '#64748B',        // Slate-500
  
  // Brand Accent
  primary: '#4F46E5',              // Indigo-600
  primaryHover: '#4338CA',         // Indigo-700
  
  // Status Colors
  completed: {
    bg: '#ECFDF5',
    border: '#A7F3D0',
    text: '#065F46',
    badge: '#10B981'
  },
  inProgress: {
    bg: '#FFFBEB',
    border: '#FDE68A',
    text: '#92400E',
    badge: '#F59E0B'
  },
  pending: {
    bg: '#F8FAFC',
    border: '#E2E8F0',
    text: '#475569',
    badge: '#94A3B8'
  },
  stuck: {
    bg: '#FFF1F2',
    border: '#FECDD3',
    text: '#9F1239',
    badge: '#F43F5E'
  },
  aiBridge: {
    bg: '#F5F3FF',
    border: '#DDD6FE',
    text: '#5B21B6',
    badge: '#8B5CF6'
  }
};
```

#### Typography
- **Font Family**: Inter or Geist Sans
- **Headers**: 600 weight, #0F172A
- **Body**: 400 weight, #64748B

---

### **Tech Stack**

```json
{
  "framework": "Next.js 15 (App Router)",
  "runtime": "React 19",
  "language": "TypeScript",
  "visualization": "@xyflow/react v12+",
  "layout": "dagre",
  "styling": "Tailwind CSS",
  "components": "shadcn/ui",
  "icons": "Lucide React",
  "animation": "Framer Motion",
  "effects": "canvas-confetti",
  "state": "Zustand"
}
```

---

### **Frontend Component Structure**

```
src/
├── app/
│   ├── layout.tsx                  # Root layout
│   ├── page.tsx                    # Landing/Dashboard
│   └── roadmap/
│       └── [id]/
│           └── page.tsx            # Dynamic roadmap viewer
│
├── components/
│   ├── intake/
│   │   └── intake-wizard.tsx       # 🔥 Multi-step intake form
│   │
│   ├── canvas/
│   │   ├── roadmap-canvas.tsx      # 🔥 Main React Flow canvas
│   │   ├── custom-node.tsx         # 🔥 Custom node renderer
│   │   └── custom-edge.tsx         # Bezier edge styling
│   │
│   ├── drawer/
│   │   └── node-drawer.tsx         # 🔥 Resource slide-over sheet
│   │
│   └── ui/                         # shadcn/ui components
│       ├── sheet.tsx
│       ├── dialog.tsx
│       ├── badge.tsx
│       ├── progress.tsx
│       └── ...
│
├── lib/
│   ├── dagre-layout.ts             # 🔥 Auto-layout calculator
│   ├── api.ts                      # 🔥 API integration layer
│   └── utils.ts                    # Utility functions
│
├── store/
│   └── use-roadmap-store.ts        # 🔥 Zustand state management
│
└── types/
    └── index.ts                    # TypeScript interfaces
```

---

## 🔌 BACKEND INTEGRATION POINTS

### **Core API Endpoints (Backend Team)**

#### 1. **Generate Roadmap** (Kanak + Reshal)
```typescript
// POST /api/roadmap/generate
interface GenerateRoadmapRequest {
  goal: string;                      // "Fullstack Next.js & AI Agent Engineer"
  existingSkills: string[];          // ["JavaScript", "React", "Node.js"]
  weeklyHours: number;               // 10
  targetWeeks: number;               // 8
}

interface GenerateRoadmapResponse {
  roadmapId: string;
  title: string;
  totalEstimatedHours: number;
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
}

interface RoadmapNode {
  id: string;                        // "node_1"
  title: string;                     // "React Fundamentals"
  type: "standard" | "milestone";
  level: "Prerequisite" | "Core" | "Advanced";
  estimatedHours: number;
  whyRecommended: string;            // XAI explanation
  resources: Resource[];             // Verified by Reshal
  prerequisites: string[];           // ["node_0"]
}

interface Resource {
  title: string;
  url: string;
  source: "Official Docs" | "YouTube" | "GitHub" | "Article";
  type: "Video" | "Article" | "Repo";
  isVerified: boolean;
  duration?: string;
}

interface RoadmapEdge {
  source: string;
  target: string;
}
```

**Frontend Integration:**
- Called from `intake-wizard.tsx` on submit
- Response stored in Zustand store
- Nodes/edges passed to `roadmap-canvas.tsx`

---

#### 2. **Update Progress** (Sanvi)
```typescript
// POST /api/progress/update
interface UpdateProgressRequest {
  roadmapId: string;
  nodeId: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "STUCK";
}

interface UpdateProgressResponse {
  success: boolean;
  completionPercentage: number;      // Recalculated
  milestonesReached: number;
  unlockedNodes: string[];           // Child nodes now accessible
}
```

**Frontend Integration:**
- Called from `custom-node.tsx` when user marks completion
- Called from `node-drawer.tsx` quiz submission
- Optimistic UI updates in Zustand store

---

#### 3. **Re-Route Roadmap** (Kanak's Re-routing Engine)
```typescript
// POST /api/roadmap/reroute
interface RerouteRequest {
  roadmapId: string;
  stuckNodeId: string;
  userProblemContext?: string;       // Optional user feedback
}

interface RerouteResponse {
  success: boolean;
  newNodes: RoadmapNode[];           // Bridge/remedial nodes
  updatedEdges: RoadmapEdge[];       // Re-wired connections
  message: string;                   // "Added 2 prerequisite topics"
}
```

**Frontend Integration:**
- Triggered from `node-drawer.tsx` "I'm Stuck" button
- Canvas updates with new bridge nodes (purple dashed style)
- Smooth animation of graph restructure

---

#### 4. **Get Diagnostic Quiz** (Kanak)
```typescript
// GET /api/quiz/:nodeId
interface DiagnosticQuiz {
  nodeId: string;
  questions: QuizQuestion[];
}

interface QuizQuestion {
  question: string;
  options: string[];                 // 4 options
  answerIndex: number;               // 0-3
  explanation: string;
}
```

---

#### 5. **Submit Quiz** (Sanvi)
```typescript
// POST /api/quiz/submit
interface QuizSubmissionRequest {
  roadmapId: string;
  nodeId: string;
  answers: number[];                 // User's selected indices
}

interface QuizSubmissionResponse {
  score: number;                     // 0-100
  passed: boolean;                   // true if 100%
  explanations: string[];
  autoCompleted: boolean;            // Node marked completed
}
```

**Frontend Integration:**
- Called from `node-drawer.tsx` quiz section
- If `passed === true`, trigger confetti animation
- Auto-update node status to "COMPLETED"

---

## 🎯 KEY FRONTEND COMPONENTS

### **1. Intake Wizard** (`/components/intake/intake-wizard.tsx`)

**Purpose**: Capture user requirements

**Features**:
- Step 1: Goal input with auto-suggest tags
- Step 2: Existing skills (multi-select tags)
- Step 3: Time commitment slider (5-40 hrs/week)
- Step 4: Target timeline (2-12 weeks)
- Loading animation during generation

**Backend Call**:
```typescript
const response = await fetch('/api/roadmap/generate', {
  method: 'POST',
  body: JSON.stringify(intakeData)
});
```

---

### **2. Roadmap Canvas** (`/components/canvas/roadmap-canvas.tsx`)

**Purpose**: Interactive DAG visualization

**Features**:
- Dagre auto-layout (TB direction)
- MiniMap, Zoom controls, Fit View
- Top progress bar (6/21 • 28%)
- Filter pills (All, In-Progress, Milestones)
- Search bar to locate nodes

**Layout Calculation**:
```typescript
import dagre from 'dagre';

export function getLayoutedElements(nodes, edges) {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ 
    rankdir: 'TB', 
    ranksep: 75, 
    nodesep: 50 
  });

  nodes.forEach(node => {
    dagreGraph.setNode(node.id, { 
      width: node.type === 'milestone' ? 280 : 240,
      height: node.type === 'milestone' ? 100 : 84
    });
  });

  edges.forEach(edge => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map(node => ({
    ...node,
    position: {
      x: dagreGraph.node(node.id).x,
      y: dagreGraph.node(node.id).y
    }
  }));
}
```

---

### **3. Custom Node** (`/components/canvas/custom-node.tsx`)

**Visual Variants**:

1. **Milestone Node**:
   - Gold gradient header
   - Trophy icon badge
   - Prominent title
   - Completion checkbox

2. **Standard Node**:
   - Clean rounded card
   - Level pill (Core/Prerequisite/Advanced)
   - Estimated hours badge
   - Status ring (colored border)

3. **AI Bridge Node**:
   - Dashed purple border (#DDD6FE)
   - "AI Bridge" badge
   - Pulse animation

**Hover Actions**:
- Open Details (opens drawer)
- Mark Done (calls `/api/progress/update`)
- I'm Stuck (triggers re-routing)

---

### **4. Node Drawer** (`/components/drawer/node-drawer.tsx`)

**Purpose**: Detailed node information

**Sections**:

1. **Why This Is In Your Path**:
   - XAI explanation in indigo tint container
   - Shows prerequisite relationships

2. **Verified Learning Resources**:
   - Source icons (YouTube, Docs, GitHub)
   - Duration badges
   - "Verified 2026" checkmarks
   - Direct links

3. **Diagnostic Micro-Quiz**:
   - 3 multiple-choice questions
   - Instant validation
   - Explanations on submit
   - Confetti on 100% score

4. **I'm Stuck Button**:
   - Triggers `/api/roadmap/reroute`
   - Splices bridge nodes into canvas

---

### **5. State Management** (`/store/use-roadmap-store.ts`)

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RoadmapStore {
  // State
  roadmapId: string | null;
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
  completionPercentage: number;
  selectedNode: string | null;
  
  // Actions
  setRoadmap: (data: GenerateRoadmapResponse) => void;
  updateNodeStatus: (nodeId: string, status: NodeStatus) => void;
  addBridgeNodes: (nodes: RoadmapNode[], edges: RoadmapEdge[]) => void;
  selectNode: (nodeId: string) => void;
}

export const useRoadmapStore = create<RoadmapStore>()(
  persist(
    (set) => ({
      roadmapId: null,
      nodes: [],
      edges: [],
      completionPercentage: 0,
      selectedNode: null,
      
      setRoadmap: (data) => set({
        roadmapId: data.roadmapId,
        nodes: data.nodes,
        edges: data.edges
      }),
      
      updateNodeStatus: (nodeId, status) => set((state) => ({
        nodes: state.nodes.map(node =>
          node.id === nodeId ? { ...node, status } : node
        )
      })),
      
      addBridgeNodes: (newNodes, newEdges) => set((state) => ({
        nodes: [...state.nodes, ...newNodes],
        edges: [...state.edges, ...newEdges]
      }))
    }),
    { name: 'roadmap-storage' }
  )
);
```

---

## 🔄 INTEGRATION WORKFLOW

### **Complete User Journey with API Calls**

```
1. User Opens App
   └─> Loads saved roadmap from localStorage (Zustand persist)

2. User Clicks "Create New Roadmap"
   └─> Opens intake-wizard.tsx modal

3. User Submits Intake Form
   └─> POST /api/roadmap/generate (Kanak + Reshal)
       └─> Kanak: Generates DAG structure
       └─> Reshal: Enriches with verified resources
       └─> Sanvi: Saves to PostgreSQL
   └─> Response stored in Zustand
   └─> Canvas renders with Dagre layout

4. User Clicks Node
   └─> Opens node-drawer.tsx
   └─> GET /api/quiz/:nodeId (lazy load quiz)

5. User Takes Quiz
   └─> POST /api/quiz/submit (Sanvi)
   └─> If passed: Confetti + Auto-mark completed
   └─> POST /api/progress/update (status: COMPLETED)

6. User Clicks "I'm Stuck"
   └─> POST /api/roadmap/reroute (Kanak)
   └─> Canvas updates with new bridge nodes
   └─> Smooth animation of graph restructure

7. Progress Tracked
   └─> Every status change calls /api/progress/update
   └─> Top bar updates completion percentage
```

---

## 📦 FRONTEND DEPENDENCIES

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@xyflow/react": "^12.0.0",
    "dagre": "^0.8.5",
    "zustand": "^4.5.0",
    "framer-motion": "^11.0.0",
    "canvas-confetti": "^1.9.0",
    "lucide-react": "^0.400.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-progress": "^1.0.3",
    "@radix-ui/react-tabs": "^1.0.4",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "@types/react": "^19.0.0",
    "@types/dagre": "^0.7.52"
  }
}
```

---

## 🎨 STYLING GUIDELINES

### **Tailwind Config Extensions**

```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EEF2FF',
          600: '#4F46E5',
          700: '#4338CA'
        }
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)',
        'card-hover': '0 4px 6px rgba(0,0,0,0.05), 0 10px 20px rgba(0,0,0,0.04)'
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      }
    }
  }
};
```

### **Component Styling Examples**

```tsx
// Milestone Node
<div className="w-[280px] h-[100px] bg-white border-2 border-amber-400 rounded-xl shadow-card">
  <div className="h-8 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-t-xl" />
  {/* Content */}
</div>

// Standard Node (Completed)
<div className="w-[240px] h-[84px] bg-white border border-emerald-400 rounded-xl shadow-card">
  {/* Content */}
</div>

// AI Bridge Node
<div className="w-[240px] h-[84px] bg-violet-50 border-2 border-dashed border-violet-400 rounded-xl">
  <div className="animate-pulse-slow">
    {/* Content */}
  </div>
</div>
```

---

## 🧪 TESTING INTEGRATION

### **Mock Data for Development**

```typescript
// lib/mock-data.ts
export const mockRoadmapResponse: GenerateRoadmapResponse = {
  roadmapId: "rm_123",
  title: "Fullstack Next.js & AI Agent Engineer",
  totalEstimatedHours: 120,
  nodes: [
    {
      id: "node_1",
      title: "JavaScript Fundamentals",
      type: "standard",
      level: "Prerequisite",
      estimatedHours: 8,
      whyRecommended: "Essential foundation for React and Next.js",
      resources: [
        {
          title: "MDN JavaScript Guide",
          url: "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
          source: "Official Docs",
          type: "Article",
          isVerified: true
        }
      ],
      prerequisites: []
    },
    {
      id: "node_2",
      title: "React Fundamentals",
      type: "milestone",
      level: "Core",
      estimatedHours: 15,
      whyRecommended: "Core library for building UI components in Next.js",
      resources: [],
      prerequisites: ["node_1"]
    }
  ],
  edges: [
    { source: "node_1", target: "node_2" }
  ]
};
```

---

## 🚀 DEPLOYMENT CHECKLIST

### **Frontend Pre-Deployment**
- [ ] Environment variables configured (.env.local)
- [ ] API endpoints point to production backend
- [ ] Zustand persist configured with correct storage keys
- [ ] Error boundaries implemented
- [ ] Loading states for all async operations
- [ ] Responsive design tested (mobile/tablet/desktop)
- [ ] Accessibility: ARIA labels, keyboard navigation
- [ ] Analytics tracking integrated (if required)

### **Backend Requirements**
- [ ] All API endpoints return consistent error format
- [ ] CORS configured for frontend domain
- [ ] Rate limiting implemented
- [ ] Authentication/authorization if required
- [ ] Database migrations run
- [ ] Redis cache configured (Reshal's layer)

---

## 📞 COMMUNICATION PROTOCOL

### **Frontend ↔ Backend Sync Points**

1. **Daily Standup Topics**:
   - API schema changes
   - New endpoint requirements
   - Performance bottlenecks
   - Error handling edge cases

2. **Integration Milestones**:
   - Week 1: Intake + Generate API integrated
   - Week 2: Canvas rendering + Progress tracking
   - Week 3: Quiz system + Re-routing engine
   - Week 4: Polish, testing, deployment

3. **Shared Artifacts**:
   - TypeScript types (`types/index.ts`) - shared via Git
   - API documentation (Swagger/OpenAPI)
   - Postman collection for testing

---

## 🐛 COMMON INTEGRATION ISSUES

### **Issue 1: CORS Errors**
```typescript
// Backend: Allow frontend origin
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

### **Issue 2: Type Mismatches**
- Solution: Share TypeScript types via npm package or Git submodule

### **Issue 3: Async State Updates**
```typescript
// Use optimistic updates + error rollback
const updateNode = async (nodeId, status) => {
  // Optimistic update
  useRoadmapStore.getState().updateNodeStatus(nodeId, status);
  
  try {
    await fetch('/api/progress/update', { ... });
  } catch (error) {
    // Rollback on error
    useRoadmapStore.getState().updateNodeStatus(nodeId, previousStatus);
  }
};
```

---

## 📚 ADDITIONAL RESOURCES

- **React Flow Docs**: https://reactflow.dev
- **Dagre Layout**: https://github.com/dagrejs/dagre/wiki
- **shadcn/ui**: https://ui.shadcn.com
- **Zustand**: https://docs.pmnd.rs/zustand

---

**Document Version**: 1.0  
**Last Updated**: 2026-08-28  
**Maintained By**: Priyanshu (Frontend Lead)
