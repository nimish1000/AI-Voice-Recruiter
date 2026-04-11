import { NextRequest, NextResponse } from 'next/server';
import { db, jobs } from '@/lib/db';
import { eq } from 'drizzle-orm';

// GET - Fetch all jobs
export async function GET(request: NextRequest) {
  try {
    const allJobs = await db.query.jobs.findMany({
      orderBy: (jobs, { desc }) => [desc(jobs.createdAt)],
    });

    return NextResponse.json({ jobs: allJobs });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

// POST - Create a new job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, requirements, location, type, status } = body;

    if (!title) {
      return NextResponse.json(
        { error: 'Job title is required' },
        { status: 400 }
      );
    }

    const newJob = await db.insert(jobs).values({
      title,
      description: description || null,
      requirements: requirements || [],
      location: location || null,
      type: type || 'full-time',
      status: status || 'draft',
    }).returning();

    return NextResponse.json({ job: newJob[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
}
