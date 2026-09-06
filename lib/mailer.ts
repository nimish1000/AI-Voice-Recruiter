import nodemailer from 'nodemailer';
import { Resend } from 'resend';

interface SendMailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendMailParams): Promise<{ success: boolean; error?: string }> {
  // Option 1: Gmail SMTP via Nodemailer (No custom domain required, sends to anyone)
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.GMAIL_USER.trim(),
          pass: process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, '').trim(),
        },
      });

      const info = await transporter.sendMail({
        from: `"AI Recruiter" <${process.env.GMAIL_USER.trim()}>`,
        to: to.trim(),
        subject,
        html,
      });

      console.log(`✅ [Gmail SMTP] Email successfully sent to ${to}, Message ID: ${info.messageId}`);
      return { success: true };
    } catch (err: any) {
      console.error(`❌ [Gmail SMTP] Failed to send email to ${to}:`, err.message || err);
      return { success: false, error: err.message || 'Failed to send email via Gmail' };
    }
  }

  // Option 2: Resend
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from = process.env.RESEND_FROM_EMAIL || 'AI Recruiter <onboarding@resend.dev>';

      const { error } = await resend.emails.send({
        from,
        to,
        subject,
        html,
      });

      if (error) {
        console.error(`❌ [Resend] Failed to send email to ${to}:`, error.message);
        return { success: false, error: error.message };
      }

      console.log(`✅ [Resend] Email successfully sent to ${to}`);
      return { success: true };
    } catch (err: any) {
      console.error(`❌ [Resend] Exception when sending email to ${to}:`, err.message || err);
      return { success: false, error: err.message || 'Failed to send email via Resend' };
    }
  }

  return {
    success: false,
    error: 'No email service configured. Please set GMAIL_USER and GMAIL_APP_PASSWORD or RESEND_API_KEY in .env.local',
  };
}
