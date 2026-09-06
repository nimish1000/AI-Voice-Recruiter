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
      const isTechnicalRound = interviewType === 'Tech Interview';

      // Generate job-specific questions
      const generatedQuestions = await generateInterviewQuestions(
        job?.title || 'General Position',
        job?.description || 'General professional interview',
        settings,
        isTechnicalRound
      );
      
      return NextResponse.json({
        success: true,
        interview: interview,
        job: job ? { title: job.title, description: job.description } : null,
        questions: generatedQuestions,
        interviewType,
        isTechnicalRound,
        totalTimeMinutes: isTechnicalRound ? 60 : null,
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

// Generate job-specific interview questions using Groq AI
async function generateInterviewQuestions(jobTitle: string, jobDescription: string, settings: any = null, isTechnicalRound: boolean = false) {
  try {
    // Technical round: exactly 2 practical DSA questions
    const questionCount = isTechnicalRound ? 2 : (settings?.questionCount || 8);
    
    if (!process.env.GROQ_API_KEY) {
      console.warn('⚠️ GROQ_API_KEY not found, using fallback questions');
      return isTechnicalRound ? getTechnicalRoundFallbackQuestions() : getFallbackQuestions(jobTitle, questionCount);
    }

    let promptContent = '';
    const agentName = settings?.agentName || 'AI Recruiter';
    const companyName = settings?.companyName || 'AI Recruitment Platform';
    const companyDescription = settings?.companyDescription || 'General professional interview';

    if (isTechnicalRound) {
      // ======= TECHNICAL ROUND: 2 Practical DSA Questions =======
      promptContent = `You are an expert technical interviewer named ${agentName} at ${companyName} conducting a TECHNICAL CODING ROUND.

About ${companyName}:
${companyDescription}

The candidate is applying for: "${jobTitle}"
Job Description: ${jobDescription}

You MUST generate EXACTLY 2 practical Data Structures and Algorithms (DSA) coding questions.

Rules:
- Return ONLY a valid JSON array of exactly 2 objects.
- Each object must have: "id" (number), "question" (string), "category" (string), "difficulty" (string: "Medium" or "Hard"), and "timeLimit" (number: 30).
- Question 1 (id: 1): A MEDIUM difficulty DSA problem. This should be a practical coding problem similar to LeetCode Medium level. Include a clear problem statement with input/output examples. Topics can include: Arrays, Strings, HashMaps, Linked Lists, Stacks, Queues, Binary Search, Two Pointers, Sliding Window, etc.
- Question 2 (id: 2): A HARD difficulty DSA problem. This should be a practical coding problem similar to LeetCode Hard level. Include a clear problem statement with input/output examples. Topics can include: Dynamic Programming, Graphs (BFS/DFS), Trees, Tries, Heaps, Greedy Algorithms, Backtracking, etc.
- Each question MUST have a concrete problem statement (not vague). For example: "Given an array of integers, find..." or "Design a data structure that supports..."
- Include at least one input/output example in each question.
- The candidate has 30 minutes per question (60 minutes total).
- Category should be "DSA - Medium" or "DSA - Hard".

Example format:
[
  { "id": 1, "question": "Given an array of integers nums and a target integer target, return the indices of the two numbers such that they add up to target.\n\nExample:\nInput: nums = [2, 7, 11, 15], target = 9\nOutput: [0, 1]\nExplanation: nums[0] + nums[1] = 2 + 7 = 9\n\nConstraints:\n- 2 <= nums.length <= 10^4\n- Each input has exactly one solution.", "category": "DSA - Medium", "difficulty": "Medium", "timeLimit": 30 },
  { "id": 2, "question": "...", "category": "DSA - Hard", "difficulty": "Hard", "timeLimit": 30 }
]

Return ONLY the JSON array. No conversational text. Make the questions unique, practical, and challenging.`;
    } else if (!settings?.systemPrompt) {
      // ======= STANDARD INTERVIEW ROUND =======
      promptContent = `You are an expert technical recruiter and interviewer named ${agentName} at ${companyName}. 
    
    About ${companyName}:
    ${companyDescription}

    Generate ${questionCount} interview questions for a candidate applying for the position of "${jobTitle}".
    
    Job Description context:
    ${jobDescription}
    
    Requirements:
    - Return ONLY a valid JSON array of objects.
    - Each object must have "id" (number 1-8), "question" (string), and "category" (string).
    - Question 1: A warm introduction and request for background.
    - Questions 2-5: Technical questions specific to the role "${jobTitle}". IMPORTANT: If the role is "Software Developer", "Full Stack Developer", or similar engineering roles, you MUST include at least 3-4 questions specifically about Data Structures and Algorithms (DSA).
    - Questions 6-7: Behavioral or collaboration questions.
    - Question 8: Career goals and a flat closing question.
    
    Example format:
    [
      { "id": 1, "question": "...", "category": "Introduction" }
    ]
    
    Return ONLY the JSON. No conversational text.`;

      // Force DSA requirement for engineering roles using code logic
      const isEngineering = jobTitle.toLowerCase().includes('software') || 
                            jobTitle.toLowerCase().includes('developer') || 
                            jobTitle.toLowerCase().includes('engineer') ||
                            jobTitle.toLowerCase().includes('stack') ||
                            jobTitle.toLowerCase().includes('coder');
                            
      if (isEngineering) {
        promptContent += `\n\nCRITICAL INSTRUCTION: YOU MUST explicitly make AT LEAST 3 to 4 of the technical questions focused purely on Data Structures and Algorithms (DSA) such as Arrays, HashMaps, Trees, Graphs, or Dynamic Programming. Do NOT ask only general web development questions. Ask specific coding/DSA problem-solving questions.`;
      }
    } else {
      // Replace placeholders in custom prompt
      promptContent = settings.systemPrompt
        .replace(/\[COUNT\]/g, questionCount.toString())
        .replace(/\[TITLE\]/g, jobTitle)
        .replace(/\[DESCRIPTION\]/g, jobDescription)
        .replace(/\[COMPANY_NAME\]/g, companyName)
        .replace(/\[COMPANY_DESCRIPTION\]/g, companyDescription);
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: promptContent }],
      model: 'openai/gpt-oss-120b',
      temperature: isTechnicalRound ? 0.4 : 0.2,
      response_format: { type: 'json_object' },
    });

    const content = chatCompletion.choices[0]?.message?.content || '[]';
    console.log('🤖 GROQ RAW RESPONSE:', content);
    
    // Handle cases where model might return { "questions": [...] } or { "interviewQuestions": [...] }
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
        // Just grab the first array we can find inside the object
        const firstArray = Object.values(parsed).find(val => Array.isArray(val));
        if (firstArray) questions = firstArray;
      }
    } catch (parseError) {
      console.error('❌ JSON Parsing Error from Groq:', parseError);
    }

    if (questions.length > 0) {
      console.log(`✅ Successfully generated ${questions.length} questions from Groq.`);
      // For technical round, ensure we have exactly 2 and add timeLimit
      if (isTechnicalRound) {
        questions = questions.slice(0, 2).map((q: any, i: number) => ({
          ...q,
          id: i + 1,
          difficulty: i === 0 ? 'Medium' : 'Hard',
          timeLimit: 30,
          category: i === 0 ? 'DSA - Medium' : 'DSA - Hard',
        }));
      }
      return questions.slice(0, questionCount);
    }
    
    console.warn('⚠️ Questions array empty, falling back.');
    return isTechnicalRound ? getTechnicalRoundFallbackQuestions() : getFallbackQuestions(jobTitle, questionCount);
    
  } catch (error) {
    console.error('Error generating AI questions:', error);
    return isTechnicalRound ? getTechnicalRoundFallbackQuestions() : getFallbackQuestions(jobTitle, 8);
  }
}

function getFallbackQuestions(jobTitle: string, count: number = 8) {
  const base = [
    { id: 1, question: `Hello! I'm your AI interviewer. To get started, could you please tell me about your background and what interests you in this ${jobTitle} position?`, category: "Introduction" },
    { id: 2, question: `Can you describe your experience with the core technologies and responsibilities required for a ${jobTitle}?`, category: "Technical" },
    { id: 3, question: "What do you consider your greatest professional achievement so far?", category: "Experience" },
    { id: 4, question: "Tell me about a challenging situation at work and how you handled it.", category: "Behavioral" },
    { id: 5, question: "How do you stay updated with the latest trends and technologies in your field?", category: "Learning" },
    { id: 6, question: "Describe your ideal team environment and how you contribute to it.", category: "Collaboration" },
    { id: 7, question: "What are your expectations from this role and our company?", category: "Motivation" },
    { id: 8, question: "Where do you see yourself professionally in the next few years?", category: "Career Goals" }
  ];

  return base.slice(0, count).map((q, i) => ({ ...q, id: i + 1 }));
}

function getTechnicalRoundFallbackQuestions() {
  return [
    {
      id: 1,
      question: "Given an integer array nums, find the contiguous subarray (containing at least one number) which has the largest sum and return its sum.\n\nExample:\nInput: nums = [-2, 1, -3, 4, -1, 2, 1, -5, 4]\nOutput: 6\nExplanation: The subarray [4, -1, 2, 1] has the largest sum = 6.\n\nConstraints:\n- 1 <= nums.length <= 10^5\n- -10^4 <= nums[i] <= 10^4\n\nFollow up: Can you solve it using Kadane's Algorithm in O(n) time?",
      category: "DSA - Medium",
      difficulty: "Medium",
      timeLimit: 30
    },
    {
      id: 2,
      question: "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.\n\nExample:\nInput: height = [0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1]\nOutput: 6\nExplanation: 6 units of rain water are trapped between the bars.\n\nConstraints:\n- n == height.length\n- 1 <= n <= 2 * 10^4\n- 0 <= height[i] <= 10^5\n\nCan you solve it in O(n) time and O(1) space using two pointers?",
      category: "DSA - Hard",
      difficulty: "Hard",
      timeLimit: 30
    }
  ];
}
