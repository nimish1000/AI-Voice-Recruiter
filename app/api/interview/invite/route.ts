import { NextRequest, NextResponse } from 'next/server';
import { automateInterviewInvite } from '@/lib/interview-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, candidates, interviewType } = body;

    if (!jobId || !candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const host = request.headers.get('host') || 'localhost:3000';
    const createdInterviews = [];

    for (const candidate of candidates) {
      const result = await automateInterviewInvite({
        jobId,
        candidateName: candidate.name,
        candidateEmail: candidate.email,
        interviewType: interviewType || 'Screening',
        host
      });

      createdInterviews.push({
        candidateId: candidate.id || candidate.candidateId,
        name: candidate.name,
        email: candidate.email,
        interviewId: result.interviewId,
        link: result.link,
        emailStatus: { sent: result.success, error: result.error || null },
      });
    }

    return NextResponse.json({ success: true, invites: createdInterviews });
  } catch (error: any) {
    console.error('Error generating invites:', error);
    return NextResponse.json(
      { error: 'Failed to generate interview links' },
      { status: 500 }
    );
  }
}
