'use client';

import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import InterviewSession from './interview-session';

function LoadingFallback() {
  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto" />
        <p className="text-gray-300 text-sm">Loading interview session...</p>
      </div>
    </div>
  );
}

export default function InterviewSessionPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <InterviewSession />
    </Suspense>
  );
}
