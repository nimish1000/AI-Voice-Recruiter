'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle, Clock, MessageSquare, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface InterviewData {
  questionsAnswered: number;
  totalQuestions: number;
  duration: number;
  candidateName: string;
  status: string;
  interviewType: string;
}

export default function InterviewCompletePage() {
  const params = useParams();
  const router = useRouter();
  const interviewId = params.id as string;
  
  const [interviewData, setInterviewData] = useState<InterviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch interview data
    const fetchInterviewData = async () => {
      try {
        const response = await fetch(`/api/interview/${interviewId}`);
        if (response.ok) {
          const data = await response.json();
          // Calculate questions answered from responses
          const questionsAnswered = data.responses?.length || 0;
          const interviewType = data.interview?.interviewType || 'Screening';
          const isTechnicalRound = interviewType === 'Tech Interview';
          
          setInterviewData({
            questionsAnswered,
            totalQuestions: isTechnicalRound ? 2 : 8,
            duration: data.interview?.duration || 0,
            candidateName: data.interview?.candidateName || 'Candidate',
            status: data.interview?.status || 'completed',
            interviewType,
          });
        }
      } catch (error) {
        console.error('Error fetching interview data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInterviewData();
    
    // Auto-redirect to homepage after 30 seconds
    const timer = setTimeout(() => {
      router.push('/');
    }, 30000);

    return () => clearTimeout(timer);
  }, [interviewId, router]);
  
  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes === 0) {
      return `${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
    } else if (remainingSeconds === 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}:${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 px-4 py-8">
      <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm max-w-3xl w-full">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600">
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
          </div>
          
          <CardTitle className="text-3xl text-white mb-2">Interview Complete!</CardTitle>
          <CardDescription className="text-base text-gray-400">
            Thank you for completing your AI-powered interview
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading your interview results...</p>
            </div>
          ) : interviewData ? (
            <>
              {/* Interview Stats */}
              <div className="bg-gray-900/50 rounded-lg p-8 space-y-6">
                {/* Questions Answered */}
                <div className="text-center space-y-3">
                  <div className="flex justify-center mb-2">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
                      <MessageSquare className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-white">
                    {interviewData.questionsAnswered} / {interviewData.totalQuestions}
                  </h3>
                  <p className="text-gray-400">Questions Answered</p>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-gray-700 rounded-full h-3 mt-4">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(interviewData.questionsAnswered / interviewData.totalQuestions) * 100}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    {Math.round((interviewData.questionsAnswered / interviewData.totalQuestions) * 100)}% Complete
                  </p>
                </div>

                {/* Divider */}
                <div className="border-t border-gray-700" />

                {/* Duration */}
                <div className="text-center space-y-3">
                  <div className="flex justify-center mb-2">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600">
                      <Clock className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold text-white">
                    {formatDuration(interviewData.duration)}
                  </h3>
                  <p className="text-gray-400">Interview Duration</p>
                </div>

                {/* Status Badge */}
                <div className="flex justify-center pt-4">
                  <Badge className="bg-green-600 text-white px-4 py-2 text-sm">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Interview {interviewData.status === 'completed' ? 'Completed' : 'Ended'}
                  </Badge>
                </div>
              </div>

              {/* Message */}
              <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-300">
                  Thank you, <strong>{interviewData.candidateName}</strong>! 
                  Your interview responses have been recorded.
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-400">Unable to load interview data</p>
            </div>
          )}
          
          <div className="space-y-3 pt-4 border-t border-gray-800">
            <Button
              onClick={() => router.push('/')}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Home className="mr-2 h-4 w-4" />
              Return to Homepage
            </Button>
            
            <p className="text-xs text-center text-gray-500">
              You will be automatically redirected in 30 seconds...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
