import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

// Initialize Groq AI
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

export async function POST(request: Request) {
  try {
    console.log('📄 Parse resume request received');
    
    // Accept JSON with extracted text and optionally available jobs
    const body = await request.json();
    const { extractedText, fileName, availableJobs = [] } = body;
    
    console.log('📝 Received extracted text:', fileName, '-', extractedText?.length, 'characters');
    
    if (!extractedText || extractedText.trim().length < 50) {
      console.error('❌ Not enough text provided:', extractedText?.length || 0);
      return NextResponse.json(
        { 
          error: 'Could not extract enough text from this file. Please ensure it contains readable text, or fill the form manually.',
        },
        { status: 400 }
      );
    }
    
    const text = extractedText;

    console.log('🤖 Sending to Groq API for parsing...');
    console.log('🔑 API Key exists:', !!process.env.GROQ_API_KEY);
    console.log('🔑 API Key starts with:', process.env.GROQ_API_KEY?.substring(0, 10) + '...');
    
    // Check if API key is configured
    if (!process.env.GROQ_API_KEY) {
      console.error('❌ GROQ_API_KEY not found in environment variables');
      return NextResponse.json(
        { error: 'AI service not configured. Please set GROQ_API_KEY environment variable.' },
        { status: 500 }
      );
    }

    const prompt = `You are an expert technical recruiter parser. Extract the following information from this resume text and return it as a valid JSON object.

Available Job Roles in the System:
${JSON.stringify(availableJobs, null, 2)}

Resume Text:
${text}

Return ONLY a valid JSON object (no markdown, no code blocks) with this exact structure:
{
  "name": "Full name of the candidate",
  "email": "Email address",
  "phone": "Phone number",
  "skills": ["skill1", "skill2", "skill3"],
  "experience": 5,
  "notes": "Brief professional summary (2-3 sentences)",
  "targetJobId": "The ID of the job from 'Available Job Roles' that best fits this candidate's resume. Leave empty if none fit well."
}

Rules:
- If a field is not found, use empty string for strings, [] for skills array, 0 for experience
- Extract ALL technical skills, programming languages, tools, and technologies mentioned
- Experience should be total years of professional experience as a number
- Keep the notes concise but informative
- For targetJobId, try to identify the best matching role from the Available Job Roles list based on the candidate's skills and experience. Only return the ID literal string. If no jobs are provided or none fit, return an empty string.
- Return ONLY the JSON object, nothing else`;

    console.log('📡 Sending request to Groq API...');
    
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'openai/gpt-oss-120b',
      temperature: 0.1,
    });
    
    let responseText = chatCompletion.choices[0]?.message?.content?.trim() || '';
    
    console.log('📨 Raw response length:', responseText.length);
    console.log('📨 Raw response preview:', responseText.substring(0, 200));

    // Remove markdown code blocks if present
    responseText = responseText.replace(/^```json\s*/gm, '').replace(/^```\s*/gm, '');
    
    console.log('📨 Cleaned response preview:', responseText.substring(0, 200));

    // Parse the JSON response
    let parsedData;
    try {
      parsedData = JSON.parse(responseText);
    } catch (parseError) {
      console.error('❌ Failed to parse Groq response as JSON:', responseText);
      return NextResponse.json(
        { error: 'Failed to parse resume data. Please try again or fill manually.' },
        { status: 500 }
      );
    }

    console.log('✅ Resume parsed successfully:', {
      name: parsedData.name,
      email: parsedData.email,
      skillsCount: parsedData.skills?.length || 0,
      experience: parsedData.experience,
      targetJobId: parsedData.targetJobId,
    });

    return NextResponse.json({
      success: true,
      data: {
        name: parsedData.name || '',
        email: parsedData.email || '',
        phone: parsedData.phone || '',
        skills: parsedData.skills || [],
        experience: parsedData.experience || 0,
        notes: parsedData.notes || '',
        targetJobId: parsedData.targetJobId || '',
      },
    });

  } catch (error: any) {
    console.error('❌ Error parsing resume:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Check for quota errors
    if (error.status === 429 || error.message?.includes('429')) {
      return NextResponse.json(
        { error: 'AI service quota exceeded. Please try again later or fill the form manually.' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to parse resume. Please try again or fill the form manually.' },
      { status: 500 }
    );
  }
}
