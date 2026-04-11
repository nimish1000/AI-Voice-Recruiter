import { NextRequest, NextResponse } from 'next/server';
import { db, candidates, applications, recruiterSettings } from '@/lib/db';
import { desc, eq } from 'drizzle-orm';
import { automateInterviewInvite } from '@/lib/interview-service';
import { auth } from '@clerk/nextjs/server';

// GET all candidates
export async function GET() {
  try {
    const allCandidates = await db.query.candidates.findMany({
      orderBy: desc(candidates.createdAt),
    });

    return NextResponse.json({
      success: true,
      candidates: allCandidates,
    });
  } catch (error) {
    console.error('Error fetching candidates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch candidates' },
      { status: 500 }
    );
  }
}

// POST create new candidate
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, skills, experience, resume, notes, jobId } = body;

    // Validate required fields
    if (!name || !email || !jobId) {
      return NextResponse.json(
        { error: 'Name, email, and target job are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Parse skills if it's a string
    let skillsArray: string[] = [];
    if (Array.isArray(skills)) {
      skillsArray = skills;
    } else if (typeof skills === 'string') {
      skillsArray = skills.split(',').map(s => s.trim()).filter(s => s);
    }

    // Create candidate
    const newCandidate = await db.insert(candidates).values({
      name,
      email,
      phone: phone || null,
      skills: skillsArray.length > 0 ? skillsArray : null,
      experience: experience ? parseInt(experience) : null,
      resume: resume || null,
      notes: notes || null,
      status: 'applied',
    }).returning();

    // Link candidate to job
    await db.insert(applications).values({
      candidateId: newCandidate[0].id,
      jobId,
      status: 'pending',
    });

    // --- AUTOMATED INTERVIEW INVITE ---
    const host = request.headers.get('host') || 'localhost:3000';
    const { userId: recruiterId } = await auth();
    
    // Fetch recruiter settings to respect autoInvite toggle
    const settings = recruiterId 
      ? await db.query.recruiterSettings.findFirst({
          where: eq(recruiterSettings.clerkId, recruiterId)
        })
      : null;

    let inviteResult = null;
    
    // Only send automated invite if autoInvite is enabled (default true for new users)
    if (!settings || settings.autoInvite) {
      console.log(`🚀 Automated trigger: Sending invite to ${name} (${email}) for job ${jobId}`);
      inviteResult = await automateInterviewInvite({
        jobId,
        candidateName: name,
        candidateEmail: email,
        interviewType: 'Initial Screening',
        host,
        recruiterId: recruiterId || undefined
      });
    } else {
      console.log(`⏭️ Automated trigger: Skipping invite for ${name} (autoInvite is disabled)`);
    }

    return NextResponse.json({
      success: true,
      candidate: newCandidate[0],
      automatedInvite: inviteResult
    });
  } catch (error: any) {
    console.error('Error creating candidate:', error);
    
    // Extract actual DB error from neon-http or Drizzle wrap
    const dbErr = error?.cause || error;
    const errMessage = dbErr?.message || error?.message || '';

    // Handle duplicate email
    if (errMessage.includes('duplicate key value') || dbErr?.code === '23505') {
      return NextResponse.json(
        { error: 'A candidate with this email already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: `Failed to create candidate: ${errMessage}` },
      { status: 500 }
    );
  }
}
