'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  X, ExternalLink, CheckCircle2, AlertCircle, Loader2,
  Sparkles, Youtube, Github, FileText, BookOpen, Clock,
  ChevronRight, RotateCcw, Trophy,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { RoadmapNode, DiagnosticQuiz, QuizQuestion } from '@/types';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface NodeDrawerProps {
  node: RoadmapNode | null;
  roadmapId: string;
  onClose: () => void;
  onMarkComplete: (nodeId: string) => void;
  onMarkStuck: (nodeId: string) => void;
  onReroute: (nodeId: string, context?: string) => Promise<void>;
  onNodeCompleted: (nodeId: string) => void;
}

function SourceIcon({ source }: { source: string }) {
  if (source === 'YouTube') return <Youtube className="w-4 h-4 text-red-500" />;
  if (source === 'GitHub') return <Github className="w-4 h-4 text-slate-700" />;
  if (source === 'Official Docs') return <BookOpen className="w-4 h-4 text-blue-600" />;
  return <FileText className="w-4 h-4 text-emerald-600" />;
}

function statusLabel(status: string) {
  const map: Record<string, string> = {
    PENDING: 'Not started',
    IN_PROGRESS: 'In progress',
    COMPLETED: 'Completed',
    STUCK: 'Stuck',
  };
  return map[status] ?? status;
}

function statusClasses(status: string) {
  switch (status) {
    case 'COMPLETED': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'IN_PROGRESS': return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'STUCK': return 'bg-rose-100 text-rose-800 border-rose-300';
    default: return 'bg-slate-100 text-slate-600 border-slate-300';
  }
}

// ── Quiz Sub-component ────────────────────────────────────────────────────────
function QuizSection({
  nodeId,
  roadmapId,
  onPassed,
}: {
  nodeId: string;
  roadmapId: string;
  onPassed: () => void;
}) {
  const [quiz, setQuiz] = useState<DiagnosticQuiz | null>(null);
  const [loading, setLoading] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([null, null, null]);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean; explanations: string[] } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stuckContext, setStuckContext] = useState('');
  const [showStuckInput, setShowStuckInput] = useState(false);

  const fetchQuiz = async () => {
    setLoading(true);
    try {
      const q = await api.getQuiz(nodeId, roadmapId);
      setQuiz(q);
      setAnswers(new Array(q.questions.length).fill(null));
    } catch {
      // silently fail — quiz unavailable
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!quiz || answers.some((a) => a === null)) return;
    setSubmitting(true);
    try {
      const res = await api.submitQuiz({
        roadmapId,
        nodeId,
        answers: answers as number[],
      });
      setResult(res);
      setSubmitted(true);
      if (res.passed) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.4 } });
        setTimeout(onPassed, 800);
      }
    } catch {
      // handle error
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSubmitted(false);
    setResult(null);
    setAnswers(new Array(quiz?.questions.length ?? 3).fill(null));
  };

  if (!quiz && !loading) {
    return (
      <Button variant="outline" size="sm" onClick={fetchQuiz} className="w-full">
        <Sparkles className="w-4 h-4 mr-2 text-brand-600" />
        Load Diagnostic Quiz
      </Button>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Generating questions...
      </div>
    );
  }

  if (!quiz) return null;

  return (
    <div className="space-y-4">
      {quiz.questions.map((q: QuizQuestion, qi: number) => (
        <div key={qi} className="space-y-2">
          <p className="text-sm font-medium text-slate-900">
            {qi + 1}. {q.question}
          </p>
          <div className="space-y-1.5">
            {q.options.map((opt: string, oi: number) => {
              const isSelected = answers[qi] === oi;
              const isCorrect = submitted && oi === q.answerIndex;
              const isWrong = submitted && isSelected && oi !== q.answerIndex;
              return (
                <button
                  key={oi}
                  disabled={submitted}
                  onClick={() => {
                    if (!submitted) {
                      const next = [...answers];
                      next[qi] = oi;
                      setAnswers(next);
                    }
                  }}
                  className={cn(
                    'w-full text-left text-sm px-3 py-2 rounded-lg border transition-colors',
                    isCorrect && 'bg-emerald-50 border-emerald-400 text-emerald-800',
                    isWrong && 'bg-rose-50 border-rose-400 text-rose-800',
                    !submitted && isSelected && 'bg-brand-50 border-brand-400 text-brand-800',
                    !submitted && !isSelected && 'bg-white border-slate-200 hover:bg-slate-50'
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {/* Explanation after submit */}
          {submitted && result && (
            <p className="text-xs text-slate-600 italic pl-2 border-l-2 border-slate-200">
              {result.explanations[qi]}
            </p>
          )}
        </div>
      ))}

      {!submitted ? (
        <Button
          onClick={handleSubmit}
          disabled={answers.some((a) => a === null) || submitting}
          className="w-full bg-brand-600 hover:bg-brand-700"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Submit Answers
        </Button>
      ) : (
        <div className="space-y-2">
          <div className={cn(
            'p-3 rounded-lg text-sm font-medium text-center',
            result?.passed ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
          )}>
            {result?.passed
              ? '🎉 Perfect score! Node marked as completed.'
              : `Score: ${result?.score}% — Try again to pass!`}
          </div>
          {!result?.passed && (
            <Button variant="outline" size="sm" onClick={reset} className="w-full">
              <RotateCcw className="w-4 h-4 mr-2" />
              Retry Quiz
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Drawer ───────────────────────────────────────────────────────────────
export function NodeDrawer({
  node,
  roadmapId,
  onClose,
  onMarkComplete,
  onMarkStuck,
  onReroute,
  onNodeCompleted,
}: NodeDrawerProps) {
  const [rerouteLoading, setRerouteLoading] = useState(false);
  const [stuckContext, setStuckContext] = useState('');
  const [showStuckInput, setShowStuckInput] = useState(false);
  const [activeTab, setActiveTab] = useState<'resources' | 'quiz'>('resources');

  // Reset tab when node changes
  useEffect(() => {
    setActiveTab('resources');
    setShowStuckInput(false);
    setStuckContext('');
  }, [node?.id]);

  const handleReroute = async () => {
    if (!node) return;
    setRerouteLoading(true);
    try {
      await onReroute(node.id, stuckContext || undefined);
      onMarkStuck(node.id);
      setShowStuckInput(false);
    } finally {
      setRerouteLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {node && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 z-20"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-[480px] bg-white border-l border-slate-200 shadow-2xl z-30 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-slate-100">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {node.type === 'milestone' && (
                    <Trophy className="w-4 h-4 text-amber-500" />
                  )}
                  <Badge
                    className={cn('text-xs border', {
                      'bg-blue-100 text-blue-700 border-blue-200': node.level === 'Prerequisite',
                      'bg-purple-100 text-purple-700 border-purple-200': node.level === 'Core',
                      'bg-orange-100 text-orange-700 border-orange-200': node.level === 'Advanced',
                    })}
                  >
                    {node.level}
                  </Badge>
                  <Badge className={cn('text-xs border', statusClasses(node.status))}>
                    {statusLabel(node.status)}
                  </Badge>
                </div>
                <h2 className="text-lg font-bold text-slate-900 leading-snug">
                  {node.title}
                </h2>
                <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  {node.estimatedHours}h estimated
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-slate-500" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Section 1 – XAI: Why this is in your path */}
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-brand-600" />
                  <span className="text-xs font-semibold text-brand-700 uppercase tracking-wide">
                    Why this is in your path
                  </span>
                </div>
                <p className="text-sm text-indigo-900 leading-relaxed">
                  {node.whyRecommended}
                </p>
              </div>

              {/* Tabs: Resources | Quiz */}
              <div className="flex border border-slate-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setActiveTab('resources')}
                  className={cn(
                    'flex-1 py-2 text-sm font-medium transition-colors',
                    activeTab === 'resources'
                      ? 'bg-brand-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  )}
                >
                  Verified Resources
                </button>
                <button
                  onClick={() => setActiveTab('quiz')}
                  className={cn(
                    'flex-1 py-2 text-sm font-medium transition-colors',
                    activeTab === 'quiz'
                      ? 'bg-brand-600 text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-50'
                  )}
                >
                  Diagnostic Quiz
                </button>
              </div>

              {/* Section 2 – Verified Resources */}
              {activeTab === 'resources' && (
                <div className="space-y-2">
                  {node.resources && node.resources.length > 0 ? (
                    node.resources.map((res, idx) => (
                      <a
                        key={idx}
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-start gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-brand-300 hover:shadow-card-hover transition-all group"
                      >
                        <div className="flex-shrink-0 mt-0.5">
                          <SourceIcon source={res.source} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate group-hover:text-brand-700">
                            {res.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="outline" className="text-xs">
                              {res.source}
                            </Badge>
                            {res.isVerified && (
                              <span className="flex items-center gap-0.5 text-xs text-emerald-600">
                                <CheckCircle2 className="w-3 h-3" />
                                Verified
                              </span>
                            )}
                          </div>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5 group-hover:text-brand-600" />
                      </a>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500 text-center py-4">
                      No resources available for this node yet.
                    </p>
                  )}
                </div>
              )}

              {/* Section 3 – Diagnostic Quiz */}
              {activeTab === 'quiz' && (
                <QuizSection
                  nodeId={node.id}
                  roadmapId={roadmapId}
                  onPassed={() => onNodeCompleted(node.id)}
                />
              )}

              {/* Section 4 – Stuck / Re-routing */}
              {node.status !== 'COMPLETED' && (
                <div className="border border-rose-200 bg-rose-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span className="text-sm font-semibold text-rose-800">
                      Struggling with this topic?
                    </span>
                  </div>
                  <p className="text-xs text-rose-700">
                    PathCraft AI will generate prerequisite bridge topics to unblock you.
                  </p>

                  {!showStuckInput ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-rose-300 text-rose-700 hover:bg-rose-100"
                      onClick={() => setShowStuckInput(true)}
                    >
                      <AlertCircle className="w-4 h-4 mr-2" />
                      I'm Stuck — Get Help
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <textarea
                        placeholder="(Optional) Describe what's confusing you..."
                        value={stuckContext}
                        onChange={(e) => setStuckContext(e.target.value)}
                        className="w-full text-sm border border-rose-200 rounded-lg p-2 resize-none h-16 focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                          onClick={handleReroute}
                          disabled={rerouteLoading}
                        >
                          {rerouteLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                          )}
                          Add Bridge Topics
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowStuckInput(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer actions */}
            {node.status !== 'COMPLETED' && (
              <div className="p-4 border-t border-slate-100 flex gap-2">
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => { onMarkComplete(node.id); onClose(); }}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Mark as Complete
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setActiveTab('quiz')}
                >
                  Take Quiz
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
