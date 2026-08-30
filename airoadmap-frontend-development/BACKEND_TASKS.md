# PathCraft AI — Backend Integration Task Sheet
**Date**: August 28, 2026  
**Frontend branch**: `frontend-development` ← needs these tasks done before full E2E works  
**Do NOT touch any file already inside `src/` or `prisma/` on the frontend branch**

---

## Current Reality (What Each Person Has Done So Far)

| Person | Branch | Status |
|--------|--------|--------|
| Kanak | `feature/kanak-ai-orchestration` | ✅ AI logic fully written (Groq/LLM) — NOT wired to any API route |
| Reshal | `reshal-resource-auth` | ✅ All 4 resource scrapers written — NOT wired to any API route |
| Sanvi | `feature/sanvi-backend-db` | ⚠️ Partial — progress + quiz services done, **generate + reroute routes are stubs (return 501)** |

The frontend is fully built and calls these 5 endpoints:
```
POST /api/roadmap/generate   ← STUB — returns 501
POST /api/roadmap/reroute    ← STUB — returns 501
POST /api/progress/update    ← ✅ Sanvi's route exists and works
POST /api/quiz/submit        ← ✅ Sanvi's route exists (minor format mismatch — see below)
GET  /api/quiz/:nodeId       ← ❌ MISSING — no route exists at all
```

---

## ═══════════════════════════════════
## 🔴 KANAK — AI Orchestration Lead
## ═══════════════════════════════════

### Your completed work (don't rewrite this):
- `lib/ai/generate-roadmap.ts` — `generateRoadmap()` function ✅
- `lib/ai/reroute-roadmap.ts` — `rerouteRoadmap()` function ✅  
- `lib/ai/generate-quiz.ts` — `generateQuiz()` function ✅
- `lib/ai/groq-client.ts` — Groq provider setup ✅

---

### 🎯 Task 1 — Wire `POST /api/roadmap/generate` (HIGHEST PRIORITY)

**File to create**: `app/api/roadmap/generate/route.ts`  
**Current state**: Returns `{ success: false, message: "Roadmap generation API not implemented yet" }` with status 501

This route must:
1. Accept this exact JSON body from the frontend:
```ts
{
  goal: string,          // "Fullstack Next.js & AI Agent Engineer"
  existingSkills: string[],
  weeklyHours: number,
  targetWeeks: number,   // NOTE: frontend sends "targetWeeks" not "timelineWeeks"
  userId?: string
}
```
2. Call **your own** `generateRoadmap()` from `lib/ai/generate-roadmap.ts` — mapping `targetWeeks → timelineWeeks`
3. Pass the raw DAG to **Reshal's** `enrichRoadmap()` from `lib/services/enrich-roadmap.ts`
4. Pass the enriched roadmap to **Sanvi's** `createRoadmap()` from `lib/services/roadmap.service.ts`
5. Return this exact shape (frontend depends on these field names):
```ts
{
  roadmapId: string,          // the DB id from Sanvi's createRoadmap()
  title: string,
  totalEstimatedHours: number,
  nodes: RoadmapNode[],       // enriched — each node has a "resources" array
  edges: RoadmapEdge[]
}
```

**Important field note**: Your `generateRoadmap()` returns `totalEstimatedHours`. Sanvi stores it as `totalHours` in DB. Make sure the response back to frontend uses `totalEstimatedHours`.

Also handle missing `userId` — if not provided, upsert a guest user:
```ts
const guestUser = await prisma.upsert({
  where: { email: "guest@pathcraft.ai" },
  update: {},
  create: { email: "guest@pathcraft.ai", name: "Guest" }
})
```

---

### 🎯 Task 2 — Wire `POST /api/roadmap/reroute` (HIGH PRIORITY)

**File to create**: `app/api/roadmap/reroute/route.ts`  
**Current state**: Returns `{ success: false, message: "Roadmap reroute API not implemented yet" }` with status 501

Accept:
```ts
{
  roadmapId: string,
  stuckNodeId: string,
  userProblemContext?: string,
  userId?: string
}
```

Steps:
1. Fetch the current roadmap from DB using Sanvi's `getRoadmap(roadmapId)`
2. Reconstruct `GeneratedRoadmap` shape from DB record
3. Call **your** `rerouteRoadmap({ currentGraph, stuckNodeId, userProblemContext })`
4. Find which nodes are new (bridge nodes) by comparing before/after
5. Enrich only the new bridge nodes via Reshal's `discoverResources(node.searchKeywords)`
6. Update DB using Sanvi's `updateRoadmapGraph(roadmapId, updatedGraph)`
7. Create `UserProgress` PENDING entries for new bridge nodes
8. Return:
```ts
{
  success: true,
  newNodes: RoadmapNode[],      // only the bridge nodes with resources
  updatedEdges: RoadmapEdge[],
  message: "Added 2 prerequisite bridge topics"
}
```

---

### 🎯 Task 3 — Create `GET /api/quiz/:nodeId` (HIGH PRIORITY)

**File to create**: `app/api/quiz/[nodeId]/route.ts`  
**Current state**: This route does not exist at all — 404

Accept: `GET /api/quiz/node-5?roadmapId=cuid123`

Steps:
1. Check if quiz already exists in DB: `prisma.diagnosticQuiz.findFirst({ where: { nodeId, roadmapId } })`
2. If found → return it directly (no LLM call needed)
3. If not found:
   - Fetch the roadmap, find the node by `nodeId` to get `node.title` and `node.level`
   - Call **your** `generateQuiz(nodeId, node.title, node.level)`
   - Save to DB: `prisma.diagnosticQuiz.create({ data: { nodeId, roadmapId, questions: quiz.questions } })`
   - Return it
4. Return this exact shape:
```ts
{
  nodeId: string,
  questions: Array<{
    question: string,
    options: string[],   // 4 options
    answerIndex: number, // 0-3 (correct answer index)
    explanation: string
  }>
}
```

**⚠️ Critical**: Sanvi's `DiagnosticQuiz` DB model uses `{ id, nodeId, roadmapId, questions }`. Your `generateQuiz()` returns `{ nodeId, questions }` where questions are `{ question, options, answerIndex, explanation }`. Make sure the DB stores and returns questions in this format — NOT the `{ id, correctAnswer }` format from Sanvi's `QuizQuestion` type.

---

### 🎯 Task 4 — Fix the `GROQ_API_KEY` guard

In `lib/ai/groq-client.ts` you throw if the key is missing. This crashes the Next.js build even when the key is present in `.env.local`.

Change to:
```ts
export const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY ?? "",
});
```
Remove the `if (!process.env.GROQ_API_KEY) throw new Error(...)` block — let the API call itself fail at runtime with a clear HTTP error rather than crashing the module.

---

### ✅ Checklist for Kanak
- [ ] `app/api/roadmap/generate/route.ts` — full pipeline (Kanak → Reshal → Sanvi)
- [ ] `app/api/roadmap/reroute/route.ts` — full pipeline (Kanak → Reshal → Sanvi)
- [ ] `app/api/quiz/[nodeId]/route.ts` — generate + cache quiz
- [ ] Remove the throw from `groq-client.ts`
- [ ] Test `POST /api/roadmap/generate` with Postman before handing off

---

## ═══════════════════════════════════
## 🟡 RESHAL — Resource Discovery Lead
## ═══════════════════════════════════

### Your completed work (don't rewrite this):
- `lib/services/article-discovery.ts` — Dev.to articles ✅
- `lib/services/github-discovery.ts` — GitHub repo search ✅
- `lib/services/youtube-discovery.ts` — YouTube API ✅
- `lib/services/official-docs.ts` — Static docs map ✅
- `lib/services/link-validator.ts` — HTTP HEAD/GET checker ✅
- `lib/services/resource-cache.ts` — Upstash Redis cache ✅
- `lib/services/enrich-roadmap.ts` — Orchestrator that calls all 4 sources ✅

---

### 🎯 Task 1 — Export a clean `enrichRoadmap()` that Kanak's routes can import (HIGHEST PRIORITY)

**Problem**: Your `enrich-roadmap.ts` uses `.js` imports (`import ... from "./resource-discovery.js"`) because your branch was set up as an ES module project (`"type": "module"`). The unified Next.js project uses TypeScript module resolution — those `.js` extensions will cause `Module not found` errors.

**Fix in `lib/services/enrich-roadmap.ts`**:
```ts
// Remove the .js extension from all imports
import { discoverResources } from "./resource-discovery";   // NOT "./resource-discovery.js"
import { discoverOfficialDocs } from "./official-docs";     // same rule everywhere
```

Apply the same fix to ALL your service files that import each other. Remove all `.js` extensions from relative imports.

---

### 🎯 Task 2 — Make `resource-discovery.ts` export a single clean function

Kanak's route needs to call:
```ts
import { discoverResources } from "../../lib/services/resource-discovery";
const resources = await discoverResources(["react hooks", "useEffect", "React"]);
```

Make sure your `resource-discovery.ts` exports this:
```ts
export async function discoverResources(keywords: string[]): Promise<Resource[]>
```

Where `Resource` is:
```ts
export interface Resource {
  title: string;
  url: string;
  source: "Official Docs" | "YouTube" | "GitHub" | "Article";
  type: "Video" | "Article" | "Repo";
  isVerified: boolean;
  duration?: string;
}
```

The `isVerified` field must be set to `true` for every resource that passes your link validator, `false` otherwise. Currently your interfaces don't include `isVerified` — add it.

---

### 🎯 Task 3 — Fix the `enrich-roadmap.ts` interface to match Kanak's node shape

Your current `RoadmapNode` in `enrich-roadmap.ts` is:
```ts
type: "standard" | "milestone"   // missing "bridge"
```

Kanak's nodes can also be `type: "bridge"`. Update:
```ts
type: "standard" | "milestone" | "bridge"
```

Also, Kanak's nodes have a `targetRole` at the top level of `GeneratedRoadmap`. Your `RoadmapGraph` type doesn't have it. Add:
```ts
export interface RoadmapGraph {
  title: string;
  targetRole?: string;
  totalEstimatedHours: number;
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
}
```

---

### 🎯 Task 4 — Ensure Redis cache is optional (don't crash without it)

Your `resource-cache.ts` should handle the case where `UPSTASH_REDIS_REST_URL` is not set. It should silently skip caching rather than throwing:

```ts
// If Redis env vars missing, return null (cache miss) / no-op on set
export async function getCachedResources(keywords: string[]): Promise<Resource[] | null> {
  if (!process.env.UPSTASH_REDIS_REST_URL) return null;  // graceful fallback
  // ... rest of code
}
```

This is important — the app must still work without Redis configured.

---

### 🎯 Task 5 — Add `isVerified` to link validation output

In `link-validator.ts`, after validating a URL, tag it:
```ts
// Currently returns: T[]
// Should return: (T & { isVerified: boolean })[] 
```

Or more simply — your `filterDeadLinks` already filters out dead ones, so just set `isVerified: true` on the survivors in `resource-discovery.ts` after calling `filterDeadLinks`.

---

### ✅ Checklist for Reshal
- [ ] Remove all `.js` extensions from internal imports
- [ ] Add `isVerified: boolean` to the `Resource` interface and set it correctly
- [ ] Add `"bridge"` to `RoadmapNode.type` union
- [ ] Make Redis cache optional (no crash if env var missing)
- [ ] Confirm `discoverResources(keywords: string[])` is exported from `resource-discovery.ts`
- [ ] Test `discoverResources(["react", "hooks", "useState"])` returns at least 2 results

---

## ═══════════════════════════════════
## 🟢 SANVI — Database & API Lead
## ═══════════════════════════════════

### Your completed work (don't rewrite this):
- `prisma/schema.prisma` — All 4 models defined ✅
- `lib/services/roadmap.service.ts` — `createRoadmap()`, `getRoadmap()`, `updateRoadmapGraph()` ✅
- `lib/services/progress.service.ts` — `updateProgress()`, `getProgress()` ✅
- `lib/services/quiz.service.ts` — `submitQuiz()` ✅
- `lib/validators/` — Zod schemas for all inputs ✅
- `lib/progress.ts` — `calculateProgress()` ✅
- `app/api/progress/update/route.ts` — ✅ Works
- `app/api/quiz/submit/route.ts` — ⚠️ Works but has a format mismatch (see Task 2)

---

### 🎯 Task 1 — Fix the Prisma client singleton (CRITICAL)

**File**: `lib/db/prisma.ts`

Your current code imports from `../../generated/prisma/client` which only exists after `prisma generate` runs with a custom `output` path. The standard path is `@prisma/client`.

Change your prisma.ts to:
```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const prisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
  }

  return prisma;
}
```

Also update `prisma/schema.prisma` — **remove** the `url = env("DATABASE_URL")` line from the datasource block since Prisma v7 moves it to `prisma.config.ts`:
```prisma
datasource db {
  provider = "postgresql"
  // NO url line here — it goes in prisma.config.ts
}
```

And create `prisma.config.ts` at root:
```ts
import { defineConfig } from 'prisma/config';

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
```

---

### 🎯 Task 2 — Fix the quiz submit format mismatch (IMPORTANT)

**Problem**: The frontend sends quiz answers as an **array of numbers** (option indices):
```ts
// Frontend sends:
{ answers: [2, 0, 3] }  // index of selected option per question
```

But your `quizSubmissionSchema` and `submitQuiz()` expect:
```ts
// Your code expects:
{ answers: Record<string, string | number> }  // e.g. { "q1": "answer text" }
```

This is incompatible. Fix the validator and service to accept `number[]`:

**`lib/validators/quiz.ts`** — change:
```ts
answers: z.record(z.string(), z.union([z.string(), z.number()]))
// to:
answers: z.array(z.number().int().min(0).max(3))
```

**`lib/services/quiz.service.ts`** — change the `submitQuiz` signature and grading logic:
```ts
// Old:
export async function submitQuiz(userId, roadmapId, nodeId, answers: Record<string, string|number>)

// New:
export async function submitQuiz(userId, roadmapId, nodeId, answers: number[])
```

And update the grading loop:
```ts
// Old logic compared answers[question.id] to question.correctAnswer
// New logic:
questions.forEach((q, idx) => {
  if (answers[idx] === q.answerIndex) correctCount++;   // answerIndex from Kanak's quiz format
});
```

Also update `types/quiz.ts` to match Kanak's quiz question format:
```ts
export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;    // 0-3 (replaces the id/correctAnswer approach)
  explanation: string;
}
```

---

### 🎯 Task 3 — Setup the actual PostgreSQL database (CRITICAL)

The frontend build fails because there's no DB. You need to:

1. Create a free PostgreSQL database — options:
   - [Neon](https://neon.tech) (free tier, recommended)
   - [Supabase](https://supabase.com) (free tier)
   - Local PostgreSQL

2. Get the `DATABASE_URL` connection string

3. Add it to `.env.local` at the project root:
   ```
   DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
   ```

4. Run migrations:
   ```bash
   npx prisma migrate dev --name init
   ```

5. Share the `DATABASE_URL` with Kanak and the rest of the team (via a secure channel, not Git)

---

### 🎯 Task 4 — Add a Guest User seed (needed for anonymous use)

Without auth, the frontend sends no `userId`. The API routes need a fallback. Add a seed script:

**`prisma/seed.ts`**:
```ts
import { getPrisma } from '../lib/db/prisma';

async function main() {
  const prisma = getPrisma();
  await prisma.user.upsert({
    where: { email: 'guest@pathcraft.ai' },
    update: {},
    create: { email: 'guest@pathcraft.ai', name: 'Guest' },
  });
  console.log('Seed complete');
}

main();
```

**`package.json`** — add:
```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

Then run: `npx prisma db seed`

---

### 🎯 Task 5 — Expose `GET /api/roadmap/:id` (needed by frontend on page refresh)

When a user refreshes `/roadmap/[id]`, the Zustand store is empty. The frontend needs to re-fetch the roadmap. Create:

**`app/api/roadmap/[id]/route.ts`**:
```ts
export async function GET(req, { params }) {
  const roadmap = await getRoadmap(params.id);
  // Return same shape as generate:
  return NextResponse.json({
    roadmapId: roadmap.id,
    title: roadmap.title,
    totalEstimatedHours: roadmap.totalHours,
    nodes: roadmap.nodes,
    edges: roadmap.edges,
  });
}
```

---

### ✅ Checklist for Sanvi
- [ ] Fix `lib/db/prisma.ts` to import from `@prisma/client` (not generated path)
- [ ] Update `prisma/schema.prisma` to remove `url =` line (Prisma v7 requirement)
- [ ] Create `prisma.config.ts` at project root
- [ ] Create the PostgreSQL database and run `npx prisma migrate dev`
- [ ] Seed the guest user
- [ ] Fix quiz submit to accept `answers: number[]` (array of indices)
- [ ] Create `GET /api/roadmap/[id]/route.ts`
- [ ] Share `DATABASE_URL` securely with the team

---

## Integration Order — Who Unblocks Whom

```
Sanvi (DB setup)
    ↓
    Unblocks Kanak's routes (need DB to save roadmaps)
    Unblocks Reshal's test (need DB to verify end-to-end)

Reshal (fix imports + isVerified)
    ↓
    Unblocks Kanak's generate route (needs enrichRoadmap to work)

Kanak (wire API routes)
    ↓
    Unblocks frontend E2E test
```

**Recommended order**: Sanvi sets up DB → Reshal fixes imports → Kanak wires routes → Team tests together

---

## Shared Environment Variables

Everyone needs to agree on and set these in `.env.local`:

```bash
# Kanak provides:
GROQ_API_KEY=gsk_...          # from console.groq.com (free)

# Sanvi provides:
DATABASE_URL=postgresql://... # from Neon/Supabase

# Reshal provides:
YOUTUBE_API_KEY=AIza...       # from Google Cloud Console (free 10k/day)
GITHUB_TOKEN=ghp_...          # from github.com/settings/tokens (optional)
UPSTASH_REDIS_REST_URL=...    # from console.upstash.com (optional)
UPSTASH_REDIS_REST_TOKEN=...  # from console.upstash.com (optional)
```

---

## What Frontend (Priyanshu) Has Already Done

So the backend team knows — **don't duplicate or conflict with these**:

| File | What it does |
|------|-------------|
| `src/lib/api.ts` | Typed fetch client for all 5 endpoints |
| `src/app/api/roadmap/generate/route.ts` | **Already written by Priyanshu** as integration shim — Kanak should override this with the real pipeline |
| `src/app/api/roadmap/reroute/route.ts` | **Already written by Priyanshu** — Kanak override |
| `src/app/api/progress/update/route.ts` | **Already written by Priyanshu** — Sanvi's version on `feature/sanvi-backend-db` is better, use that |
| `src/app/api/quiz/[nodeId]/route.ts` | **Already written by Priyanshu** — Kanak should validate it matches the quiz format |
| `src/app/api/quiz/submit/route.ts` | **Already written by Priyanshu** — Sanvi's version is better once format is fixed |
| `src/components/drawer/node-drawer.tsx` | Full drawer with quiz, resources, stuck button |
| `src/components/canvas/` | React Flow canvas with Dagre layout |
| `src/components/intake/intake-wizard.tsx` | 4-step intake form |
| `src/store/use-roadmap-store.ts` | Zustand store, localStorage persistence |
| `prisma/schema.prisma` | Updated for Prisma v7 (no `url =` in datasource) |
| `prisma.config.ts` | Prisma v7 config file |

---

## Quick Test Plan (After All Tasks Done)

1. Sanvi starts the server with DB connected
2. Open `http://localhost:3001`
3. Click "Create Your Learning Path"
4. Fill in: Goal = "Learn React", Skills = ["JavaScript"], Hours = 10, Weeks = 4
5. Click "Generate Roadmap"
6. **Expected**: Canvas loads with nodes in DAG layout
7. Click any node → **Expected**: Drawer opens with resources + quiz
8. Take the quiz → **Expected**: Confetti on 100%, node turns green
9. Click "I'm Stuck" on a node → **Expected**: 1–2 bridge nodes appear on canvas

If all 9 steps work, integration is complete.

---

**Questions?** Coordinate in the team chat. Tag @Sanvi for DB issues, @Reshal for resource issues, @Kanak for AI/generation issues, @Priyanshu for frontend/canvas issues.
