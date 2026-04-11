import { NextResponse } from 'next/server';
import { db, recruiterSettings } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Attempt to find settings for this recruiter
    let settings = await db.query.recruiterSettings.findFirst({
      where: eq(recruiterSettings.clerkId, userId),
    });

    // If no settings exist, create defaults
    if (!settings) {
      const defaultPrompt = `You are an expert technical recruiter and interviewer. Generate [COUNT] interview questions for a candidate applying for the position of "[TITLE]".

Job Description context:
[DESCRIPTION]

Requirements:
- Return ONLY a valid JSON array of objects.
- Each object must have "id" (number 1-[COUNT]), "question" (string), and "category" (string).
- Question 1: A warm introduction and request for background.
- Technical questions specific to the role "[TITLE]" and its typical requirements.
- Behavioral or collaboration questions.
- A final question about career goals and a flat closing.

Example format:
[
  { "id": 1, "question": "...", "category": "Introduction" }
]

Return ONLY the JSON. No conversational text.`;

      const result = await db.insert(recruiterSettings).values({
        clerkId: userId,
        agentName: 'AI Recruiter',
        systemPrompt: defaultPrompt,
        questionCount: 8,
        voiceId: 'alloy', // default placeholder
        autoInvite: true,
        companyName: 'AI Recruitment Platform',
        companyDescription: 'We are a technology company focused on streamlining the hiring process using advanced AI agents.',
      }).returning();
      
      settings = result[0];
    }

    return NextResponse.json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Find or Create settings first (upsert)
    const existing = await db.query.recruiterSettings.findFirst({
      where: eq(recruiterSettings.clerkId, userId),
    });

    if (existing) {
      const updated = await db.update(recruiterSettings)
        .set({
          ...body,
          updatedAt: new Date(),
        })
        .where(eq(recruiterSettings.clerkId, userId))
        .returning();
      
      return NextResponse.json({ success: true, settings: updated[0] });
    } else {
      const created = await db.insert(recruiterSettings).values({
        clerkId: userId,
        ...body,
      }).returning();
      
      return NextResponse.json({ success: true, settings: created[0] });
    }

  } catch (error) {
    console.error('Error updating settings:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
