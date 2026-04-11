'use client';

import { useEffect, useState } from 'react';
import { Plus, Grid3x3, List, Users, Mail, Phone, Briefcase, Calendar, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AddCandidateDialog } from '@/components/candidates/add-candidate-dialog';
import { DashboardLayout } from '@/components/dashboard-layout';
import { toast } from 'sonner';

interface Candidate {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  skills: string[] | null;
  experience: number | null;
  status: string;
  notes: string | null;
  resume: string | null;
  createdAt: string;
}

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(9);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  // Filter candidates by search
  const filteredCandidates = candidates.filter((candidate) => {
    const searchLower = search.toLowerCase();
    return (
      candidate.name.toLowerCase().includes(searchLower) ||
      candidate.email.toLowerCase().includes(searchLower) ||
      (candidate.skills && candidate.skills.join(' ').toLowerCase().includes(searchLower))
    );
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredCandidates.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCandidates = filteredCandidates.slice(startIndex, endIndex);

  useEffect(() => {
    fetchCandidates();
  }, []);

  // Handle escape key to close dialog
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDetailsOpen) {
        closeDetails();
      }
    };

    if (isDetailsOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isDetailsOpen]);

  const fetchCandidates = async () => {
    try {
      const response = await fetch('/api/candidates');
      const data = await response.json();

      if (response.ok) {
        console.log('Raw API response:', data);
        console.log('Candidates array:', data.candidates);
        console.log('Fetched candidates:', data.candidates?.length || 0, 'candidates');
        if (data.candidates?.length > 0) {
          console.log('First candidate sample:', data.candidates[0]);
          console.log('First candidate ID:', data.candidates[0].id, 'type:', typeof data.candidates[0].id);
        }
        setCandidates(data.candidates);
      } else {
        throw new Error(data.error || 'Failed to fetch candidates');
      }
    } catch (error: any) {
      console.error('Error fetching candidates:', error);
      toast.error(error.message || 'Failed to load candidates');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCandidate = async (candidateId: string, candidateName?: string) => {
    console.log('deleteCandidate called with:', { candidateId, candidateName, type: typeof candidateId });

    if (!candidateId || typeof candidateId !== 'string' || candidateId.trim() === '') {
      console.error('ERROR: candidateId is invalid:', candidateId);
      toast.error('Error: Invalid candidate ID');
      return;
    }

    // Find the candidate to ensure it exists
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) {
      console.error('ERROR: Candidate not found in local state:', candidateId);
      toast.error('Error: Candidate not found');
      return;
    }

    const confirmMessage = candidateName || candidate.name
      ? `Are you sure you want to delete "${candidateName || candidate.name}"? This action cannot be undone.`
      : 'Are you sure you want to delete this candidate? This action cannot be undone.';

    if (!window.confirm(confirmMessage)) return;

    setIsDeleting(candidateId);
    try {
      console.log('Deleting candidate:', candidateId, candidate.name);
      const deleteUrl = `/api/candidates/${encodeURIComponent(candidateId)}`;
      console.log('Delete URL:', deleteUrl);

      const response = await fetch(deleteUrl, {
        method: 'DELETE',
      });

      console.log('Delete response status:', response.status);

      if (response.ok) {
        // Immediately update the UI by filtering out the deleted candidate
        setCandidates(prevCandidates => prevCandidates.filter(c => c.id !== candidateId));
        toast.success('Candidate deleted successfully');
        console.log('Candidate deleted from UI');
      } else {
        const data = await response.json();
        console.error('Delete failed:', data);
        throw new Error(data.error || 'Failed to delete candidate');
      }
    } catch (error: any) {
      console.error('Error deleting candidate:', error);
      toast.error(error.message || 'Failed to delete candidate');
    } finally {
      setIsDeleting(null);
    }
  };

  const openDetails = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setIsDetailsOpen(true);
  };

  const closeDetails = () => {
    console.log('Closing details dialog');
    setIsDetailsOpen(false);
    setSelectedCandidate(null);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'applied':
        return 'bg-blue-600';
      case 'screened':
        return 'bg-purple-600';
      case 'interviewed':
        return 'bg-orange-600';
      case 'hired':
        return 'bg-green-600';
      case 'rejected':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
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

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8">
        {/* Header + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
              Candidates
            </h1>
            <p className="text-gray-400">
              Manage and track all job candidates
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Search candidates..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full sm:w-64 px-3 py-2 rounded-md bg-gray-800 border border-gray-700 text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-600 mb-2 sm:mb-0"
            />
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
              Add Candidate
            </Button>
          </div>
        </div>

        {/* Candidates Display */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading candidates...</p>
            </div>
          </div>
        ) : filteredCandidates.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              No candidates found
            </h3>
            <p className="text-gray-400 mb-6">
              Try adjusting your search or add a new candidate.
            </p>
            <Button
              onClick={() => setIsDialogOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Candidate
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedCandidates.map((candidate, index) => {
              console.log(`Rendering candidate ${index}:`, { id: candidate.id, name: candidate.name });
              return (
              <Card key={candidate.id} className="border-gray-700 bg-gray-800/50 hover:bg-gray-800/70 transition-all">
                <CardContent className="p-6 space-y-4">
                  {/* Header with Delete */}
                  <div className="flex items-start gap-3 justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <Avatar className="h-12 w-12 border-2 border-gray-700">
                        <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white font-semibold">
                          {getInitials(candidate.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-white truncate">
                          {candidate.name}
                        </h3>
                        <Badge className={`${getStatusColor(candidate.status)} text-white mt-1`}>
                          {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          console.log('View details clicked for candidate:', candidate.id);
                          openDetails(candidate);
                        }}
                        className="text-blue-400 hover:text-blue-600 hover:bg-blue-950"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          console.log('Delete clicked for candidate:', { id: candidate.id, name: candidate.name });
                          deleteCandidate(candidate.id, candidate.name);
                        }}
                        disabled={isDeleting === candidate.id}
                        className="text-red-400 hover:text-red-600 hover:bg-red-950"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Contact Info */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-300">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="truncate">{candidate.email}</span>
                    </div>
                    {candidate.phone && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <Phone className="h-4 w-4 text-gray-500" />
                        <span>{candidate.phone}</span>
                      </div>
                    )}
                    {candidate.experience !== null && (
                      <div className="flex items-center gap-2 text-gray-300">
                        <Briefcase className="h-4 w-4 text-gray-500" />
                        <span>{candidate.experience} {candidate.experience === 1 ? 'year' : 'years'} experience</span>
                      </div>
                    )}
                  </div>

                  {/* Skills */}
                  {candidate.skills && candidate.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {candidate.skills.slice(0, 4).map((skill, idx) => (
                        <Badge key={idx} variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                          {skill}
                        </Badge>
                      ))}
                      {candidate.skills.length > 4 && (
                        <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                          +{candidate.skills.length - 4} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center gap-1 text-xs text-gray-500 pt-2 border-t border-gray-700">
                    <Calendar className="h-3 w-3" />
                    <span>Added {formatDate(candidate.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        ) : (
          /* List View */
          <Card className="border-gray-700 bg-gray-800/50">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-700 bg-gray-900/50">
                  <tr>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300">Name</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300">Contact</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300">Skills</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300">Experience</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300">Status</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300">Added</th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {paginatedCandidates.map((candidate, index) => {
                    console.log(`Rendering table candidate ${index}:`, { id: candidate.id, name: candidate.name });
                    return (
                      <tr key={candidate.id} className="hover:bg-gray-800/70 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10 border-2 border-gray-700">
                              <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-sm font-semibold">
                                {getInitials(candidate.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-white">{candidate.name}</span>
                          </div>
                        </td>
                      <td className="py-4 px-6">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-300">
                            <Mail className="h-3 w-3 text-gray-500" />
                            <span>{candidate.email}</span>
                          </div>
                          {candidate.phone && (
                            <div className="flex items-center gap-2 text-sm text-gray-300">
                              <Phone className="h-3 w-3 text-gray-500" />
                              <span>{candidate.phone}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        {candidate.skills && candidate.skills.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {candidate.skills.slice(0, 2).map((skill, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                                {skill}
                              </Badge>
                            ))}
                            {candidate.skills.length > 2 && (
                              <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                                +{candidate.skills.length - 2}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-300">
                          {candidate.experience !== null ? `${candidate.experience} ${candidate.experience === 1 ? 'year' : 'years'}` : '-'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <Badge className={`${getStatusColor(candidate.status)} text-white`}>
                          {candidate.status.charAt(0).toUpperCase() + candidate.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="py-4 px-6">
                        <span className="text-sm text-gray-400">
                          {formatDate(candidate.createdAt)}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              console.log('Table view details clicked for candidate:', candidate.id);
                              openDetails(candidate);
                            }}
                            className="text-blue-400 hover:text-blue-600 hover:bg-blue-950"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              console.log('Table view delete clicked for candidate:', { id: candidate.id, name: candidate.name });
                              deleteCandidate(candidate.id, candidate.name);
                            }}
                            disabled={isDeleting === candidate.id}
                            className="text-red-400 hover:text-red-600 hover:bg-red-950"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* Pagination Controls */}
        {filteredCandidates.length > itemsPerPage && (
          <div className="flex items-center justify-between mt-8">
            <div className="text-sm text-gray-400">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredCandidates.length)} of {filteredCandidates.length} candidates
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="text-gray-300 border-gray-700 hover:bg-gray-800"
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={currentPage === page ? 'bg-blue-600 hover:bg-blue-700' : 'text-gray-300 border-gray-700 hover:bg-gray-800'}
                  >
                    {page}
                  </Button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="text-gray-300 border-gray-700 hover:bg-gray-800"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* View Details Dialog */}
        {selectedCandidate && isDetailsOpen && (
          <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={closeDetails}
          >
            <div
              className="bg-gray-900 border border-gray-700 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white">Candidate Details</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeDetails}
                    className="text-gray-400 hover:text-white hover:bg-gray-800 p-2"
                  >
                    ✕
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-gray-700">
                      <AvatarFallback className="bg-gradient-to-br from-blue-600 to-purple-600 text-white text-xl font-semibold">
                        {getInitials(selectedCandidate.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-semibold text-white">{selectedCandidate.name}</h3>
                      <Badge className={`${getStatusColor(selectedCandidate.status)} text-white mt-1`}>
                        {selectedCandidate.status.charAt(0).toUpperCase() + selectedCandidate.status.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <h4 className="text-lg font-semibold text-white">Contact Information</h4>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-gray-300">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span>{selectedCandidate.email}</span>
                        </div>
                        {selectedCandidate.phone && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <Phone className="h-4 w-4 text-gray-500" />
                            <span>{selectedCandidate.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-lg font-semibold text-white">Professional Info</h4>
                      <div className="space-y-2">
                        {selectedCandidate.experience !== null && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <Briefcase className="h-4 w-4 text-gray-500" />
                            <span>{selectedCandidate.experience} {selectedCandidate.experience === 1 ? 'year' : 'years'} experience</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-300">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span>Added {formatDate(selectedCandidate.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Skills */}
                  {selectedCandidate.skills && selectedCandidate.skills.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-lg font-semibold text-white">Skills</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedCandidate.skills.map((skill, idx) => (
                          <Badge key={idx} variant="secondary" className="bg-gray-700 text-gray-300">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedCandidate.notes && (
                    <div className="space-y-3">
                      <h4 className="text-lg font-semibold text-white">Notes</h4>
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        <p className="text-gray-300 whitespace-pre-wrap">{selectedCandidate.notes}</p>
                      </div>
                    </div>
                  )}

                  {/* Resume */}
                  {selectedCandidate.resume && (
                    <div className="space-y-3">
                      <h4 className="text-lg font-semibold text-white">Resume</h4>
                      <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        <p className="text-gray-300 text-sm break-all">{selectedCandidate.resume}</p>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                    <Button
                      variant="outline"
                      onClick={closeDetails}
                      className="text-gray-300 border-gray-700 hover:bg-gray-800"
                    >
                      Close
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => {
                        deleteCandidate(selectedCandidate.id, selectedCandidate.name);
                        closeDetails();
                      }}
                      disabled={isDeleting === selectedCandidate.id}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {isDeleting === selectedCandidate.id ? 'Deleting...' : 'Delete Candidate'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Candidate Dialog */}
        <AddCandidateDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onCandidateAdded={fetchCandidates}
        />


      </div>
    </DashboardLayout>
  );
}
