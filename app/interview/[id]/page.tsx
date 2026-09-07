'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sparkles, User, Play, Info, Clock, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function InterviewPage() {
  const params = useParams();
  const router = useRouter();
  const interviewId = params.id as string;

  const [fullName, setFullName] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [interviewData, setInterviewData] = useState({
    id: interviewId,
    jobTitle: 'Loading Role...',
    company: 'AI Recruitment Platform',
    companyDescription: '',
    agentName: 'AI Recruiter',
    duration: '20-30 minutes',
    type: 'AI Assessment',
    description: 'This interview will assess your skills and experience. Please ensure you are in a quiet environment.',
    instructions: [
      'Find a quiet space with good lighting',
      'Ensure your microphone and camera are working',
      'Have a stable internet connection',
      'Be prepared to discuss your experience and skills',
      'Speak clearly and take your time to answer questions',
    ],
  });

  useEffect(() => {
    const fetchInterviewDetails = async () => {
      try {
        const response = await fetch(`/api/interview/${interviewId}`);
        const data = await response.json();
        
        if (data.success && data.job) {
          const interviewType = data.interview.interviewType || 'Screening';
          const isTechnicalRound = interviewType === 'Tech Interview' || interviewType === 'Technical Round';
          const isProjectRound = interviewType === 'Project Discussion' || interviewType === 'Project Round';
          
          setInterviewData(prev => {
            let roundDescription = data.job.description || prev.description;
            let roundDuration = '15-20 minutes';
            let roundInstructions = [
              'Find a quiet space with good lighting',
              'Ensure your microphone and camera are working',
              'Have a stable internet connection',
              'Answer 3-4 basic screening questions clearly',
              'Speak naturally and take your time to answer',
            ];

            if (isTechnicalRound) {
              roundDescription = 'This is a technical coding round. You will be presented with 2 practical DSA (Data Structures & Algorithms) coding problems — with 30 minutes allocated per question (1 hour total). Explain your approach and problem-solving steps.';
              roundDuration = '60 minutes (30 mins / question)';
              roundInstructions = [
                'Find a quiet space — you will solve 2 DSA coding problems',
                'Ensure your microphone and camera are working',
                'You have 30 minutes per question (2 questions total)',
                'Type your solution in the code editor provided',
                'Explain your approach, time, and space complexity',
              ];
            } else if (isProjectRound) {
              roundDescription = 'This is an in-depth Project Discussion round. The interviewer will ask detailed questions about the software/engineering projects you have built, including architecture, tech stack decisions, technical hurdles, and scalability.';
              roundDuration = '25-30 minutes';
              roundInstructions = [
                'Be prepared to discuss your major projects in depth',
                'Highlight system architecture, API/database design, and data flow',
                'Explain challenging technical roadblocks or bugs you solved',
                'Discuss scalability, trade-offs, and future improvements',
              ];
            }

            return {
              ...prev,
              jobTitle: data.job.title,
              description: roundDescription,
              company: data.settings?.companyName || prev.company,
              companyDescription: data.settings?.companyDescription || prev.companyDescription,
              agentName: data.settings?.agentName || prev.agentName,
              type: interviewType,
              duration: roundDuration,
              instructions: roundInstructions,
            };
          });
        }
      } catch (error) {
        console.error('Error fetching interview details:', error);
        toast.error('Failed to load interview details');
      } finally {
        setIsLoading(false);
      }
    };

    fetchInterviewDetails();
  }, [interviewId]);

  const handleStartInterview = () => {
    if (!fullName.trim()) {
      alert('Please enter your full name to start the interview');
      return;
    }

    setIsStarting(true);
    
    // Navigate to the interview session page with user's name
    setTimeout(() => {
      router.push(`/interview/${interviewId}/session?name=${encodeURIComponent(fullName)}`);
    }, 500);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      {/* Application Header */}
      <header className="sticky top-0 z-50 border-b border-gray-800 bg-gray-950/90 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 shadow-lg">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{interviewData.agentName}</h1>
                <p className="text-xs text-gray-400">Interview Portal</p>
              </div>
            </div>
            <Badge variant="outline" className="border-blue-500/50 text-blue-400">
              Interview Session
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto container mx-auto px-4 py-6">
        <div className="mx-auto max-w-7xl">
          {/* Interview Title Card - Full Width */}
          <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm mb-4">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-2xl text-white">
                    {interviewData.jobTitle}
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-400">
                    {interviewData.company}
                  </CardDescription>
                </div>
                <Badge className="bg-blue-600 hover:bg-blue-700 text-white">
                  {interviewData.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3">
                <div className="flex items-center gap-2 rounded-lg bg-gray-900/50 p-3">
                  <Clock className="h-4 w-4 text-blue-400" />
                  <div>
                    <p className="text-xs text-gray-400">Duration</p>
                    <p className="text-sm font-medium text-white">{interviewData.duration}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-gray-900/50 p-3">
                  <Briefcase className="h-4 w-4 text-purple-400" />
                  <div>
                    <p className="text-xs text-gray-400">Position</p>
                    <p className="text-sm font-medium text-white">{interviewData.jobTitle}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-gray-900/50 p-3">
                  <Info className="h-4 w-4 text-green-400" />
                  <div>
                    <p className="text-xs text-gray-400">Interview ID</p>
                    <p className="text-sm font-medium text-white font-mono text-xs">{interviewId}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2x2 Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              {/* Interview Description */}
              <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-white">About This Interview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {interviewData.description}
                  </p>
                  
                  <Separator className="bg-gray-700" />
                  
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-2">Instructions</h3>
                    <ul className="space-y-1.5">
                      {interviewData.instructions.slice(0, 3).map((instruction, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-gray-300">
                          <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 text-[10px] font-medium">
                            {index + 1}
                          </div>
                          <span>{instruction}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {/* Support Information */}
              <Card className="border-blue-700/50 bg-blue-900/20 backdrop-blur-sm">
                <CardContent className="pt-4">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-blue-400 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="text-xs font-medium text-blue-300">Need Help?</p>
                      <p className="text-xs text-blue-200/80">
                        Contact support at{' '}
                        <a href="mailto:support@airecruiter.com" className="underline hover:text-blue-200">
                          support@airecruiter.com
                        </a>
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              {/* Candidate Information Form */}
              <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg text-white flex items-center gap-2">
                    <User className="h-4 w-4 text-blue-400" />
                    Enter Your Details
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Please provide your full name to begin the interview
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <label htmlFor="fullName" className="text-xs font-medium text-gray-300">
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-gray-900 border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500 focus:ring-blue-500/20 text-sm"
                      disabled={isStarting}
                    />
                  </div>

                  <Button
                    onClick={handleStartInterview}
                    disabled={!fullName.trim() || isStarting}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-5 text-base shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    {isStarting ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Starting Interview...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Start Interview
                      </>
                    )}
                  </Button>

                  <p className="text-[10px] text-center text-gray-500">
                    By clicking "Start Interview", you agree to participate in the AI-powered screening process
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
