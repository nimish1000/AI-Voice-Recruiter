import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { jobTitle } = body;

  if (!jobTitle) {
    return NextResponse.json(
      { error: 'Job title is required' },
      { status: 400 }
    );
  }

  try {

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'AI API key not configured' },
        { status: 500 }
      );
    }

    const groq = new Groq({ apiKey });

    const prompt = `
You are an expert HR professional and job description writer. Create a comprehensive job posting for the position of "${jobTitle}".

Please provide the response in the following JSON format:
{
  "title": "${jobTitle}",
  "description": "A compelling and detailed job description (2-3 paragraphs) that explains the role, responsibilities, and what makes this opportunity exciting.",
  "requirements": [
    "List 8-10 specific requirements including education, experience, technical skills, and soft skills",
    "Make them realistic and relevant to the position"
  ],
  "location": "Suggest appropriate work arrangement (Remote, Hybrid, or On-site)",
  "type": "full-time"
}

Make the job description:
- Professional and engaging
- Inclusive and diverse in language
- Clear about expectations
- Attractive to top talent
- Specific to the role mentioned

Requirements should be:
- Realistic and achievable
- Mix of must-have and nice-to-have
- Include both technical and soft skills
- Specific to the industry/role

Return ONLY valid JSON, no markdown formatting or explanation.
`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
    });
    
    const text = chatCompletion.choices[0]?.message?.content || '';

    // Parse the JSON response
    let jobData;
    try {
      // Remove any markdown code blocks if present
      const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
      jobData = JSON.parse(cleanJson);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse AI response' },
        { status: 500 }
      );
    }

    return NextResponse.json({ job: jobData });
  } catch (error: any) {
    console.error('Error generating job with AI:', error);
    
    // Check for quota exceeded error
    if (error?.status === 429 || error?.message?.includes('429')) {
      // Fallback to template-based generation
      console.log('AI quota exceeded, using fallback template generator');
      const fallbackJob = generateFallbackJob(jobTitle);
      return NextResponse.json({ 
        job: fallbackJob,
        usedFallback: true,
        message: 'Generated using template (AI quota exceeded)'
      });
    }
    
    return NextResponse.json(
      { error: 'Failed to generate job description. Please try again or use manual entry.' },
      { status: 500 }
    );
  }
}

// Fallback template-based job generator
function generateFallbackJob(jobTitle: string) {
  const title = jobTitle.trim();
  
  // Common requirements based on job type
  const getRequirements = (title: string): string[] => {
    const titleLower = title.toLowerCase();
    
    if (titleLower.includes('developer') || titleLower.includes('engineer') || titleLower.includes('software')) {
      return [
        "Bachelor's degree in Computer Science or related field",
        "3+ years of experience in software development",
        "Proficiency in modern programming languages (JavaScript, Python, Java, etc.)",
        "Experience with version control systems (Git)",
        "Strong problem-solving and analytical skills",
        "Experience with agile development methodologies",
        "Excellent communication and teamwork abilities",
        "Understanding of software design patterns and best practices",
        "Experience with testing frameworks and debugging tools",
        "Familiarity with cloud services (AWS, Azure, or GCP)"
      ];
    } else if (titleLower.includes('design') || titleLower.includes('ui') || titleLower.includes('ux')) {
      return [
        "Bachelor's degree in Design, HCI, or related field",
        "3+ years of experience in UI/UX design",
        "Proficiency in design tools (Figma, Sketch, Adobe Creative Suite)",
        "Strong portfolio demonstrating design process and solutions",
        "Understanding of user-centered design principles",
        "Experience with wireframing and prototyping",
        "Knowledge of HTML/CSS fundamentals",
        "Excellent visual design skills with attention to detail",
        "Ability to conduct user research and usability testing",
        "Strong communication and presentation skills"
      ];
    } else if (titleLower.includes('marketing') || titleLower.includes('growth')) {
      return [
        "Bachelor's degree in Marketing, Business, or related field",
        "3+ years of experience in digital marketing",
        "Experience with marketing analytics tools (Google Analytics, etc.)",
        "Strong understanding of SEO/SEM principles",
        "Experience with social media marketing and content strategy",
        "Excellent written and verbal communication skills",
        "Data-driven mindset with analytical skills",
        "Experience with marketing automation platforms",
        "Creative thinking and problem-solving abilities",
        "Project management and organizational skills"
      ];
    } else if (titleLower.includes('sales') || titleLower.includes('account')) {
      return [
        "Bachelor's degree in Business or related field",
        "3+ years of experience in sales or account management",
        "Proven track record of meeting or exceeding sales targets",
        "Strong negotiation and closing skills",
        "Excellent relationship-building abilities",
        "Experience with CRM software (Salesforce, HubSpot, etc.)",
        "Outstanding communication and presentation skills",
        "Strategic thinking and problem-solving abilities",
        "Self-motivated with strong work ethic",
        "Ability to work independently and as part of a team"
      ];
    } else {
      return [
        "Bachelor's degree in relevant field or equivalent experience",
        "3+ years of experience in related role",
        "Strong technical and professional skills relevant to the position",
        "Excellent communication and interpersonal abilities",
        "Proven problem-solving and analytical skills",
        "Experience with industry-standard tools and technologies",
        "Ability to work collaboratively in team environments",
        "Strong organizational and time management skills",
        "Adaptability and willingness to learn new skills",
        "Attention to detail and commitment to quality"
      ];
    }
  };

  return {
    title: title,
    description: `We are seeking a talented and motivated ${title} to join our growing team. In this role, you will play a key part in driving our success and contributing to innovative projects that make a real impact.\n\nAs a ${title}, you will collaborate with cross-functional teams, leverage your expertise to solve complex challenges, and help shape the future of our organization. We offer a dynamic work environment, competitive compensation, and excellent opportunities for professional growth and development.\n\nIf you're passionate about your craft and eager to work with a team of dedicated professionals, we'd love to hear from you.`,
    requirements: getRequirements(title),
    location: "Remote or Hybrid (flexible)",
    type: "full-time"
  };
}
