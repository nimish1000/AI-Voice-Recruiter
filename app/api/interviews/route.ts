import { NextResponse } from 'next/server';
import { db, interviews, jobs, interviewSummaries } from '@/lib/db';
import { eq, desc } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all interviews with job names and summaries
    // We use a manual join because relations might not be explicitly defined in Drizzle schema yet
    const data = await db
      .select({
        interview: interviews,
        jobTitle: jobs.title,
        summary: interviewSummaries,
      })
      .from(interviews)
      .leftJoin(jobs, eq(interviews.jobId, jobs.id))
      .leftJoin(interviewSummaries, eq(interviews.id, interviewSummaries.interviewId))
      .orderBy(desc(interviews.createdAt));

    // Deduplicate by interview ID to avoid issues with joins returning multiple rows
    const uniqueInterviews = new Map();
    
    data.forEach(item => {
      if (!uniqueInterviews.has(item.interview.id)) {
        uniqueInterviews.set(item.interview.id, {
          ...item.interview,
          jobTitle: item.jobTitle || 'General Position',
          result: item.summary ? {
            score: item.summary.overallScore,
            recommendation: item.summary.recommendation,
            technical: item.summary.technicalScore,
            communication: item.summary.communicationScore,
            culture: item.summary.culturalFitScore,
          } : null
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: Array.from(uniqueInterviews.values())
    });
  } catch (error) {
    console.error('Error fetching interviews:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
