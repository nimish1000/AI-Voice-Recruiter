'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { InterviewCard } from '@/components/dashboard/interviews/interview-card';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Filter, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';

interface Interview {
  id: string;
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  jobId: string;
  status: string;
  createdAt: string;
  result?: {
    score: number | null;
    recommendation: string | null;
    technical: number | null;
    communication: number | null;
    culture: number | null;
  } | null;
}

interface Job {
  id: string;
  title: string;
}

export default function SchedulesPage() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState('all');
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [interviewsRes, jobsRes] = await Promise.all([
        fetch('/api/interviews'),
        fetch('/api/jobs')
      ]);

      const interviewsData = await interviewsRes.json();
      const jobsData = await jobsRes.json();

      if (interviewsData.success) {
        setInterviews(interviewsData.data);
      }
      if (jobsData.jobs) {
        setJobs(jobsData.jobs);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load interview records');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (id: string) => {
    router.push(`/dashboard/interviews/${id}/result`);
  };

  const filteredInterviews = interviews.filter(interview => {
    const matchesSearch = 
      interview.candidateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      interview.candidateEmail.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesJob = selectedJob === 'all' || interview.jobId === selectedJob;
    
    return matchesSearch && matchesJob;
  });

  const scheduledInterviews = filteredInterviews.filter(i => i.status !== 'completed');
  const completedInterviews = filteredInterviews.filter(i => i.status === 'completed');

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[70vh] items-center justify-center">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Schedules & Interviews</h1>
            <p className="text-gray-400">Track candidate invitations and AI assessment results</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 bg-gray-800/30 p-4 rounded-xl border border-gray-700/50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input 
              placeholder="Search by candidate name or email..." 
              className="pl-10 bg-gray-900/50 border-gray-700 text-white"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64">
            <Select value={selectedJob} onValueChange={setSelectedJob}>
              <SelectTrigger className="bg-gray-900/50 border-gray-700 text-white">
                <Filter className="h-4 w-4 mr-2 text-gray-400" />
                <SelectValue placeholder="Filter by Job" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700 text-white">
                <SelectItem value="all">All Positions</SelectItem>
                {jobs.map(job => (
                  <SelectItem key={job.id} value={job.id}>{job.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dynamic Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Scheduled */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <CalendarIcon className="h-5 w-5 text-blue-400" />
              <h2 className="text-xl font-semibold text-white">Invitations & Scheduled</h2>
              <span className="bg-blue-500/10 text-blue-400 text-xs px-2 py-0.5 rounded-full border border-blue-500/20">
                {scheduledInterviews.length}
              </span>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {scheduledInterviews.length > 0 ? (
                scheduledInterviews.map(interview => (
                  <InterviewCard 
                    key={interview.id} 
                    candidate={interview} 
                    onViewDetails={handleViewDetails}
                  />
                ))
              ) : (
                <div className="bg-gray-800/20 border border-dashed border-gray-700 rounded-xl p-12 text-center">
                  <AlertCircle className="h-10 w-10 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No scheduled interviews found</p>
                  <p className="text-sm text-gray-600">Try adjusting your filters or search terms</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              <h2 className="text-xl font-semibold text-white">Assessment Results</h2>
              <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-500/20">
                {completedInterviews.length}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {completedInterviews.length > 0 ? (
                completedInterviews.map(interview => (
                  <InterviewCard 
                    key={interview.id} 
                    candidate={interview} 
                    onViewDetails={handleViewDetails}
                  />
                ))
              ) : (
                <div className="bg-gray-800/20 border border-dashed border-gray-700 rounded-xl p-12 text-center">
                  <CheckCircle2 className="h-10 w-10 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 font-medium">No completed assessments yet</p>
                  <p className="text-sm text-gray-600">Results will appear here once candidates finish their sessions</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
