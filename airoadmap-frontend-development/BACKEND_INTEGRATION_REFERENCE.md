# PathCraft AI - Backend Integration Reference

## 🔧 Backend Architecture Overview

### **Team Structure**
1. **Kanak** - AI Orchestration & Graph Generation (LLM-based)
2. **Reshal** - Resource Discovery & URL Verification
3. **Sanvi** - Database, APIs & Progress Tracking

---

## 🗄️ Database Schema (Sanvi's Domain)

### **Prisma Schema**

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  
  roadmaps  Roadmap[]
  progress  UserProgress[]
}

model Roadmap {
  id             String   @id @default(cuid())
  userId         String
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  title          String
  goal           String   @db.Text
  totalHours     Int
  nodes          Json     // Array of RoadmapNode objects
  edges          Json     // Array of RoadmapEdge objects
  
  isPublic       Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  progress       UserProgress[]
  quizzes        DiagnosticQuiz[]
  
  @@index([userId])
  @@index([createdAt])
}

model UserProgress {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  roadmapId    String
  roadmap      Roadmap  @relation(fields: [roadmapId], references: [id], onDelete: Cascade)
  
  nodeId       String   // References node ID in Roadmap.nodes JSON
  status       NodeStatus @default(PENDING)
  quizScore    Int?     // 0-100
  completedAt  DateTime?
  
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  
  @@unique([userId, roadmapId, nodeId])
  @@index([roadmapId, nodeId])
}

model DiagnosticQuiz {
  id          String   @id @default(cuid())
  roadmapId   String
  roadmap     Roadmap  @relation(fields: [roadmapId], references: [id], onDelete: Cascade)
  
  nodeId      String   // References node ID in Roadmap.nodes JSON
  questions   Json     // Array of QuizQuestion objects
  
  createdAt   DateTime @default(now())
  
  @@unique([roadmapId, nodeId])
  @@index([roadmapId])
}

enum NodeStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  STUCK
}
```

---

## 🎯 API Endpoints Specification

### **1. Generate Roadmap (Kanak + Reshal + Sanvi)**

**Endpoint**: `POST /api/roadmap/generate`

**Request Body**:
```typescript
interface GenerateRoadmapRequest {
  userId: string;                    // From auth session
  goal: string;                      // "Fullstack Next.js & AI Agent Engineer"
  existingSkills: string[];          // ["JavaScript", "React"]
  weeklyHours: number;               // 10
  targetWeeks: number;               // 8
}
```

**Response**:
```typescript
interface GenerateRoadmapResponse {
  roadmapId: string;                 // "rm_abc123"
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
  status: "PENDING";                 // Initial status
  resources: Resource[];             // Populated by Reshal
  prerequisites: string[];           // ["node_0"]
}

interface Resource {
  title: string;
  url: string;
  source: "Official Docs" | "YouTube" | "GitHub" | "Article";
  type: "Video" | "Article" | "Repo";
  isVerified: boolean;
  duration?: string;                 // "15 min" or "2h 30m"
}

interface RoadmapEdge {
  source: string;                    // "node_1"
  target: string;                    // "node_2"
}
```

**Processing Flow**:
```
1. Sanvi receives request
   ↓
2. Calls Kanak's AI orchestration service
   └─> Generates DAG structure with nodes & edges
   ↓
3. Passes to Reshal's resource enrichment service
   └─> Fetches & verifies resources for each node
   └─> Caches in Redis
   ↓
4. Sanvi saves to PostgreSQL (Roadmap table)
   └─> Creates initial UserProgress entries (all PENDING)
   ↓
5. Returns complete roadmap to frontend
```

**Implementation Example** (Sanvi):
```typescript
// app/api/roadmap/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateDAG } from '@/lib/services/kanak-orchestration';
import { enrichWithResources } from '@/lib/services/reshal-enrichment';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, goal, existingSkills, weeklyHours, targetWeeks } = body;

    // Step 1: Generate DAG (Kanak's service)
    const rawRoadmap = await generateDAG({
      goal,
      existingSkills,
      weeklyHours,
      targetWeeks
    });

    // Step 2: Enrich with resources (Reshal's service)
    const enrichedRoadmap = await enrichWithResources(rawRoadmap);

    // Step 3: Save to database
    const roadmap = await prisma.roadmap.create({
      data: {
        userId,
        title: enrichedRoadmap.title,
        goal,
        totalHours: enrichedRoadmap.totalEstimatedHours,
        nodes: enrichedRoadmap.nodes,
        edges: enrichedRoadmap.edges
      }
    });

    // Step 4: Create progress entries
    await prisma.userProgress.createMany({
      data: enrichedRoadmap.nodes.map(node => ({
        userId,
        roadmapId: roadmap.id,
        nodeId: node.id,
        status: 'PENDING'
      }))
    });

    return NextResponse.json({
      roadmapId: roadmap.id,
      title: roadmap.title,
      totalEstimatedHours: roadmap.totalHours,
      nodes: roadmap.nodes,
      edges: roadmap.edges
    });

  } catch (error) {
    console.error('Generate roadmap error:', error);
    return NextResponse.json(
      { error: 'Failed to generate roadmap' },
      { status: 500 }
    );
  }
}
```

---

### **2. Update Progress (Sanvi)**

**Endpoint**: `POST /api/progress/update`

**Request Body**:
```typescript
interface UpdateProgressRequest {
  userId: string;
  roadmapId: string;
  nodeId: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "STUCK";
}
```

**Response**:
```typescript
interface UpdateProgressResponse {
  success: boolean;
  completionPercentage: number;      // Recalculated
  milestonesReached: number;
  unlockedNodes: string[];           // Child nodes now accessible
}
```

**Implementation** (Sanvi):
```typescript
// app/api/progress/update/route.ts
export async function POST(req: NextRequest) {
  const { userId, roadmapId, nodeId, status } = await req.json();

  // Update progress
  await prisma.userProgress.upsert({
    where: {
      userId_roadmapId_nodeId: { userId, roadmapId, nodeId }
    },
    update: {
      status,
      completedAt: status === 'COMPLETED' ? new Date() : null
    },
    create: {
      userId,
      roadmapId,
      nodeId,
      status
    }
  });

  // Calculate metrics
  const roadmap = await prisma.roadmap.findUnique({
    where: { id: roadmapId },
    include: { progress: true }
  });

  const totalNodes = (roadmap.nodes as any[]).length;
  const completedCount = roadmap.progress.filter(p => p.status === 'COMPLETED').length;
  const completionPercentage = Math.round((completedCount / totalNodes) * 100);

  const milestones = (roadmap.nodes as any[]).filter(n => n.type === 'milestone');
  const milestonesReached = roadmap.progress.filter(
    p => p.status === 'COMPLETED' && milestones.some(m => m.id === p.nodeId)
  ).length;

  // Find unlocked nodes (nodes whose prerequisites are all completed)
  const nodes = roadmap.nodes as RoadmapNode[];
  const completedNodeIds = new Set(
    roadmap.progress.filter(p => p.status === 'COMPLETED').map(p => p.nodeId)
  );
  
  const unlockedNodes = nodes
    .filter(node => 
      node.prerequisites.every(prereqId => completedNodeIds.has(prereqId))
    )
    .map(node => node.id);

  return NextResponse.json({
    success: true,
    completionPercentage,
    milestonesReached,
    unlockedNodes
  });
}
```

---

### **3. Re-Route Roadmap (Kanak + Sanvi)**

**Endpoint**: `POST /api/roadmap/reroute`

**Request Body**:
```typescript
interface RerouteRequest {
  userId: string;
  roadmapId: string;
  stuckNodeId: string;
  userProblemContext?: string;       // Optional user feedback
}
```

**Response**:
```typescript
interface RerouteResponse {
  success: boolean;
  newNodes: RoadmapNode[];           // Bridge/remedial nodes
  updatedEdges: RoadmapEdge[];       // Re-wired connections
  message: string;                   // "Added 2 prerequisite topics"
}
```

**Processing Flow**:
```
1. Sanvi receives stuck node request
   ↓
2. Fetches current roadmap from database
   ↓
3. Calls Kanak's re-routing agent
   └─> Analyzes prerequisite gaps
   └─> Generates 1-2 bridge nodes with type: "bridge"
   └─> Rewires edges: OldNode → BridgeNode → StuckNode
   ↓
4. Reshal verifies resources for bridge nodes
   ↓
5. Sanvi updates Roadmap.nodes and Roadmap.edges in DB
   └─> Creates new UserProgress entries for bridge nodes
   ↓
6. Returns updated graph to frontend
```

**Implementation** (Sanvi + Kanak):
```typescript
// app/api/roadmap/reroute/route.ts
import { rerouteRoadmap } from '@/lib/services/kanak-rerouting';

export async function POST(req: NextRequest) {
  const { userId, roadmapId, stuckNodeId, userProblemContext } = await req.json();

  // Fetch current roadmap
  const roadmap = await prisma.roadmap.findUnique({
    where: { id: roadmapId }
  });

  // Call Kanak's re-routing agent
  const rerouteResult = await rerouteRoadmap({
    currentNodes: roadmap.nodes as RoadmapNode[],
    currentEdges: roadmap.edges as RoadmapEdge[],
    stuckNodeId,
    userContext: userProblemContext
  });

  // Enrich bridge nodes with resources (Reshal)
  const enrichedBridgeNodes = await enrichWithResources({
    nodes: rerouteResult.newNodes
  });

  // Update database
  const updatedNodes = [...(roadmap.nodes as any[]), ...enrichedBridgeNodes];
  const updatedEdges = rerouteResult.updatedEdges;

  await prisma.roadmap.update({
    where: { id: roadmapId },
    data: {
      nodes: updatedNodes,
      edges: updatedEdges
    }
  });

  // Create progress entries for new nodes
  await prisma.userProgress.createMany({
    data: enrichedBridgeNodes.map(node => ({
      userId,
      roadmapId,
      nodeId: node.id,
      status: 'PENDING'
    }))
  });

  return NextResponse.json({
    success: true,
    newNodes: enrichedBridgeNodes,
    updatedEdges,
    message: `Added ${enrichedBridgeNodes.length} prerequisite bridge topic(s)`
  });
}
```

---

### **4. Get Diagnostic Quiz (Kanak)**

**Endpoint**: `GET /api/quiz/:nodeId?roadmapId=xxx`

**Response**:
```typescript
interface DiagnosticQuiz {
  nodeId: string;
  questions: QuizQuestion[];
}

interface QuizQuestion {
  question: string;
  options: string[];                 // 4 options
  answerIndex: number;               // 0-3 (correct answer)
  explanation: string;
}
```

**Implementation** (Kanak):
```typescript
// app/api/quiz/[nodeId]/route.ts
import { generateQuiz } from '@/lib/services/kanak-quiz-generator';

export async function GET(
  req: NextRequest,
  { params }: { params: { nodeId: string } }
) {
  const { searchParams } = new URL(req.url);
  const roadmapId = searchParams.get('roadmapId');

  // Check if quiz already exists in DB
  let quiz = await prisma.diagnosticQuiz.findUnique({
    where: {
      roadmapId_nodeId: { roadmapId, nodeId: params.nodeId }
    }
  });

  if (!quiz) {
    // Generate new quiz using LLM
    const roadmap = await prisma.roadmap.findUnique({
      where: { id: roadmapId }
    });
    
    const node = (roadmap.nodes as RoadmapNode[]).find(
      n => n.id === params.nodeId
    );

    const questions = await generateQuiz({
      nodeTitle: node.title,
      nodeLevel: node.level
    });

    // Save to database
    quiz = await prisma.diagnosticQuiz.create({
      data: {
        roadmapId,
        nodeId: params.nodeId,
        questions
      }
    });
  }

  return NextResponse.json({
    nodeId: params.nodeId,
    questions: quiz.questions
  });
}
```

---

### **5. Submit Quiz (Sanvi)**

**Endpoint**: `POST /api/quiz/submit`

**Request Body**:
```typescript
interface QuizSubmissionRequest {
  userId: string;
  roadmapId: string;
  nodeId: string;
  answers: number[];                 // User's selected indices
}
```

**Response**:
```typescript
interface QuizSubmissionResponse {
  score: number;                     // 0-100
  passed: boolean;                   // true if 100%
  explanations: string[];
  autoCompleted: boolean;            // Node marked completed
}
```

**Implementation** (Sanvi):
```typescript
// app/api/quiz/submit/route.ts
export async function POST(req: NextRequest) {
  const { userId, roadmapId, nodeId, answers } = await req.json();

  // Fetch quiz
  const quiz = await prisma.diagnosticQuiz.findUnique({
    where: { roadmapId_nodeId: { roadmapId, nodeId } }
  });

  const questions = quiz.questions as QuizQuestion[];
  
  // Grade answers
  let correctCount = 0;
  const explanations: string[] = [];

  questions.forEach((q, idx) => {
    if (answers[idx] === q.answerIndex) {
      correctCount++;
    }
    explanations.push(q.explanation);
  });

  const score = Math.round((correctCount / questions.length) * 100);
  const passed = score === 100;

  // Update progress if passed
  let autoCompleted = false;
  if (passed) {
    await prisma.userProgress.update({
      where: {
        userId_roadmapId_nodeId: { userId, roadmapId, nodeId }
      },
      data: {
        status: 'COMPLETED',
        quizScore: score,
        completedAt: new Date()
      }
    });
    autoCompleted = true;
  }

  return NextResponse.json({
    score,
    passed,
    explanations,
    autoCompleted
  });
}
```

---

## 🤖 Kanak's AI Services

### **1. Generate DAG Service**

```typescript
// lib/services/kanak-orchestration.ts
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';

const RoadmapSchema = z.object({
  title: z.string(),
  totalEstimatedHours: z.number(),
  nodes: z.array(z.object({
    id: z.string(),
    title: z.string(),
    type: z.enum(['standard', 'milestone']),
    level: z.enum(['Prerequisite', 'Core', 'Advanced']),
    estimatedHours: z.number(),
    whyRecommended: z.string(),
    searchKeywords: z.array(z.string()),
    prerequisites: z.array(z.string())
  })),
  edges: z.array(z.object({
    source: z.string(),
    target: z.string()
  }))
});

export async function generateDAG(input: {
  goal: string;
  existingSkills: string[];
  weeklyHours: number;
  targetWeeks: number;
}) {
  const prompt = `
You are an expert curriculum designer. Create a personalized learning roadmap DAG.

User Goal: ${input.goal}
Existing Skills: ${input.existingSkills.join(', ')}
Weekly Hours: ${input.weeklyHours}
Target Timeline: ${input.targetWeeks} weeks

Generate a structured DAG with:
- Clear prerequisite chains
- Milestone nodes every 3-4 topics
- Topics scoped to available time
- Each node must have "whyRecommended" explaining connection to user's background
- searchKeywords for resource discovery

Ensure nodes follow dependency order (prerequisites before dependents).
  `;

  const result = await generateObject({
    model: openai('gpt-4o'),
    schema: RoadmapSchema,
    prompt
  });

  return result.object;
}
```

---

### **2. Re-Routing Service**

```typescript
// lib/services/kanak-rerouting.ts
export async function rerouteRoadmap(input: {
  currentNodes: RoadmapNode[];
  currentEdges: RoadmapEdge[];
  stuckNodeId: string;
  userContext?: string;
}) {
  const stuckNode = input.currentNodes.find(n => n.id === input.stuckNodeId);

  const prompt = `
User is stuck on: "${stuckNode.title}" (${stuckNode.level})
User feedback: ${input.userContext || 'None provided'}

Analyze prerequisite gaps and generate 1-2 bridge nodes to fill the knowledge gap.

Current prerequisites: ${stuckNode.prerequisites.join(', ')}

Return bridge nodes with type: "bridge" and rewired edges.
  `;

  // LLM generates bridge nodes
  const result = await generateObject({
    model: openai('gpt-4o'),
    schema: z.object({
      newNodes: z.array(NodeSchema),
      updatedEdges: z.array(EdgeSchema)
    }),
    prompt
  });

  return result.object;
}
```

---

### **3. Quiz Generator Service**

```typescript
// lib/services/kanak-quiz-generator.ts
export async function generateQuiz(input: {
  nodeTitle: string;
  nodeLevel: string;
}) {
  const prompt = `
Generate 3 conceptual multiple-choice questions for: "${input.nodeTitle}" (${input.level} level).

Requirements:
- 4 options each
- Focus on understanding, not memorization
- Include brief explanations
  `;

  const result = await generateObject({
    model: openai('gpt-4o'),
    schema: z.object({
      questions: z.array(z.object({
        question: z.string(),
        options: z.array(z.string()).length(4),
        answerIndex: z.number().min(0).max(3),
        explanation: z.string()
      }))
    }),
    prompt
  });

  return result.object.questions;
}
```

---

## 🔍 Reshal's Resource Services

### **1. Resource Discovery Pipeline**

```typescript
// lib/services/reshal-resource-discovery.ts
import axios from 'axios';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL!,
  token: process.env.UPSTASH_REDIS_TOKEN!
});

export async function discoverResources(searchKeywords: string[]): Promise<Resource[]> {
  const cacheKey = `resources:${searchKeywords.join('_')}`;
  
  // Check cache
  const cached = await redis.get(cacheKey);
  if (cached) return cached as Resource[];

  const resources: Resource[] = [];

  // 1. Official Documentation
  const docsResults = await searchOfficialDocs(searchKeywords);
  resources.push(...docsResults);

  // 2. YouTube Videos
  const videoResults = await searchYouTube(searchKeywords);
  resources.push(...videoResults);

  // 3. GitHub Repositories
  const repoResults = await searchGitHub(searchKeywords);
  resources.push(...repoResults);

  // 4. Articles
  const articleResults = await searchArticles(searchKeywords);
  resources.push(...articleResults);

  // Verify all URLs
  const verifiedResources = await verifyURLs(resources);

  // Cache for 7 days
  await redis.set(cacheKey, verifiedResources, { ex: 604800 });

  return verifiedResources;
}

async function searchYouTube(keywords: string[]): Promise<Resource[]> {
  const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
    params: {
      part: 'snippet',
      q: keywords.join(' '),
      type: 'video',
      order: 'rating',
      maxResults: 3,
      key: process.env.YOUTUBE_API_KEY
    }
  });

  return response.data.items.map(item => ({
    title: item.snippet.title,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    source: 'YouTube' as const,
    type: 'Video' as const,
    isVerified: false // Will be verified in next step
  }));
}
```

---

### **2. URL Verification Service**

```typescript
// lib/services/reshal-link-validator.ts
export async function verifyURLs(resources: Resource[]): Promise<Resource[]> {
  const verifiedResources = await Promise.all(
    resources.map(async (resource) => {
      try {
        const response = await axios.head(resource.url, {
          timeout: 5000,
          headers: {
            'User-Agent': 'PathCraft-AI-Bot/1.0'
          }
        });

        return {
          ...resource,
          isVerified: response.status >= 200 && response.status < 300
        };
      } catch (error) {
        return {
          ...resource,
          isVerified: false
        };
      }
    })
  );

  // Filter out unverified resources
  return verifiedResources.filter(r => r.isVerified);
}
```

---

### **3. Enrichment Orchestrator**

```typescript
// lib/services/reshal-enrichment.ts
export async function enrichWithResources(roadmap: {
  nodes: RoadmapNode[];
  edges: RoadmapEdge[];
  title: string;
  totalEstimatedHours: number;
}) {
  const enrichedNodes = await Promise.all(
    roadmap.nodes.map(async (node) => {
      const resources = await discoverResources(node.searchKeywords);
      
      return {
        ...node,
        resources: resources.slice(0, 6) // Max 6 resources per node
      };
    })
  );

  return {
    ...roadmap,
    nodes: enrichedNodes
  };
}
```

---

## 🔐 Environment Variables

```env
# Database (Sanvi)
DATABASE_URL="postgresql://user:password@host:5432/pathcraft"

# Redis Cache (Reshal)
UPSTASH_REDIS_URL="https://..."
UPSTASH_REDIS_TOKEN="..."

# OpenAI (Kanak)
OPENAI_API_KEY="sk-..."

# YouTube API (Reshal)
YOUTUBE_API_KEY="..."

# GitHub Token (Reshal)
GITHUB_TOKEN="ghp_..."

# Frontend URL (CORS)
FRONTEND_URL="http://localhost:3000"
```

---

## 🚀 Backend Deployment

### **Infrastructure**
- **Hosting**: Vercel (Next.js API Routes)
- **Database**: Neon PostgreSQL or Supabase
- **Cache**: Upstash Redis
- **LLM**: OpenAI GPT-4o

### **Deployment Steps**
1. Setup PostgreSQL instance
2. Run Prisma migrations: `npx prisma migrate deploy`
3. Configure environment variables
4. Deploy to Vercel

---

## 📞 Integration Coordination

### **Weekly Sync Agenda**
- API schema changes
- Error handling patterns
- Performance bottlenecks
- Feature prioritization

### **Shared Artifacts**
- TypeScript types (Git-managed)
- Postman collection
- API documentation (Swagger)

---

**Last Updated**: 2026-08-28  
**Maintained By**: Sanvi (Backend Lead)
