import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/mailer';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log(`🧪 Sending test email to: ${email}`);

    const result = await sendEmail({
      to: email,
      subject: 'Test Email: AI Recruiter Configuration',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #3b82f6;">Configuration Test Successful! ✅</h2>
          <p>Hello!</p>
          <p>This is a test email from your <strong>AI Recruiter</strong> application.</p>
          <p>Your email provider is configured correctly and your automated agent is ready to send interview invitations to candidates.</p>
          <p style="font-size: 12px; color: #9ca3af; margin-top: 30px;">Sent via AI Recruiter System</p>
        </div>
      `,
    });

    if (!result.success) {
      console.error('❌ Test Email Error:', result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('❌ Test Email Exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
