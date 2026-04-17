import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || '' });

export async function POST(request: Request) {
  try {
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'Transcription service not configured' }, { status: 500 });
    }

    const formData = await request.formData();
    const audio = formData.get('audio');

    if (!(audio instanceof File)) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 });
    }

    // Keep a tiny guard only for effectively empty payloads.
    // Some browsers can produce very small valid Opus chunks.
    if (audio.size < 128) {
      return NextResponse.json({ transcript: '' });
    }

    const transcription = await groq.audio.transcriptions.create({
      file: audio as any,
      model: 'whisper-large-v3-turbo',
      response_format: 'json',
      language: 'en',
      temperature: 0,
    });

    return NextResponse.json({ transcript: (transcription.text || '').trim() });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (
      errorMessage.includes('could not process file') ||
      errorMessage.includes('invalid_request_error')
    ) {
      return NextResponse.json({ transcript: '' });
    }
    console.error('Error transcribing audio:', error);
    return NextResponse.json({ transcript: '' }, { status: 500 });
  }
}
