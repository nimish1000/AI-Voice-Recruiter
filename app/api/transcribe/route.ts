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

    console.log(`🎤 [Server] Received audio: size=${audio.size}, type="${audio.type}", name="${audio.name}"`);

    const transcription = await groq.audio.transcriptions.create({
      file: audio as any,
      model: 'whisper-large-v3-turbo',
      response_format: 'json',
      language: 'en',
      temperature: 0,
    });

    let transcript = (transcription.text || '').trim();
    console.log(`🎤 [Server] Raw Whisper output: "${transcript}" (length=${transcript.length})`);

    // Filter common Whisper hallucinations that happen during silence/noise
    const HALLUCINATION_PHRASES = [
      'thank you',
      'thank you for watching',
      'please subscribe',
      'subtitle by',
      'thanks for watching',
      'bye',
      'goodbye',
      'you',
    ];
    const hallucinationWords = new Set(['thank', 'you', 'thanks', 'for', 'watching', 'please', 'subscribe', 'subtitle', 'by', 'bye', 'goodbye']);

    const cleaned = transcript.toLowerCase().replace(/[.,!?;:]+/g, ' ').replace(/\s+/g, ' ').trim();
    let isHallucination = false;
    if (HALLUCINATION_PHRASES.includes(cleaned)) {
      isHallucination = true;
    } else {
      // Check if ALL sentence segments are hallucination phrases (e.g. "Thank you. Thank you.")
      const segments = cleaned.split(/[.!?]+/).map((s: string) => s.trim()).filter(Boolean);
      if (segments.length > 0 && segments.every((seg: string) => HALLUCINATION_PHRASES.includes(seg))) {
        isHallucination = true;
      }
      // Very short transcripts made entirely of hallucination words
      const words = cleaned.split(/\s+/);
      if (words.length <= 6 && words.every((w: string) => hallucinationWords.has(w))) {
        isHallucination = true;
      }
    }

    if (isHallucination) {
      console.log(`🚫 Filtered Whisper hallucination: "${transcript}"`);
      transcript = '';
    }

    return NextResponse.json({ transcript });
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    const errStatus = error?.status || error?.statusCode || 'unknown';
    const errBody = error?.error || error?.response?.data || '';
    console.error(`🔥 CRITICAL Groq Transcription Error [${errStatus}]: ${errMsg}`, errBody);
    return NextResponse.json({ transcript: '', error: errMsg }, { status: 500 });
  }
}
