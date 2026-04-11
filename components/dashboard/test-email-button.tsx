'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mail, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface TestEmailButtonProps {
  userEmail: string;
}

export function TestEmailButton({ userEmail }: TestEmailButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleTestEmail = async () => {
    if (!userEmail) return;
    
    setIsLoading(true);
    setStatus('idle');
    
    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        toast.success(`Test email sent to ${userEmail}! Check your inbox (and spam).`);
      } else {
        throw new Error(data.error || 'Failed to send test email');
      }
    } catch (error: any) {
      console.error('Test email error:', error);
      setStatus('error');
      toast.error(error.message || 'Failed to send test email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-2">
      <Button 
        onClick={handleTestEmail}
        disabled={isLoading}
        variant={status === 'success' ? 'outline' : 'default'}
        className={`${status === 'success' ? 'border-green-500 text-green-400' : 'bg-blue-600 hover:bg-blue-700'}`}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending Test...
          </>
        ) : status === 'success' ? (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Test Sent!
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Send Test Email to Myself
          </>
        )}
      </Button>
      <p className="text-[10px] text-gray-500">
        Tests the "Agent" auto-emailing feature by sending a sample invite to you.
      </p>
    </div>
  );
}
