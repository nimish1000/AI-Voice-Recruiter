import { NextResponse } from 'next/server';
import { db, interviews, interviewResponses, interviewSummaries, jobs, recruiterSettings } from '@/lib/db';
import { eq, asc } from 'drizzle-orm';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

// Create interview or save response
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // If action is 'create', create a new interview record
    if (body.action === 'create') {
      let interview = await db.query.interviews.findFirst({
        where: eq(interviews.interviewId, id),
      });
      
      // If interview doesn't exist, create it (fallback)
      if (!interview) {
        const result = await db.insert(interviews).values({
          interviewId: id,
          candidateName: body.candidateName || 'Unknown',
          status: 'in_progress',
          startedAt: new Date(),
        }).returning();
        interview = result[0];
      } else if (interview.status === 'scheduled') {
        // Update status to in_progress if it was just scheduled
        const result = await db.update(interviews)
          .set({ status: 'in_progress', startedAt: new Date() })
          .where(eq(interviews.id, interview.id))
          .returning();
        interview = result[0];
      }
      
      if (!interview) {
        return NextResponse.json({ error: 'Failed to initialize interview' }, { status: 500 });
      }

      // Fetch job context
      const job = interview.jobId 
        ? await db.query.jobs.findFirst({
            where: eq(jobs.id, interview.jobId)
          })
        : null;

      // Fetch recruiter settings
      const settings = interview.recruiterId 
        ? await db.query.recruiterSettings.findFirst({
            where: eq(recruiterSettings.clerkId, interview.recruiterId)
          })
        : null;

      const interviewType = interview.interviewType || 'Screening';
      const isTechnicalRound = interviewType === 'Tech Interview' || interviewType === 'Technical Round';
      const isProjectRound = interviewType === 'Project Discussion' || interviewType === 'Project Round';
      const isScreeningRound = !isTechnicalRound && !isProjectRound;

      // Generate round-specific questions
      const generatedQuestions = await generateInterviewQuestions(
        job?.title || 'General Position',
        job?.description || 'General professional interview',
        settings,
        interviewType
      );
      
      return NextResponse.json({
        success: true,
        interview: interview,
        job: job ? { title: job.title, description: job.description } : null,
        questions: generatedQuestions,
        interviewType,
        isTechnicalRound,
        isProjectRound,
        isScreeningRound,
        totalTimeMinutes: isTechnicalRound ? 60 : isProjectRound ? 30 : 15,
        perQuestionTimeMinutes: isTechnicalRound ? 30 : null,
        settings: settings ? {
          agentName: settings.agentName,
          voiceId: settings.voiceId
        } : null
      });
    }
    
    // Otherwise, save interview response
    const {
      interviewId,
      questionNumber,
      question,
      category,
      userResponse,
    } = body;

    // Find the interview record
    let interview = await db.query.interviews.findFirst({
      where: eq(interviews.interviewId, interviewId || id),
    });

    if (!interview) {
      // Auto-create interview record if it doesn't exist yet (e.g. session started without DB entry)
      console.log(`📝 Interview record not found for ${interviewId || id}, creating on-the-fly`);
      const result = await db.insert(interviews).values({
        interviewId: interviewId || id,
        candidateName: 'Candidate',
        status: 'in_progress',
        startedAt: new Date(),
      }).returning();
      interview = result[0];
    }

    // Save the response
    const response = await db.insert(interviewResponses).values({
      interviewId: interview.id,
      questionNumber,
      question,
      category,
      userResponse,
    }).returning();

    return NextResponse.json({
      success: true,
      response: response[0],
    });
  } catch (error) {
    console.error('Error in interview API:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

// Get interview summary
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Find the interview
    const interview = await db.query.interviews.findFirst({
      where: eq(interviews.interviewId, id),
    });

    if (!interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    // Fetch job details
    const job = interview.jobId 
      ? await db.query.jobs.findFirst({
          where: eq(jobs.id, interview.jobId)
        })
      : null;

    // Get all responses to count questions answered
    const responses = await db.query.interviewResponses.findMany({
      where: eq(interviewResponses.interviewId, interview.id),
    });

    // Fetch recruiter settings for branding
    const settings = interview.recruiterId 
      ? await db.query.recruiterSettings.findFirst({
          where: eq(recruiterSettings.clerkId, interview.recruiterId)
        })
      : null;

    // Get the summary if it exists
    const summary = await db.query.interviewSummaries.findFirst({
      where: eq(interviewSummaries.interviewId, interview.id),
    });

    // Calculate duration
    const duration = interview.startedAt
      ? Math.floor((Date.now() - new Date(interview.startedAt).getTime()) / 1000)
      : 0;

    return NextResponse.json({
      success: true,
      interview: {
        id: interview.id,
        interviewId: interview.interviewId,
        candidateName: interview.candidateName,
        status: interview.status,
        startedAt: interview.startedAt,
        completedAt: interview.completedAt,
        duration: interview.duration || duration,
        interviewType: interview.interviewType,
      },
      job: job ? { title: job.title, description: job.description } : null,
      responses,
      summary,
      settings: settings ? {
        agentName: settings.agentName,
        voiceId: settings.voiceId,
        companyName: settings.companyName,
        companyDescription: settings.companyDescription
      } : null
    });
  } catch (error) {
    console.error('Error fetching interview data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch interview data' },
      { status: 500 }
    );
  }
}

// Generate AI summary and complete interview
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { interviewId } = body;

    // Find the interview
    const interview = await db.query.interviews.findFirst({
      where: eq(interviews.interviewId, interviewId),
    });

    if (!interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      );
    }

    // Get all responses
    const responses = await db.query.interviewResponses.findMany({
      where: eq(interviewResponses.interviewId, interview.id),
      orderBy: (responses, { asc }) => [asc(responses.createdAt)],
    });

    // Fetch recruiter settings for dynamic summary calc
    const settings = interview.recruiterId 
      ? await db.query.recruiterSettings.findFirst({
          where: eq(recruiterSettings.clerkId, interview.recruiterId)
        })
      : null;

    // Generate AI-powered summary
    const summary = await generateInterviewSummary(responses, settings?.questionCount || 8);

    // Calculate duration
    const duration = interview.startedAt
      ? Math.floor((Date.now() - new Date(interview.startedAt).getTime()) / 1000)
      : 0;

    // Update interview status
    await db.update(interviews)
      .set({
        status: 'completed',
        completedAt: new Date(),
        duration,
      })
      .where(eq(interviews.id, interview.id));

    // Save summary
    const savedSummary = await db.insert(interviewSummaries).values({
      interviewId: interview.id,
      overallScore: summary.overallScore,
      recommendation: summary.recommendation,
      summary: summary.summary,
      strengths: summary.strengths,
      weaknesses: summary.weaknesses,
      technicalScore: summary.technicalScore,
      communicationScore: summary.communicationScore,
      culturalFitScore: summary.culturalFitScore,
    }).returning();

    return NextResponse.json({
      success: true,
      summary: savedSummary[0],
      responses,
    });
  } catch (error) {
    console.error('Error generating summary:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}

// AI-powered summary generation
async function generateInterviewSummary(responses: any[], totalQuestions: number = 8) {
  const answeredQuestions = responses.filter(r => r.userResponse && r.userResponse.trim().length > 10).length;
  const completionRate = answeredQuestions / totalQuestions;
  
  // Analyze response quality
  const avgResponseLength = responses.reduce((sum, r) => sum + (r.userResponse?.length || 0), 0) / Math.max(answeredQuestions, 1);
  
  // Check for repetitive answers (simple heuristic)
  const responses_text = responses.map(r => r.userResponse?.toLowerCase() || '');
  let repetitionScore = 0;
  for (let i = 0; i < responses_text.length; i++) {
    for (let j = i + 1; j < responses_text.length; j++) {
      if (responses_text[i] && responses_text[j]) {
        const similarity = calculateSimilarity(responses_text[i], responses_text[j]);
        if (similarity > 0.7) { // 70% similar
          repetitionScore++;
        }
      }
    }
  }
  
  // Communication skills assessment
  let communicationScore = 65;
  
  // Factor 1: Response length (articulation)
  if (avgResponseLength > 200) communicationScore += 15;
  else if (avgResponseLength > 100) communicationScore += 10;
  else if (avgResponseLength < 30) communicationScore -= 15;
  
  // Factor 2: Completion rate (engagement)
  if (completionRate >= 0.9) communicationScore += 10;
  else if (completionRate >= 0.7) communicationScore += 5;
  else if (completionRate < 0.3) communicationScore -= 15;
  
  // Factor 3: Repetition penalty
  if (repetitionScore > 3) communicationScore -= 15;
  else if (repetitionScore > 1) communicationScore -= 8;
  
  // Clamp score
  communicationScore = Math.max(10, Math.min(100, communicationScore));
  
  // Technical score based on content keywords (simplified)
  let technicalScore = 60;
  const techKeywords = ['react', 'javascript', 'python', 'sql', 'api', 'database', 'framework', 'testing', 'debugging', 'algorithm'];
  responses.forEach(r => {
    const text = (r.userResponse || '').toLowerCase();
    const foundKeywords = techKeywords.filter(kw => text.includes(kw));
    technicalScore += foundKeywords.length * 2;
  });
  technicalScore = Math.min(100, technicalScore);
  
  // Cultural fit based on soft skills mentions
  let culturalFitScore = 65;
  const softSkills = ['team', 'collaborate', 'communication', 'leadership', 'problem-solving', 'adapt', 'learn'];
  responses.forEach(r => {
    const text = (r.userResponse || '').toLowerCase();
    const foundSkills = softSkills.filter(skill => text.includes(skill));
    culturalFitScore += foundSkills.length * 3;
  });
  culturalFitScore = Math.min(100, culturalFitScore);
  
  // Overall score (weighted)
  const overallScore = Math.round(
    technicalScore * 0.35 + 
    communicationScore * 0.40 + 
    culturalFitScore * 0.25
  );
  
  // Determine recommendation with honesty about incomplete interview
  let recommendation = 'no_hire';
  let recommendationNote = '';
  
  if (completionRate < 0.5) {
    recommendation = 'no_hire';
    recommendationNote = 'Candidate did not complete the interview.';
  } else if (overallScore >= 80) {
    recommendation = 'strong_hire';
  } else if (overallScore >= 65) {
    recommendation = 'hire';
  } else if (overallScore >= 50) {
    recommendation = 'no_hire';
  } else {
    recommendation = 'strong_no_hire';
  }
  
  // Generate strengths and weaknesses
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  
  // Communication assessment
  if (communicationScore >= 75) {
    strengths.push('Excellent verbal communication skills');
    strengths.push('Articulates thoughts clearly and confidently');
  } else if (communicationScore >= 60) {
    strengths.push('Adequate communication abilities');
  } else {
    weaknesses.push('Communication skills need significant improvement');
    weaknesses.push('Struggles to articulate responses clearly');
  }
  
  // Completion assessment
  if (completionRate >= 0.9) {
    strengths.push('Completed all interview questions');
    strengths.push('Showed strong engagement and commitment');
  } else if (completionRate >= 0.5) {
    weaknesses.push(`Only completed ${Math.round(completionRate * 100)}% of interview questions`);
    weaknesses.push('Left interview before completion');
  } else {
    weaknesses.push('Abandoned interview early');
    weaknesses.push('Poor commitment and engagement');
  }
  
  // Repetition assessment
  if (repetitionScore > 2) {
    weaknesses.push('Frequently repeated similar points across answers');
    weaknesses.push('Limited variety in responses');
  } else if (repetitionScore === 0 && answeredQuestions > 3) {
    strengths.push('Provided diverse and varied responses');
  }
  
  // Response quality
  if (avgResponseLength > 150) {
    strengths.push('Provides detailed and thoughtful answers');
  } else if (avgResponseLength < 50) {
    weaknesses.push('Responses are too brief and lack depth');
  }
  
  // Technical assessment
  if (technicalScore >= 75) {
    strengths.push('Demonstrates strong technical knowledge');
  } else if (technicalScore < 50) {
    weaknesses.push('Technical knowledge appears limited');
  }
  
  // Ensure we have items
  if (strengths.length === 0) strengths.push('Participated in the interview process');
  if (weaknesses.length === 0) weaknesses.push('Room for improvement in certain areas');
  
  // Generate detailed summary
  const summary = `
INTERVIEW ASSESSMENT REPORT
${'='.repeat(50)}

COMPLETION STATUS:
- Questions Answered: ${answeredQuestions}/${totalQuestions} (${Math.round(completionRate * 100)}%)
- Interview Status: ${completionRate < 1 ? 'INCOMPLETE' : 'COMPLETE'}
${recommendationNote ? `- Note: ${recommendationNote}` : ''}

OVERALL SCORE: ${overallScore}/100
RECOMMENDATION: ${recommendation.replace('_', ' ').toUpperCase()}

DETAILED ASSESSMENT:

1. COMMUNICATION SKILLS (${communicationScore}/100):
${communicationScore >= 75 ? 'The candidate demonstrates excellent verbal communication abilities. They articulate their thoughts clearly, speak confidently, and provide well-structured responses.' :
  communicationScore >= 60 ? 'The candidate shows adequate communication skills. They can express their ideas but may benefit from improving clarity and confidence.' :
  'The candidate struggles with verbal communication. Responses lack clarity, confidence, or proper structure. Significant improvement needed.'}

2. TECHNICAL COMPETENCY (${technicalScore}/100):
${technicalScore >= 75 ? 'Strong technical foundation demonstrated. The candidate shows good understanding of relevant technologies and concepts.' :
  technicalScore >= 60 ? 'Moderate technical knowledge. Has basic understanding but may need development in certain areas.' :
  'Technical knowledge appears limited. Candidate may require substantial training and development.'}

3. CULTURAL FIT (${culturalFitScore}/100):
${culturalFitScore >= 75 ? 'Good alignment with company values. Shows awareness of teamwork, collaboration, and professional growth.' :
  culturalFitScore >= 60 ? 'Moderate cultural fit. Some alignment with values but room for better integration.' :
  'Cultural fit is uncertain. Limited demonstration of team-oriented thinking or company values.'}

4. ENGAGEMENT & COMMITMENT:
${completionRate >= 0.9 ? 'Excellent - Completed full interview showing strong interest and commitment.' :
  completionRate >= 0.5 ? 'Moderate - Partially completed interview. May have time constraints or other priorities.' :
  'Poor - Left interview early. Raises concerns about commitment and genuine interest.'}

5. RESPONSE QUALITY:
${repetitionScore > 2 ? 'Concerning - Frequently repeated similar points, suggesting limited depth of experience or preparation.' :
  avgResponseLength > 150 ? 'Good - Provided detailed, thoughtful responses showing preparation and experience.' :
  'Needs Improvement - Responses were brief and lacked sufficient detail.'}

KEY STRENGTHS:
${strengths.map(s => `• ${s}`).join('\n')}

AREAS FOR IMPROVEMENT:
${weaknesses.map(w => `• ${w}`).join('\n')}

FINAL RECOMMENDATION:
${recommendation === 'strong_hire' ? 'STRONG HIRE - Highly recommended. Candidate demonstrates excellent skills and fit.' :
  recommendation === 'hire' ? 'HIRE - Recommended with minor reservations. Good potential for growth.' :
  recommendation === 'no_hire' ? 'NO HIRE - Does not meet requirements at this time. Consider for future roles after development.' :
  'STRONG NO HIRE - Significantly below requirements. Not suitable for this role.'}

${completionRate < 1 ? '\nNOTE: This assessment is based on an incomplete interview. A full evaluation would require completion of all questions.' : ''}
  `.trim();
  
  return {
    overallScore,
    recommendation,
    summary,
    strengths,
    weaknesses,
    technicalScore,
    communicationScore,
    culturalFitScore,
  };
}

// Simple text similarity calculation (Jaccard similarity)
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(text2.split(/\s+/).filter(w => w.length > 3));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
}

// Generate round-specific interview questions using Groq AI
async function generateInterviewQuestions(
  jobTitle: string,
  jobDescription: string,
  settings: any = null,
  interviewType: string = 'Screening'
) {
  const isTechnicalRound = interviewType === 'Tech Interview' || interviewType === 'Technical Round';
  const isProjectRound = interviewType === 'Project Discussion' || interviewType === 'Project Round';
  const isScreeningRound = !isTechnicalRound && !isProjectRound;

  try {
    // Round question count:
    // Screening: 4 basic questions
    // Technical: 2 DSA questions (30 mins each)
    // Project Discussion: 4 project-focused questions
    const questionCount = isTechnicalRound ? 2 : 4;
    
    if (!process.env.GROQ_API_KEY) {
      console.warn('⚠️ GROQ_API_KEY not found, using fallback questions');
      if (isTechnicalRound) return getTechnicalRoundFallbackQuestions();
      if (isProjectRound) return getProjectDiscussionFallbackQuestions(jobTitle);
      return getScreeningFallbackQuestions(jobTitle);
    }

    let promptContent = '';
    const agentName = settings?.agentName || 'AI Recruiter';
    const companyName = settings?.companyName || 'AI Recruitment Platform';
    const companyDescription = settings?.companyDescription || 'General professional interview';

    if (isTechnicalRound) {
      // ======= ROUND 2: TECHNICAL DSA ROUND (2 Questions, 30 min each) =======
      promptContent = `You are an expert technical interviewer named ${agentName} at ${companyName} conducting a TECHNICAL CODING ROUND (DSA).

About ${companyName}:
${companyDescription}

The candidate is applying for: "${jobTitle}"
Job Description: ${jobDescription}

You MUST generate EXACTLY 2 practical Data Structures and Algorithms (DSA) coding questions.

Rules:
- Return ONLY a valid JSON array of exactly 2 objects.
- Each object must have: "id" (number: 1 or 2), "question" (string), "category" (string), "difficulty" (string: "Medium" or "Hard"), and "timeLimit" (number: 30).
- Question 1 (id: 1): A MEDIUM difficulty DSA problem (LeetCode Medium level). Include problem statement with input/output examples and constraints. Topics: Arrays, Strings, HashMaps, Sliding Window, Two Pointers, Linked Lists, Binary Trees, Stacks, Queues, etc.
- Question 2 (id: 2): A HARD difficulty DSA problem (LeetCode Hard level). Include problem statement with input/output examples and constraints. Topics: Dynamic Programming, Graphs (BFS/DFS), Binary Search Trees, Heaps, Backtracking, etc.
- Each question MUST include clear Example inputs & outputs, and Constraints.
- Time limit for each question is 30 minutes.
- Category should be "DSA - Medium" or "DSA - Hard".

Example JSON format:
[
  { "id": 1, "question": "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nExample 1:\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: nums[0] + nums[1] == 9, so return [0, 1].\n\nConstraints:\n- 2 <= nums.length <= 10^4\n- -10^9 <= nums[i] <= 10^9", "category": "DSA - Medium", "difficulty": "Medium", "timeLimit": 30 },
  { "id": 2, "question": "...", "category": "DSA - Hard", "difficulty": "Hard", "timeLimit": 30 }
]

Return ONLY the JSON array.`;

    } else if (isProjectRound) {
      // ======= ROUND 3: PROJECT DISCUSSION ROUND (3-4 In-depth Project Questions) =======
      promptContent = `You are an expert engineering leader and hiring manager named ${agentName} at ${companyName} conducting a PROJECT DISCUSSION & ARCHITECTURE ROUND.

About ${companyName}:
${companyDescription}

The candidate is applying for: "${jobTitle}"
Job Description: ${jobDescription}

You MUST generate EXACTLY 4 comprehensive questions focused on whatever projects the candidate has built.

Structure the 4 questions as follows:
- Question 1 (id: 1): Project Overview & Tech Stack - Ask the candidate to pick their most proud / complex project built from scratch, explain the real-world problem it solves, and justify their tech stack choices.
- Question 2 (id: 2): Architecture & Data Flow - Ask for a deep-dive into the system architecture, API/database design, or data flow of that project.
- Question 3 (id: 3): Technical Roadblocks & Debugging - Ask about the single toughest technical bottleneck, complex bug, or scalability issue they encountered in that project and how they diagnosed and solved it.
- Question 4 (id: 4): Scalability, Trade-offs & Security - Ask what architectural trade-offs they made, how they would scale the project to 100,000+ users, or what they would re-engineer with more time.

Rules:
- Return ONLY a valid JSON array of exactly 4 objects.
- Each object must have: "id" (number 1 to 4), "question" (string), and "category" (string: "Project Overview", "System Architecture", "Technical Problem Solving", "Scalability & Trade-offs").

Example JSON format:
[
  { "id": 1, "question": "Could you walk me through the most impactful project you've built? What problem did it solve, and why did you choose your specific tech stack for it?", "category": "Project Overview" },
  { "id": 2, "question": "...", "category": "System Architecture" },
  { "id": 3, "question": "...", "category": "Technical Problem Solving" },
  { "id": 4, "question": "...", "category": "Scalability & Trade-offs" }
]

Return ONLY the JSON array.`;

    } else {
      // ======= ROUND 1: SCREENING ROUND (3-4 Basic Questions) =======
      promptContent = `You are a friendly and professional recruiter named ${agentName} at ${companyName} conducting an INITIAL SCREENING ROUND.

About ${companyName}:
${companyDescription}

The candidate is applying for: "${jobTitle}"
Job Description: ${jobDescription}

You MUST generate EXACTLY 4 basic screening questions to assess background, communication, and initial role fit.

Structure the 4 questions as follows:
- Question 1 (id: 1): Warm Welcome & Background - Warm greeting, asking the candidate to introduce themselves, their educational/professional background, and what drew them to this position.
- Question 2 (id: 2): Core Skills & Experience - A concise question exploring their primary hands-on experience with the key skills required for "${jobTitle}".
- Question 3 (id: 3): Motivation & Alignment - A question asking why they want to join ${companyName} and what motivates them in their career.
- Question 4 (id: 4): Work Style & Collaboration - A practical behavioral question about how they manage deadlines, handle feedback, or collaborate in team settings.

Rules:
- Return ONLY a valid JSON array of exactly 4 objects.
- Each object must have: "id" (number 1 to 4), "question" (string), and "category" (string: "Introduction", "Core Skills", "Motivation", "Collaboration").

Example JSON format:
[
  { "id": 1, "question": "Hello! I'm your AI recruiter. To kick off our screening, could you share a brief overview of your background and what excites you about this ${jobTitle} role?", "category": "Introduction" },
  { "id": 2, "question": "...", "category": "Core Skills" },
  { "id": 3, "question": "...", "category": "Motivation" },
  { "id": 4, "question": "...", "category": "Collaboration" }
]

Return ONLY the JSON array.`;
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: promptContent }],
      model: 'openai/gpt-oss-120b',
      temperature: isTechnicalRound ? 0.4 : 0.3,
      response_format: { type: 'json_object' },
    });

    const content = chatCompletion.choices[0]?.message?.content || '[]';
    console.log(`🤖 GROQ [${interviewType}] RAW RESPONSE:`, content);
    
    let questions = [];
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        questions = parsed;
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        questions = parsed.questions;
      } else if (parsed.interviewQuestions && Array.isArray(parsed.interviewQuestions)) {
        questions = parsed.interviewQuestions;
      } else {
        const firstArray = Object.values(parsed).find(val => Array.isArray(val));
        if (firstArray) questions = firstArray;
      }
    } catch (parseError) {
      console.error('❌ JSON Parsing Error from Groq:', parseError);
    }

    if (questions.length > 0) {
      console.log(`✅ Successfully generated ${questions.length} questions for ${interviewType}.`);
      if (isTechnicalRound) {
        questions = questions.slice(0, 2).map((q: any, i: number) => ({
          ...q,
          id: i + 1,
          difficulty: i === 0 ? 'Medium' : 'Hard',
          timeLimit: 30,
          category: i === 0 ? 'DSA - Medium' : 'DSA - Hard',
        }));
      } else {
        questions = questions.slice(0, 4).map((q: any, i: number) => ({
          ...q,
          id: i + 1,
        }));
      }
      return questions;
    }
    
    console.warn(`⚠️ Questions array empty for ${interviewType}, falling back.`);
    if (isTechnicalRound) return getTechnicalRoundFallbackQuestions();
    if (isProjectRound) return getProjectDiscussionFallbackQuestions(jobTitle);
    return getScreeningFallbackQuestions(jobTitle);
    
  } catch (error) {
    console.error('Error generating AI questions:', error);
    if (isTechnicalRound) return getTechnicalRoundFallbackQuestions();
    if (isProjectRound) return getProjectDiscussionFallbackQuestions(jobTitle);
    return getScreeningFallbackQuestions(jobTitle);
  }
}

// Fallback for Round 1: Screening (3-4 Basic Questions)
function getScreeningFallbackQuestions(jobTitle: string) {
  return [
    {
      id: 1,
      question: `Hello! I'm your AI recruiter. To get started with our screening round, could you please give me a brief introduction of yourself, your background, and why you are interested in this ${jobTitle} position?`,
      category: "Introduction"
    },
    {
      id: 2,
      question: `Can you describe your core experience and technical/domain skills relevant to the responsibilities of a ${jobTitle}?`,
      category: "Core Skills"
    },
    {
      id: 3,
      question: `What motivated you to apply for this opportunity, and what are your primary career goals over the next couple of years?`,
      category: "Motivation"
    },
    {
      id: 4,
      question: `How do you typically manage priorities when dealing with tight deadlines or shifting requirements in a team environment?`,
      category: "Work Style"
    }
  ];
}

// Fallback for Round 2: Technical DSA (2 Questions, 30 min each)
function getTechnicalRoundFallbackQuestions() {
  return [
    {
      id: 1,
      question: "Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.\n\nExample 1:\nInput: nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]\nOutput: 6\nExplanation: The subarray [4, -1, 2, 1] has the largest sum = 6.\n\nConstraints:\n- 1 <= nums.length <= 10^5\n- -10^4 <= nums[i] <= 10^4\n\nFollow up: Can you formulate an O(n) solution using Kadane's Algorithm?",
      category: "DSA - Medium",
      difficulty: "Medium",
      timeLimit: 30
    },
    {
      id: 2,
      question: "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.\n\nExample 1:\nInput: height = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]\nOutput: 6\nExplanation: 6 units of rain water are trapped between the bars.\n\nConstraints:\n- n == height.length\n- 1 <= n <= 2 * 10^4\n- 0 <= height[i] <= 10^5\n\nCan you solve it in O(n) time and O(1) extra space using two pointers?",
      category: "DSA - Hard",
      difficulty: "Hard",
      timeLimit: 30
    }
  ];
}

// Fallback for Round 3: Project Discussion (4 in-depth project questions)
function getProjectDiscussionFallbackQuestions(jobTitle: string) {
  return [
    {
      id: 1,
      question: `Welcome to the Project Discussion round! Tell me about the most impactful software or technical project you have built from scratch. What problem did it solve, and why did you select your specific tech stack?`,
      category: "Project Overview"
    },
    {
      id: 2,
      question: `Can you walk me through the high-level system architecture and data flow of that project? How did the frontend, backend, APIs, and database communicate?`,
      category: "System Architecture"
    },
    {
      id: 3,
      question: `What was the most difficult technical hurdle, bug, or performance bottleneck you ran into during that project, and how did you diagnose and resolve it?`,
      category: "Technical Problem Solving"
    },
    {
      id: 4,
      question: `If you had to scale that project to handle 100,000+ concurrent active users, what architectural trade-offs, caching strategies, or structural changes would you make?`,
      category: "Scalability & Trade-offs"
    }
  ];
}
