# PathCraft AI - Frontend Branch Structure

## 🌳 Git Branch Strategy

### **Main Branches**
```
main (production)
├── develop (integration branch)
    ├── frontend/setup
    ├── frontend/intake-wizard
    ├── frontend/canvas-core
    ├── frontend/node-components
    ├── frontend/drawer-resources
    └── frontend/state-management
```

---

## 📂 Frontend File Structure to Implement

```
pathcraft-ai-frontend/
│
├── .next/                          # Next.js build output (gitignored)
├── public/
│   ├── dot-grid.svg               # Background pattern
│   └── icons/
│       ├── youtube.svg
│       ├── github.svg
│       └── docs.svg
│
├── src/
│   ├── app/
│   │   ├── layout.tsx                      # 🔥 Root layout with providers
│   │   ├── page.tsx                        # 🔥 Landing/Dashboard
│   │   ├── globals.css                     # Tailwind imports + custom styles
│   │   └── roadmap/
│   │       └── [id]/
│   │           └── page.tsx                # 🔥 Dynamic roadmap viewer
│   │
│   ├── components/
│   │   ├── intake/
│   │   │   ├── intake-wizard.tsx           # 🔥 Multi-step form (Step 1-4)
│   │   │   ├── step-goal.tsx               # Goal input with tags
│   │   │   ├── step-skills.tsx             # Existing skills selector
│   │   │   ├── step-commitment.tsx         # Hours/week slider
│   │   │   └── step-timeline.tsx           # Target weeks selector
│   │   │
│   │   ├── canvas/
│   │   │   ├── roadmap-canvas.tsx          # 🔥 Main React Flow wrapper
│   │   │   ├── custom-node.tsx             # 🔥 Node renderer (3 variants)
│   │   │   ├── custom-edge.tsx             # Bezier edge styling
│   │   │   ├── canvas-controls.tsx         # Zoom, pan, fit view
│   │   │   ├── canvas-minimap.tsx          # MiniMap component
│   │   │   ├── progress-bar.tsx            # Top progress indicator
│   │   │   └── node-search.tsx             # Search/filter nodes
│   │   │
│   │   ├── drawer/
│   │   │   ├── node-drawer.tsx             # 🔥 Main slide-over sheet
│   │   │   ├── drawer-header.tsx           # Title, status, hours
│   │   │   ├── drawer-xai.tsx              # "Why this is in your path"
│   │   │   ├── drawer-resources.tsx        # Verified learning links
│   │   │   ├── drawer-quiz.tsx             # Diagnostic micro-quiz
│   │   │   └── drawer-stuck-button.tsx     # Re-routing trigger
│   │   │
│   │   ├── shared/
│   │   │   ├── loading-spinner.tsx         # Reusable loader
│   │   │   ├── confetti-trigger.tsx        # Canvas confetti wrapper
│   │   │   └── status-badge.tsx            # Color-coded status pill
│   │   │
│   │   └── ui/                             # shadcn/ui components
│   │       ├── sheet.tsx
│   │       ├── dialog.tsx
│   │       ├── badge.tsx
│   │       ├── button.tsx
│   │       ├── progress.tsx
│   │       ├── tabs.tsx
│   │       ├── tooltip.tsx
│   │       ├── dropdown-menu.tsx
│   │       └── ...
│   │
│   ├── lib/
│   │   ├── dagre-layout.ts                 # 🔥 Auto-layout calculator
│   │   ├── api.ts                          # 🔥 Fetch wrappers for backend
│   │   ├── utils.ts                        # cn(), clsx helpers
│   │   └── constants.ts                    # Color palette, configs
│   │
│   ├── store/
│   │   └── use-roadmap-store.ts            # 🔥 Zustand global state
│   │
│   ├── types/
│   │   └── index.ts                        # 🔥 TypeScript interfaces
│   │
│   └── hooks/
│       ├── use-roadmap-query.ts            # React Query hooks (optional)
│       └── use-confetti.ts                 # Confetti effect hook
│
├── .env.local                              # Environment variables
├── .gitignore
├── next.config.js                          # Next.js configuration
├── package.json
├── postcss.config.js
├── tailwind.config.ts                      # 🔥 Extended color palette
├── tsconfig.json
└── README.md
```

---

## 🔥 Priority Components (Implementation Order)

### **Phase 1: Core Infrastructure** (Week 1)
```
1. ✅ Project setup (Next.js 15 + TypeScript)
2. ✅ Tailwind + shadcn/ui installation
3. ✅ TypeScript types (types/index.ts)
4. ✅ API client (lib/api.ts)
5. ✅ Zustand store (store/use-roadmap-store.ts)
```

### **Phase 2: Intake Flow** (Week 1)
```
6. ✅ intake-wizard.tsx (main modal)
7. ✅ step-goal.tsx
8. ✅ step-skills.tsx
9. ✅ step-commitment.tsx
10. ✅ step-timeline.tsx
11. ✅ Integration with POST /api/roadmap/generate
```

### **Phase 3: Canvas Visualization** (Week 2)
```
12. ✅ dagre-layout.ts
13. ✅ roadmap-canvas.tsx (React Flow setup)
14. ✅ custom-node.tsx (3 variants)
15. ✅ custom-edge.tsx
16. ✅ canvas-controls.tsx
17. ✅ progress-bar.tsx
```

### **Phase 4: Node Details & Resources** (Week 3)
```
18. ✅ node-drawer.tsx (slide-over)
19. ✅ drawer-xai.tsx
20. ✅ drawer-resources.tsx
21. ✅ drawer-quiz.tsx
22. ✅ Integration with POST /api/quiz/submit
```

### **Phase 5: Dynamic Features** (Week 3)
```
23. ✅ drawer-stuck-button.tsx
24. ✅ POST /api/roadmap/reroute integration
25. ✅ Bridge node insertion animation
26. ✅ Canvas confetti effects
```

### **Phase 6: Polish & Optimization** (Week 4)
```
27. ✅ Responsive design
28. ✅ Error boundaries
29. ✅ Loading states
30. ✅ Accessibility (ARIA, keyboard nav)
31. ✅ Performance optimization
```

---

## 🎯 Key Components Deep Dive

### **1. intake-wizard.tsx**
```typescript
'use client';

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useRoadmapStore } from '@/store/use-roadmap-store';
import { generateRoadmap } from '@/lib/api';

export function IntakeWizard() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    goal: '',
    existingSkills: [],
    weeklyHours: 10,
    targetWeeks: 8
  });

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const response = await generateRoadmap(formData);
      useRoadmapStore.getState().setRoadmap(response);
      // Navigate to roadmap view
    } catch (error) {
      console.error('Failed to generate roadmap:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open>
      <DialogContent className="max-w-2xl">
        {/* Multi-step form UI */}
      </DialogContent>
    </Dialog>
  );
}
```

---

### **2. roadmap-canvas.tsx**
```typescript
'use client';

import { useCallback, useEffect } from 'react';
import { ReactFlow, Background, Controls, MiniMap } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { CustomNode } from './custom-node';
import { CustomEdge } from './custom-edge';
import { getLayoutedElements } from '@/lib/dagre-layout';
import { useRoadmapStore } from '@/store/use-roadmap-store';

const nodeTypes = {
  custom: CustomNode
};

const edgeTypes = {
  custom: CustomEdge
};

export function RoadmapCanvas() {
  const { nodes, edges } = useRoadmapStore();
  const layoutedNodes = getLayoutedElements(nodes, edges);

  return (
    <div className="h-screen w-full bg-slate-50">
      {/* Progress Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        {/* Progress UI */}
      </div>

      <ReactFlow
        nodes={layoutedNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
      >
        <Background 
          color="#CBD5E1" 
          gap={20} 
          size={1} 
          variant="dots" 
        />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
```

---

### **3. custom-node.tsx**
```typescript
import { Handle, Position } from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock } from 'lucide-react';

export function CustomNode({ data }) {
  const isMilestone = data.type === 'milestone';
  const isAIBridge = data.type === 'bridge';

  return (
    <div className={`
      ${isMilestone ? 'w-[280px] h-[100px]' : 'w-[240px] h-[84px]'}
      ${isAIBridge 
        ? 'bg-violet-50 border-2 border-dashed border-violet-400' 
        : 'bg-white border border-slate-200'
      }
      rounded-xl shadow-card hover:shadow-card-hover
      transition-all duration-200 hover:-translate-y-0.5
    `}>
      <Handle type="target" position={Position.Top} />

      {/* Milestone Header */}
      {isMilestone && (
        <div className="h-8 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-t-xl flex items-center px-3">
          <Trophy className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Content */}
      <div className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-slate-900">
              {data.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {data.level}
              </Badge>
              <span className="flex items-center text-xs text-slate-500">
                <Clock className="w-3 h-3 mr-1" />
                {data.estimatedHours}h
              </span>
            </div>
          </div>
          
          {/* Status Indicator */}
          <div className={`
            w-3 h-3 rounded-full
            ${data.status === 'COMPLETED' && 'bg-emerald-500'}
            ${data.status === 'IN_PROGRESS' && 'bg-amber-500 animate-pulse'}
            ${data.status === 'PENDING' && 'bg-slate-300'}
            ${data.status === 'STUCK' && 'bg-rose-500 animate-pulse'}
          `} />
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
```

---

### **4. node-drawer.tsx**
```typescript
'use client';

import { Sheet, SheetContent, SheetHeader } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { useRoadmapStore } from '@/store/use-roadmap-store';

export function NodeDrawer() {
  const { selectedNode, nodes } = useRoadmapStore();
  const node = nodes.find(n => n.id === selectedNode);

  if (!node) return null;

  return (
    <Sheet open={!!selectedNode}>
      <SheetContent className="w-[480px] overflow-y-auto">
        <SheetHeader>
          <h2 className="text-xl font-bold text-slate-900">
            {node.title}
          </h2>
          <div className="flex gap-2">
            <Badge>{node.level}</Badge>
            <Badge variant="outline">{node.estimatedHours}h</Badge>
          </div>
        </SheetHeader>

        {/* Section 1: Why Recommended */}
        <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-indigo-600">AI Explained</Badge>
          </div>
          <p className="text-sm text-indigo-900">
            {node.whyRecommended}
          </p>
        </div>

        {/* Section 2: Resources */}
        <div className="mt-6">
          <h3 className="font-semibold mb-3">Verified Learning Resources</h3>
          {node.resources.map((resource, idx) => (
            <a
              key={idx}
              href={resource.url}
              target="_blank"
              className="block p-3 mb-2 border rounded-lg hover:bg-slate-50"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{resource.title}</span>
                <Badge variant="outline">{resource.source}</Badge>
              </div>
            </a>
          ))}
        </div>

        {/* Section 3: Quiz */}
        {/* Section 4: Stuck Button */}
      </SheetContent>
    </Sheet>
  );
}
```

---

### **5. use-roadmap-store.ts**
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface RoadmapStore {
  roadmapId: string | null;
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
  selectedNode: string | null;
  completionPercentage: number;
  
  setRoadmap: (data: GenerateRoadmapResponse) => void;
  updateNodeStatus: (nodeId: string, status: NodeStatus) => void;
  selectNode: (nodeId: string | null) => void;
  addBridgeNodes: (nodes: RoadmapNode[], edges: RoadmapEdge[]) => void;
}

export const useRoadmapStore = create<RoadmapStore>()(
  persist(
    (set, get) => ({
      roadmapId: null,
      nodes: [],
      edges: [],
      selectedNode: null,
      completionPercentage: 0,
      
      setRoadmap: (data) => set({
        roadmapId: data.roadmapId,
        nodes: data.nodes,
        edges: data.edges
      }),
      
      updateNodeStatus: (nodeId, status) => set((state) => {
        const updatedNodes = state.nodes.map(node =>
          node.id === nodeId ? { ...node, status } : node
        );
        
        const completed = updatedNodes.filter(n => n.status === 'COMPLETED').length;
        const completionPercentage = Math.round((completed / updatedNodes.length) * 100);
        
        return { nodes: updatedNodes, completionPercentage };
      }),
      
      selectNode: (nodeId) => set({ selectedNode: nodeId }),
      
      addBridgeNodes: (newNodes, newEdges) => set((state) => ({
        nodes: [...state.nodes, ...newNodes],
        edges: [...state.edges, ...newEdges]
      }))
    }),
    { name: 'pathcraft-roadmap' }
  )
);
```

---

## 🔗 Backend Integration Checklist

### **API Endpoints to Integrate**
- [ ] `POST /api/roadmap/generate` - From Kanak + Reshal
- [ ] `POST /api/progress/update` - From Sanvi
- [ ] `POST /api/roadmap/reroute` - From Kanak
- [ ] `GET /api/quiz/:nodeId` - From Kanak
- [ ] `POST /api/quiz/submit` - From Sanvi

### **Data Flow**
```
Frontend (Zustand) ←→ API Layer (lib/api.ts) ←→ Backend (Next.js API Routes)
                                                        ↓
                                                  PostgreSQL (Sanvi)
                                                  Redis Cache (Reshal)
                                                  LLM Services (Kanak)
```

---

## 🚀 Getting Started

### **1. Clone Repository**
```bash
git clone <repo-url>
cd pathcraft-ai-frontend
```

### **2. Install Dependencies**
```bash
npm install
```

### **3. Setup Environment**
```bash
cp .env.example .env.local
# Add backend API URL
```

### **4. Run Development Server**
```bash
npm run dev
```

### **5. Access Application**
```
http://localhost:3000
```

---

## 📝 Notes for Priyanshu (Frontend Lead)

1. **State Management**: Zustand with localStorage persistence ensures users don't lose progress on refresh.

2. **Optimistic Updates**: UI updates immediately, then syncs with backend. Rollback on error.

3. **Canvas Performance**: React Flow handles 100+ nodes efficiently. Use `memo()` for custom node components.

4. **Accessibility**: 
   - All interactive elements have `aria-label`
   - Keyboard navigation (Tab, Enter, Escape)
   - Focus indicators with `ring-2 ring-indigo-600`

5. **Error Handling**: Use error boundaries + toast notifications (shadcn/ui Toaster).

6. **Testing**: Consider adding Playwright for E2E tests on critical flows (intake → generate → quiz).

---

**Branch**: `frontend/main`  
**Lead**: Priyanshu  
**Status**: Ready for Implementation  
**Last Updated**: 2026-08-28
