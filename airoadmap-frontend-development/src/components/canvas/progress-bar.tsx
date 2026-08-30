'use client';

import { Badge } from '@/components/ui/badge';
import { useRoadmapStore } from '@/store/use-roadmap-store';
import { Target, Trophy } from 'lucide-react';

export function ProgressBar() {
  const {
    title,
    completionPercentage,
    getCompletedCount,
    getMilestoneCount,
    getCompletedMilestones,
    nodes,
    spine,
  } = useRoadmapStore();

  const subTopics = spine.flatMap((node) => node.subTopics ?? []);
  const completedSubtopics = subTopics.filter((topic) => topic.status === 'COMPLETED').length;
  const totalSubtopics = subTopics.length;
  const completedCount = totalSubtopics > 0
    ? completedSubtopics
    : getCompletedCount();
  const totalNodes = totalSubtopics > 0 ? totalSubtopics : nodes.length;
  const progress = totalNodes > 0 ? Math.round((completedCount / totalNodes) * 100) : 0;
  const milestoneCount = getMilestoneCount();
  const completedMilestones = getCompletedMilestones();

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
      <div className="w-[calc(100vw-2rem)] max-w-[400px] bg-white border border-slate-200 rounded-xl shadow-card p-4">
        {/* Title */}
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-brand-600" />
          <h2 className="font-semibold text-slate-900 text-sm truncate">
            {title}
          </h2>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
            <span>Progress</span>
            <span className="font-semibold">{totalSubtopics > 0 ? progress : completionPercentage}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-600 to-brand-500 transition-all duration-500"
              style={{ width: `${totalSubtopics > 0 ? progress : completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <Badge variant="outline" className="text-xs">
              {completedCount}/{totalNodes} Topics
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Trophy className="w-3 h-3 text-amber-500" />
            <span className="text-slate-600">
              {completedMilestones}/{milestoneCount} Milestones
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
