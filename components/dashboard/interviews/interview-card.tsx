'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  User, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Trophy,
  MessageSquare,
  Users,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface InterviewCardProps {
  candidate: {
    id: string;
    candidateName: string;
    candidateEmail: string;
    jobTitle: string;
    status: string;
    createdAt: string;
    result?: {
      score: number | null;
      recommendation: string | null;
      technical: number | null;
      communication: number | null;
      culture: number | null;
    } | null;
  };
  onViewDetails?: (id: string) => void;
}

export function InterviewCard({ candidate, onViewDetails }: InterviewCardProps) {
  const isCompleted = candidate.status === 'completed';
  
  const getRecommendationColor = (rec: string | null) => {
    switch (rec) {
      case 'strong_hire': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50';
      case 'hire': return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'no_hire': return 'bg-red-500/20 text-red-400 border-red-500/50';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };

  const formatRecommendation = (rec: string | null) => {
    if (!rec) return 'Pending';
    return rec.replace('_', ' ').toUpperCase();
  };

  return (
    <Card className="bg-gray-800/40 border-gray-700/50 hover:bg-gray-800/60 transition-all duration-200 overflow-hidden group">
      <CardContent className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isCompleted ? 'bg-emerald-500/10' : 'bg-blue-500/10'}`}>
              <User className={`h-5 w-5 ${isCompleted ? 'text-emerald-400' : 'text-blue-400'}`} />
            </div>
            <div>
              <h3 className="text-white font-semibold flex items-center gap-2">
                {candidate.candidateName}
                {isCompleted && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
              </h3>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {candidate.candidateEmail}
              </p>
            </div>
          </div>
          <Badge variant="outline" className={
            candidate.status === 'completed' ? 'border-emerald-500/50 text-emerald-400' :
            candidate.status === 'in_progress' ? 'border-blue-500/50 text-blue-400 animate-pulse' :
            'border-gray-600 text-gray-400'
          }>
            {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 flex items-center gap-1 uppercase tracking-wider font-medium">
              Job Title
            </span>
            <span className="text-white font-medium bg-gray-700/50 px-2 py-0.5 rounded">
              {candidate.jobTitle}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 flex items-center gap-1 uppercase tracking-wider font-medium">
              Applied On
            </span>
            <span className="text-gray-300">
              {new Date(candidate.createdAt).toLocaleDateString()}
            </span>
          </div>

          {isCompleted && candidate.result && (
            <div className="mt-4 pt-4 border-t border-gray-700/50 space-y-4">
              <div className="flex items-center justify-between">
                <Badge className={getRecommendationColor(candidate.result.recommendation)}>
                  {formatRecommendation(candidate.result.recommendation)}
                </Badge>
                <div className="flex items-center gap-1">
                  <span className="text-2xl font-bold text-white">{candidate.result.score}</span>
                  <span className="text-xs text-gray-500">/100</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="bg-gray-900/40 p-2 rounded text-center">
                  <p className="text-[10px] text-gray-500 uppercase">Tech</p>
                  <p className="text-sm font-bold text-blue-400">{candidate.result.technical}%</p>
                </div>
                <div className="bg-gray-900/40 p-2 rounded text-center">
                  <p className="text-[10px] text-gray-500 uppercase">Comm</p>
                  <p className="text-sm font-bold text-purple-400">{candidate.result.communication}%</p>
                </div>
                <div className="bg-gray-900/40 p-2 rounded text-center">
                  <p className="text-[10px] text-gray-500 uppercase">Culture</p>
                  <p className="text-sm font-bold text-emerald-400">{candidate.result.culture}%</p>
                </div>
              </div>

              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewDetails?.(candidate.id);
                }}
                className="w-full mt-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 border border-blue-500/20 group/btn"
              >
                View Full Report
                <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover/btn:translate-x-1" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
