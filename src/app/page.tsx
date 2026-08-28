'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useRoadmapStore } from '@/store/use-roadmap-store';
import { Sparkles, Target, Clock, TrendingUp } from 'lucide-react';

export default function HomePage() {
  const { roadmapId, title } = useRoadmapStore();
  const [showIntake, setShowIntake] = useState(false);

  return (
    <div className="min-h-screen dot-grid-bg">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Logo/Title */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-slate-900">
              PathCraft AI
            </h1>
          </div>

          {/* Tagline */}
          <p className="text-xl text-slate-600 mb-8">
            Adaptive, Self-Healing Learning Roadmaps
          </p>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-card">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Target className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Personalized DAGs</h3>
              <p className="text-sm text-slate-600">
                Custom learning paths based on your skills, time, and goals
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-card">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Verified Resources</h3>
              <p className="text-sm text-slate-600">
                Zero hallucinations - all links are checked and validated
              </p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-card">
              <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center mb-4 mx-auto">
                <TrendingUp className="w-5 h-5 text-violet-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Self-Healing</h3>
              <p className="text-sm text-slate-600">
                Stuck? AI auto-inserts prerequisite topics to get you back on track
              </p>
            </div>
          </div>

          {/* CTA */}
          {roadmapId ? (
            <div className="space-y-4">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-card">
                <p className="text-slate-600 mb-4">Continue your roadmap:</p>
                <h2 className="text-2xl font-bold text-slate-900 mb-6">{title}</h2>
                <div className="flex gap-4 justify-center">
                  <Button 
                    size="lg" 
                    onClick={() => window.location.href = `/roadmap/${roadmapId}`}
                  >
                    Continue Learning
                  </Button>
                  <Button 
                    size="lg" 
                    variant="outline"
                    onClick={() => setShowIntake(true)}
                  >
                    Create New Roadmap
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button 
              size="lg" 
              onClick={() => setShowIntake(true)}
              className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-6 text-lg"
            >
              Create Your Learning Path
            </Button>
          )}
        </div>
      </div>

      {/* Placeholder for Intake Wizard */}
      {showIntake && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl max-w-md">
            <h3 className="text-xl font-bold mb-4">Intake Wizard</h3>
            <p className="text-slate-600 mb-4">
              Coming soon! This will be a multi-step form to capture:
            </p>
            <ul className="list-disc list-inside text-sm text-slate-600 space-y-1 mb-6">
              <li>Your learning goal</li>
              <li>Existing skills</li>
              <li>Weekly time commitment</li>
              <li>Target timeline</li>
            </ul>
            <Button onClick={() => setShowIntake(false)}>Close</Button>
          </div>
        </div>
      )}
    </div>
  );
}
