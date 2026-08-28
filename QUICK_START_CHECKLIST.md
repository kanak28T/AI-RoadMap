# PathCraft AI - Quick Start Implementation Checklist

## 🎯 For Priyanshu (Frontend Lead)

### ✅ Week 1: Foundation & Intake Flow

#### Day 1-2: Project Setup
- [ ] Initialize Next.js 15 project with TypeScript
  ```bash
  npx create-next-app@latest pathcraft-frontend --typescript --tailwind --app
  ```
- [ ] Install core dependencies:
  ```bash
  npm install @xyflow/react dagre zustand framer-motion canvas-confetti lucide-react
  npm install @radix-ui/react-dialog @radix-ui/react-sheet @radix-ui/react-progress
  npm install clsx tailwind-merge
  npm install -D @types/dagre
  ```
- [ ] Setup shadcn/ui:
  ```bash
  npx shadcn-ui@latest init
  npx shadcn-ui@latest add dialog sheet badge button progress tabs tooltip dropdown-menu
  ```
- [ ] Configure Tailwind (extended color palette)
- [ ] Create `types/index.ts` with all interfaces
- [ ] Setup `.env.local` with backend API URL

#### Day 3-4: Intake Wizard
- [ ] Create `components/intake/intake-wizard.tsx`
- [ ] Build multi-step form (4 steps)
- [ ] Add animated loader for generation
- [ ] Create `lib/api.ts` with `generateRoadmap()` function
- [ ] Test with mock data first
- [ ] Integrate with `POST /api/roadmap/generate` (coordinate with backend)

#### Day 5: State Management
- [ ] Create `store/use-roadmap-store.ts`
- [ ] Implement Zustand store with persist middleware
- [ ] Add actions: `setRoadmap`, `updateNodeStatus`, `selectNode`, `addBridgeNodes`
- [ ] Test localStorage persistence

---

### ✅ Week 2: Canvas & Node Visualization

#### Day 1-2: Dagre Layout
- [ ] Create `lib/dagre-layout.ts`
- [ ] Implement `getLayoutedElements()` function
- [ ] Test with sample DAG (5-10 nodes)
- [ ] Handle different node sizes (milestone vs standard)

#### Day 3-5: Roadmap Canvas
- [ ] Create `components/canvas/roadmap-canvas.tsx`
- [ ] Setup React Flow with custom node types
- [ ] Implement `components/canvas/custom-node.tsx`:
  - [ ] Milestone variant (gold border, trophy icon)
  - [ ] Standard variant (clean card)
  - [ ] AI Bridge variant (dashed purple border)
- [ ] Add status indicators (colored rings)
- [ ] Implement hover actions (Open, Mark Done, I'm Stuck)
- [ ] Create `components/canvas/custom-edge.tsx`
- [ ] Add MiniMap and Controls
- [ ] Build top progress bar component

---

### ✅ Week 3: Node Details & Interactivity

#### Day 1-2: Node Drawer
- [ ] Create `components/drawer/node-drawer.tsx`
- [ ] Implement slide-over sheet (480px width)
- [ ] Section 1: XAI explanation (indigo container)
- [ ] Section 2: Verified resources list
  - [ ] Source icons (YouTube, Docs, GitHub)
  - [ ] Duration badges
  - [ ] Verification checkmarks
  - [ ] External links

#### Day 3-4: Quiz System
- [ ] Create `components/drawer/drawer-quiz.tsx`
- [ ] Build multiple-choice question UI
- [ ] Add instant validation feedback
- [ ] Integrate with `GET /api/quiz/:nodeId`
- [ ] Implement `POST /api/quiz/submit`
- [ ] Add confetti effect on 100% score
- [ ] Auto-update node status on pass

#### Day 5: Re-Routing
- [ ] Create "I'm Stuck" button in drawer
- [ ] Integrate with `POST /api/roadmap/reroute`
- [ ] Handle adding bridge nodes to canvas
- [ ] Animate graph restructure smoothly
- [ ] Update Zustand store with new nodes/edges

---

### ✅ Week 4: Polish & Production

#### Day 1-2: Progress Tracking
- [ ] Wire up all `POST /api/progress/update` calls
- [ ] Implement optimistic UI updates
- [ ] Add error rollback logic
- [ ] Show unlocked nodes animation
- [ ] Update completion percentage in real-time

#### Day 3: UI/UX Polish
- [ ] Add loading skeletons
- [ ] Implement error boundaries
- [ ] Add toast notifications (success/error)
- [ ] Responsive design (mobile/tablet)
- [ ] Smooth transitions and animations
- [ ] Keyboard navigation

#### Day 4: Accessibility
- [ ] Add ARIA labels to all interactive elements
- [ ] Ensure focus indicators (ring-2 ring-indigo-600)
- [ ] Test keyboard navigation (Tab, Enter, Escape)
- [ ] Test with screen reader
- [ ] Check color contrast ratios

#### Day 5: Testing & Deployment
- [ ] Manual testing of all flows
- [ ] Test with large DAGs (50+ nodes)
- [ ] Performance optimization (memoization)
- [ ] Build for production
- [ ] Deploy to Vercel
- [ ] Final QA with team

---

## 🔧 For Backend Team

### ✅ Kanak's Checklist (AI Orchestration)

#### Week 1:
- [ ] Setup OpenAI API integration
- [ ] Create `lib/services/kanak-orchestration.ts`
- [ ] Implement DAG generation with Zod schema
- [ ] Test prompt with various goals
- [ ] Ensure proper prerequisite ordering

#### Week 2:
- [ ] Create `lib/services/kanak-rerouting.ts`
- [ ] Implement bridge node generation logic
- [ ] Test edge rewiring algorithm
- [ ] Handle various "stuck" scenarios

#### Week 3:
- [ ] Create `lib/services/kanak-quiz-generator.ts`
- [ ] Generate 3-question quizzes per node
- [ ] Validate quiz quality with sample nodes
- [ ] Cache quizzes in database

---

### ✅ Reshal's Checklist (Resource Discovery)

#### Week 1:
- [ ] Setup Upstash Redis
- [ ] Implement YouTube API integration
- [ ] Implement GitHub API integration
- [ ] Create documentation source scrapers (MDN, etc.)

#### Week 2:
- [ ] Create `lib/services/reshal-link-validator.ts`
- [ ] Implement HTTP HEAD/GET validation
- [ ] Filter out 404s and paywalls
- [ ] Add retry logic for transient failures

#### Week 3:
- [ ] Create `lib/services/reshal-enrichment.ts`
- [ ] Orchestrate multi-source discovery
- [ ] Implement Redis caching (7-day TTL)
- [ ] Optimize for parallel processing

---

### ✅ Sanvi's Checklist (Database & APIs)

#### Week 1:
- [ ] Setup PostgreSQL (Neon/Supabase)
- [ ] Define Prisma schema
- [ ] Run migrations
- [ ] Create `POST /api/roadmap/generate` endpoint
- [ ] Integrate Kanak + Reshal services

#### Week 2:
- [ ] Create `POST /api/progress/update` endpoint
- [ ] Implement completion percentage calculation
- [ ] Track milestone achievements
- [ ] Return unlocked nodes logic

#### Week 3:
- [ ] Create `GET /api/quiz/:nodeId` endpoint
- [ ] Create `POST /api/quiz/submit` endpoint
- [ ] Implement auto-completion on 100% score
- [ ] Create `POST /api/roadmap/reroute` endpoint

#### Week 4:
- [ ] Add error handling to all endpoints
- [ ] Implement rate limiting
- [ ] Setup CORS for frontend
- [ ] Add logging/monitoring
- [ ] Performance testing with large datasets

---

## 🔌 Integration Milestones

### Milestone 1: Intake → Generate (End of Week 1)
**Test**: User fills intake form → Backend generates DAG → Frontend displays canvas

**Success Criteria**:
- [ ] Frontend can submit intake data
- [ ] Backend returns valid roadmap structure
- [ ] Canvas renders with proper layout
- [ ] All nodes visible with correct hierarchy

---

### Milestone 2: Progress Tracking (End of Week 2)
**Test**: User marks node complete → Progress updates → Canvas reflects change

**Success Criteria**:
- [ ] Node status changes reflected visually
- [ ] Completion percentage updates
- [ ] Unlocked nodes highlighted
- [ ] Changes persist in database

---

### Milestone 3: Quiz System (Mid Week 3)
**Test**: User opens node → Takes quiz → Passes → Node auto-completes

**Success Criteria**:
- [ ] Quiz loads correctly
- [ ] Answers validated instantly
- [ ] Confetti triggers on 100%
- [ ] Node status changes to COMPLETED

---

### Milestone 4: Re-Routing (End of Week 3)
**Test**: User clicks "I'm Stuck" → Backend generates bridges → Canvas updates

**Success Criteria**:
- [ ] Bridge nodes appear with purple dashed border
- [ ] Edges correctly rewired
- [ ] Graph layout recalculates smoothly
- [ ] New nodes persist in database

---

### Milestone 5: End-to-End Flow (Week 4)
**Test**: Complete user journey from intake to first milestone completion

**Success Criteria**:
- [ ] All features work together
- [ ] No console errors
- [ ] Smooth UX throughout
- [ ] Mobile responsive
- [ ] Production-ready

---

## 🐛 Testing Protocol

### Frontend Testing
```bash
# Manual testing checklist
1. Intake form validation
2. Canvas zoom/pan/fit-view
3. Node clicking → drawer opens
4. Resource links open correctly
5. Quiz submission → status update
6. "I'm Stuck" → bridge nodes appear
7. Progress bar updates correctly
8. localStorage persistence works
```

### Backend Testing
```bash
# Use Postman/Thunder Client
1. Test POST /api/roadmap/generate with sample data
2. Verify database entries created
3. Test POST /api/progress/update
4. Test POST /api/roadmap/reroute
5. Test quiz endpoints
6. Check error responses (400, 500)
```

### Integration Testing
```typescript
// Example flow test
1. Generate roadmap via frontend
2. Verify database has entries
3. Mark node complete
4. Check if backend returns updated percentage
5. Frontend displays correct completion state
```

---

## 📞 Daily Standup Format

### Frontend (Priyanshu):
- Yesterday: [Component built]
- Today: [Next component/integration]
- Blockers: [Waiting on X API endpoint]

### Backend (Kanak/Reshal/Sanvi):
- Yesterday: [Service implemented]
- Today: [Next endpoint/service]
- Blockers: [Need frontend input on X]

---

## 🚀 Deployment Checklist

### Frontend (Vercel):
- [ ] `NEXT_PUBLIC_API_URL` environment variable set
- [ ] Build succeeds without errors
- [ ] Static assets optimized
- [ ] Vercel domain configured

### Backend (Vercel/Railway):
- [ ] Database migrations applied
- [ ] All environment variables set
- [ ] CORS configured for frontend domain
- [ ] API endpoints return proper error codes

---

## 📚 Resources

### Documentation:
- [Next.js 15 Docs](https://nextjs.org/docs)
- [React Flow Docs](https://reactflow.dev)
- [Dagre Wiki](https://github.com/dagrejs/dagre/wiki)
- [Zustand Docs](https://docs.pmnd.rs/zustand)
- [shadcn/ui](https://ui.shadcn.com)
- [Prisma Docs](https://www.prisma.io/docs)

### Design Reference:
- [Tailwind Color Palette](https://tailwindcss.com/docs/customizing-colors)
- [Radix UI Components](https://www.radix-ui.com)

---

## 🎉 Success Metrics

### By End of Week 4:
- [ ] User can generate personalized roadmap in <30 seconds
- [ ] Canvas supports 50+ nodes without lag
- [ ] All resources are verified (100% valid URLs)
- [ ] Re-routing adds bridge nodes in <5 seconds
- [ ] Mobile responsive (viewable on phone)
- [ ] Zero console errors in production

---

**Document Version**: 1.0  
**Last Updated**: 2026-08-28  
**Team**: PathCraft AI Development Team
