import { NextRequest, NextResponse } from 'next/server';
import { db, jobs, candidates, applications } from '@/lib/db';
import { eq } from 'drizzle-orm';
import Groq from 'groq-sdk';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get the job
    const job = await db.query.jobs.findFirst({
      where: eq(jobs.id, id),
    });

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    // Get all candidates who applied to this specific job
    const jobCandidates = await db.select({ candidate: candidates })
      .from(candidates)
      .innerJoin(applications, eq(candidates.id, applications.candidateId))
      .where(eq(applications.jobId, id));

    const allCandidates = jobCandidates.map(jc => jc.candidate);

    if (allCandidates.length === 0) {
      return NextResponse.json(
        { matches: [], message: 'No candidates found in the database' }
      );
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI API key not configured' },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey });

    // Prepare candidates data for AI
    const candidatesData = allCandidates.map(c => ({
      id: c.id,
      name: c.name,
      email: c.email,
      skills: c.skills || [],
      experience: c.experience || 0,
      notes: c.notes || '',
    }));

    const prompt = `
You are an expert technical recruiter. Match candidates to a job opening based on their qualifications.

JOB DETAILS:
- Title: ${job.title}
- Description: ${job.description || 'N/A'}
- Requirements: ${(job.requirements || []).join(', ')}
- Location: ${job.location || 'N/A'}
- Type: ${job.type || 'full-time'}

CANDIDATES:
${JSON.stringify(candidatesData, null, 2)}

Analyze each candidate's fit for this position based on:
1. Skills match with job requirements
2. Years of experience
3. Overall qualifications

Return a JSON array of ALL candidates sorted by match score (highest to lowest):
[
  {
    "candidateId": "candidate uuid",
    "name": "Candidate Name",
    "email": "candidate@email.com",
    "matchScore": 85,
    "matchPercentage": "85%",
    "strengths": ["Relevant skill 1", "Relevant experience"],
    "gaps": ["Missing skill 1", "Needs more experience"],
    "summary": "Brief 1-2 sentence explanation of why this candidate is a good fit"
  }
]

Match Score Guidelines:
- 90-100: Excellent match, highly qualified
- 75-89: Good match, meets most requirements
- 60-74: Fair match, meets some requirements
- Below 60: Poor match, significant gaps

Return ONLY valid JSON array, no markdown formatting or explanation.
`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai/gpt-oss-120b',
      temperature: 0.1,
    });
    
    const text = chatCompletion.choices[0]?.message?.content || '';

    // Parse the JSON response
    let matches;
    try {
      // Remove any markdown code blocks if present
      const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
      matches = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    return NextResponse.json({ matches, jobTitle: job.title });
  } catch (error: any) {
    console.error('Error matching candidates:', error);
    
    // Check for quota exceeded error
    if (error?.status === 429 || error?.message?.includes('429')) {
      return NextResponse.json(
        { 
          error: 'AI quota exceeded. Please try again later.',
          quotaExceeded: true
        },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to match candidates. Please try again.' },
      { status: 500 }
    );
  }
}
