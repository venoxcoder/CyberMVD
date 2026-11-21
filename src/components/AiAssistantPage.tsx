import React, { useEffect, useRef, useState } from 'react';
import mammoth from 'mammoth';
import {
  AlertTriangle,
  Bot,
  Briefcase,
  FileUp,
  Loader2,
  MessageSquarePlus,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  Radio,
  Send,
  Sparkles,
  Square,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { CaseRecord, Lang } from '../types';
import { t, tr, localizeRecordText } from '../utils/i18n';
import { logActivity, lsJSON, lsSetJSON } from '../utils/storage';
import { PageHeader } from './CommonUI';

type AiMode = 'qa' | 'explain' | 'forensics' | 'scenario' | 'quiz';
type VoicePersona = 'Zephyr' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir';

interface ChatAttachment {
  name: string;
  mimeType: string;
  base64?: string;
  extractedText?: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system_notice';
  text: string;
  timestamp: string;
  attachmentName?: string;
  viaVoice?: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  mode: AiMode;
  updatedAt: string;
  messages: ChatMessage[];
}

interface AiAssistantPageProps {
  lang: Lang;
  canGoBack: boolean;
  onBack: () => void;
  onToast: (msg: string) => void;
}

const VOICE_OPTIONS: { id: VoicePersona; label: string }[] = [
  { id: 'Zephyr', label: 'Zephyr (Live)' },
  { id: 'Kore', label: 'Kore (Briefing)' },
  { id: 'Puck', label: 'Puck (Clear)' },
  { id: 'Charon', label: 'Charon (Deep)' },
  { id: 'Fenrir', label: 'Fenrir (Direct)' },
];

function float32ToPcm16Base64(float32: Float32Array): string {
  const buffer = new ArrayBuffer(float32.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    view.setInt16(i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64Pcm16ToFloat32(base64: string): Float32Array {
  const binary = atob(base64);
  const byteLen = binary.length;
  const bytes = new Uint8Array(byteLen);
  for (let i = 0; i < byteLen; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const sampleCount = Math.floor(byteLen / 2);
  const float32 = new Float32Array(sampleCount);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < sampleCount; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768;
  }
  return float32;
}

function computeRms(samples: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.min(1, Math.sqrt(sum / Math.max(1, samples.length)) * 3.5);
}

export const AiAssistantPage: React.FC<AiAssistantPageProps> = ({
  lang,
  canGoBack,
  onBack,
  onToast,
}) => {
  const { token, aiConfigured: ctxAiConfigured, apiFetch } = useAuth();
  const [aiConfigured, setAiConfigured] = useState<boolean>(ctxAiConfigured);
  const [sessions, setSessions] = useState<ChatSession[]>(() =>
    lsJSON<ChatSession[]>('kj_ai_chats', [])
  );
  const [activeId, setActiveId] = useState<string>(() => {
    const existing = lsJSON<ChatSession[]>('kj_ai_chats', []);
    return existing[0]?.id || '';
  });
  const [mode, setMode] = useState<AiMode>('qa');
  const [input, setInput] = useState('');
  const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
  const [loading, setLoading] = useState(false);

  // Authorized case context
  const [accessibleCases, setAccessibleCases] = useState<CaseRecord[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  // Voice & TTS state
  const [voiceName, setVoiceName] = useState<VoicePersona>('Zephyr');
  const [autoSpeakReplies, setAutoSpeakReplies] = useState<boolean>(false);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [ttsLoadingMsgId, setTtsLoadingMsgId] = useState<string | null>(null);
  const audioCacheRef = useRef<Map<string, string>>(new Map());
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Voice Dictation (STT via gemini-3.5-transcribe)
  const [isRecordingDictation, setIsRecordingDictation] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [dictationSec, setDictationSec] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const dictationStreamRef = useRef<MediaStream | null>(null);
  const dictationChunksRef = useRef<Blob[]>([]);
  const dictationTimerRef = useRef<number | null>(null);

  // Real-time Live Voice Mode (gemini-3.8-live via /ws/ai-live)
  const [voiceModeOpen, setVoiceModeOpen] = useState(false);
  const [liveStatus, setLiveStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
  const [liveMuted, setLiveMuted] = useState(false);
  const [liveError, setLiveError] = useState<string>('');
  const [liveLevel, setLiveLevel] = useState<number>(0);
  const [liveAiSpeaking, setLiveAiSpeaking] = useState(false);
  const [liveInputDraft, setLiveInputDraft] = useState('');
  const [liveOutputDraft, setLiveOutputDraft] = useState('');

  const fileRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Refs for WebSocket & Web Audio (avoid stale closures in audio/ws callbacks)
  const wsRef = useRef<WebSocket | null>(null);
  const liveStatusRef = useRef<'idle' | 'connecting' | 'active' | 'error'>('idle');
  const liveMutedRef = useRef(false);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const liveMicStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const activeOutputSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const liveInTranscriptRef = useRef<string>('');
  const liveOutTranscriptRef = useRef<string>('');
  const sessionsRef = useRef<ChatSession[]>(sessions);
  const activeIdRef = useRef<string>(activeId);
  const modeRef = useRef<AiMode>(mode);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    liveMutedRef.current = liveMuted;
  }, [liveMuted]);

  useEffect(() => {
    liveStatusRef.current = liveStatus;
  }, [liveStatus]);

  useEffect(() => {
    setAiConfigured(ctxAiConfigured);
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setAiConfigured(Boolean(d?.aiConfigured)))
      .catch(() => {});
  }, [ctxAiConfigured]);

  useEffect(() => {
    apiFetch<{ cases: CaseRecord[] }>('/api/cases')
      .then((d) => setAccessibleCases(d.cases || []))
      .catch(() => setAccessibleCases([]));
  }, [apiFetch]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeId, sessions.length, loading, liveInputDraft, liveOutputDraft]);

  // Cleanup everything on unmount
  useEffect(() => {
    return () => {
      stopAudioPlayback();
      stopDictationCleanup();
      stopLiveVoice();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistSessions = (next: ChatSession[]) => {
    setSessions(next);
    sessionsRef.current = next;
    lsSetJSON('kj_ai_chats', next);
  };

  const activeSession = sessions.find((s) => s.id === activeId) || null;

  const ensureActiveSession = (seedTitle?: string): { sess: ChatSession; all: ChatSession[] } => {
    const existing = sessionsRef.current.find((s) => s.id === activeIdRef.current);
    if (existing) {
      return { sess: existing, all: sessionsRef.current };
    }
    const created: ChatSession = {
      id: `chat_${Date.now()}`,
      title: (seedTitle || (lang === 'ru' ? 'Голосовой брифинг' : lang === 'en' ? 'Voice Briefing' : 'Ovozli brifing')).slice(0, 42),
      mode: modeRef.current,
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    const next = [created, ...sessionsRef.current];
    persistSessions(next);
    setActiveId(created.id);
    activeIdRef.current = created.id;
    return { sess: created, all: next };
  };

  const appendMessageToActive = (msg: ChatMessage, seedTitle?: string) => {
    const { sess, all } = ensureActiveSession(seedTitle || msg.text);
    const updated = all.map((s) =>
      s.id === sess.id
        ? {
            ...s,
            mode: modeRef.current,
            title: s.messages.length === 0 ? msg.text.slice(0, 42) : s.title,
            updatedAt: new Date().toISOString(),
            messages: [...s.messages, msg],
          }
        : s
    );
    persistSessions(updated);
  };

  const createNewChat = () => {
    const newSess: ChatSession = {
      id: `chat_${Date.now()}`,
      title: lang === 'ru' ? 'Новый диалог' : lang === 'en' ? 'New Session' : 'Yangi suhbat',
      mode,
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    const next = [newSess, ...sessions];
    persistSessions(next);
    setActiveId(newSess.id);
  };

  const deleteSession = (id: string) => {
    const next = sessions.filter((s) => s.id !== id);
    persistSessions(next);
    if (activeId === id) {
      setActiveId(next[0]?.id || '');
    }
  };

  /* ======================== TTS PLAYBACK ======================== */

  const stopAudioPlayback = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current = null;
    }
    setPlayingMsgId(null);
  };

  const speakMessage = async (msgId: string, text: string) => {
    if (playingMsgId === msgId) {
      stopAudioPlayback();
      return;
    }
    stopAudioPlayback();

    const cacheKey = `${msgId}:${voiceName}`;
    const cached = audioCacheRef.current.get(cacheKey);
    if (cached) {
      const player = new Audio(`data:audio/wav;base64,${cached}`);
      audioPlayerRef.current = player;
      setPlayingMsgId(msgId);
      player.onended = () => setPlayingMsgId(null);
      player.onerror = () => setPlayingMsgId(null);
      await player.play().catch(() => setPlayingMsgId(null));
      return;
    }

    setTtsLoadingMsgId(msgId);
    try {
      const res = await fetch('/api/ai/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text, voiceName, lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        onToast(data?.message || tr(lang, 'Nutq sintezi xatosi', 'Ошибка синтеза речи', 'TTS error'));
        return;
      }
      if (data.audioBase64) {
        audioCacheRef.current.set(cacheKey, data.audioBase64);
        const player = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
        audioPlayerRef.current = player;
        setPlayingMsgId(msgId);
        player.onended = () => setPlayingMsgId(null);
        player.onerror = () => setPlayingMsgId(null);
        await player.play().catch(() => setPlayingMsgId(null));
      }
    } catch {
      onToast(tr(lang, 'Javobni ovozda o‘qib bo‘lmadi', 'Не удалось озвучить ответ', 'Failed to synthesize voice'));
    } finally {
      setTtsLoadingMsgId(null);
    }
  };

  /* ======================== VOICE DICTATION (STT) ======================== */

  const stopDictationCleanup = () => {
    if (dictationTimerRef.current) {
      window.clearInterval(dictationTimerRef.current);
      dictationTimerRef.current = null;
    }
    if (dictationStreamRef.current) {
      dictationStreamRef.current.getTracks().forEach((tr) => tr.stop());
      dictationStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
  };

  const toggleDictation = async () => {
    if (isRecordingDictation) {
      mediaRecorderRef.current?.stop();
      setIsRecordingDictation(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      onToast(
        lang === 'ru'
          ? 'Браузер не поддерживает запись с микрофона'
          : lang === 'en'
            ? 'Microphone capture is not supported in this browser'
            : 'Brauzer mikrofon yozuvini qo‘llamaydi'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      dictationStreamRef.current = stream;
      dictationChunksRef.current = [];
      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          dictationChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = async () => {
        const mime = recorder.mimeType || 'audio/webm';
        const blob = new Blob(dictationChunksRef.current, { type: mime });
        stopDictationCleanup();
        setDictationSec(0);
        if (blob.size < 400) return;

        setIsTranscribing(true);
        try {
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const res = String(reader.result || '');
              resolve(res.includes(',') ? res.split(',')[1] : res);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          const res = await fetch('/api/ai/transcribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({
              audioBase64: base64,
              mimeType: mime,
              lang,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            onToast(data?.message || tr(lang, 'Nutqni aniqlash xatosi', 'Ошибка распознавания речи', 'Transcription error'));
            return;
          }
          if (data.text) {
            setInput((prev) => (prev.trim() ? `${prev.trim()} ${data.text}` : data.text));
          }
        } catch {
          onToast(tr(lang, 'Ovozni matnga o‘girib bo‘lmadi', 'Не удалось распознать голос', 'Voice transcription failed'));
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingDictation(true);
      setDictationSec(0);
      dictationTimerRef.current = window.setInterval(() => {
        setDictationSec((s) => s + 1);
      }, 1000);
    } catch {
      stopDictationCleanup();
      onToast(
        lang === 'ru'
          ? 'Доступ к микрофону отклонён или устройство не найдено'
          : lang === 'en'
            ? 'Microphone permission denied or device unavailable'
            : 'Mikrofonga ruxsat berilmadi'
      );
    }
  };

  /* ======================== LIVE VOICE MODE (GEMINI LIVE API) ======================== */

  const clearQueuedOutputAudio = () => {
    activeOutputSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch {
        // ignore already stopped
      }
    });
    activeOutputSourcesRef.current.clear();
    if (outputAudioCtxRef.current) {
      nextPlayTimeRef.current = outputAudioCtxRef.current.currentTime;
    } else {
      nextPlayTimeRef.current = 0;
    }
    setLiveAiSpeaking(false);
  };

  const scheduleOutputPcmChunk = (base64Pcm: string) => {
    const ctx = outputAudioCtxRef.current;
    if (!ctx || ctx.state === 'closed') return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const floatData = base64Pcm16ToFloat32(base64Pcm);
    if (floatData.length === 0) return;

    const buffer = ctx.createBuffer(1, floatData.length, 24000);
    buffer.getChannelData(0).set(floatData);

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);

    const now = ctx.currentTime;
    const startAt = Math.max(now + 0.02, nextPlayTimeRef.current || now + 0.02);
    nextPlayTimeRef.current = startAt + buffer.duration;

    activeOutputSourcesRef.current.add(src);
    setLiveAiSpeaking(true);
    setLiveLevel(Math.max(0.28, computeRms(floatData)));

    src.onended = () => {
      activeOutputSourcesRef.current.delete(src);
      if (activeOutputSourcesRef.current.size === 0) {
        setLiveAiSpeaking(false);
      }
    };
    src.start(startAt);
  };

  const commitLiveTranscriptTurn = () => {
    const inText = liveInTranscriptRef.current.trim();
    const outText = liveOutTranscriptRef.current.trim();
    if (inText) {
      appendMessageToActive({
        id: `m_${Date.now()}_vu`,
        role: 'user',
        text: inText,
        timestamp: new Date().toISOString(),
        viaVoice: true,
      });
      liveInTranscriptRef.current = '';
      setLiveInputDraft('');
    }
    if (outText) {
      appendMessageToActive({
        id: `m_${Date.now()}_va`,
        role: 'assistant',
        text: outText,
        timestamp: new Date().toISOString(),
        viaVoice: true,
      });
      liveOutTranscriptRef.current = '';
      setLiveOutputDraft('');
    }
  };

  const stopLiveVoice = () => {
    commitLiveTranscriptTurn();
    clearQueuedOutputAudio();

    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {
        // ignore
      }
      wsRef.current = null;
    }
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {
        // ignore
      }
      processorRef.current = null;
    }
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {
        // ignore
      }
      sourceNodeRef.current = null;
    }
    if (liveMicStreamRef.current) {
      liveMicStreamRef.current.getTracks().forEach((tr) => tr.stop());
      liveMicStreamRef.current = null;
    }
    if (inputAudioCtxRef.current && inputAudioCtxRef.current.state !== 'closed') {
      inputAudioCtxRef.current.close().catch(() => {});
    }
    inputAudioCtxRef.current = null;
    if (outputAudioCtxRef.current && outputAudioCtxRef.current.state !== 'closed') {
      outputAudioCtxRef.current.close().catch(() => {});
    }
    outputAudioCtxRef.current = null;

    setLiveStatus('idle');
    setLiveLevel(0);
    setLiveAiSpeaking(false);
  };

  const startLiveVoice = async () => {
    if (!token) {
      onToast(tr(lang, 'Avtorizatsiya talab qilinadi', 'Требуется авторизация', 'Authentication required'));
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setLiveError(
        tr(
          lang,
          'Ushbu brauzerda mikrofon mavjud emas.',
          'Микрофон недоступен в этом браузере.',
          'Microphone capture is unavailable in this browser.'
        )
      );
      setLiveStatus('error');
      return;
    }

    stopAudioPlayback();
    stopLiveVoice();
    setVoiceModeOpen(true);
    setLiveStatus('connecting');
    setLiveError('');
    setLiveMuted(false);
    liveMutedRef.current = false;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      liveMicStreamRef.current = stream;

      const inputCtx = new AudioContext({ sampleRate: 16000 });
      const outputCtx = new AudioContext({ sampleRate: 24000 });
      inputAudioCtxRef.current = inputCtx;
      outputAudioCtxRef.current = outputCtx;
      nextPlayTimeRef.current = outputCtx.currentTime;

      const wsProto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const params = new URLSearchParams({
        token,
        lang,
        mode: mode === 'qa' ? 'general' : mode,
        voice: voiceName,
      });
      if (selectedCaseId) params.set('caseId', selectedCaseId);

      const ws = new WebSocket(`${wsProto}//${window.location.host}/ws/ai-live?${params.toString()}`);
      wsRef.current = ws;

      ws.onopen = () => {
        // Wait for Gemini Live "ready" signal before confirming active
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data)) as {
            type: string;
            text?: string;
            data?: string;
            message?: string;
          };

          if (msg.type === 'ready') {
            liveStatusRef.current = 'active';
            setLiveStatus('active');
            logActivity('ai', `Live voice session (${voiceName})`);
          } else if (msg.type === 'input_transcript' && msg.text) {
            liveInTranscriptRef.current = `${liveInTranscriptRef.current} ${msg.text}`.trim();
            setLiveInputDraft(liveInTranscriptRef.current);
          } else if (msg.type === 'output_transcript' && msg.text) {
            liveOutTranscriptRef.current = `${liveOutTranscriptRef.current} ${msg.text}`.trim();
            setLiveOutputDraft(liveOutTranscriptRef.current);
          } else if (msg.type === 'audio' && msg.data) {
            scheduleOutputPcmChunk(msg.data);
          } else if (msg.type === 'interrupted') {
            clearQueuedOutputAudio();
            commitLiveTranscriptTurn();
          } else if (msg.type === 'turn_complete') {
            commitLiveTranscriptTurn();
          } else if (msg.type === 'error') {
            liveStatusRef.current = 'error';
            setLiveError(msg.message || 'Live voice session failed.');
            setLiveStatus('error');
          } else if (msg.type === 'closed') {
            stopLiveVoice();
          }
        } catch {
          // ignore invalid frame
        }
      };

      ws.onerror = () => {
        liveStatusRef.current = 'error';
        setLiveError(
          lang === 'ru'
            ? 'Ошибка WebSocket-соединения голосового канала.'
            : lang === 'en'
              ? 'Live voice WebSocket connection error.'
              : 'Ovozli WebSocket ulanish xatosi.'
        );
        setLiveStatus('error');
      };

      ws.onclose = () => {
        if (liveStatusRef.current !== 'error') {
          stopLiveVoice();
        } else {
          commitLiveTranscriptTurn();
        }
      };

      const source = inputCtx.createMediaStreamSource(stream);
      const processor = inputCtx.createScriptProcessor(4096, 1, 1);
      sourceNodeRef.current = source;
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(inputCtx.destination);

      processor.onaudioprocess = (ev) => {
        const socket = wsRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) return;
        const channel = ev.inputBuffer.getChannelData(0);
        const rms = computeRms(channel);
        if (!liveMutedRef.current) {
          setLiveLevel((prev) => Math.max(rms, prev * 0.65));
          const b64 = float32ToPcm16Base64(channel);
          socket.send(JSON.stringify({ type: 'audio', data: b64 }));
        } else {
          setLiveLevel(0);
        }
      };
    } catch {
      stopLiveVoice();
      setLiveError(
        lang === 'ru'
          ? 'Не удалось получить доступ к микрофону или открыть аудиоканал.'
          : lang === 'en'
            ? 'Could not access microphone or initialize live audio session.'
            : 'Mikrofon yoki jonli audio ulanishini ishga tushirib bo‘lmadi.'
      );
      setLiveStatus('error');
    }
  };

  /* ======================== FILE ATTACHMENT & TEXT CHAT ======================== */

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      onToast(lang === 'ru' ? 'Файл > 10 MB' : lang === 'en' ? 'File exceeds 10 MB' : 'Fayl 10 MB dan katta');
      return;
    }

    try {
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.txt') || lower.endsWith('.log') || lower.endsWith('.csv') || lower.endsWith('.json')) {
        const text = await file.text();
        setAttachment({ name: file.name, mimeType: 'text/plain', extractedText: text.slice(0, 20000) });
      } else if (lower.endsWith('.docx')) {
        const buf = await file.arrayBuffer();
        const res = await mammoth.extractRawText({ arrayBuffer: buf });
        setAttachment({
          name: file.name,
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          extractedText: res.value.slice(0, 20000),
        });
      } else if (lower.endsWith('.pdf') || file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          const result = String(reader.result || '');
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          setAttachment({
            name: file.name,
            mimeType: file.type || (lower.endsWith('.pdf') ? 'application/pdf' : 'image/png'),
            base64,
          });
        };
        reader.readAsDataURL(file);
      } else {
        onToast(
          lang === 'ru'
            ? 'Поддерживаются PDF, DOCX, TXT, изображения'
            : lang === 'en'
              ? 'Supported: PDF, DOCX, TXT, images'
              : 'Qo‘llab-quvvatlanadi: PDF, DOCX, TXT, rasm'
        );
      }
    } catch {
      onToast(lang === 'ru' ? 'Ошибка чтения файла' : lang === 'en' ? 'Failed to read file' : 'Faylni o‘qishda xatolik');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleSend = async (customPrompt?: string) => {
    const promptText = (customPrompt ?? input).trim();
    if (!promptText && !attachment) return;

    // If a live voice WebSocket is currently active and user submits text without attachments, inject right into Live session!
    if (liveStatus === 'active' && wsRef.current?.readyState === WebSocket.OPEN && !attachment) {
      appendMessageToActive({
        id: `m_${Date.now()}_u`,
        role: 'user',
        text: promptText,
        timestamp: new Date().toISOString(),
      });
      wsRef.current.send(JSON.stringify({ type: 'text', text: promptText }));
      if (!customPrompt) setInput('');
      return;
    }

    let currentSess = activeSession;
    let currentSessions = sessions;
    if (!currentSess) {
      currentSess = {
        id: `chat_${Date.now()}`,
        title: (promptText || attachment?.name || 'Session').slice(0, 40),
        mode,
        updatedAt: new Date().toISOString(),
        messages: [],
      };
      currentSessions = [currentSess, ...sessions];
      setActiveId(currentSess.id);
    }

    const userMsg: ChatMessage = {
      id: `m_${Date.now()}_u`,
      role: 'user',
      text: promptText || `[File: ${attachment?.name}]`,
      timestamp: new Date().toISOString(),
      attachmentName: attachment?.name,
    };

    const updatedMsgs = [...currentSess.messages, userMsg];
    const withUser = currentSessions.map((s) =>
      s.id === currentSess!.id
        ? {
            ...s,
            mode,
            title: s.messages.length === 0 ? (promptText || attachment?.name || s.title).slice(0, 42) : s.title,
            updatedAt: new Date().toISOString(),
            messages: updatedMsgs,
          }
        : s
    );
    persistSessions(withUser);
    if (!customPrompt) setInput('');

    setLoading(true);
    const activeAttachment = attachment;
    setAttachment(null);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          lang,
          mode: mode === 'qa' ? 'general' : mode,
          caseId: selectedCaseId || undefined,
          message: promptText || `Analyze attached document: ${activeAttachment?.name || ''}`,
          history: currentSess.messages
            .filter((m) => m.role === 'user' || m.role === 'assistant')
            .map((m) => ({ role: m.role, text: m.text })),
          attachments: activeAttachment
            ? [
                {
                  name: activeAttachment.name,
                  mimeType: activeAttachment.mimeType,
                  base64Data: activeAttachment.base64,
                  extractedText: activeAttachment.extractedText,
                },
              ]
            : [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const noticeText =
          response.status === 503 && data?.error === 'AI_UNCONFIGURED'
            ? lang === 'ru'
              ? 'Модуль ИИ подключён к серверному маршруту (/api/ai/chat), но на сервере не задан GEMINI_API_KEY.'
              : lang === 'en'
                ? 'AI endpoint (/api/ai/chat) is active, but GEMINI_API_KEY is not configured on the server.'
                : 'AI server marshruti tayyor, biroq serverda GEMINI_API_KEY sozlanmagan.'
            : data?.message || (lang === 'ru' ? 'Ошибка запроса к ИИ.' : lang === 'en' ? 'AI request failed.' : 'AI so‘rovida xatolik.');

        const sysMsg: ChatMessage = {
          id: `m_${Date.now()}_s`,
          role: 'system_notice',
          text: noticeText,
          timestamp: new Date().toISOString(),
        };
        persistSessions(
          withUser.map((s) =>
            s.id === currentSess!.id ? { ...s, messages: [...updatedMsgs, sysMsg] } : s
          )
        );
        return;
      }

      const aiMsgId = `m_${Date.now()}_a`;
      const aiText = String(data.text || '');
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        role: 'assistant',
        text: aiText,
        timestamp: new Date().toISOString(),
      };
      persistSessions(
        withUser.map((s) =>
          s.id === currentSess!.id ? { ...s, messages: [...updatedMsgs, aiMsg] } : s
        )
      );
      logActivity('ai', `AI query (${mode})`);

      if (autoSpeakReplies && aiText) {
        speakMessage(aiMsgId, aiText);
      }
    } catch {
      const errMsg: ChatMessage = {
        id: `m_${Date.now()}_e`,
        role: 'system_notice',
        text:
          lang === 'ru'
            ? 'Не удалось связаться с серверным маршрутом /api/ai/chat.'
            : lang === 'en'
              ? 'Could not reach server endpoint /api/ai/chat.'
              : '/api/ai/chat server manzili bilan bog‘lanib bo‘lmadi.',
        timestamp: new Date().toISOString(),
      };
      persistSessions(
        withUser.map((s) =>
          s.id === currentSess!.id ? { ...s, messages: [...updatedMsgs, errMsg] } : s
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const modes: { id: AiMode; label: string }[] = [
    { id: 'qa', label: lang === 'ru' ? 'Вопросы УК/расследование' : lang === 'en' ? 'Cybercrime Q&A' : 'Savol-javob' },
    { id: 'explain', label: lang === 'ru' ? 'Объяснить термин' : lang === 'en' ? 'Explain Term' : 'Atamani tushuntirish' },
    { id: 'forensics', label: lang === 'ru' ? 'Криминалистика' : lang === 'en' ? 'Digital Forensics' : 'Kriminalistika' },
    { id: 'scenario', label: lang === 'ru' ? 'Анализ ситуации' : lang === 'en' ? 'Scenario Analysis' : 'Vaziyat tahlili' },
    { id: 'quiz', label: lang === 'ru' ? 'Создать тест' : lang === 'en' ? 'Generate Test' : 'Test tuzish' },
  ];

  const starters = [
    lang === 'ru'
      ? 'Объясни простым языком разницу между ст. 168 и ст. 169 УК при краже через APK'
      : lang === 'en'
        ? 'Explain simply the difference between Art. 168 Fraud and Art. 169 Theft in APK malware cases'
        : 'APK zararli dasturi holatida JK 168 va 169-moddalar farqini sodda tilda tushuntiring',
    lang === 'ru'
      ? 'Составь пошаговый план фиксации цифровых следов при фишинге (Chain of Custody)'
      : lang === 'en'
        ? 'Outline a step-by-step phishing evidence preservation checklist (Chain of Custody)'
        : 'Fishing holatida raqamli izlarni rasmiylashtirish (Chain of Custody) bosqichlarini tuzing',
  ];

  const selectedCase = accessibleCases.find((c) => c.id === selectedCaseId);

  return (
    <div className="space-y-5">
      <PageHeader
        lang={lang}
        eyebrow={t('e_ai', lang)}
        title={t('p_ai', lang)}
        subtitle={
          lang === 'ru'
            ? 'Анализ дел, юридическая квалификация, разбор PDF/DOCX/изображений и двусторонний голосовой режим реального времени.'
            : lang === 'en'
              ? 'Case-aware intelligence, legal qualification, artifact analysis, voice dictation, and real-time voice briefing.'
              : 'Ishlar tahlili, huquqiy kvalifikatsiya, fayl tahlili, ovozli diktovka va jonli ovozli muloqot rejimi.'
        }
        canGoBack={canGoBack}
        onBack={onBack}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAutoSpeakReplies((v) => !v)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                autoSpeakReplies
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--line)] bg-[var(--panel2)] text-[var(--secondary-text)] hover:text-[var(--text)]'
              }`}
            >
              {autoSpeakReplies ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              <span>
                {lang === 'ru' ? 'Автоозвучка' : lang === 'en' ? 'Auto-Voice' : 'Avto-ovoz'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                if (voiceModeOpen && liveStatus === 'active') {
                  stopLiveVoice();
                  setVoiceModeOpen(false);
                } else {
                  setVoiceModeOpen((v) => !v);
                }
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                voiceModeOpen || liveStatus === 'active'
                  ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                  : 'border border-[var(--accent)]/50 bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-ink)]'
              }`}
            >
              <Radio className={`h-3.5 w-3.5 ${liveStatus === 'active' ? 'animate-pulse' : ''}`} />
              <span>
                {lang === 'ru'
                  ? 'Голосовой режим'
                  : lang === 'en'
                    ? 'Voice Mode'
                    : 'Ovozli rejim'}
              </span>
            </button>
          </div>
        }
      />

      {!aiConfigured && (
        <div className="flex items-start gap-3 rounded-xl border border-[var(--orange)]/40 bg-[var(--orange)]/10 p-4 text-xs leading-relaxed text-[var(--text)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--orange)]" />
          <div>
            <div className="font-bold">
              {lang === 'ru'
                ? 'Серверный API ИИ ожидает ключ GEMINI_API_KEY'
                : lang === 'en'
                  ? 'Server AI Endpoint Ready — Awaiting GEMINI_API_KEY'
                  : 'Server AI arxitekturasi tayyor — GEMINI_API_KEY kutilmoqda'}
            </div>
            <p className="mt-1 text-[var(--secondary-text)]">
              {lang === 'ru'
                ? 'Добавьте GEMINI_API_KEY в настройки окружения сервера (Settings > Secrets), чтобы активировать текстовый и голосовой режимы.'
                : lang === 'en'
                  ? 'Configure GEMINI_API_KEY in Settings > Secrets to enable live text and voice AI capabilities.'
                  : 'Matnli va ovozli AI imkoniyatlarini faollashtirish uchun Settings > Secrets orqali GEMINI_API_KEY kiriting.'}
            </p>
          </div>
        </div>
      )}

      {/* Real-time Voice Briefing Console */}
      {voiceModeOpen && (
        <section className="rounded-xl border border-[var(--accent)]/40 bg-[var(--panel)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
                  liveStatus === 'active'
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-[var(--line)] bg-[var(--panel2)] text-[var(--muted)]'
                }`}
              >
                <Radio className={`h-4.5 w-4.5 ${liveStatus === 'active' ? 'animate-pulse' : ''}`} />
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-[var(--text)]">
                  <span>
                    {lang === 'ru'
                      ? 'Голосовой режим реального времени'
                      : lang === 'en'
                        ? 'Real-Time Voice Investigation Console'
                        : 'Jonli ovozli tergov konsoli'}
                  </span>
                  <span className="rounded border border-[var(--line)] bg-[var(--panel2)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--accent)]">
                    gemini-3.8-live
                  </span>
                </div>
                <div className="text-xs text-[var(--muted)]">
                  {liveStatus === 'active'
                    ? liveAiSpeaking
                      ? lang === 'ru'
                        ? 'Ассистент отвечает голосом (перебивание активно)...'
                        : lang === 'en'
                          ? 'Assistant speaking (barge-in enabled)...'
                          : 'Yordamchi gapirmoqda...'
                      : liveMuted
                        ? lang === 'ru'
                          ? 'Микрофон отключён (Mute)'
                          : lang === 'en'
                            ? 'Microphone muted'
                            : 'Mikrofon o‘chirilgan'
                        : lang === 'ru'
                          ? 'Канал открыт · Говорите в микрофон (16kHz PCM → 24kHz)'
                          : lang === 'en'
                            ? 'Channel open · Speak normally (16kHz PCM → 24kHz)'
                            : 'Aloqa faol · Mikrofonga gapiring'
                    : liveStatus === 'connecting'
                      ? tr(lang, 'Himoyalangan ovozli kanal ulanmoqda...', 'Установка защищённого голосового канала...', 'Connecting voice channel...')
                      : lang === 'ru'
                        ? 'Голосовой эфир не запущен. Нажмите «Начать эфир», чтобы говорить с ассистентом.'
                        : lang === 'en'
                          ? 'Voice session standby. Click Start Voice Call to speak in real time.'
                          : 'Jonli ovozli aloqa tayyor. Boshlash tugmasini bosing.'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value as VoicePersona)}
                disabled={liveStatus === 'active' || liveStatus === 'connecting'}
                aria-label="Voice Persona"
                className="rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-1.5 text-xs text-[var(--text)] disabled:opacity-60"
              >
                {VOICE_OPTIONS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>

              {liveStatus === 'active' || liveStatus === 'connecting' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setLiveMuted((m) => !m)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                      liveMuted
                        ? 'border-[var(--orange)] bg-[var(--orange)]/15 text-[var(--orange)]'
                        : 'border-[var(--line)] bg-[var(--panel2)] text-[var(--text)]'
                    }`}
                  >
                    {liveMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5 text-[var(--accent)]" />}
                    <span>{liveMuted ? 'Unmute' : 'Mute'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={stopLiveVoice}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--red)] px-3.5 py-1.5 text-xs font-bold text-white hover:opacity-90"
                  >
                    <PhoneOff className="h-3.5 w-3.5" />
                    <span>{lang === 'ru' ? 'Завершить' : lang === 'en' ? 'End Call' : 'Tugatish'}</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={startLiveVoice}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3.5 py-1.5 text-xs font-bold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
                >
                  <PhoneCall className="h-3.5 w-3.5" />
                  <span>{lang === 'ru' ? 'Начать эфир' : lang === 'en' ? 'Start Voice Call' : 'Ovozli aloqani boshlash'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  stopLiveVoice();
                  setVoiceModeOpen(false);
                }}
                aria-label="Close voice console"
                className="rounded-lg border border-[var(--line)] p-1.5 text-[var(--muted)] hover:text-[var(--text)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Reactive Audio Level Meter + Live Captions */}
          <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="flex flex-col justify-center rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-3">
              <div className="mb-2 flex items-center justify-between text-[11px] font-mono text-[var(--muted)]">
                <span>AUDIO SIGNAL</span>
                <span>{Math.round(liveLevel * 100)}%</span>
              </div>
              <div className="flex h-8 items-end gap-1">
                {Array.from({ length: 20 }).map((_, idx) => {
                  const threshold = (idx + 1) / 20;
                  const active = liveStatus === 'active' && liveLevel >= threshold * 0.65;
                  return (
                    <div
                      key={idx}
                      className={`flex-1 rounded-xs transition-all duration-75 ${
                        active
                          ? liveAiSpeaking
                            ? 'bg-[var(--blue)]'
                            : 'bg-[var(--accent)]'
                          : 'bg-[var(--line)]'
                      }`}
                      style={{
                        height: active
                          ? `${Math.max(25, Math.min(100, (liveLevel * 120) - idx * 2))}%`
                          : '18%',
                      }}
                    />
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-3 lg:col-span-2 space-y-1.5 text-xs">
              <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--muted)]">
                {lang === 'ru' ? 'Живая расшифровка эфира' : lang === 'en' ? 'Live Transcript' : 'Jonli matn'}
              </div>
              {liveError ? (
                <div className="text-[var(--red)]">{liveError}</div>
              ) : (
                <>
                  <div className="text-[var(--secondary-text)]">
                    <span className="font-bold text-[var(--accent)]">{tr(lang, 'Siz: ', 'Вы: ', 'You: ')}</span>
                    {liveInputDraft || (liveStatus === 'active' ? '...' : '—')}
                  </div>
                  <div className="text-[var(--text)]">
                    <span className="font-bold text-[var(--blue)]">AI: </span>
                    {liveOutputDraft || (liveStatus === 'active' ? '...' : '—')}
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
        {/* Chat History & Case Context Sidebar */}
        <aside className="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 space-y-4 lg:col-span-1">
          <button
            type="button"
            onClick={createNewChat}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-bold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)]"
          >
            <MessageSquarePlus className="h-4 w-4" />
            <span>{lang === 'ru' ? 'Новый диалог' : lang === 'en' ? 'New Conversation' : 'Yangi suhbat'}</span>
          </button>

          {/* Authorized Case Dossier Context Selector */}
          <div className="space-y-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel2)] p-2.5">
            <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-[var(--muted)]">
              <Briefcase className="h-3.5 w-3.5 text-[var(--accent)]" />
              <span>
                {lang === 'ru' ? 'Контекст дела' : lang === 'en' ? 'Case Context' : 'Ish konteksti'}
              </span>
            </label>
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              className="w-full rounded-md border border-[var(--line)] bg-[var(--input-bg)] px-2 py-1.5 text-xs text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
            >
              <option value="">
                {lang === 'ru' ? '— Без привязки к делу —' : lang === 'en' ? '— General / No Case —' : '— Umumiy rejim —'}
              </option>
              {accessibleCases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.caseNumber} · {localizeRecordText(c.title, lang).slice(0, 30)}
                </option>
              ))}
            </select>
            {selectedCase && (
              <div className="text-[11px] leading-snug text-[var(--secondary-text)]">
                {selectedCase.caseNumber} ({selectedCase.kind}) · {selectedCase.entities.length}{' '}
                {tr(lang, 'obyekt', 'объектов', 'entities')}
              </div>
            )}
          </div>

          <div className="text-[11px] font-bold uppercase text-[var(--muted)]">
            {lang === 'ru' ? 'История диалогов' : lang === 'en' ? 'Chat History' : 'Suhbatlar tarixi'}
          </div>

          <div className="max-h-[380px] space-y-1.5 overflow-y-auto">
            {sessions.length === 0 ? (
              <p className="py-4 text-center text-xs text-[var(--muted)]">
                {lang === 'ru' ? 'Диалогов пока нет' : lang === 'en' ? 'No conversations yet' : 'Hali suhbatlar yo‘q'}
              </p>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs ${
                    s.id === activeId
                      ? 'bg-[var(--accent-soft)] text-[var(--accent)] font-semibold'
                      : 'bg-[var(--panel2)] text-[var(--secondary-text)] hover:text-[var(--text)]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setActiveId(s.id);
                      setMode(s.mode);
                    }}
                    className="min-w-0 flex-1 truncate text-left"
                  >
                    {s.title}
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteSession(s.id)}
                    aria-label={lang === 'ru' ? 'Удалить диалог' : lang === 'en' ? 'Delete session' : 'Suhbatni o‘chirish'}
                    className="shrink-0 text-[var(--muted)] hover:text-[var(--red)]"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </aside>

        {/* Main Chat Panel */}
        <section className="flex min-h-[560px] flex-col rounded-xl border border-[var(--line)] bg-[var(--panel)] lg:col-span-3">
          {/* Mode selector & voice persona */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] p-3">
            <div className="flex flex-wrap gap-1.5">
              {modes.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    mode === m.id
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)]'
                      : 'bg-[var(--panel2)] text-[var(--secondary-text)] hover:text-[var(--text)]'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {!voiceModeOpen && (
              <select
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value as VoicePersona)}
                aria-label="TTS Voice"
                className="rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-2 py-1 text-[11px] font-mono text-[var(--secondary-text)]"
              >
                {VOICE_OPTIONS.map((v) => (
                  <option key={v.id} value={v.id}>
                    🔊 {v.id}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto p-4">
            {(!activeSession || activeSession.messages.length === 0) && (
              <div className="my-8 flex flex-col items-center justify-center text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
                  <Bot className="h-6 w-6" />
                </div>
                <h3 className="text-sm font-bold text-[var(--text)]">
                  {lang === 'ru'
                    ? 'ИИ-помощник по киберкриминалистике'
                    : lang === 'en'
                      ? 'Cyber Forensics & Investigation Assistant'
                      : 'Raqamli kriminalistika va tergov AI yordamchisi'}
                </h3>
                <p className="mt-1 max-w-md text-xs text-[var(--muted)]">
                  {lang === 'ru'
                    ? 'Задайте вопрос текстом или голосом, прикрепите PDF/DOCX/изображение либо запустите живой голосовой брифинг.'
                    : lang === 'en'
                      ? 'Ask by text or voice, attach a PDF/DOCX/image artifact, or start a real-time voice briefing.'
                      : 'Matn yoki ovoz bilan savol bering, fayl biriktiring yoxud jonli ovozli aloqani boshlang.'}
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {starters.map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleSend(st)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-3 py-2 text-left text-xs text-[var(--text)] hover:border-[var(--accent)]"
                    >
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
                      <span>{st}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeSession?.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-4 py-3 text-xs leading-relaxed sm:text-sm ${
                    msg.role === 'user'
                      ? 'bg-[var(--accent)] text-[var(--accent-ink)] font-medium'
                      : msg.role === 'system_notice'
                        ? 'border border-[var(--orange)]/50 bg-[var(--orange)]/10 text-[var(--text)]'
                        : 'border border-[var(--line)] bg-[var(--panel2)] text-[var(--text)]'
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] uppercase opacity-75">
                      {msg.role === 'user'
                        ? msg.viaVoice
                          ? '🎙 Voice'
                          : 'Operator'
                        : msg.role === 'system_notice'
                          ? 'Notice'
                          : msg.viaVoice
                            ? '🔊 Live AI'
                            : 'Gemini AI'}
                    </span>

                    {msg.role === 'assistant' && msg.text && (
                      <button
                        type="button"
                        onClick={() => speakMessage(msg.id, msg.text)}
                        disabled={ttsLoadingMsgId === msg.id}
                        title={lang === 'ru' ? 'Озвучить ответ' : lang === 'en' ? 'Read aloud' : 'Ovozda tinglash'}
                        className="inline-flex items-center gap-1 rounded border border-[var(--line)] bg-[var(--panel)] px-2 py-0.5 text-[10px] font-semibold text-[var(--secondary-text)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                      >
                        {ttsLoadingMsgId === msg.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : playingMsgId === msg.id ? (
                          <Square className="h-3 w-3 fill-current text-[var(--accent)]" />
                        ) : (
                          <Volume2 className="h-3 w-3" />
                        )}
                        <span>
                          {playingMsgId === msg.id
                            ? tr(lang, 'To‘xtatish', 'Стоп', 'Stop')
                            : tr(lang, 'Tinglash', 'Озвучить', 'Listen')}
                        </span>
                      </button>
                    )}
                  </div>

                  {msg.attachmentName && (
                    <div className="mb-1.5 font-mono text-[11px] font-bold opacity-80">
                      📎 {msg.attachmentName}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-xs font-mono text-[var(--accent)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>
                  {lang === 'ru' ? 'Обработка запроса...' : lang === 'en' ? 'Analyzing...' : 'Tahlil qilinmoqda...'}
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input, Voice Dictation & Attachment Bar */}
          <div className="border-t border-[var(--line)] p-3 space-y-2">
            {attachment && (
              <div className="flex items-center justify-between rounded-lg bg-[var(--panel2)] px-3 py-1.5 text-xs">
                <span className="truncate font-mono text-[var(--accent)]">
                  📎 {attachment.name}
                </span>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  className="text-[var(--muted)] hover:text-[var(--red)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.txt,.log,.csv,.json,image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                title={lang === 'ru' ? 'PDF, DOCX, TXT, изображение' : lang === 'en' ? 'PDF, DOCX, TXT, Image' : 'PDF, DOCX, TXT, rasm'}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-3 py-2.5 text-xs font-semibold text-[var(--text)] hover:border-[var(--accent)]"
              >
                <FileUp className="h-4 w-4 text-[var(--accent)]" />
                <span className="hidden sm:inline">PDF/DOCX</span>
              </button>

              <button
                type="button"
                onClick={toggleDictation}
                disabled={isTranscribing}
                title={
                  lang === 'ru'
                    ? 'Голосовой ввод (диктовка)'
                    : lang === 'en'
                      ? 'Voice dictation'
                      : 'Ovozli kiritish'
                }
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2.5 text-xs font-semibold transition-colors ${
                  isRecordingDictation
                    ? 'border-[var(--red)] bg-[var(--red)]/15 text-[var(--red)]'
                    : 'border-[var(--line)] bg-[var(--panel2)] text-[var(--text)] hover:border-[var(--accent)]'
                }`}
              >
                {isTranscribing ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
                ) : isRecordingDictation ? (
                  <Square className="h-3.5 w-3.5 fill-current" />
                ) : (
                  <Mic className="h-4 w-4 text-[var(--accent)]" />
                )}
                {isRecordingDictation && (
                  <span className="font-mono text-[11px]">{dictationSec}s</span>
                )}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isRecordingDictation
                    ? lang === 'ru'
                      ? 'Идёт запись голоса... Нажмите Стоп для расшифровки'
                      : lang === 'en'
                        ? 'Recording voice... Click Stop to transcribe'
                        : 'Ovoz yozilmoqda... To‘xtatish uchun bosing'
                    : isTranscribing
                      ? tr(lang, 'Nutq matnga o‘girilmoqda...', 'Расшифровка речи...', 'Transcribing audio...')
                      : lang === 'ru'
                        ? 'Введите вопрос или продиктуйте голосом...'
                        : lang === 'en'
                          ? 'Type a question or dictate by voice...'
                          : 'Savol yozing yoki ovoz orqali kiriting...'
                }
                className="flex-1 rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-3.5 py-2.5 text-sm text-[var(--text)] focus:border-[var(--accent)] focus:outline-none"
              />

              <button
                type="submit"
                disabled={loading || isRecordingDictation}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-xs font-bold text-[var(--accent-ink)] hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {lang === 'ru' ? 'Отправить' : lang === 'en' ? 'Send' : 'Yuborish'}
                </span>
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
};
