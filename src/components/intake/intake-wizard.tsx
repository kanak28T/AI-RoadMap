'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';
import { useRoadmapStore } from '@/store/use-roadmap-store';
import { api } from '@/lib/api';
import type { GenerateRoadmapRequest } from '@/types';

interface IntakeWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COMMON_SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'React', 'Node.js',
  'SQL', 'Git', 'HTML/CSS', 'Java', 'C++', 'Docker', 'AWS'
];

const COMMON_GOALS = [
  'Fullstack Developer',
  'AI/ML Engineer',
  'DevOps Engineer',
  'Data Scientist',
  'Mobile Developer',
  'Cloud Architect',
];

export function IntakeWizard({ open, onOpenChange }: IntakeWizardProps) {
  const router = useRouter();
  const setRoadmap = useRoadmapStore((state) => state.setRoadmap);
  
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<GenerateRoadmapRequest>({
    goal: '',
    existingSkills: [],
    weeklyHours: 10,
    targetWeeks: 8,
  });

  const handleSkillToggle = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      existingSkills: prev.existingSkills.includes(skill)
        ? prev.existingSkills.filter((s) => s !== skill)
        : [...prev.existingSkills, skill],
    }));
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await api.generateRoadmap(formData);
      setRoadmap(response);
      onOpenChange(false);
      router.push(`/roadmap/${response.roadmapId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate roadmap');
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    if (step === 1) return formData.goal.trim().length > 0;
    if (step === 2) return formData.existingSkills.length > 0;
    if (step === 3) return formData.weeklyHours > 0;
    if (step === 4) return formData.targetWeeks > 0;
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="w-6 h-6 text-brand-600" />
            Create Your Learning Path
          </DialogTitle>
          <DialogDescription>
            Tell us about your goals and we'll craft a personalized roadmap
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Indicator */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`h-2 flex-1 rounded-full transition-colors ${
                  i <= step ? 'bg-brand-600' : 'bg-slate-200'
                }`}
              />
            ))}
          </div>

          {/* Step 1: Goal */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  What's your learning goal?
                </label>
                <Input
                  placeholder="e.g., Fullstack Next.js & AI Agent Engineer"
                  value={formData.goal}
                  onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
                  className="text-base"
                />
              </div>
              
              <div>
                <p className="text-sm text-slate-600 mb-3">Quick suggestions:</p>
                <div className="flex flex-wrap gap-2">
                  {COMMON_GOALS.map((goal) => (
                    <Badge
                      key={goal}
                      variant="outline"
                      className="cursor-pointer hover:bg-brand-50 hover:border-brand-600"
                      onClick={() => setFormData({ ...formData, goal })}
                    >
                      {goal}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Skills */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  What do you already know?
                </label>
                <p className="text-sm text-slate-600 mb-3">
                  Select all that apply (we'll skip these in your roadmap)
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {COMMON_SKILLS.map((skill) => (
                  <Badge
                    key={skill}
                    variant={formData.existingSkills.includes(skill) ? 'default' : 'outline'}
                    className="cursor-pointer transition-colors"
                    onClick={() => handleSkillToggle(skill)}
                  >
                    {skill}
                  </Badge>
                ))}
              </div>

              <div className="pt-2">
                <p className="text-xs text-slate-500">
                  Selected: {formData.existingSkills.length} skills
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Weekly Hours */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  How many hours per week can you dedicate?
                </label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min="1"
                    max="40"
                    value={formData.weeklyHours}
                    onChange={(e) => setFormData({ ...formData, weeklyHours: parseInt(e.target.value) || 0 })}
                    className="text-base w-24"
                  />
                  <span className="text-slate-600">hours/week</span>
                </div>
              </div>

              <div className="flex gap-2">
                {[5, 10, 15, 20].map((hours) => (
                  <Button
                    key={hours}
                    variant={formData.weeklyHours === hours ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData({ ...formData, weeklyHours: hours })}
                  >
                    {hours}h
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Timeline */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  What's your target timeline?
                </label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min="1"
                    max="52"
                    value={formData.targetWeeks}
                    onChange={(e) => setFormData({ ...formData, targetWeeks: parseInt(e.target.value) || 0 })}
                    className="text-base w-24"
                  />
                  <span className="text-slate-600">weeks</span>
                </div>
              </div>

              <div className="flex gap-2">
                {[4, 8, 12, 16].map((weeks) => (
                  <Button
                    key={weeks}
                    variant={formData.targetWeeks === weeks ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormData({ ...formData, targetWeeks: weeks })}
                  >
                    {weeks}w
                  </Button>
                ))}
              </div>

              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-700">
                  <strong>Estimated commitment:</strong>{' '}
                  {formData.weeklyHours * formData.targetWeeks} total hours over{' '}
                  {formData.targetWeeks} weeks
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
              <p className="text-sm text-rose-800">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-600 mb-4" />
              <p className="text-sm text-slate-600 mb-2">Synthesizing your learning path...</p>
              <p className="text-xs text-slate-500">This may take 15-30 seconds</p>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        {!isLoading && (
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => step > 1 ? setStep(step - 1) : onOpenChange(false)}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              {step > 1 ? 'Back' : 'Cancel'}
            </Button>

            {step < 4 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed() || isLoading}
                className="bg-brand-600 hover:bg-brand-700"
              >
                Generate Roadmap
                <Sparkles className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
