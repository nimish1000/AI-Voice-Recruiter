'use client';

import { useEffect, useState } from 'react';
import { Plus, Grid3x3, List, Briefcase, MapPin, Calendar, Trash2, Eye, Sparkles, Search, X, CheckCircle2, AlertCircle, Mail, Send, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DashboardLayout } from '@/components/dashboard-layout';
import { AddJobDialog } from '@/components/jobs/add-job-dialog';
import { toast } from 'sonner';

interface Job {
  id: string;
  title: string;
  description: string | null;
  requirements: string[] | null;
  location: string | null;
  type: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface CandidateMatch {
  candidateId: string;
  name: string;
  email: string;
  matchScore: number;
  matchPercentage: string;
  strengths: string[];
  gaps: string[];
  summary: string;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [isMatching, setIsMatching] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);
  const [showMatches, setShowMatches] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [matches, setMatches] = useState<CandidateMatch[]>([]);
  const [isFetchingMatches, setIsFetchingMatches] = useState(false);
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [matchDialogStep, setMatchDialogStep] = useState<'matches' | 'invite' | 'success'>('matches');
  const [interviewType, setInterviewType] = useState('Screening');
  const [generatedLinks, setGeneratedLinks] = useState<{
    name: string, 
    email: string, 
    link: string, 
    emailStatus: { sent: boolean, error: string | null }
  }[]>([]);
  const [isGeneratingInvites, setIsGeneratingInvites] = useState(false);

  // Filter jobs by search
  const filteredJobs = jobs.filter((job) => {
    const searchLower = search.toLowerCase();
    return (
      job.title.toLowerCase().includes(searchLower) ||
      (job.description && job.description.toLowerCase().includes(searchLower)) ||
      (job.location && job.location.toLowerCase().includes(searchLower))
    );
  });

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs');
      const data = await response.json();

      if (response.ok) {
        setJobs(data.jobs);
      } else {
        throw new Error(data.error || 'Failed to fetch jobs');
      }
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
      toast.error(error.message || 'Failed to load jobs');
    } finally {
      setIsLoading(false);
    }
  };

  const updateJobStatus = async (jobId: string, newStatus: string) => {
    setIsUpdatingStatus(jobId);
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update job status');
      }

      setJobs(jobs.map(job => job.id === jobId ? { ...job, status: newStatus } : job));
      toast.success(`Job status updated to ${newStatus}`);
    } catch (error: any) {
      console.error('Error updating job status:', error);
      toast.error(error.message || 'Failed to update job status');
    } finally {
      setIsUpdatingStatus(null);
    }
  };

  const deleteJob = async (jobId: string, jobTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete "${jobTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete job');
      }

      setJobs(jobs.filter(job => job.id !== jobId));
      toast.success('Job deleted successfully');
    } catch (error: any) {
      console.error('Error deleting job:', error);
      toast.error(error.message || 'Failed to delete job');
    }
  };

  const findMatchingCandidates = async (job: Job) => {
    setIsMatching(job.id);
    try {
      const response = await fetch(`/api/jobs/${job.id}/match-candidates`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle quota exceeded specifically
        if (response.status === 429 || data.quotaExceeded) {
          toast.warning(
            'AI quota exceeded. Please try again in a few moments.',
            { duration: 5000 }
          );
        } else {
          throw new Error(data.error || 'Failed to find matching candidates');
        }
        return;
      }

      setSelectedJob(job);
      setMatches(data.matches || []);
      setSelectedCandidates([]);
      setMatchDialogStep('matches');
      setGeneratedLinks([]);
      setShowMatches(true);
      toast.success(`Found ${data.matches?.length || 0} candidate matches`);
    } catch (error: any) {
      console.error('Error matching candidates:', error);
      toast.error(error.message || 'Failed to find matching candidates');
    } finally {
      setIsMatching(null);
    }
  };

  const getMatchScoreColor = (score: number) => {
    if (score >= 90) return 'from-green-500 to-emerald-600';
    if (score >= 75) return 'from-blue-500 to-cyan-600';
    if (score >= 60) return 'from-yellow-500 to-orange-600';
    return 'from-red-500 to-pink-600';
  };

  const getMatchScoreBg = (score: number) => {
    if (score >= 90) return 'bg-green-600';
    if (score >= 75) return 'bg-blue-600';
    if (score >= 60) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-600';
      case 'active':
        return 'bg-green-600';
      case 'expired':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getJobTypeColor = (type: string) => {
    switch (type) {
      case 'full-time':
        return 'bg-blue-900/50 text-blue-300 border-blue-700';
      case 'part-time':
        return 'bg-purple-900/50 text-purple-300 border-purple-700';
      case 'contract':
        return 'bg-orange-900/50 text-orange-300 border-orange-700';
      case 'freelance':
        return 'bg-pink-900/50 text-pink-300 border-pink-700';
      case 'internship':
        return 'bg-teal-900/50 text-teal-300 border-teal-700';
      default:
        return 'bg-gray-900/50 text-gray-300 border-gray-700';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const toggleCandidateSelection = (candidateId: string) => {
    setSelectedCandidates(prev => 
      prev.includes(candidateId) 
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedCandidates.length === matches.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(matches.map(m => m.candidateId));
    }
  };

  const handleGenerateInvites = async () => {
    if (selectedCandidates.length === 0 || !selectedJob) return;
    
    setIsGeneratingInvites(true);
    
    // Get the full candidate objects for selected ones
    const candidatesToInvite = matches.filter(m => selectedCandidates.includes(m.candidateId));
    
    try {
      const response = await fetch('/api/interview/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: selectedJob.id,
          interviewType,
          candidates: candidatesToInvite
        })
      });

      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error);
      
      setGeneratedLinks(data.invites);
      setMatchDialogStep('success');
      toast.success('Interview invites sent successfully!');
    } catch (error: any) {
      console.error('Error generating invites:', error);
      toast.error('Failed to generate invites');
    } finally {
      setIsGeneratingInvites(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8">
        {/* Header + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
              Job Postings
            </h1>
            <p className="text-gray-400">
              Create and manage job postings, find matching candidates with AI
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search jobs..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1 border border-gray-700">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400'}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400'}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Job
            </Button>
          </div>
        </div>

        {/* Jobs Display */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading jobs...</p>
            </div>
          </div>
        ) : filteredJobs.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12">
            <Briefcase className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              No job postings found
            </h3>
            <p className="text-gray-400 mb-6">
              {search ? 'Try adjusting your search or add a new job posting.' : 'Create your first job posting to get started.'}
            </p>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Job
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredJobs.map((job) => (
              <Card key={job.id} className="border-gray-700 bg-gray-800/50 hover:bg-gray-800/70 transition-all overflow-hidden">
                <CardContent className="p-4 sm:p-6 space-y-4">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                        {job.title}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={`${getStatusColor(job.status)} text-white`}>
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`text-xs border ${getJobTypeColor(job.type)}`}
                        >
                          {job.type}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  {job.description && (
                    <p className="text-sm text-gray-400 line-clamp-3">
                      {job.description}
                    </p>
                  )}

                  {/* Requirements Preview */}
                  {job.requirements && job.requirements.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {job.requirements.slice(0, 3).map((req, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                          {req}
                        </Badge>
                      ))}
                      {job.requirements.length > 3 && (
                        <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                          +{job.requirements.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Location */}
                  {job.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-300">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      <span>{job.location}</span>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(job.createdAt)}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-3 border-t border-gray-700">
                    {/* Status Update */}
                    <div className="flex flex-wrap gap-2">
                      {job.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => updateJobStatus(job.id, 'active')}
                          disabled={isUpdatingStatus === job.id}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-xs"
                        >
                          {isUpdatingStatus === job.id ? 'Updating...' : 'Activate'}
                        </Button>
                      )}
                      {job.status === 'active' && (
                        <Button
                          size="sm"
                          onClick={() => updateJobStatus(job.id, 'expired')}
                          disabled={isUpdatingStatus === job.id}
                          className="flex-1 bg-red-600 hover:bg-red-700 text-xs"
                        >
                          {isUpdatingStatus === job.id ? 'Updating...' : 'Expire'}
                        </Button>
                      )}
                      {job.status === 'expired' && (
                        <Button
                          size="sm"
                          onClick={() => updateJobStatus(job.id, 'active')}
                          disabled={isUpdatingStatus === job.id}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-xs"
                        >
                          {isUpdatingStatus === job.id ? 'Updating...' : 'Reactivate'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteJob(job.id, job.title)}
                        className="text-red-400 border-red-700 hover:bg-red-950 text-xs"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* AI Match Candidates */}
                    <Button
                      size="sm"
                      onClick={() => findMatchingCandidates(job)}
                      disabled={isMatching === job.id}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-xs"
                    >
                      {isMatching === job.id ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                          Finding Matches...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 mr-2" />
                          Find Matching Candidates
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          /* List View */
          <Card className="border-gray-700 bg-gray-800/50">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-700 bg-gray-900/50">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300">Job Title</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300">Location</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300">Type</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300">Status</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300">Created</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {filteredJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-800/70 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <Briefcase className="h-5 w-5 text-gray-500" />
                          <div>
                            <span className="font-medium text-white">{job.title}</span>
                            {job.description && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-1">{job.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span>{job.location || '-'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <Badge 
                          variant="outline" 
                          className={`text-xs border ${getJobTypeColor(job.type)}`}
                        >
                          {job.type}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <Badge className={`${getStatusColor(job.status)} text-white`}>
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-400">
                          {formatDate(job.createdAt)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-1">
                            {job.status === 'draft' && (
                              <Button
                                size="sm"
                                onClick={() => updateJobStatus(job.id, 'active')}
                                disabled={isUpdatingStatus === job.id}
                                className="bg-green-600 hover:bg-green-700 text-xs"
                              >
                                {isUpdatingStatus === job.id ? '...' : 'Activate'}
                              </Button>
                            )}
                            {job.status === 'active' && (
                              <Button
                                size="sm"
                                onClick={() => updateJobStatus(job.id, 'expired')}
                                disabled={isUpdatingStatus === job.id}
                                className="bg-red-600 hover:bg-red-700 text-xs"
                              >
                                {isUpdatingStatus === job.id ? '...' : 'Expire'}
                              </Button>
                            )}
                            {job.status === 'expired' && (
                              <Button
                                size="sm"
                                onClick={() => updateJobStatus(job.id, 'active')}
                                disabled={isUpdatingStatus === job.id}
                                className="bg-green-600 hover:bg-green-700 text-xs"
                              >
                                {isUpdatingStatus === job.id ? '...' : 'Reactivate'}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteJob(job.id, job.title)}
                              className="text-red-400 hover:text-red-600 hover:bg-red-950"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => findMatchingCandidates(job)}
                            disabled={isMatching === job.id}
                            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-xs"
                          >
                            {isMatching === job.id ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />
                                Finding...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3 mr-2" />
                                Find Matches
                              </>
                            )}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Candidate Matches Modal */}
        {showMatches && selectedJob && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-6 animate-in fade-in duration-200"
            onClick={() => setShowMatches(false)}
          >
            <div
              className="bg-gray-900 border border-gray-800 rounded-2xl max-w-4xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-900/90 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                      {matchDialogStep === 'matches' && 'AI Candidate Matches'}
                      {matchDialogStep === 'invite' && 'Setup Interview Invites'}
                      {matchDialogStep === 'success' && 'Invites Successfully Sent'}
                    </h2>
                    <p className="text-gray-400 text-xs mt-0.5 flex items-center gap-1.5">
                      Target Job: <span className="font-medium text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{selectedJob.title}</span>
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMatches(false)}
                  className="text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg h-9 w-9 p-0"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Step 1: Matches List */}
              {matchDialogStep === 'matches' && (
                <div className="flex flex-col flex-1 overflow-hidden">
                  {/* Action Toolbar */}
                  <div className="px-6 py-3 border-b border-gray-800/80 bg-gray-900/50 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-2.5">
                      <input 
                        type="checkbox" 
                        id="selectAll"
                        className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600"
                        checked={matches.length > 0 && selectedCandidates.length === matches.length}
                        onChange={toggleSelectAll}
                      />
                      <label htmlFor="selectAll" className="text-xs font-semibold text-gray-300 cursor-pointer select-none">
                        Select All ({matches.length})
                      </label>
                      {selectedCandidates.length > 0 && (
                        <span className="text-[11px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium">
                          {selectedCandidates.length} Selected
                        </span>
                      )}
                    </div>
                    
                    <Button 
                      onClick={() => setMatchDialogStep('invite')}
                      disabled={selectedCandidates.length === 0}
                      className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium h-8 px-4 rounded-lg shadow-sm disabled:opacity-40"
                    >
                      <Send className="w-3.5 h-3.5 mr-1.5" />
                      Send Invites ({selectedCandidates.length})
                    </Button>
                  </div>

                  {/* Scrollable Matches Body */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {matches.length === 0 ? (
                      <div className="text-center py-16">
                        <Briefcase className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                        <h3 className="text-base font-semibold text-white mb-1">
                          No matches found
                        </h3>
                        <p className="text-xs text-gray-400 max-w-sm mx-auto">
                          Try adding more candidates or adjust the job description and requirements.
                        </p>
                      </div>
                    ) : (
                      matches.map((match, index) => {
                        const isSelected = selectedCandidates.includes(match.candidateId);
                        const isHigh = match.matchScore >= 80;
                        const isMed = match.matchScore >= 60;
                        const isFair = match.matchScore >= 40;

                        const scoreBadgeStyle = isHigh
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : isMed
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : isFair
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30';

                        return (
                          <div
                            key={match.candidateId}
                            className={`border rounded-xl p-5 transition-all cursor-pointer ${
                              isSelected
                                ? 'border-blue-500/80 bg-blue-950/20 ring-1 ring-blue-500/50 shadow-lg shadow-blue-950/30'
                                : 'border-gray-800 bg-gray-800/40 hover:bg-gray-800/70 hover:border-gray-700'
                            }`}
                            onClick={() => toggleCandidateSelection(match.candidateId)}
                          >
                            {/* Card Header */}
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <input 
                                  type="checkbox"
                                  className="w-4 h-4 mt-1 rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 cursor-pointer accent-blue-600 shrink-0"
                                  checked={isSelected}
                                  onChange={() => toggleCandidateSelection(match.candidateId)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap mb-1">
                                    <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-gray-800 text-gray-300 border border-gray-700">
                                      #{index + 1}
                                    </span>
                                    <h3 className="text-base font-bold text-white truncate">
                                      {match.name}
                                    </h3>
                                  </div>
                                  <p className="text-xs text-gray-400 flex items-center gap-1.5 truncate">
                                    <Mail className="w-3 h-3 text-gray-500 shrink-0" />
                                    <span>{match.email}</span>
                                  </p>
                                </div>
                              </div>

                              {/* Match Score Indicator */}
                              <div className={`px-3 py-1 rounded-full border text-xs font-bold flex items-center gap-1 shrink-0 ${scoreBadgeStyle}`}>
                                <Sparkles className="w-3 h-3" />
                                <span>{match.matchScore}% Match</span>
                              </div>
                            </div>

                            {/* AI Summary */}
                            {match.summary && (
                              <div className="bg-gray-950/50 border border-gray-800/80 rounded-lg p-3 text-xs text-gray-300 leading-relaxed my-3.5">
                                {match.summary}
                              </div>
                            )}

                            {/* Strengths & Areas to Develop Columns */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-3">
                              {/* Strengths */}
                              {match.strengths && match.strengths.length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    <span>Strengths</span>
                                  </div>
                                  <div className="flex flex-col gap-1.5">
                                    {match.strengths.map((strength, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-start gap-2 p-2 rounded-lg bg-emerald-950/30 border border-emerald-800/30 text-emerald-200 text-xs leading-relaxed"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                                        <span className="break-words flex-1">{strength}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Areas to Develop */}
                              {match.gaps && match.gaps.length > 0 && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span>Areas to Develop</span>
                                  </div>
                                  <div className="flex flex-col gap-1.5">
                                    {match.gaps.map((gap, idx) => (
                                      <div
                                        key={idx}
                                        className="flex items-start gap-2 p-2 rounded-lg bg-amber-950/30 border border-amber-800/30 text-amber-200 text-xs leading-relaxed"
                                      >
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                                        <span className="break-words flex-1">{gap}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Step 2: Setup Invite */}
              {matchDialogStep === 'invite' && (
                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                  <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4 flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                      <Send className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm text-blue-300 font-semibold">Ready to invite {selectedCandidates.length} candidate(s)</p>
                      <p className="text-xs text-blue-400/80">Each candidate will receive their unique AI interview link via email.</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                        Interview Type / Stage
                      </label>
                      <select 
                        value={interviewType}
                        onChange={(e) => setInterviewType(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg py-2 px-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Screening">Screening (AI First Round)</option>
                        <option value="Tech Interview">Tech Interview (Coding / Architecture)</option>
                        <option value="HR Final Interview">HR Final Interview (Cultural Fit)</option>
                      </select>
                    </div>

                    <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-700/80">
                      <h4 className="text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider">Recipients ({selectedCandidates.length}):</h4>
                      <ul className="space-y-2 max-h-48 overflow-y-auto pr-2 divide-y divide-gray-700/50">
                        {matches
                          .filter(m => selectedCandidates.includes(m.candidateId))
                          .map(m => (
                            <li key={m.candidateId} className="flex items-center justify-between text-xs pt-2 first:pt-0">
                              <span className="text-white font-medium">{m.name}</span>
                              <span className="text-gray-400 font-mono">{m.email}</span>
                            </li>
                          ))
                        }
                      </ul>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-800 mt-6">
                    <Button 
                      variant="ghost" 
                      onClick={() => setMatchDialogStep('matches')}
                      className="text-gray-400 hover:text-white hover:bg-gray-800"
                    >
                      Back
                    </Button>
                    <Button 
                      onClick={handleGenerateInvites}
                      disabled={isGeneratingInvites}
                      className="bg-blue-600 hover:bg-blue-500 text-white"
                    >
                      {isGeneratingInvites ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                          Sending Invites...
                        </>
                      ) : (
                        'Send Automated Invites'
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Success Links */}
              {matchDialogStep === 'success' && (
                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                  <div className="text-center py-4">
                    <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-1">Invites Sent Successfully!</h3>
                    <p className="text-xs text-gray-400 max-w-md mx-auto">
                      Invitations with AI interview links have been dispatched to the candidate emails. You can also copy links below.
                    </p>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {generatedLinks.map((invite, index) => (
                      <div key={index} className="bg-gray-800/60 p-3.5 rounded-xl border border-gray-700/80">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-sm text-white">{invite.name}</h4>
                            {invite.emailStatus.sent ? (
                              <span className="text-[10px] bg-emerald-900/50 text-emerald-300 border border-emerald-700/50 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                                <Check className="w-2.5 h-2.5" />
                                Email Sent
                              </span>
                            ) : (
                              <span className="text-[10px] bg-rose-900/50 text-rose-300 border border-rose-700/50 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium" title={invite.emailStatus.error || 'Failed'}>
                                <AlertCircle className="w-2.5 h-2.5" />
                                Delivery Failed
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-mono text-gray-400 bg-gray-900 px-2 py-0.5 rounded border border-gray-800">
                            {invite.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <input 
                            readOnly 
                            value={invite.link} 
                            className="bg-gray-900/90 border border-gray-700/80 rounded-lg py-1.5 px-3 text-xs text-blue-400 w-full font-mono outline-none"
                          />
                          <Button 
                            size="sm" 
                            variant="secondary"
                            className="h-8 text-xs shrink-0"
                            onClick={() => {
                              navigator.clipboard.writeText(invite.link);
                              toast.success('Link copied to clipboard!');
                            }}
                          >
                            Copy Link
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-center pt-4 border-t border-gray-800">
                    <Button 
                      onClick={() => setShowMatches(false)}
                      className="bg-gray-800 hover:bg-gray-700 text-white text-xs px-6"
                    >
                      Done
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Job Dialog */}
        <AddJobDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onJobAdded={fetchJobs}
        />
      </div>
    </DashboardLayout>
  );
}
