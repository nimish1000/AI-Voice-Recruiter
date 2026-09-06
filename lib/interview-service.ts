import { db, interviews } from './db';
import crypto from 'crypto';
import { sendEmail } from './mailer';

interface InviteOptions {
  jobId: string;
  candidateName: string;
  candidateEmail: string;
  interviewType?: string;
  host?: string;
  recruiterId?: string;
}

export async function automateInterviewInvite({
  jobId,
  candidateName,
  candidateEmail,
  interviewType = 'Screening',
  host = 'localhost:3000',
  recruiterId
}: InviteOptions) {
  try {
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;
    
    // 1. Generate unique interview ID
    const interviewId = `int_${crypto.randomBytes(8).toString('hex')}`;
    
    // 2. Insert into database
    await db.insert(interviews).values({
      interviewId,
      jobId,
      candidateName,
      candidateEmail,
      interviewType,
      recruiterId,
      status: 'scheduled',
    });

    const interviewLink = `${baseUrl}/interview/${interviewId}`;

    // 3. Send email invite (via Gmail SMTP if configured, or Resend)
    console.log(`📧 Automatically sending interview invite to: ${candidateEmail}`);
    
    const emailResult = await sendEmail({
      to: candidateEmail,
      subject: `Interview Invitation: ${interviewType} for Job Opportunity`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; padding: 40px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="display: inline-block; width: 50px; height: 50px; background: linear-gradient(to bottom right, #2563eb, #7c3aed); border-radius: 10px; line-height: 50px; color: white; font-size: 24px; font-weight: bold;">AI</div>
          </div>
          <h2 style="color: #111827; margin-top: 0;">Hello ${candidateName}!</h2>
          <p style="color: #4b5563; line-height: 1.6;">Great news! You have been invited to participate in an AI-powered automated interview session for a position you recently applied for.</p>
          <p style="color: #4b5563; line-height: 1.6;">This interview will assess your technical skills and background. It should take approximately 20-30 minutes.</p>
          
          <div style="margin: 40px 0; text-align: center;">
            <a href="${interviewLink}" style="background-color: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">Start Your Interview</a>
          </div>
          
          <div style="background-color: #f9fafb; border-radius: 8px; padding: 20px; border-left: 4px solid #2563eb;">
             <p style="margin: 0; font-size: 14px; color: #374151;"><strong>Tip:</strong> Ensure you are in a quiet environment with a working microphone and camera before starting.</p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">If the button doesn't work, copy and paste this link: <br> <span style="color: #2563eb;">${interviewLink}</span></p>
          
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">Sent by AI Recruiter Assistant. This is an automated message.</p>
        </div>
      `,
    });

    if (!emailResult.success) {
      console.error(`❌ Automation failed to deliver email to ${candidateEmail}:`, emailResult.error);
      return { success: false, error: emailResult.error };
    }

    console.log(`✅ Automated invite successfully dispatched to ${candidateEmail}`);
    return { success: true, interviewId, link: interviewLink };
    
  } catch (error: any) {
    console.error('❌ Error in automated interview service:', error);
    return { success: false, error: error.message };
  }
}
