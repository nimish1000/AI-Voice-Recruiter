'use client';

import { useState, useEffect } from 'react';
import { Upload, X, FileText, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface AddCandidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCandidateAdded: () => void;
}

interface FormData {
  name: string;
  email: string;
  phone: string;
  skills: string;
  experience: string;
  notes: string;
  jobId: string;
}

export function AddCandidateDialog({ open, onOpenChange, onCandidateAdded }: AddCandidateDialogProps) {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    skills: '',
    experience: '',
    notes: '',
    jobId: '',
  });
  
  const [jobs, setJobs] = useState<{id: string, title: string}[]>([]);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      fetch('/api/jobs')
        .then(res => res.json())
        .then(data => {
          if (data.jobs) setJobs(data.jobs);
        })
        .catch(console.error);
    }
  }, [open]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const allowedTypes = ['application/pdf', 'text/plain'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF or TXT file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploadedFile(file);
    setIsUploading(true);
    
    // Show initial loading message
    const loadingToast = toast.loading('Analyzing resume...');
    
    // Show progress update after 10 seconds
    const progressTimer = setTimeout(() => {
      toast.loading('Still processing... OCR may take 30-60 seconds for scanned PDFs.', {
        id: loadingToast,
      });
    }, 10000);

    try {
      // Extract text client-side
      let extractedText = '';
      
      if (file.type === 'application/pdf') {
        // Dynamic import to avoid SSR issues
        const { extractTextFromPDF } = await import('@/lib/pdf-extractor');
        extractedText = await extractTextFromPDF(file);
      } else if (file.type === 'text/plain') {
        extractedText = await file.text();
      }
      
      clearTimeout(progressTimer);
      
      // Check if extraction was successful
      if (!extractedText || extractedText.trim().length < 50) {
        toast.error(
          'Could not extract enough text from this file. Please ensure it contains readable text, or fill the form manually.',
          { duration: 7000 }
        );
        return;
      }
      
      // Update loading message
      toast.loading('AI is parsing the resume...', { id: loadingToast });
      
      // Send extracted text to API for AI parsing
      const response = await fetch('/api/candidates/parse-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          extractedText: extractedText,
          fileName: file.name,
          availableJobs: jobs.map(j => ({ id: j.id, title: j.title })),
        }),
      });
      
      const result = await response.json();
      console.log('Parse resume response:', { status: response.status, result });

      if (!response.ok) {
        console.error('API Error:', result);
        toast.error(result.error || 'Failed to parse resume');
        return;
      }

      // Auto-fill form with parsed data
      const data = result.data;
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        skills: Array.isArray(data.skills) ? data.skills.join(', ') : '',
        experience: data.experience?.toString() || '',
        notes: data.notes || '',
        jobId: data.targetJobId || formData.jobId,
      });

      toast.success('Resume parsed successfully!', { id: loadingToast });
    } catch (error: any) {
      clearTimeout(progressTimer);
      
      if (error.name === 'AbortError') {
        toast.error('Processing timed out. The file may be too large or complex. Please try a different file or fill the form manually.', {
          duration: 7000
        });
      } else {
        console.error('Error parsing resume:', error);
        toast.error(error.message || 'Failed to parse resume');
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    // Validate required fields
    if (!formData.name.trim() || !formData.email.trim() || !formData.jobId) {
      toast.error('Name, email, and target job are required');
      return;
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch('/api/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          resume: uploadedFile?.name || null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save candidate');
      }

      toast.success('Candidate added successfully!');
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        skills: '',
        experience: '',
        notes: '',
        jobId: '',
      });
      setUploadedFile(null);
      
      onCandidateAdded();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving candidate:', error);
      toast.error(error.message || 'Failed to save candidate');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      skills: '',
      experience: '',
      notes: '',
      jobId: '',
    });
    setUploadedFile(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-2xl text-white">Add New Candidate</DialogTitle>
          <DialogDescription className="text-gray-400">
            Upload a resume to auto-fill the form with AI, or fill in the details manually.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Resume Upload Section */}
          <div className="space-y-3">
            <Label className="text-white text-base">Upload Resume (Optional)</Label>
            <div className="border-2 border-dashed border-gray-700 rounded-lg p-6 bg-gray-800/50">
              <div className="flex flex-col items-center justify-center space-y-3">
                <FileText className="h-10 w-10 text-gray-500" />
                <div className="text-center">
                  <p className="text-sm text-gray-400 mb-2">
                    {uploadedFile ? uploadedFile.name : 'Upload PDF or TXT resume'}
                  </p>
                  {uploadedFile && !isUploading && (
                    <Badge variant="secondary" className="mb-2">
                      <Sparkles className="h-3 w-3 mr-1" />
                      AI Parsed
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isUploading}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                    asChild
                  >
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                        disabled={isUploading}
                      />
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Parsing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          {uploadedFile ? 'Replace' : 'Upload File'}
                        </>
                      )}
                    </label>
                  </Button>
                  {uploadedFile && !isUploading && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setUploadedFile(null)}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* Target Job */}
            <div className="space-y-2">
              <Label htmlFor="jobId" className="text-white">
                Target Job <span className="text-red-400">*</span>
              </Label>
              <select
                id="jobId"
                value={formData.jobId}
                onChange={(e) => setFormData({ ...formData, jobId: e.target.value })}
                className="w-full bg-gray-800 border-gray-700 text-white rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-600"
              >
                <option value="">Select a job...</option>
                {jobs.map(job => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white">
                  Full Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">
                  Email <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-white">
                  Phone
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience" className="text-white">
                  Years of Experience
                </Label>
                <Input
                  id="experience"
                  type="number"
                  min="0"
                  max="50"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  placeholder="5"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="skills" className="text-white">
                Skills (comma-separated)
              </Label>
              <Input
                id="skills"
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                placeholder="React, TypeScript, Node.js, Python"
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-white">
                Notes / Summary
              </Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Brief professional summary or additional notes..."
                rows={4}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              handleReset();
              onOpenChange(false);
            }}
            className="border-gray-600 text-gray-300"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || isUploading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Candidate'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
