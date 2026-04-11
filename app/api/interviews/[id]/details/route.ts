import { NextResponse } from 'next/server';
import { db, interviews, jobs, interviewSummaries, interviewResponses } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: interviewId } = await params;

    // 1. Fetch the interview with job details
    const interviewData = await db
      .select({
        interview: interviews,
        jobTitle: jobs.title,
        jobDescription: jobs.description,
      })
      .from(interviews)
      .leftJoin(jobs, eq(interviews.jobId, jobs.id))
      .where(eq(interviews.id, interviewId))
      .limit(1);

    if (!interviewData.length) {
      return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
    }

    // 2. Fetch the summary
    const summary = await db.query.interviewSummaries.findFirst({
      where: eq(interviewSummaries.interviewId, interviewId),
    });

    // 3. Fetch all responses
    const responses = await db.query.interviewResponses.findMany({
      where: eq(interviewResponses.interviewId, interviewId),
      orderBy: [asc(interviewResponses.questionNumber)],
    });

    return NextResponse.json({
      success: true,
      data: {
        ...interviewData[0].interview,
        jobTitle: interviewData[0].jobTitle,
        jobDescription: interviewData[0].jobDescription,
        summary,
        responses,
      }
    });
  } catch (error) {
    console.error('Error fetching interview details:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
