'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { 
  Sparkles, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  Send,
  Volume2,
  VolumeX,
  User,
  Bot,
  Loader2,
  Clock,
  AlertTriangle,
  Code2,
  FileText,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Message {
  id: string;
  role: 'ai' | 'user';
  content: string;
  timestamp: Date;
}

interface InterviewQuestion {
  id: number;
  question: string;
  category: string;
  difficulty?: string;
  timeLimit?: number;
}

/** Web Speech auto-send uses this; keep very low so short valid answers are not dropped. */
const MIN_VOICE_RESPONSE_CHARS = 1;
const FALLBACK_MIN_CHUNK_BYTES = 500;
const FALLBACK_COMBINE_BYTES = 2500;
/** Must be longer than recorder timeslice (3500ms) to avoid echo from AI speech */
const FALLBACK_POST_AI_COOLDOWN_MS = 1500;
/** Number of consecutive 'no-speech' errors before switching to fallback mode */
const NO_SPEECH_THRESHOLD = 2;

const WHISPER_HALLUCINATION_PHRASES = [
  'thank you',
  'thank you for watching',
  'please subscribe',
  'subtitle by',
  'thanks for watching',
  'bye',
  'goodbye',
  'you',
];

/** Returns true if the transcript is a Whisper hallucination (silence noise → garbage text) */
const isWhisperHallucination = (text: string): boolean => {
  const cleaned = text.toLowerCase().replace(/[.,!?;:]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return true;
  
  // Direct full-match
  if (WHISPER_HALLUCINATION_PHRASES.includes(cleaned)) return true;
  if (cleaned === 'okay' || cleaned === 'ok' || cleaned === 'okay.') return true;
  if (cleaned.includes('thank you') && cleaned.length < 30 && !cleaned.includes('my')) return true;
  
  // Split into sentences / segments and check if ALL are hallucinations
  const segments = cleaned.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  if (segments.length > 0 && segments.every(seg => WHISPER_HALLUCINATION_PHRASES.includes(seg))) return true;
  
  // Very short + only hallucination words
  const words = cleaned.split(/\s+/);
  const hallucinationWords = new Set(['okay', 'ok', 'thank', 'you', 'thanks', 'for', 'watching', 'please', 'subscribe', 'subtitle', 'by', 'bye', 'goodbye', 'these', 'questions']);
  if (words.length <= 8 && words.every(w => hallucinationWords.has(w))) return true;
  
  return false;
};


export default function InterviewSession() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const interviewId = params.id as string;
  const userNameFromQuery = searchParams.get('name') || 'Candidate';

  // State management
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [userName, setUserName] = useState(userNameFromQuery);
  const [isListening, setIsListening] = useState(false);
  const [isInterviewEnding, setIsInterviewEnding] = useState(false);
  const isInterviewEndingRef = useRef(false);
  const lastSpeechTimeRef = useRef<number>(0);
  const autoSendTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const askedQuestionsRef = useRef<Set<number>>(new Set());
  const currentQuestionIndexRef = useRef<number>(0);
  const interviewQuestionsRef = useRef<InterviewQuestion[]>([]);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const micPermissionStreamRef = useRef<MediaStream | null>(null);
  const fallbackRecorderRef = useRef<MediaRecorder | null>(null);
  const fallbackNoSpeechCountRef = useRef(0);
  const fallbackTranscribingRef = useRef(false);
  const lastFallbackTranscriptRef = useRef('');
  const fallbackChunkBufferRef = useRef<Blob[]>([]);
  const fallbackChunkBytesRef = useRef(0);
  const lastAISpeechEndAtRef = useRef(0);
  /** Tracks what the AI last said — used to detect and reject echo in fallback transcription */
  const lastAISpeechTextRef = useRef('');
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextClosedRef = useRef<boolean>(false);
  const isAISpeakingRef = useRef(false);
  const isCallActiveRef = useRef(false);
  /** Set true synchronously before recognition.stop() for TTS; onend must not auto-restart until utterance ends. */
  const recognitionPausedForAIRef = useRef(false);
  /** Latest combined final + interim text; read when the pause-timeout fires (avoids stale snapshot bugs). */
  const liveSpeechTextRef = useRef('');
  const handleUserMessageRef = useRef<(text: string) => void | Promise<void>>(() => {});
  const [sttMode, setSttMode] = useState<'browser' | 'fallback'>('browser');
  const sttModeRef = useRef<'browser' | 'fallback'>('browser');
  const [micLevel, setMicLevel] = useState(0);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);

  // Mock interview questions based on job description
  const [interviewQuestions, setInterviewQuestions] = useState<InterviewQuestion[]>([
    {
      id: 1,
      question: "Hello! I'm your AI interviewer. To get started, could you please tell me a bit about yourself and your background?",
      category: "Introduction"
    }
  ]);

  // Sync ref with initial state
  useEffect(() => {
    interviewQuestionsRef.current = interviewQuestions;
  }, []);
  const [jobTitle, setJobTitle] = useState('Position');
  const [agentName, setAgentName] = useState('AI Interviewer');

  // Technical round state
  const [isTechnicalRound, setIsTechnicalRound] = useState(false);
  const [userCode, setUserCode] = useState('');
  const [perQuestionTimeMinutes, setPerQuestionTimeMinutes] = useState(30);
  const [questionSecondsLeft, setQuestionSecondsLeft] = useState<number | null>(null);
  const [overallSecondsLeft, setOverallSecondsLeft] = useState<number | null>(null);
  const questionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const overallTimerRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const isTechnicalRoundRef = useRef(false);
  const questionSecondsLeftRef = useRef<number | null>(null);
  const overallSecondsLeftRef = useRef<number | null>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    isAISpeakingRef.current = isAISpeaking;
  }, [isAISpeaking]);

  useEffect(() => {
    isCallActiveRef.current = isCallActive;
  }, [isCallActive]);

  useEffect(() => {
    sttModeRef.current = sttMode;
  }, [sttMode]);

  // Sync technical round refs
  useEffect(() => {
    isTechnicalRoundRef.current = isTechnicalRound;
  }, [isTechnicalRound]);

  useEffect(() => {
    questionSecondsLeftRef.current = questionSecondsLeft;
  }, [questionSecondsLeft]);

  useEffect(() => {
    overallSecondsLeftRef.current = overallSecondsLeft;
  }, [overallSecondsLeft]);

  useEffect(() => {
    isInterviewEndingRef.current = isInterviewEnding;
  }, [isInterviewEnding]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
      if (overallTimerRef.current) clearInterval(overallTimerRef.current);
    };
  }, []);

  // Initialize webcam
  const initializeCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: false 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera. Please check permissions.');
    }
  }, []);

  // Not memoized: must call the current render's setupSpeechRecognition (useCallback([]) froze a stale closure before).
  const initializeMicrophone = async () => {
    try {
      // Prime microphone permissions/device selection before Web Speech starts.
      // On some Chromium builds, SpeechRecognition can loop on "no-speech" unless
      // mic access is explicitly granted first via getUserMedia.
      if (micPermissionStreamRef.current) {
        micPermissionStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      micPermissionStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      // ---- Mic diagnostic: log track info and monitor audio levels ----
      const tracks = micPermissionStreamRef.current.getAudioTracks();
      tracks.forEach((track, i) => {
        console.log(`🎙️ Mic track ${i}: label="${track.label}", enabled=${track.enabled}, muted=${track.muted}, readyState=${track.readyState}`);
        const settings = track.getSettings();
        console.log(`🎙️ Track settings:`, JSON.stringify(settings));
      });

      // Audio level meter — updates UI every 500ms so user can visually see mic activity
      try {
        const diagCtx = new AudioContext();
        const source = diagCtx.createMediaStreamSource(micPermissionStreamRef.current);
        const analyser = diagCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        micAnalyserRef.current = analyser;
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const levelInterval = setInterval(() => {
          if (!micPermissionStreamRef.current || !isCallActiveRef.current) {
            clearInterval(levelInterval);
            diagCtx.close();
            return;
          }
          analyser.getByteTimeDomainData(dataArray);
          // Calculate RMS level (0-100)
          let sumSquares = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const normalized = (dataArray[i] - 128) / 128;
            sumSquares += normalized * normalized;
          }
          const rms = Math.sqrt(sumSquares / dataArray.length);
          const level = Math.min(100, Math.round(rms * 500));
          setMicLevel(level);
        }, 500);
      } catch (e) {
        console.warn('Audio level diagnostic failed:', e);
      }
      // ---- End mic diagnostic ----

      setupSpeechRecognition({ deferInitialStart: true });
      // Start fallback recorder immediately alongside browser STT
      // so transcription works even if browser STT never picks up speech
      startFallbackTranscription();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions and ensure your device has a microphone.');
    }
  };

  /** Check if a transcript looks like an echo of what the AI just said */
  const isEchoOfAISpeech = (transcript: string): boolean => {
    const aiText = lastAISpeechTextRef.current.toLowerCase().trim();
    if (!aiText) return false;
    const userText = transcript.toLowerCase().trim();
    // Direct substring match
    if (aiText.includes(userText) || userText.includes(aiText)) return true;
    // Word overlap check — if >60% of user words appear in AI text, it's echo
    const userWords = userText.split(/\s+/).filter(w => w.length > 2);
    const aiWords = new Set(aiText.split(/\s+/).filter(w => w.length > 2));
    if (userWords.length === 0) return true; // empty/trivial
    const overlap = userWords.filter(w => aiWords.has(w)).length;
    const ratio = overlap / userWords.length;
    if (ratio > 0.6) {
      console.log(`🔇 Echo detected: "${transcript}" matches AI speech (${Math.round(ratio * 100)}% overlap)`);
      return true;
    }
    return false;
  };

  /** Pause the fallback recorder during AI speech to prevent echo */
  const pauseFallbackRecorder = () => {
    // Completely STOP the recorder (not just pause) to prevent any echo
    if (fallbackRecorderRef.current && fallbackRecorderRef.current.state !== 'inactive') {
      try {
        fallbackRecorderRef.current.stop();
        console.log('⏹️ Fallback recorder stopped (AI speaking)');
      } catch { /* ignore */ }
    }
    fallbackRecorderRef.current = null;
    // Clear all accumulated chunks
    fallbackChunkBufferRef.current = [];
    fallbackChunkBytesRef.current = 0;
  };

  /** Resume the fallback recorder after AI finishes speaking */
  const resumeFallbackRecorder = () => {
    // Always restart the fallback recorder — use ref to avoid stale closure
    // Clear any stale chunks first
    fallbackChunkBufferRef.current = [];
    fallbackChunkBytesRef.current = 0;
    lastFallbackTranscriptRef.current = '';
    // Start a fresh recorder
    startFallbackTranscription();
  };

  const transcribeAudioChunk = async (audioBlob: Blob) => {
    if (fallbackTranscribingRef.current) return;
    if (audioBlob.size < FALLBACK_MIN_CHUNK_BYTES) return;
    if (!isCallActiveRef.current) return;
    if (isAISpeakingRef.current) return;
    if (Date.now() - lastAISpeechEndAtRef.current < FALLBACK_POST_AI_COOLDOWN_MS) {
      console.log('⏳ Skipping transcription — still in post-AI cooldown');
      return;
    }

    fallbackTranscribingRef.current = true;
    try {
      const formData = new FormData();
      const audioFile = new File([audioBlob], `chunk-${Date.now()}.webm`, {
        type: audioBlob.type || 'audio/webm',
      });
      formData.append('audio', audioFile);

      console.log('📤 Sending fallback audio chunk for transcription:', audioBlob.size, 'bytes');
      const response = await fetch('/api/transcribe', { method: 'POST', body: formData });
      if (!response.ok) return;
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        console.warn('Fallback transcription returned non-JSON response');
        return;
      }

      const data = await response.json();
      const transcript = (data.transcript || '').trim();
      console.log(`🤖 [Client] Received transcript: "${transcript}"`);
      if (!transcript || transcript === lastFallbackTranscriptRef.current) return;

      // Filter hallucinations
      if (isWhisperHallucination(transcript)) {
        console.log('🚫 Filtered Whisper hallucination in frontend:', transcript);
        return;
      }

      // ECHO DETECTION: reject transcripts that match what the AI just said
      if (isEchoOfAISpeech(transcript)) {
        console.log('🔇 Rejected echo transcript:', transcript);
        return;
      }

      setSttMode('fallback');
      fallbackNoSpeechCountRef.current = 0;
      lastFallbackTranscriptRef.current = transcript;
      
      // APPEND logic: Since the fallback recorder stops and restarts every 3 seconds, 
      // each transcript is a new, discrete slice of audio. We must append them.
      const currentText = liveSpeechTextRef.current.trim();
      const newText = currentText ? `${currentText} ${transcript}` : transcript;
      liveSpeechTextRef.current = newText;
      setInputMessage(newText);
      
      lastSpeechTimeRef.current = Date.now();

      if (autoSendTimeoutRef.current) clearTimeout(autoSendTimeoutRef.current);
      autoSendTimeoutRef.current = setTimeout(() => {
        const textToSend = liveSpeechTextRef.current.trim();
        if (textToSend.length >= MIN_VOICE_RESPONSE_CHARS) {
          // Final hallucination check
          if (isWhisperHallucination(textToSend)) {
            console.log('🚫 Refused to auto-send hallucination:', textToSend);
            return;
          }
          // Final echo check before sending
          if (isEchoOfAISpeech(textToSend)) {
            console.log('🔇 Blocked echo from auto-send:', textToSend);
            liveSpeechTextRef.current = '';
            setInputMessage('');
            return;
          }
          void handleUserMessageRef.current(textToSend);
          liveSpeechTextRef.current = '';
          setInputMessage('');
          lastFallbackTranscriptRef.current = '';
        }
      }, 8000); // Increased from 2.5s to 8s to allow thinking time
    } catch (error) {
      console.warn('Fallback transcription failed:', error);
    } finally {
      fallbackTranscribingRef.current = false;
    }
  };

  const startFallbackTranscription = () => {
    if (!micPermissionStreamRef.current) return;
    if (fallbackRecorderRef.current?.state === 'recording') return;

    try {
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(micPermissionStreamRef.current, { mimeType });
      fallbackRecorderRef.current = recorder;

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        // Combine all chunks into a COMPLETE, valid WebM file
        const completeBlob = new Blob(chunks, { type: mimeType });
        console.log('🎧 Fallback recorder produced complete file:', completeBlob.size, 'bytes');
        
        if (completeBlob.size >= FALLBACK_MIN_CHUNK_BYTES) {
          void transcribeAudioChunk(completeBlob);
        }

        // Auto-restart recording if call is still active and AI isn't speaking
        if (isCallActiveRef.current && !isAISpeakingRef.current) {
          setTimeout(() => {
            if (isCallActiveRef.current && !isAISpeakingRef.current) {
              startFallbackTranscription();
            }
          }, 200);
        }
      };

      // Start recording without timeslice — produces complete files on stop()
      recorder.start();
      console.log('🎧 Fallback transcription recorder started');

      // Stop after 3 seconds to produce a complete, valid audio file
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, 3000);
    } catch (error) {
      console.warn('Unable to start fallback transcription recorder:', error);
    }
  };

  // Setup continuous speech recognition
  const setupSpeechRecognition = (opts?: { deferInitialStart?: boolean }) => {
    if (typeof window === 'undefined') return;
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition is not supported in your browser. Falling back to server-side transcription.');
      setSttMode('fallback');
      return;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true; // Keep listening
    recognition.interimResults = true; // Show results as you speak
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;
    recognition.interimResults = true;
    
    let finalTranscript = '';
    setIsListening(true);
    
    recognition.onstart = () => {
      console.log('✅ Speech recognition engine started');
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      
      const currentText = [finalTranscript.trim(), interimTranscript.trim()]
        .filter(Boolean)
        .join(' ')
        .trim();
      if (currentText) {
        fallbackNoSpeechCountRef.current = 0;
        setSttMode('browser');
        liveSpeechTextRef.current = currentText;
        console.log('🎤 Speech detected:', currentText);
        console.log('📝 Final transcript length:', finalTranscript.trim().length, 'Interim:', interimTranscript.trim().length);
        
        // Update input with current speech
        setInputMessage(currentText);
        lastSpeechTimeRef.current = Date.now();
        
        // Auto-send after 2.5 seconds of silence
        if (autoSendTimeoutRef.current) {
          clearTimeout(autoSendTimeoutRef.current);
        }
        
        autoSendTimeoutRef.current = setTimeout(() => {
          const textToSend = liveSpeechTextRef.current.trim();
          console.log('⏱️ Timeout triggered - Text to send:', textToSend, 'Length:', textToSend.length);
          
          if (textToSend.length >= MIN_VOICE_RESPONSE_CHARS) {
            console.log('✅ Auto-sending response:', textToSend);
            void handleUserMessageRef.current(textToSend);
            finalTranscript = '';
            liveSpeechTextRef.current = '';
            setInputMessage('');
          } else {
            console.log('❌ Text too short, not sending:', textToSend.length, 'chars (minimum ' + MIN_VOICE_RESPONSE_CHARS + ')');
          }
        }, 8000); // Increased from 2.5s to 8s to allow thinking time
      }
    };
    
    recognition.onerror = (event: any) => {
      // Silence no-speech as it's common and handled by auto-restart
      if (event.error === 'no-speech') {
        fallbackNoSpeechCountRef.current += 1;
        if (fallbackNoSpeechCountRef.current >= NO_SPEECH_THRESHOLD) {
          setSttMode('fallback');
          console.warn('⚠️ Browser speech recognition is unstable; using fallback transcription');
          startFallbackTranscription();
        }
        console.log('🎤 Speech recognition: No speech detected (normal timeout)');
        return;
      }
      // "aborted" is usually emitted when we intentionally stop recognition
      // (e.g. while AI voice is speaking). Treat it as expected.
      if (event.error === 'aborted') {
        console.log('🎤 Speech recognition aborted (expected during restarts)');
        return;
      }

      console.error('❌ Speech recognition error:', event.error);
      
      // Handle specific error types
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone permissions.');
      } else if (event.error === 'audio-capture') {
        console.error('No microphone detected. Please ensure your microphone is connected.');
      } else if (event.error === 'network') {
        console.warn('Network error in speech recognition - auto-retrying...');
        // Fall back to server-side transcription on network errors
        setSttMode('fallback');
        startFallbackTranscription();
      } else if (event.error === 'service-not-allowed') {
        console.warn('Speech recognition service unavailable. Falling back to server-side transcription.');
        setSttMode('fallback');
        startFallbackTranscription();
      } else {
        console.warn('Speech recognition event:', event.error);
      }
    };

    recognition.onaudiostart = () => {
      console.log('🎙️ Microphone audio stream detected by SpeechRecognition');
    };
    recognition.onspeechstart = () => {
      console.log('🗣️ Speech start detected');
    };
    recognition.onspeechend = () => {
      console.log('🛑 Speech end detected');
    };
    
    recognition.onend = () => {
      console.log('Speech recognition ended (this is normal during operation)');
      setIsListening(false);
      
      // Do not auto-restart after we intentionally stopped for TTS — refs update before stop(), unlike React state.
      setTimeout(() => {
        if (!isCallActiveRef.current) return;
        if (recognitionPausedForAIRef.current) {
          console.log('⏸️ Skipping recognition restart (paused for AI TTS)');
          return;
        }
        if (isAISpeakingRef.current) {
          console.log('⏸️ Skipping recognition restart while AI is speaking');
          return;
        }
        try {
          recognition.start();
          setIsListening(true);
          console.log('✅ Speech recognition restarted successfully');
        } catch (error: any) {
          if (error.name !== 'InvalidStateError') {
            console.log('Recognition will restart on next cycle');
          }
        }
      }, 300);
    };
    
    // Start recognition (optional defer: first start happens in utterance.onend after welcome TTS)
    if (!opts?.deferInitialStart) {
      try {
        recognition.start();
        console.log('✅ Speech recognition started successfully');
      } catch (error: any) {
        console.error('❌ Failed to start recognition:', error.message || error);
        setIsListening(false);
      }
    } else {
      setIsListening(false);
      console.log('🎤 Speech recognition ready — will start after the AI finishes speaking');
    }
    
    // Store recognition instance for cleanup
    (window as any).speechRecognition = recognition;
  };

  // Process speech to text
  const processSpeechToText = async (audioBlob: Blob) => {
    // Using Web Speech API for speech-to-text
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript.trim()) {
          handleUserMessage(transcript);
        }
      };
      
      recognition.start();
    }
  };

  // Murf.ai Falcon TTS Streaming
  const speakWithMurf = async (text: string) => {
    // Track what the AI is saying so we can detect echo in fallback transcription
    lastAISpeechTextRef.current = text;
    // Sync immediately so recognition.onend (fires on a timer) never races React useEffect.
    isAISpeakingRef.current = true;
    setIsAISpeaking(true);
    
    try {
      // For now, use fallback since Murf WebSocket requires proper authentication
      // In production, you would set up a backend proxy for Murf API
      fallbackToWebSpeech(text);
      
      /* 
      // Original Murf WebSocket implementation (requires backend proxy)
      const ws = new WebSocket('wss://api.murf.ai/v1/speech/stream');
      wsRef.current = ws;
      
      ws.onopen = () => {
        // Send configuration
        const config = {
          apiKey: process.env.NEXT_PUBLIC_MURF_API_KEY,
          model: 'falcon',
          voice: 'en-US-natalie',
          text: text,
          format: 'mp3',
          sampleRate: 24000
        };
        
        ws.send(JSON.stringify(config));
      };
      
      ws.onmessage = async (event) => {
        const audioData = event.data;
        
        // Play audio stream
        if (audioContextRef.current) {
          const arrayBuffer = await audioData.arrayBuffer();
          const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
          const source = audioContextRef.current.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContextRef.current.destination);
          source.start();
          
          source.onended = () => {
            setIsAISpeaking(false);
          };
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsAISpeaking(false);
        // Fallback to Web Speech API
        fallbackToWebSpeech(text);
      };
      
      ws.onclose = () => {
        setIsAISpeaking(false);
      };
      */
      
    } catch (error) {
      console.error('Error with Murf TTS:', error);
      isAISpeakingRef.current = false;
      recognitionPausedForAIRef.current = false;
      setIsAISpeaking(false);
      fallbackToWebSpeech(text);
    }
  };

  /** Shared cleanup when AI finishes speaking (used by onend + watchdog) */
  const handleAISpeechEnd = () => {
    if (!isAISpeakingRef.current) return; // already handled
    console.log('🔇 AI finished speaking');
    lastAISpeechEndAtRef.current = Date.now();
    recognitionPausedForAIRef.current = false;
    isAISpeakingRef.current = false;
    setIsAISpeaking(false);
    // Let audio output settle before listening again (reduces echo / false no-speech)
    setTimeout(() => {
      // RESUME fallback recorder now that AI is done (after cooldown buffer)
      resumeFallbackRecorder();
      if ((window as any).speechRecognition) {
        try {
          (window as any).speechRecognition.start();
          setIsListening(true);
          console.log('✅ Speech recognition restarted (AI done)');
        } catch (error: any) {
          // "already started" error is normal, ignore it
          if (error.name !== 'InvalidStateError') {
            console.log('Recognition restart attempt:', error.message || error);
          }
        }
      } else {
        // Speech recognition instance was lost - rebuild it
        console.warn('⚠️ Speech recognition instance lost, rebuilding...');
        setupSpeechRecognition();
      }
    }, 1500);
  };

  // Fallback to Web Speech API
  const fallbackToWebSpeech = (text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Try to find a good English voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.name.includes('Google US English') ||
        voice.name.includes('Samantha') ||
        voice.name.includes('Microsoft Zira') ||
        (voice.lang === 'en-US' && voice.default)
      );
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.rate = 0.9; // Slightly slower for clarity
      utterance.pitch = 1.0;
      utterance.volume = isMuted ? 0 : 1;

      // ---- Chrome watchdog: onend sometimes silently fails to fire ----
      let watchdogInterval: ReturnType<typeof setInterval> | null = null;
      let onendFired = false;
      const startWatchdog = () => {
        watchdogInterval = setInterval(() => {
          if (onendFired) {
            if (watchdogInterval) clearInterval(watchdogInterval);
            return;
          }
          // If synthesis says it's no longer speaking but our flag is still set → onend was lost
          if (!window.speechSynthesis.speaking && isAISpeakingRef.current) {
            console.warn('🐛 Chrome watchdog: onend did not fire — forcing cleanup');
            if (watchdogInterval) clearInterval(watchdogInterval);
            onendFired = true;
            handleAISpeechEnd();
          }
        }, 500);
      };
      // ---- end watchdog ----
      
      utterance.onstart = () => {
        console.log('🔊 AI started speaking');
        isAISpeakingRef.current = true;
        setIsAISpeaking(true);
        recognitionPausedForAIRef.current = true;
        // PAUSE fallback recorder to prevent it from recording AI audio
        pauseFallbackRecorder();
        // Stop speech recognition while AI is speaking
        if ((window as any).speechRecognition) {
          try {
            (window as any).speechRecognition.stop();
            console.log('⏸️ Speech recognition paused (AI speaking)');
          } catch (error) {
            // Ignore errors when stopping - this is normal
            console.log('Recognition stop requested (already stopped is OK)');
          }
        }
        // Start the watchdog AFTER speech actually begins
        startWatchdog();
      };
      
      utterance.onend = () => {
        onendFired = true;
        if (watchdogInterval) clearInterval(watchdogInterval);
        handleAISpeechEnd();
      };
      
      utterance.onerror = (event) => {
        onendFired = true;
        if (watchdogInterval) clearInterval(watchdogInterval);
        // Don't log interrupted errors as they're normal
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
          console.warn('Speech synthesis warning:', event.error);
        }
        recognitionPausedForAIRef.current = false;
        isAISpeakingRef.current = false;
        setIsAISpeaking(false);
        // Restart speech recognition on error
        setTimeout(() => {
          resumeFallbackRecorder();
          if ((window as any).speechRecognition) {
            try {
              (window as any).speechRecognition.start();
              setIsListening(true);
              console.log('✅ Speech recognition restarted after error');
            } catch (error: any) {
              if (error.name !== 'InvalidStateError') {
                console.log('Recognition restart after error:', error.message || error);
              }
            }
          }
        }, 750);
      };
      
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Web Speech API not supported');
      isAISpeakingRef.current = false;
      recognitionPausedForAIRef.current = false;
      setIsAISpeaking(false);
      setTimeout(() => {
        if ((window as any).speechRecognition) {
          try {
            (window as any).speechRecognition.start();
            setIsListening(true);
            console.log('✅ Speech recognition started (no TTS available)');
          } catch (e: any) {
            if (e.name !== 'InvalidStateError') console.warn('Speech recognition start:', e);
          }
        }
      }, 300);
    }
  };

  // Start the interview
  const startInterview = async () => {
    setIsConnecting(true);
    
    try {
      // 1. Try to initialize interview and fetch questions
      let activeQuestions = interviewQuestions;
      let isTechRound = false;
      let data: any = null;
      
      try {
        const response = await fetch(`/api/interview/${interviewId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'create',
            candidateName: userName,
          }),
        });
        
        if (response.ok) {
          data = await response.json();
          console.log('Interview session initialized:', data);
          
          if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
            activeQuestions = data.questions;
            setInterviewQuestions(data.questions);
            interviewQuestionsRef.current = data.questions;
            if (data.job?.title) setJobTitle(data.job.title);
            if (data.settings?.agentName) setAgentName(data.settings.agentName);
            
            // Technical round detection
            if (data.isTechnicalRound) {
              isTechRound = true;
              setIsTechnicalRound(true);
              isTechnicalRoundRef.current = true;
              if (data.perQuestionTimeMinutes) setPerQuestionTimeMinutes(data.perQuestionTimeMinutes);
            }
          }
        }
      } catch (e) {
        console.warn('Failed to fetch dynamic questions, using fallback', e);
      }
      
      // 2. Initialize camera and microphone
      await Promise.all([
        initializeCamera(),
        initializeMicrophone()
      ]);
      
      // 3. Initialize audio context
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextClosedRef.current = false;
      
      // 4. Reset question tracking
      askedQuestionsRef.current.clear();
      setCurrentQuestionIndex(0);
      currentQuestionIndexRef.current = 0;
      
      setIsCallActive(true);
      setIsConnecting(false);
      
      // 5. Add welcome message and mark first question as asked
      askedQuestionsRef.current.add(0);
      const firstQuestionText = activeQuestions[0].question;
      
      const isProjectRound = data?.isProjectRound || false;
      const welcomeText = isTechRound
        ? `Welcome to the Technical Coding Round! I'm ${agentName || 'your AI interviewer'}. You will be given 2 DSA coding problems — one Medium and one Hard level. You have 30 minutes per question (1 hour total). Let's begin with Question 1:\n\n${firstQuestionText}`
        : isProjectRound
        ? `Welcome to the Project Discussion Round! I'm ${agentName || 'your AI interviewer'}. In this session, we'll dive into the architecture, challenges, and implementation details of the projects you've built. Let's begin:\n\n${firstQuestionText}`
        : firstQuestionText.includes("I'm your AI interviewer")
          ? firstQuestionText.replace("I'm your AI interviewer", `I'm ${agentName || 'your AI interviewer'}`)
          : firstQuestionText;

      const welcomeMessage: Message = {
        id: Date.now().toString(),
        role: 'ai',
        content: welcomeText,
        timestamp: new Date()
      };
      
      setMessages([welcomeMessage]);
      
      // 7. Start timers for technical round
      if (isTechRound) {
        const perQSeconds = (data?.perQuestionTimeMinutes || 30) * 60;
        const totalSeconds = (data?.totalTimeMinutes || 60) * 60;
        
        setQuestionSecondsLeft(perQSeconds);
        setOverallSecondsLeft(totalSeconds);
        questionSecondsLeftRef.current = perQSeconds;
        overallSecondsLeftRef.current = totalSeconds;

        // Per-question countdown
        questionTimerRef.current = setInterval(() => {
          setQuestionSecondsLeft(prev => {
            if (prev === null) return null;
            const next = prev - 1;
            questionSecondsLeftRef.current = next;
            if (next <= 0) {
              // Time up for this question — auto-advance
              console.log('⏰ Per-question timer expired! Auto-advancing...');
              const timeUpMsg: Message = {
                id: Date.now().toString(),
                role: 'ai',
                content: '⏰ Time\'s up for this question! Moving to the next one.',
                timestamp: new Date()
              };
              setMessages(p => [...p, timeUpMsg]);
              // Trigger next question
              setTimeout(() => {
                // Save empty response for current question
                const currentQIndex = currentQuestionIndexRef.current;
                const latestQuestions = interviewQuestionsRef.current;
                const currentQuestion = latestQuestions[currentQIndex];
                if (currentQuestion) {
                  fetch(`/api/interview/${interviewId}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      interviewId,
                      questionNumber: currentQuestion.id,
                      question: currentQuestion.question,
                      category: currentQuestion.category,
                      userResponse: '[Time expired - no answer submitted]',
                    }),
                  }).catch(console.error);
                }
                askNextQuestion();
              }, 1500);
              return null; // Stop counting
            }
            return next;
          });
        }, 1000);

        // Overall countdown
        overallTimerRef.current = setInterval(() => {
          setOverallSecondsLeft(prev => {
            if (prev === null) return null;
            const next = prev - 1;
            overallSecondsLeftRef.current = next;
            if (next <= 0) {
              // Overall time up — end interview
              console.log('⏰ Overall timer expired! Ending interview...');
              setIsInterviewEnding(true);
              isInterviewEndingRef.current = true;
              if (questionTimerRef.current) clearInterval(questionTimerRef.current);
              if (overallTimerRef.current) clearInterval(overallTimerRef.current);
              const timeUpMsg: Message = {
                id: Date.now().toString(),
                role: 'ai',
                content: '⏰ The 1-hour time limit is up! Your interview is now being submitted.',
                timestamp: new Date()
              };
              setMessages(p => [...p, timeUpMsg]);
              speakWithMurf('Time is up! Your interview is now being submitted. Thank you for participating.');
              setTimeout(() => endCall(), 5000);
              return null;
            }
            return next;
          });
        }, 1000);
      }
      
      // 8. Start speaking first question
      await speakWithMurf(welcomeText);
      
    } catch (error) {
      console.error('Error starting interview:', error);
      setIsConnecting(false);
      alert('Failed to start interview. Please check your camera and microphone permissions.');
    }
  };

  // Ask next question - ensures no repetition
  const askNextQuestion = () => {
    if (isInterviewEndingRef.current) {
      console.log('askNextQuestion called but interview is already ending');
      return;
    }
    const currentIndex = currentQuestionIndexRef.current;
    console.log('Current question index:', currentIndex);
    console.log('Asked questions:', Array.from(askedQuestionsRef.current));
    
    // Mark current question as asked
    askedQuestionsRef.current.add(currentIndex);
    
    console.log('After marking asked:', Array.from(askedQuestionsRef.current));
    
    // Find next unasked question
    const latestQuestions = interviewQuestionsRef.current;
    let nextIndex = -1;
    for (let i = 0; i < latestQuestions.length; i++) {
      if (!askedQuestionsRef.current.has(i)) {
        nextIndex = i;
        console.log('Found next question:', nextIndex, latestQuestions[i].category);
        break;
      }
    }
    
    // If all questions asked or none found, complete interview
    if (nextIndex === -1) {
      console.log('All questions completed!');
      setIsInterviewEnding(true);
      isInterviewEndingRef.current = true;
      // Stop timers for technical round
      if (isTechnicalRoundRef.current) {
        if (questionTimerRef.current) clearInterval(questionTimerRef.current);
        if (overallTimerRef.current) clearInterval(overallTimerRef.current);
        setQuestionSecondsLeft(null);
      }
      
      const completionMessage: Message = {
        id: Date.now().toString(),
        role: 'ai',
        content: isTechnicalRoundRef.current
          ? "Excellent! You've completed both DSA coding problems. We'll review your solutions and get back to you soon. Thank you!"
          : "Thank you for completing the interview! We'll review your responses and get back to you soon.",
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, completionMessage]);
      speakWithMurf(completionMessage.content);
      
      // End call after completion message
      setTimeout(() => {
        endCall();
      }, 5000);
      return;
    }
    
    // Update both state and ref
    setCurrentQuestionIndex(nextIndex);
    currentQuestionIndexRef.current = nextIndex;
    
    const nextQuestion = latestQuestions[nextIndex];
    
    // Reset per-question timer for technical round
    if (isTechnicalRoundRef.current) {
      const perQSeconds = perQuestionTimeMinutes * 60;
      setQuestionSecondsLeft(perQSeconds);
      questionSecondsLeftRef.current = perQSeconds;
    }
    
    // Add brief acknowledgment
    const acknowledgments = isTechnicalRoundRef.current
      ? ["Great effort on that one!", "Nice work!", "Good attempt!"]
      : [
          "Thank you for sharing.",
          "I appreciate your response.",
          "That's interesting.",
          "Good to know.",
          "Understood."
        ];
    
    const randomAcknowledgment = acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
    
    // Clear code editor for next question in technical round
    if (isTechnicalRoundRef.current) {
      setUserCode('');
      // Focus editor after a small delay to allow for transition
      setTimeout(() => {
        editorRef.current?.focus();
      }, 500);
    }
    
    // Build question intro for technical round
    const difficultyLabel = nextQuestion.difficulty ? ` [${nextQuestion.difficulty}]` : '';
    const questionPrefix = isTechnicalRoundRef.current
      ? `Moving to Question ${nextQuestion.id}${difficultyLabel}:\n\n`
      : '';
    
    const ackMessage: Message = {
      id: Date.now().toString(),
      role: 'ai',
      content: randomAcknowledgment,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, ackMessage]);
    
    // Speak acknowledgment, then ask next question
    setTimeout(() => {
      const questionMessage: Message = {
        id: Date.now().toString(),
        role: 'ai',
        content: `${questionPrefix}${nextQuestion.question}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, questionMessage]);
      speakWithMurf(`${randomAcknowledgment} ${questionPrefix}${nextQuestion.question}`);
    }, 2000);
  };

  // Handle user message - auto-send when speaking is detected
  const handleUserMessage = async (text: string) => {
    // In technical round, we ignore voice transcripts
    if (isTechnicalRoundRef.current) {
      console.log('Voice transcript ignored in technical round');
      return;
    }

    if (isInterviewEndingRef.current) {
      console.log('Interview is ending, ignoring voice message');
      return;
    }

    if (!text.trim() || text.length < MIN_VOICE_RESPONSE_CHARS) {
      console.log('Response too short, ignoring:', text.length, 'chars');
      return;
    }
    
    console.log('Handling user message:', text.substring(0, 50) + '...');
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Completely clear all speech input state for the next question
    setInputMessage('');
    liveSpeechTextRef.current = '';
    lastFallbackTranscriptRef.current = '';
    
    // Save response to database
    try {
      const currentQIndex = currentQuestionIndexRef.current;
      const latestQuestions = interviewQuestionsRef.current;
      const currentQuestion = latestQuestions[currentQIndex];
      
      if (!currentQuestion) {
        console.warn('No current question found in ref for index:', currentQIndex);
        setTimeout(() => askNextQuestion(), 2000);
        return;
      }
      
      console.log('Saving response for question', currentQIndex, currentQuestion.category);
      
      const response = await fetch(`/api/interview/${interviewId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId,
          questionNumber: currentQuestion.id,
          question: currentQuestion.question,
          category: currentQuestion.category,
          userResponse: text,
        }),
      });
      
      if (!response.ok) {
        console.warn('Failed to save response:', response.status, response.statusText);
        // Continue anyway - interview can proceed without saving
      } else {
        const data = await response.json();
        console.log('Response saved successfully:', data);
      }
    } catch (error) {
      console.error('Error saving response:', error);
      // Don't block the interview - continue to next question
    }
    
    // Wait a moment, then ask next question
    console.log('Scheduling next question in 2 seconds...');
    setTimeout(() => askNextQuestion(), 2000);
  };

  useEffect(() => {
    handleUserMessageRef.current = handleUserMessage;
  });

  // Send message manually
  const sendMessage = async () => {
    const textToSend = isTechnicalRound ? userCode : inputMessage;
    
    if (!textToSend.trim()) return;

    if (isInterviewEndingRef.current) {
      console.log('Interview is ending, ignoring manual message');
      return;
    }

    console.log('Sending manual message:', isTechnicalRound ? 'Code Submission' : textToSend.substring(0, 50) + '...');

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Completely clear input state
    if (isTechnicalRound) {
      setUserCode('');
    } else {
      setInputMessage('');
      liveSpeechTextRef.current = '';
      lastFallbackTranscriptRef.current = '';
    }
    
    // Save response to database
    try {
      const currentQIndex = currentQuestionIndexRef.current;
      const latestQuestions = interviewQuestionsRef.current;
      const currentQuestion = latestQuestions[currentQIndex];
      
      if (!currentQuestion) {
        console.warn('No current question found in ref for index:', currentQIndex);
        setTimeout(() => askNextQuestion(), 2000);
        return;
      }
      
      console.log('Saving response for question', currentQIndex, currentQuestion.category);
      
      const response = await fetch(`/api/interview/${interviewId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId,
          questionNumber: currentQuestion.id,
          question: currentQuestion.question,
          category: currentQuestion.category,
          userResponse: textToSend,
        }),
      });
      
      if (!response.ok) {
        console.warn('Failed to save response:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error saving response:', error);
    }
    
    // Wait a moment, then ask next question
    console.log('Scheduling next question in 2 seconds...');
    setTimeout(() => askNextQuestion(), 2000);
  };

  // Emergency fallback: re-arm browser speech recognition with explicit user gesture.
  const retryMicrophoneRecognition = () => {
    if ((window as any).speechRecognition) {
      try {
        (window as any).speechRecognition.stop();
      } catch {
        // no-op
      }
      setTimeout(() => {
        try {
          (window as any).speechRecognition.start();
          setIsListening(true);
          console.log('✅ Speech recognition re-armed from user action');
        } catch (error: any) {
          console.warn('Retry microphone failed:', error?.message || error);
        }
      }, 150);
      return;
    }

    // If instance is missing for any reason, rebuild and start it now.
    setupSpeechRecognition();
  };

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted);
    // Muting is handled by setting volume to 0 in speech synthesis
  };

  // Toggle camera
  const toggleCamera = () => {
    if (isCameraOn) {
      // Turn off camera
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    } else {
      // Turn on camera
      initializeCamera();
    }
    setIsCameraOn(!isCameraOn);
  };

  // End call
  const endCall = async () => {
    setIsInterviewEnding(true);
    isInterviewEndingRef.current = true;
    // Stop technical round timers
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    if (overallTimerRef.current) clearInterval(overallTimerRef.current);
    
    // Check if interview is incomplete
    const answeredCount = askedQuestionsRef.current.size;
    const totalQuestions = interviewQuestions.length;
    
    console.log(`Ending interview: ${answeredCount}/${totalQuestions} questions answered`);
    
    if (answeredCount < totalQuestions) {
      const confirmEnd = window.confirm(
        `You've only answered ${answeredCount} out of ${totalQuestions} questions.\n\n` +
        `Ending now will generate your interview summary based on completed responses.\n\n` +
        `Are you sure you want to end the interview?`
      );
      
      if (!confirmEnd) return;
    }
    
    try {
      // Generate summary and save to database
      const response = await fetch(`/api/interview/${interviewId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId }),
      });
      
      if (!response.ok) {
        console.warn('Failed to generate summary:', response.status, response.statusText);
        // Continue with redirect even if summary fails
      } else {
        const data = await response.json();
        console.log('Interview summary generated:', data.summary);
      }
    } catch (error) {
      console.error('Error generating summary:', error);
      // Continue with redirect even if summary fails
    }
    
    // Stop all streams
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (micPermissionStreamRef.current) {
      micPermissionStreamRef.current.getTracks().forEach(track => track.stop());
      micPermissionStreamRef.current = null;
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (fallbackRecorderRef.current && fallbackRecorderRef.current.state !== 'inactive') {
      fallbackRecorderRef.current.stop();
      fallbackRecorderRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Close audio context safely
    if (audioContextRef.current && !audioContextClosedRef.current) {
      try {
        await audioContextRef.current.close();
        audioContextClosedRef.current = true;
      } catch (error) {
        console.warn('AudioContext already closed or closing');
      }
    }
    
    // Navigate to completion page
    router.push(`/interview/${interviewId}/complete`);
  };

  // Cleanup on unmount
  useEffect(() => {
    // Load voices
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      
      // Some browsers load voices asynchronously
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          window.speechSynthesis.getVoices();
        };
      }
    }
    
    return () => {
      // Stop video stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      if (micPermissionStreamRef.current) {
        micPermissionStreamRef.current.getTracks().forEach(track => track.stop());
        micPermissionStreamRef.current = null;
      }
      
      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      // Stop media recorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }

      if (fallbackRecorderRef.current && fallbackRecorderRef.current.state !== 'inactive') {
        fallbackRecorderRef.current.stop();
        fallbackRecorderRef.current = null;
      }
      
      // Close audio context safely
      if (audioContextRef.current && !audioContextClosedRef.current) {
        try {
          audioContextRef.current.close();
          audioContextClosedRef.current = true;
        } catch (error) {
          console.warn('AudioContext cleanup: already closed');
        }
      }
      
      // Cancel any ongoing speech
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      
      // Stop speech recognition
      if ((window as any).speechRecognition) {
        try {
          (window as any).speechRecognition.stop();
        } catch (error) {
          console.warn('Speech recognition cleanup:', error);
        }
      }
      
      // Clear auto-send timeout
      if (autoSendTimeoutRef.current) {
        clearTimeout(autoSendTimeoutRef.current);
      }
    };
  }, []);

  // Show initial screen before starting
  if (!isCallActive) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <Card className="border-gray-700 bg-gray-800/50 backdrop-blur-sm p-8 max-w-md w-full mx-4">
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-purple-600">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
            </div>
            
            
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">{agentName} Session</h1>
              <p className="text-gray-400 text-sm">
                You're about to start an AI-powered interview with {agentName}. Please ensure your camera and microphone are working.
              </p>
            </div>
            
            <div className="space-y-3">
              <Button
                onClick={startInterview}
                disabled={isConnecting}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Video className="mr-2 h-4 w-4" />
                    Start Interview
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => router.back()}
                className="w-full border-gray-700 text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/90 backdrop-blur-xl px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-purple-600">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">{agentName}</h1>
              <p className="text-xs text-gray-400">{jobTitle}</p>
            </div>
          </div>
          
          {/* Technical Round Timers */}
          {isTechnicalRound && (
            <div className="flex items-center gap-3">
              {/* Per-Question Timer */}
              {questionSecondsLeft !== null && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
                  questionSecondsLeft <= 60 
                    ? 'bg-red-950/80 border-red-500/70 text-red-300' 
                    : questionSecondsLeft <= 300 
                      ? 'bg-yellow-950/80 border-yellow-500/50 text-yellow-300'
                      : 'bg-gray-800/80 border-gray-600 text-gray-200'
                }`}>
                  <Clock className={`h-3.5 w-3.5 ${questionSecondsLeft <= 60 ? 'animate-pulse' : ''}`} />
                  <div className="text-xs">
                    <span className="opacity-70">Q{currentQuestionIndex + 1}: </span>
                    <span className="font-mono font-bold">
                      {String(Math.floor(questionSecondsLeft / 60)).padStart(2, '0')}:
                      {String(questionSecondsLeft % 60).padStart(2, '0')}
                    </span>
                  </div>
                  {questionSecondsLeft <= 300 && questionSecondsLeft > 60 && (
                    <AlertTriangle className="h-3 w-3 text-yellow-400" />
                  )}
                </div>
              )}
              
              {/* Overall Timer */}
              {overallSecondsLeft !== null && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${
                  overallSecondsLeft <= 120
                    ? 'bg-red-950/80 border-red-500/70 text-red-300'
                    : overallSecondsLeft <= 600
                      ? 'bg-yellow-950/80 border-yellow-500/50 text-yellow-300'
                      : 'bg-blue-950/60 border-blue-500/30 text-blue-200'
                }`}>
                  <Clock className={`h-3.5 w-3.5 ${overallSecondsLeft <= 120 ? 'animate-pulse' : ''}`} />
                  <div className="text-xs">
                    <span className="opacity-70">Total: </span>
                    <span className="font-mono font-bold">
                      {String(Math.floor(overallSecondsLeft / 60)).padStart(2, '0')}:
                      {String(overallSecondsLeft % 60).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Question difficulty badge */}
              {interviewQuestions[currentQuestionIndex]?.difficulty && (
                <Badge className={`text-xs ${
                  interviewQuestions[currentQuestionIndex].difficulty === 'Hard'
                    ? 'bg-red-600/80 text-white'
                    : 'bg-yellow-600/80 text-white'
                }`}>
                  {interviewQuestions[currentQuestionIndex].difficulty}
                </Badge>
              )}
            </div>
          )}
          
          {!isTechnicalRound && (
            <Badge variant="outline" className="border-green-500/50 text-green-400">
              <div className="h-2 w-2 rounded-full bg-green-400 mr-2 animate-pulse" />
              Live
            </Badge>
          )}
          
          {isTechnicalRound && (
            <Badge variant="outline" className="border-purple-500/50 text-purple-400">
              <div className="h-2 w-2 rounded-full bg-purple-400 mr-2 animate-pulse" />
              Technical Round
            </Badge>
          )}
        </div>
      </header>

      {/* Main Content - Video Call Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-hidden">
        {/* Left Side - Problem Statement & Code Editor */}
        <div className="lg:col-span-2 flex flex-col gap-4 overflow-hidden">
          {isTechnicalRound ? (
            /* Code Editor Layout - Full Height */
            <Card className="flex-1 border-gray-700 bg-[#1e1e1e] flex flex-col overflow-hidden shadow-2xl relative">
              <div className="bg-[#2d2d2d] border-b border-gray-700 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5 mr-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <Code2 className="h-4 w-4 text-gray-400" />
                  <span className="text-xs font-mono text-gray-300">solution.js</span>
                </div>
              </div>
              <div className="flex-1 relative flex overflow-hidden">
                {/* Line Numbers */}
                <div className="w-12 bg-[#1e1e1e] border-r border-gray-800 pt-4 flex flex-col items-center select-none opacity-30 font-mono text-[13px] leading-6 text-gray-400 shrink-0">
                  {Array.from({ length: 100 }).map((_, i) => (
                    <div key={i}>{i + 1}</div>
                  ))}
                </div>
                {/* Editor Textarea */}
                <textarea
                  ref={editorRef}
                  value={userCode}
                  onChange={(e) => setUserCode(e.target.value)}
                  spellCheck={false}
                  autoFocus
                  placeholder="// Write your solution here..."
                  className="flex-1 bg-transparent p-4 font-mono text-[14px] leading-6 text-gray-300 outline-none resize-none placeholder:text-gray-600 z-0"
                  style={{ tabSize: 2 }}
                />
                
                {/* AI Speaking Animation Overlay */}
                {isAISpeaking && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 bg-gray-950/80 backdrop-blur-sm rounded-lg px-3 py-2 z-10 border border-blue-500/30">
                    <div className="flex gap-1">
                      <div className="w-1 h-3 bg-blue-500 rounded-full animate-pulse" />
                      <div className="w-1 h-4 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                      <div className="w-1 h-2 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-[10px] text-white">AI is reading...</span>
                  </div>
                )}
              </div>
              <div className="bg-[#1e1e1e] border-t border-gray-800 p-3 flex justify-end gap-3">
                <div className="flex-1 flex items-center px-3">
                  <span className="text-[10px] text-gray-500 font-mono">JavaScript (Node.js)</span>
                </div>
                <Button 
                  onClick={sendMessage}
                  disabled={!userCode.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-lg shadow-blue-900/20"
                >
                  <Send className="h-4 w-4" />
                  Submit Solution
                </Button>
              </div>
            </Card>
          ) : (
            /* Webcam Feed */
            <Card className="flex-1 border-gray-700 bg-gray-900 relative overflow-hidden">
              {isCameraOn ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                  <User className="h-24 w-24 text-gray-600" />
                </div>
              )}
              
              {/* AI Speaking Animation Overlay */}
              {isAISpeaking && (
                <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-gray-950/80 backdrop-blur-sm rounded-lg px-3 py-2">
                  <div className="flex gap-1">
                    <div className="w-1 h-4 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                    <div className="w-1 h-6 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                    <div className="w-1 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                    <div className="w-1 h-5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '450ms' }} />
                  </div>
                  <span className="text-xs text-white">AI is speaking...</span>
                </div>
              )}
              
              {/* User Name Tag */}
              <div className="absolute top-4 left-4 bg-gray-950/80 backdrop-blur-sm rounded-lg px-3 py-1.5">
                <span className="text-xs text-white">{userName}</span>
              </div>
            </Card>
          )}
          
          {/* Call Controls */}
          <Card className="border-gray-700 bg-gray-900 p-4">
            <div className="flex items-center justify-center gap-4">
              <Button
                size="icon"
                variant={isMuted ? "destructive" : "outline"}
                onClick={toggleMute}
                className="rounded-full"
              >
                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </Button>
              
              <Button
                size="icon"
                variant={isCameraOn ? "outline" : "destructive"}
                onClick={toggleCamera}
                className="rounded-full"
              >
                {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
              </Button>
              
              <Button
                size="icon"
                variant="destructive"
                onClick={endCall}
                className="rounded-full h-14 w-14"
              >
                <PhoneOff className="h-6 w-6" />
              </Button>
              
              <Button
                size="icon"
                variant="outline"
                className="rounded-full"
              >
                <Volume2 className="h-5 w-5" />
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Side - Question or Chat */}
        <div className="lg:col-span-1 flex flex-col h-full overflow-hidden">
          {isTechnicalRound ? (
            /* Technical Round Question Panel */
            <Card className="flex-1 border-gray-700 bg-gray-900 flex flex-col overflow-hidden">
            <div className="border-b border-gray-800 bg-gray-800/50 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-blue-400" />
                <h2 className="text-sm font-semibold text-white">Problem Statement</h2>
              </div>
              <Badge className="bg-blue-600/20 text-blue-400 border-blue-500/30">
                Q{currentQuestionIndex + 1}
              </Badge>
            </div>
            
            <ScrollArea className="flex-1 p-5">
              <div className="space-y-6">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`${
                    interviewQuestions[currentQuestionIndex]?.difficulty === 'Hard' 
                      ? 'border-red-500/50 text-red-400' 
                      : 'border-yellow-500/50 text-yellow-400'
                  }`}>
                    {interviewQuestions[currentQuestionIndex]?.difficulty || 'Medium'}
                  </Badge>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">Difficulty</span>
                </div>

                <div className="prose prose-invert max-w-none">
                  <p className="text-gray-100 whitespace-pre-wrap leading-relaxed font-medium text-[17px] tracking-tight">
                    {interviewQuestions[currentQuestionIndex]?.question}
                  </p>
                </div>

                {/* Additional instructions if any */}
                <div className="pt-6 border-t border-gray-800">
                  <div className="bg-blue-900/10 border border-blue-900/30 rounded-lg p-3">
                    <p className="text-[11px] text-blue-300/80 leading-relaxed italic">
                      "Type your solution in the code editor on the left. Click 'Submit Solution' when you're finished. You have 30 minutes for this problem."
                    </p>
                  </div>
                </div>
              </div>
            </ScrollArea>
            
            <div className="p-4 border-t border-gray-800 bg-gray-900/50">
              <div className="flex items-center justify-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Interview Live</span>
              </div>
            </div>
            </Card>
          ) : (
            /* Standard Interview Chat Area */
            <Card className="flex-1 border-gray-700 bg-gray-900 flex flex-col overflow-hidden">
            <div className="border-b border-gray-800 p-4">
              <h2 className="text-sm font-semibold text-white">Interview Chat</h2>
              <p className="text-xs text-gray-400">Real-time transcription</p>
            </div>
            
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'ai' 
                        ? 'bg-gradient-to-br from-blue-600 to-purple-600' 
                        : 'bg-gray-700'
                    }`}>
                      {message.role === 'ai' ? (
                        <Bot className="h-4 w-4 text-white" />
                      ) : (
                        <User className="h-4 w-4 text-white" />
                      )}
                    </div>
                    
                    <div className={`max-w-[90%] rounded-lg p-3 ${
                      message.role === 'ai'
                        ? 'bg-gray-800 text-gray-200'
                        : 'bg-blue-600 text-white'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
                      <p className="text-[10px] opacity-60 mt-1">
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
          </Card>
        )}

        {/* Message Input - Only show in non-technical rounds to save space */}
        {!isTechnicalRound && (
          <div className="mt-4 border-t border-gray-800 p-4 bg-gray-900 rounded-lg border border-gray-700">
            {/* Voice response indicator */}
            {!isAISpeaking && messages.length > 0 && messages[messages.length - 1].role === 'ai' && (
              <div className="mb-3 space-y-2">
                <div className="flex items-center gap-2 text-xs text-blue-400">
                  <div className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                  <span>Your turn to answer...</span>
                </div>
                {isListening && (
                  <div className="flex items-center justify-center gap-2 py-2 px-3 bg-green-900/20 border border-green-700/50 rounded-lg">
                    <Mic className="h-4 w-4 text-green-400 animate-pulse" />
                    <span className="text-xs text-green-300">Listening... Speak your answer</span>
                  </div>
                )}
                {/* Real-time mic level indicator */}
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 w-14">Mic Level</span>
                    <div className="flex-1 h-3 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
                      <div
                        className={`h-full rounded-full transition-all duration-150 ${micLevel > 10 ? 'bg-green-500' : micLevel > 3 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${Math.max(2, micLevel)}%` }}
                      />
                    </div>
                    <span className={`text-[10px] font-mono w-8 ${micLevel > 10 ? 'text-green-400' : 'text-red-400'}`}>{micLevel}</span>
                  </div>
                  {micLevel <= 3 && (
                    <p className="text-[10px] text-red-400">⚠️ Mic appears silent! Check your microphone in Windows Sound Settings.</p>
                  )}
                </div>
              </div>
            )}
            
            {/* Live transcription display */}
            {inputMessage && (
              <div className="mb-3 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Your response:</p>
                <p className="text-sm text-white">{inputMessage}</p>
                {inputMessage.length < MIN_VOICE_RESPONSE_CHARS && (
                  <p className="text-[10px] text-orange-400 mt-1">
                    ⚠️ Please speak a bit more (minimum {MIN_VOICE_RESPONSE_CHARS} characters)
                  </p>
                )}
              </div>
            )}
            
            {/* Info message */}
            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-3 mb-3">
              <p className="text-xs text-blue-300 text-center">
                🎤 <strong>Voice Response Required</strong><br/>
                Speak your answer clearly. Your response will be automatically sent after you pause.
                {isListening && <span className="block mt-1 text-green-300">✓ Microphone is active</span>}
                {sttMode === 'fallback' && (
                  <span className="block mt-1 text-yellow-300">Using backup transcription mode</span>
                )}
              </p>
            </div>

            {/* Reliability fallback controls */}
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={retryMicrophoneRecognition}
                className="w-full border-gray-700 text-gray-200 hover:bg-gray-800"
              >
                <Mic className="h-4 w-4 mr-2" />
                Retry Microphone Recognition
              </Button>

              <div className="flex items-center gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Fallback: type your answer here and press Enter"
                  className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-500"
                />
                <Button type="button" onClick={sendMessage} className="shrink-0">
                  <Send className="h-4 w-4 mr-1" />
                  Send
                </Button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
