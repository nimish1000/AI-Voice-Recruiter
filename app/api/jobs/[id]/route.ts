import { NextRequest, NextResponse } from 'next/server';
import { db, jobs } from '@/lib/db';
import { eq } from 'drizzle-orm';

// GET - Fetch a single job
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const job = await db.query.jobs.findFirst({
      where: eq(jobs.id, id),
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Error fetching job:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job' },
      { status: 500 }
    );
  }
}

// PUT - Update a job
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, requirements, location, type, status } = body;

    const existingJob = await db.query.jobs.findFirst({
      where: eq(jobs.id, id),
    });

    if (!existingJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const updatedJob = await db.update(jobs)
      .set({
        title: title || existingJob.title,
        description: description !== undefined ? description : existingJob.description,
        requirements: requirements || existingJob.requirements,
        location: location !== undefined ? location : existingJob.location,
        type: type || existingJob.type,
        status: status || existingJob.status,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, id))
      .returning();

    return NextResponse.json({ job: updatedJob[0] });
  } catch (error) {
    console.error('Error updating job:', error);
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const existingJob = await db.query.jobs.findFirst({
      where: eq(jobs.id, id),
    });

    if (!existingJob) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    await db.delete(jobs).where(eq(jobs.id, id));

    return NextResponse.json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error);
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    );
  }
}
