# PathCraft AI - Adaptive Learning Roadmap Platform

> An intelligent, graph-based learning path recommendation platform that generates dynamic DAG roadmaps with verified resources and self-healing capabilities.

---

## 📋 Project Overview

PathCraft AI replaces static, one-size-fits-all learning roadmaps with **dynamic Directed Acyclic Graphs (DAGs)** that:
- **Personalize** based on your existing skills, available time, and goals
- **Verify** all learning resources (zero dead links or hallucinated content)
- **Adapt** by automatically inserting prerequisite "bridge" topics when you're stuck
- **Explain** every recommendation with transparent AI reasoning

---

## 👥 Team Structure

| Role | Lead | Responsibility |
|------|------|----------------|
| **Frontend** | Priyanshu | Next.js 15, React Flow canvas, interactive UI |
| **AI Orchestration** | Kanak | LLM-based DAG generation, re-routing, quiz generation |
| **Resource Discovery** | Reshal | Multi-source scraping, URL verification, caching |
| **Database & APIs** | Sanvi | PostgreSQL, Prisma ORM, REST endpoints |

---

## 🗂️ Repository Documentation

### **📖 Essential Guides**

1. **[INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md)**  
   Complete frontend-backend integration architecture with:
   - Design system specifications (color palette, typography)
   - API endpoint contracts
   - Component architecture
   - State management patterns

2. **[FRONTEND_BRANCH_STRUCTURE.md](./FRONTEND_BRANCH_STRUCTURE.md)**  
   Frontend implementation roadmap:
   - File structure and components
   - Phase-by-phase implementation plan
   - Code examples for key components
   - Backend integration checklist

3. **[BACKEND_INTEGRATION_REFERENCE.md](./BACKEND_INTEGRATION_REFERENCE.md)**  
   Backend services and data flows:
   - Prisma database schema
   - API endpoint implementations
   - Kanak's AI services (DAG generation, re-routing, quizzes)
   - Reshal's resource discovery pipeline

4. **[QUICK_START_CHECKLIST.md](./QUICK_START_CHECKLIST.md)**  
   Week-by-week implementation checklist:
   - Daily tasks for each team member
   - Integration milestones
   - Testing protocols
   - Deployment checklist

---

## 🎨 Frontend Tech Stack

- **Framework**: Next.js 15 (App Router, React 19)
- **Visualization**: @xyflow/react + Dagre layout
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand (with localStorage persistence)
- **Animation**: Framer Motion + canvas-confetti
- **Icons**: Lucide React

### Key Features:
✅ Interactive DAG canvas with zoom/pan  
✅ Auto-layout with Dagre algorithm  
✅ 3 node variants (Standard, Milestone, AI Bridge)  
✅ Slide-over resource drawer with verified links  
✅ Diagnostic micro-quizzes with instant feedback  
✅ Dynamic re-routing when users get stuck  
✅ Real-time progress tracking

---

## 🔧 Backend Tech Stack

- **API**: Next.js Route Handlers / Server Actions
- **Database**: PostgreSQL (Prisma ORM)
- **Cache**: Upstash Redis
- **AI**: OpenAI GPT-4o / Anthropic Claude
- **Validation**: Zod schemas

### Key Services:
- **Kanak's Layer**: LLM orchestration for DAG generation, re-routing, quizzes
- **Reshal's Layer**: Multi-source resource discovery (YouTube, GitHub, MDN) + URL verification
- **Sanvi's Layer**: Database persistence, progress tracking, API endpoints

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database
- OpenAI API key
- YouTube API key (optional)

### Installation

```bash
# Clone repository
git clone <repo-url>
cd pathcraft-ai

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your keys

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📊 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERFACE (Priyanshu)              │
│  Next.js 15 │ React Flow Canvas │ Zustand State Manager   │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     API LAYER (Sanvi)                       │
│  /api/roadmap/generate │ /api/progress/update              │
│  /api/roadmap/reroute  │ /api/quiz/*                       │
└──────────┬────────────────────────┬─────────────────────────┘
           │                        │
           ↓                        ↓
┌──────────────────────┐  ┌──────────────────────────────────┐
│   AI ORCHESTRATION   │  │   RESOURCE DISCOVERY (Reshal)    │
│      (Kanak)         │  │  YouTube │ GitHub │ MDN │ Docs   │
│  GPT-4o │ Claude     │  │  URL Verification │ Redis Cache  │
└──────────────────────┘  └──────────────────────────────────┘
           │
           ↓
┌─────────────────────────────────────────────────────────────┐
│              DATABASE (Sanvi)                               │
│  PostgreSQL │ Prisma ORM │ User │ Roadmap │ Progress       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Core User Flow

1. **Intake**: User describes goal, existing skills, weekly hours, timeline
2. **Generation**: Backend generates personalized DAG with verified resources
3. **Visualization**: Frontend displays interactive canvas with auto-layout
4. **Learning**: User explores nodes, accesses resources, takes quizzes
5. **Progress**: Completion tracked, percentage updated, milestones celebrated
6. **Adaptation**: If stuck, system auto-inserts prerequisite bridge topics

---

## 📖 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/roadmap/generate` | POST | Generate personalized DAG |
| `/api/progress/update` | POST | Update node completion status |
| `/api/roadmap/reroute` | POST | Insert bridge nodes when stuck |
| `/api/quiz/:nodeId` | GET | Fetch diagnostic quiz |
| `/api/quiz/submit` | POST | Grade quiz and auto-complete |

See [BACKEND_INTEGRATION_REFERENCE.md](./BACKEND_INTEGRATION_REFERENCE.md) for detailed schemas.

---

## 🎨 Design System

### Color Palette (Light Theme)
- **Page Canvas**: #F8FAFC (Slate-50) with subtle dot grid
- **Cards**: #FFFFFF with #E2E8F0 border
- **Primary**: #4F46E5 (Indigo-600)
- **Completed**: #10B981 (Emerald)
- **In-Progress**: #F59E0B (Amber)
- **Stuck**: #F43F5E (Rose)
- **AI Bridge**: #8B5CF6 (Violet) with dashed border

### Typography
- **Font**: Inter or Geist Sans
- **Headers**: 600 weight, #0F172A
- **Body**: 400 weight, #64748B

---

## 🧪 Testing

```bash
# Frontend
npm run dev          # Development server
npm run build        # Production build
npm run lint         # Linting

# Backend
npm run test         # Unit tests
npm run test:e2e     # End-to-end tests
npx prisma studio    # Database GUI
```

---

## 📦 Deployment

### Frontend (Vercel)
```bash
vercel --prod
```

### Backend
- Database: Neon PostgreSQL / Supabase
- API: Vercel Serverless Functions
- Cache: Upstash Redis

---

## 🤝 Contributing

1. Read documentation files in this repo
2. Follow the [QUICK_START_CHECKLIST.md](./QUICK_START_CHECKLIST.md)
3. Coordinate with your team lead for task assignment
4. Submit PRs to `develop` branch

---

## 📄 License

MIT License - See LICENSE file for details

---

## 📞 Support

- **Frontend Issues**: Contact Priyanshu
- **AI/Backend Issues**: Contact Kanak
- **Resource Pipeline**: Contact Reshal
- **Database/API**: Contact Sanvi

---

**Project Status**: In Development  
**Target Launch**: Q4 2026  
**Last Updated**: August 28, 2026