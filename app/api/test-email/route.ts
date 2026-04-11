import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    console.log(`🧪 Sending test email to: ${email}`);

    const { data, error } = await resend.emails.send({
      from: 'Nimish <onboarding@resend.dev>',
      to: email,
      subject: 'Test Email: AI Recruiter Configuration',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px;">
          <h2 style="color: #3b82f6;">Configuration Test Successful! ✅</h2>
          <p>Hello!</p>
          <p>This is a test email from your <strong>AI Recruiter</strong> application.</p>
          <p>If you are receiving this, it means your <strong>Resend API Key</strong> is configured correctly and your "Agent" is ready to send interview invites automatically.</p>
          <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #4b5563;">
              <strong>Note:</strong> You are currently in Resend Sandbox mode. To send emails to real candidates, remember to verify your domain in the Resend dashboard.
            </p>
          </div>
          <p style="font-size: 12px; color: #9ca3af; margin-top: 30px;">Sent via AI Recruiter System</p>
        </div>
      `,
    });

    if (error) {
      console.error('❌ Resend Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('❌ Test Email Exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
