import { Resend } from 'resend';
import * as dotenv from 'dotenv';
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function test() {
  console.log('Using API Key:', process.env.RESEND_API_KEY?.substring(0, 10) + '...');
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'Recruiter AI <onboarding@resend.dev>',
      to: 'nimishsabnani@gmail.com', // The email from the screenshot
      subject: 'Diagnostic Test',
      html: '<p>Test</p>',
    });

    if (error) {
      console.error('❌ Resend Error Object:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ Resend Data:', JSON.stringify(data, null, 2));
    }
  } catch (err: any) {
    console.error('❌ Exception:', err);
  }
}

test();
