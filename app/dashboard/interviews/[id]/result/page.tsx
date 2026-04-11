'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  Trophy, 
  MessageSquare, 
  Briefcase, 
  CheckCircle2, 
  XCircle, 
  Brain, 
  Target,
  Clock,
  User,
  ArrowLeft,
  Loader2,
  Sparkles,
  AlertCircle,
  FileText,
  Calendar,
  ChevronRight,
  Users
} from "lucide-react";
import { toast } from 'sonner';

interface InterviewDetails {
  id: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  status: string;
  duration: number;
  completedAt: string;
  summary: {
    overallScore: number;
    recommendation: string;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    technicalScore: number;
    communicationScore: number;
    culturalFitScore: number;
  } | null;
  responses: {
    questionNumber: number;
    question: string;
    category: string;
    userResponse: string;
  }[];
}

export default function InterviewResultPage() {
  const params = useParams();
  const router = useRouter();
  const interviewId = params.id as string;
  
  const [details, setDetails] = useState<InterviewDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (interviewId) {
      fetchDetails();
    }
  }, [interviewId]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/interviews/${interviewId}/details`);
      const result = await response.json();
      if (result.success) {
        setDetails(result.data);
      } else {
        toast.error(result.error || 'Failed to load report');
        router.push('/dashboard/schedules');
      }
    } catch (error) {
      console.error('Error fetching interview details:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getRecommendationBadge = (rec: string | undefined) => {
    switch (rec) {
      case 'strong_hire': 
        return <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/50 px-4 py-1.5 text-sm font-semibold">Strong Hire</Badge>;
      case 'hire': 
        return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/50 px-4 py-1.5 text-sm font-semibold">Hire</Badge>;
      case 'no_hire': 
        return <Badge className="bg-red-500/10 text-red-400 border-red-500/50 px-4 py-1.5 text-sm font-semibold">No Hire</Badge>;
      case 'strong_no_hire': 
        return <Badge className="bg-red-900/30 text-red-500 border-red-800/50 px-4 py-1.5 text-sm font-semibold">Strong No Hire</Badge>;
      default: 
        return <Badge variant="outline" className="text-gray-400 border-gray-700 px-4 py-1.5 text-sm">Pending</Badge>;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[70vh] items-center justify-center">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-t-2 border-r-2 border-blue-500 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Brain className="h-8 w-8 text-blue-500/50" />
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white mb-2">Generating Report</h2>
              <p className="text-gray-400 animate-pulse">Analyzing candidate interview data...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!details) return null;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-10 max-w-7xl mx-auto space-y-8">
        {/* Navigation & Actions */}
        <div className="flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => router.push('/dashboard/schedules')}
            className="text-gray-400 hover:text-white hover:bg-gray-800 -ml-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Schedules
          </Button>
          
          <div className="flex items-center gap-3">
             <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/5">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Assessment Complete
             </Badge>
          </div>
        </div>

        {/* Hero Header */}
        <div className="relative overflow-hidden bg-gray-800/30 border border-gray-700/50 rounded-3xl p-8 lg:p-12">
           {/* Background decorative elements */}
           <div className="absolute top-0 right-0 -mr-20 -mt-20 h-64 w-64 rounded-full bg-blue-600/10 blur-[100px]" />
           <div className="absolute bottom-0 left-0 -ml-20 -mb-20 h-64 w-64 rounded-full bg-purple-600/10 blur-[100px]" />
           
           <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="flex items-center gap-6">
                 <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-blue-500/20">
                    <User className="h-10 w-10 text-white" />
                 </div>
                 <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">{details.candidateName}</h1>
                    <p className="text-gray-400 mt-2 flex items-center gap-4 text-sm lg:text-base">
                       <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" /> {details.jobTitle}</span>
                       <span className="hidden sm:inline text-gray-700">•</span>
                       <span className="flex items-center gap-1.5"><FileText className="h-4 w-4" /> {details.candidateEmail}</span>
                    </p>
                 </div>
              </div>
              
              <div className="flex items-center gap-6 bg-gray-901/50 backdrop-blur-md p-6 rounded-2xl border border-white/5">
                 <div className="text-right">
                    <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-500 mb-2">Recommendation</p>
                    {getRecommendationBadge(details.summary?.recommendation)}
                 </div>
                 <div className="h-12 w-[1px] bg-gray-700" />
                 <div className="flex flex-col items-center">
                    <span className="text-4xl font-black text-white leading-none">{details.summary?.overallScore || 0}</span>
                    <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">AI Score</span>
                 </div>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           {/* Main Content (Left) */}
           <div className="lg:col-span-2 space-y-8">
              
              {/* Detailed Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 {[
                    { label: 'Technical Accuracy', score: details.summary?.technicalScore || 0, icon: Target, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                    { label: 'Communication', score: details.summary?.communicationScore || 0, icon: MessageSquare, color: 'text-purple-400', bg: 'bg-purple-400/10' },
                    { label: 'Cultural Alignment', score: details.summary?.culturalFitScore || 0, icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
                 ].map((metric) => (
                    <div key={metric.label} className={`${metric.bg} border border-white/5 p-6 rounded-2xl group transition-all hover:border-white/10`}>
                       <metric.icon className={`h-5 w-5 ${metric.color} mb-4`} />
                       <div className="flex justify-between items-end mb-2">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{metric.label}</span>
                          <span className={`text-xl font-bold ${metric.color}`}>{metric.score}%</span>
                       </div>
                       <Progress value={metric.score} className="h-1.5" />
                    </div>
                 ))}
              </div>

              {/* AI Narrative Result */}
              <div className="bg-gray-800/20 border border-gray-700/50 rounded-3xl p-8">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-amber-400/10">
                       <Sparkles className="h-5 w-5 text-amber-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">Qualitative Assessment</h2>
                 </div>
                 <div className="prose prose-invert max-w-none text-gray-300 leading-relaxed text-base whitespace-pre-wrap">
                    {details.summary?.summary}
                 </div>
              </div>

              {/* Full Transcript */}
              <div className="space-y-6">
                 <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                       <div className="p-2 rounded-lg bg-blue-500/10">
                          <MessageSquare className="h-5 w-5 text-blue-400" />
                       </div>
                       <h2 className="text-xl font-bold text-white">Interview Transcript</h2>
                    </div>
                    <Badge variant="ghost" className="text-gray-500 text-xs uppercase tracking-widest">{details.responses.length} Questions</Badge>
                 </div>

                 <div className="space-y-6">
                    {details.responses.map((resp, i) => (
                       <div key={i} className="group relative bg-gray-800/40 border border-white/5 rounded-3xl p-8 hover:bg-gray-800/60 transition-all">
                          <div className="flex items-start gap-6">
                             <div className="h-10 w-10 rounded-xl bg-gray-800 flex items-center justify-center shrink-0 border border-gray-700 font-bold text-gray-400 text-sm">
                                {resp.questionNumber}
                             </div>
                             <div className="space-y-6 flex-1">
                                <div>
                                   <Badge variant="outline" className="mb-3 text-[10px] uppercase font-bold text-blue-400 border-blue-400/20 bg-blue-400/5">
                                      {resp.category}
                                   </Badge>
                                   <p className="text-lg font-semibold text-white leading-tight">
                                      {resp.question}
                                   </p>
                                </div>
                                <div className="pl-6 border-l-2 border-blue-500/20 py-1">
                                   <p className="text-gray-300 text-base leading-relaxed italic font-serif">
                                      "{resp.userResponse}"
                                   </p>
                                </div>
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Sidebar Info (Right) */}
           <div className="space-y-8">
              {/* Highlights & Meta */}
              <div className="bg-gray-800/40 border border-gray-700/50 rounded-3xl p-8 sticky top-10 overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Target className="h-32 w-32 text-red-500" />
                 </div>
                 
                 <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                    <Target className="h-4 w-4 text-red-400" />
                    Key Highlights
                 </h3>

                 <div className="space-y-8 relative z-10">
                    {/* Strengths */}
                    {details.summary?.strengths && (
                       <div className="space-y-4">
                          <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                             <CheckCircle2 className="h-4 w-4" /> 
                             Top Strengths
                          </p>
                          <div className="space-y-2">
                             {details.summary.strengths.map((s, i) => (
                                <div key={i} className="flex items-start gap-3 bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10">
                                   <ChevronRight className="h-3 w-3 text-emerald-500 mt-1 shrink-0" />
                                   <span className="text-sm text-gray-300 leading-tight">{s}</span>
                                </div>
                             ))}
                          </div>
                       </div>
                    )}

                    {/* Weaknesses */}
                    {details.summary?.weaknesses && (
                       <div className="space-y-4">
                          <p className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                             <AlertCircle className="h-4 w-4" /> 
                             Weakness Areas
                          </p>
                          <div className="space-y-2">
                             {details.summary.weaknesses.map((w, i) => (
                                <div key={i} className="flex items-start gap-3 bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                                   <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                                   <span className="text-sm text-gray-300 leading-tight">{w}</span>
                                </div>
                             ))}
                          </div>
                       </div>
                    )}

                    {/* Session Metadata */}
                    <div className="pt-8 border-t border-gray-700 space-y-4">
                       <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 flex items-center gap-2"><Calendar className="h-3 w-3" /> Date</span>
                          <span className="text-gray-300 font-medium">{new Date(details.completedAt).toLocaleDateString()}</span>
                       </div>
                       <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 flex items-center gap-2"><Clock className="h-3 w-3" /> Duration</span>
                          <span className="text-gray-300 font-medium">{formatDuration(details.duration)}</span>
                       </div>
                       <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-500 flex items-center gap-2"><Clock className="h-3 w-3" /> Interview ID</span>
                          <span className="text-[10px] text-gray-500 font-mono tracking-tighter truncate max-w-[120px]">{details.id}</span>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
