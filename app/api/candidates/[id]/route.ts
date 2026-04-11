import { NextResponse } from 'next/server';
import { db, candidates } from '@/lib/db';
import { eq } from 'drizzle-orm';

// DELETE a candidate by ID
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: candidateId } = await params;
    console.log('API DELETE called with params:', await params);
    console.log('Candidate ID from params:', candidateId, typeof candidateId);

    if (!candidateId) {
      console.error('ERROR: Candidate ID is missing from params');
      return NextResponse.json(
        { error: 'Candidate ID is required' },
        { status: 400 }
      );
    }

    if (typeof candidateId !== 'string' || candidateId.trim() === '') {
      console.error('ERROR: Candidate ID is not a valid string:', candidateId);
      return NextResponse.json(
        { error: 'Invalid candidate ID format' },
        { status: 400 }
      );
    }

    console.log('Deleting candidate with ID:', candidateId);

    // Delete the candidate from the database
    const result = await db
      .delete(candidates)
      .where(eq(candidates.id, candidateId))
      .returning();

    console.log('Delete result:', result);

    if (!result || result.length === 0) {
      return NextResponse.json(
        { error: 'Candidate not found or already deleted' },
        { status: 404 }
      );
    }

    console.log('Candidate deleted successfully:', result[0].name);

    return NextResponse.json({
      success: true,
      message: 'Candidate deleted successfully',
      candidate: result[0],
    });
  } catch (error) {
    console.error('Error deleting candidate:', error);
    return NextResponse.json(
      { error: 'Failed to delete candidate from database' },
      { status: 500 }
    );
  }
}

// UPDATE a candidate by ID
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: candidateId } = await params;
    const body = await request.json();
    
    if (!candidateId) {
      return NextResponse.json({ error: 'Candidate ID is required' }, { status: 400 });
    }

    const { name, email, phone, skills, experience, notes, status } = body;

    // Update the candidate in the database
    const result = await db
      .update(candidates)
      .set({
        name,
        email,
        phone,
        skills: Array.isArray(skills) ? skills : (typeof skills === 'string' ? skills.split(',').map((s: string) => s.trim()) : []),
        experience: typeof experience === 'string' ? parseInt(experience) : experience,
        notes,
        status: status || 'applied',
        updatedAt: new Date(),
      })
      .where(eq(candidates.id, candidateId))
      .returning();

    if (!result || result.length === 0) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Candidate updated successfully',
      candidate: result[0],
    });
  } catch (error: any) {
    console.error('Error updating candidate:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update candidate' },
      { status: 500 }
    );
  }
}

