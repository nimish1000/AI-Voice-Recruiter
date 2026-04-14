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
  Loader2
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
}

/** Web Speech auto-send uses this; keep low enough for short answers but avoid noise. */
const MIN_VOICE_RESPONSE_CHARS = 5;

export default function InterviewSessionPage() {
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
      const permissionStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      // Release the permission stream immediately so SpeechRecognition can exclusively use the mic on strict devices.
      permissionStream.getTracks().forEach((track) => track.stop());

      // Do not call recognition.start() yet — avoids start → immediate stop for welcome TTS (Chrome bug / no-speech loops).
      setupSpeechRecognition({ deferInitialStart: true });
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Unable to access microphone. Please check permissions and ensure your device has a microphone.');
    }
  };

  // Setup continuous speech recognition
  const setupSpeechRecognition = (opts?: { deferInitialStart?: boolean }) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari.');
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
        }, 2500);
      }
    };
    
    recognition.onerror = (event: any) => {
      // Silence no-speech as it's common and handled by auto-restart
      if (event.error === 'no-speech') {
        console.log('🎤 Speech recognition: No speech detected (normal timeout)');
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
      } else if (event.error === 'service-not-allowed') {
        console.warn('Speech recognition service unavailable. Falling back to background listening.');
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
      
      utterance.onstart = () => {
        console.log('🔊 AI started speaking');
        isAISpeakingRef.current = true;
        setIsAISpeaking(true);
        recognitionPausedForAIRef.current = true;
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
      };
      
      utterance.onend = () => {
        console.log('🔇 AI finished speaking');
        recognitionPausedForAIRef.current = false;
        isAISpeakingRef.current = false;
        setIsAISpeaking(false);
        // Let audio output settle before listening again (reduces echo / false no-speech)
        setTimeout(() => {
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
            console.warn('⚠️ Speech recognition not available to restart');
          }
        }, 750);
      };
      
      utterance.onerror = (event) => {
        // Don't log interrupted errors as they're normal
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
          console.warn('Speech synthesis warning:', event.error);
        }
        recognitionPausedForAIRef.current = false;
        isAISpeakingRef.current = false;
        setIsAISpeaking(false);
        // Restart speech recognition on error
        setTimeout(() => {
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
          const data = await response.json();
          console.log('Interview session initialized:', data);
          
          if (data.questions && Array.isArray(data.questions) && data.questions.length > 0) {
            activeQuestions = data.questions;
            setInterviewQuestions(data.questions);
            interviewQuestionsRef.current = data.questions;
            if (data.job?.title) setJobTitle(data.job.title);
            if (data.settings?.agentName) setAgentName(data.settings.agentName);
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
      
      // Update first question if it's the generic fallback to include agent name
      const welcomeText = firstQuestionText.includes("I'm your AI interviewer")
        ? firstQuestionText.replace("I'm your AI interviewer", `I'm ${agentName || 'your AI interviewer'}`)
        : firstQuestionText;

      const welcomeMessage: Message = {
        id: Date.now().toString(),
        role: 'ai',
        content: welcomeText,
        timestamp: new Date()
      };
      
      setMessages([welcomeMessage]);
      
      // 6. Start speaking first question
      await speakWithMurf(welcomeText);
      
    } catch (error) {
      console.error('Error starting interview:', error);
      setIsConnecting(false);
      alert('Failed to start interview. Please check your camera and microphone permissions.');
    }
  };

  // Ask next question - ensures no repetition
  const askNextQuestion = () => {
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
      const completionMessage: Message = {
        id: Date.now().toString(),
        role: 'ai',
        content: "Thank you for completing the interview! We'll review your responses and get back to you soon.",
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
    
    // Add brief acknowledgment
    const acknowledgments = [
      "Thank you for sharing.",
      "I appreciate your response.",
      "That's interesting.",
      "Good to know.",
      "Understood."
    ];
    
    const randomAcknowledgment = acknowledgments[Math.floor(Math.random() * acknowledgments.length)];
    
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
        content: nextQuestion.question,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, questionMessage]);
      speakWithMurf(`${randomAcknowledgment} ${nextQuestion.question}`);
    }, 2000);
  };

  // Handle user message - auto-send when speaking is detected
  const handleUserMessage = async (text: string) => {
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
    setInputMessage('');
    
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
  const sendMessage = () => {
    if (inputMessage.trim()) {
      handleUserMessage(inputMessage);
    }
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
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
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
          
          <Badge variant="outline" className="border-green-500/50 text-green-400">
            <div className="h-2 w-2 rounded-full bg-green-400 mr-2 animate-pulse" />
            Live
          </Badge>
        </div>
      </header>

      {/* Main Content - Video Call Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 overflow-hidden">
        {/* Left Side - Video Feed */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Webcam Feed */}
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

        {/* Right Side - Chat Area */}
        <Card className="border-gray-700 bg-gray-900 flex flex-col">
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
                  
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'ai'
                      ? 'bg-gray-800 text-gray-200'
                      : 'bg-blue-600 text-white'
                  }`}>
                    <p className="text-sm">{message.content}</p>
                    <p className="text-[10px] opacity-60 mt-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
          
          {/* Message Input - Voice Only */}
          <div className="border-t border-gray-800 p-4">
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
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
