import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Briefcase,
  Loader2,
  Maximize2,
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
import type { CaseRecord, Lang, PageId, RouteState } from '../types';
import { base64Pcm16ToFloat32, computeRms, float32ToPcm16Base64 } from '../utils/audioUtils';
import { localizeRecordText, tr } from '../utils/i18n';
import { logActivity, lsJSON, lsSetJSON } from '../utils/storage';

type VoicePersona = 'Zephyr' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir';

interface WidgetMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  viaVoice?: boolean;
}

interface FloatingAiWidgetProps {
  lang: Lang;
  route: RouteState;
  onNavigate: (
    page: PageId,
    opts?: { a?: string; m?: string; view?: string; id?: string; tab?: string }
  ) => void;
  onToast: (msg: string) => void;
}

const VOICE_OPTIONS: VoicePersona[] = ['Zephyr', 'Kore', 'Puck', 'Charon', 'Fenrir'];
const STORAGE_KEY = 'kj_floating_ai_msgs';

interface SpeechRecognitionResultAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionResultAlternativeLike;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike extends Event {
  error?: string;
}

interface BrowserSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

function getSpeechRecognitionCtor(): (new () => BrowserSpeechRecognition) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export const FloatingAiWidget: React.FC<FloatingAiWidgetProps> = ({
  lang,
  route,
  onNavigate,
  onToast,
}) => {
  const { token, permissions, aiConfigured: ctxAiConfigured, apiFetch } = useAuth();
  const [open, setOpen] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(ctxAiConfigured);
  const [messages, setMessages] = useState<WidgetMessage[]>(() =>
    lsJSON<WidgetMessage[]>(STORAGE_KEY, [])
  );
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // Authorized case context
  const [accessibleCases, setAccessibleCases] = useState<CaseRecord[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');

  // TTS playback
  const [voiceName, setVoiceName] = useState<VoicePersona>('Zephyr');
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const [ttsLoadingId, setTtsLoadingId] = useState<string | null>(null);
  const audioCacheRef = useRef<Map<string, string>>(new Map());
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Dictation (STT via Browser SpeechRecognition with MediaRecorder fallback)
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [dictationSec, setDictationSec] = useState(0);
  const [interimTranscript, setInterimTranscript] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const dictationStreamRef = useRef<MediaStream | null>(null);
  const dictationChunksRef = useRef<Blob[]>([]);
  const dictationTimerRef = useRef<number | null>(null);
  const speechRecRef = useRef<BrowserSpeechRecognition | null>(null);
  const speechBaseInputRef = useRef<string>('');
  const speechFinalRef = useRef<string>('');
  const inputRef = useRef<string>(input);

  // Real-time Live Voice Mode (gemini-3.8-live via /ws/ai-live)
  const [voiceModeOpen, setVoiceModeOpen] = useState(false);
  const [liveStatus, setLiveStatus] = useState<'idle' | 'connecting' | 'active' | 'error'>('idle');
  const [liveMuted, setLiveMuted] = useState(false);
  const [liveError, setLiveError] = useState('');
  const [liveLevel, setLiveLevel] = useState(0);
  const [liveAiSpeaking, setLiveAiSpeaking] = useState(false);
  const [liveInputDraft, setLiveInputDraft] = useState('');
  const [liveOutputDraft, setLiveOutputDraft] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
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
  const messagesRef = useRef<WidgetMessage[]>(messages);

  const hidden = route.page === 'ai' || !permissions?.ai_use;

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    inputRef.current = input;
  }, [input]);

  useEffect(() => {
    liveMutedRef.current = liveMuted;
  }, [liveMuted]);

  useEffect(() => {
    liveStatusRef.current = liveStatus;
  }, [liveStatus]);

  useEffect(() => {
    setAiConfigured(ctxAiConfigured);
  }, [ctxAiConfigured]);

  useEffect(() => {
    if (!open || !token) return;
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setAiConfigured(Boolean(d?.aiConfigured)))
      .catch(() => {});
    apiFetch<{ cases: CaseRecord[] }>('/api/cases')
      .then((d) => setAccessibleCases(d.cases || []))
      .catch(() => {});
  }, [open, token, apiFetch]);

  // Automatically attach case context when inspecting a Case Dossier
  useEffect(() => {
    if (route.page === 'case' && route.id) {
      setSelectedCaseId(route.id);
    }
  }, [route.page, route.id]);

  // Prevent dual microphone / WebSocket session when user navigates to full AI Assistant page or logs out
  useEffect(() => {
    if (hidden) {
      stopAudioPlayback();
      stopDictationCleanup();
      stopLiveVoice();
      setOpen(false);
      setVoiceModeOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden]);

  // Scroll message list to bottom
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [open, messages.length, sending, liveInputDraft, liveOutputDraft]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudioPlayback();
      stopDictationCleanup();
      stopLiveVoice();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistMessages = (next: WidgetMessage[]) => {
    const trimmed = next.slice(-40);
    setMessages(trimmed);
    messagesRef.current = trimmed;
    lsSetJSON(STORAGE_KEY, trimmed);
  };

  const appendMessage = (msg: WidgetMessage) => {
    persistMessages([...messagesRef.current, msg]);
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

    setTtsLoadingId(msgId);
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
        onToast(
          data?.message ||
            tr(lang, 'Nutq sintezi xatosi', 'Ошибка синтеза речи', 'TTS error')
        );
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
      onToast(
        tr(
          lang,
          'Javobni ovozda o‘qib bo‘lmadi',
          'Не удалось озвучить ответ',
          'Failed to synthesize voice'
        )
      );
    } finally {
      setTtsLoadingId(null);
    }
  };

  /* ======================== VOICE DICTATION (BROWSER SPEECH RECOGNITION + FALLBACK) ======================== */

  const stopDictationCleanup = () => {
    if (speechRecRef.current) {
      try {
        speechRecRef.current.onresult = null;
        speechRecRef.current.onerror = null;
        speechRecRef.current.onend = null;
        speechRecRef.current.stop();
      } catch {
        // ignore
      }
      speechRecRef.current = null;
    }
    if (dictationTimerRef.current) {
      window.clearInterval(dictationTimerRef.current);
      dictationTimerRef.current = null;
    }
    if (dictationStreamRef.current) {
      dictationStreamRef.current.getTracks().forEach((trTrack) => trTrack.stop());
      dictationStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    setInterimTranscript('');
    setIsRecording(false);
    setDictationSec(0);
  };

  const startMediaRecorderDictation = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      onToast(
        tr(
          lang,
          'Brauzer mikrofon yozuvini qo‘llamaydi',
          'Браузер не поддерживает запись с микрофона',
          'Microphone capture is not supported in this browser'
        )
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
            body: JSON.stringify({ audioBase64: base64, mimeType: mime, lang }),
          });
          const data = await res.json();
          if (!res.ok) {
            onToast(
              data?.message ||
                tr(lang, 'Nutqni aniqlash xatosi', 'Ошибка распознавания речи', 'Transcription error')
            );
            return;
          }
          if (data.text) {
            setInput((prev) => (prev.trim() ? `${prev.trim()} ${data.text}` : data.text));
          }
        } catch {
          onToast(
            tr(
              lang,
              'Ovozni matnga o‘girib bo‘lmadi',
              'Не удалось распознать голос',
              'Voice transcription failed'
            )
          );
        } finally {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setDictationSec(0);
      dictationTimerRef.current = window.setInterval(() => {
        setDictationSec((s) => s + 1);
      }, 1000);
    } catch {
      stopDictationCleanup();
      onToast(
        tr(
          lang,
          'Mikrofonga ruxsat berilmadi',
          'Доступ к микрофону отклонён или устройство не найдено',
          'Microphone permission denied or unavailable'
        )
      );
    }
  };

  const toggleDictation = async () => {
    if (isRecording) {
      if (speechRecRef.current) {
        try {
          speechRecRef.current.stop();
        } catch {
          stopDictationCleanup();
        }
      } else if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
      } else {
        stopDictationCleanup();
      }
      return;
    }

    const SpeechRecognitionCtor = getSpeechRecognitionCtor();
    if (SpeechRecognitionCtor) {
      try {
        stopAudioPlayback();
        const recognition = new SpeechRecognitionCtor();
        recognition.lang = lang === 'ru' ? 'ru-RU' : lang === 'en' ? 'en-US' : 'uz-UZ';
        recognition.continuous = true;
        recognition.interimResults = true;

        speechBaseInputRef.current = inputRef.current.trim();
        speechFinalRef.current = '';
        setInterimTranscript('');

        recognition.onstart = () => {
          setIsRecording(true);
          setDictationSec(0);
          if (dictationTimerRef.current) window.clearInterval(dictationTimerRef.current);
          dictationTimerRef.current = window.setInterval(() => {
            setDictationSec((s) => s + 1);
          }, 1000);
        };

        recognition.onresult = (event: SpeechRecognitionEventLike) => {
          let finalChunk = '';
          let interimChunk = '';
          for (let i = 0; i < event.results.length; i++) {
            const result = event.results[i];
            const transcript = result?.[0]?.transcript || '';
            if (result?.isFinal) {
              finalChunk = `${finalChunk} ${transcript}`.trim();
            } else {
              interimChunk = `${interimChunk} ${transcript}`.trim();
            }
          }
          speechFinalRef.current = finalChunk;
          setInterimTranscript(interimChunk);
          const combined = [speechBaseInputRef.current, finalChunk, interimChunk]
            .filter(Boolean)
            .join(' ')
            .trim();
          setInput(combined);
        };

        recognition.onerror = (ev: SpeechRecognitionErrorEventLike) => {
          const code = ev?.error || '';
          if (code === 'not-allowed' || code === 'service-not-allowed') {
            stopDictationCleanup();
            onToast(
              tr(
                lang,
                'Mikrofonga ruxsat berilmadi',
                'Доступ к микрофону отклонён',
                'Microphone permission denied'
              )
            );
          } else if (code !== 'aborted' && code !== 'no-speech') {
            stopDictationCleanup();
            void startMediaRecorderDictation();
          }
        };

        recognition.onend = () => {
          const finalCombined = [speechBaseInputRef.current, speechFinalRef.current]
            .filter(Boolean)
            .join(' ')
            .trim();
          if (finalCombined) {
            setInput(finalCombined);
          }
          stopDictationCleanup();
        };

        speechRecRef.current = recognition;
        recognition.start();
        return;
      } catch {
        stopDictationCleanup();
      }
    }

    await startMediaRecorderDictation();
  };

  /* ======================== REAL-TIME LIVE VOICE ======================== */

  const clearQueuedOutputAudio = () => {
    activeOutputSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch {
        // ignore
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
    const additions: WidgetMessage[] = [];
    if (inText) {
      additions.push({
        id: `wm_${Date.now()}_vu`,
        role: 'user',
        text: inText,
        timestamp: new Date().toISOString(),
        viaVoice: true,
      });
      liveInTranscriptRef.current = '';
      setLiveInputDraft('');
    }
    if (outText) {
      additions.push({
        id: `wm_${Date.now()}_va`,
        role: 'assistant',
        text: outText,
        timestamp: new Date().toISOString(),
        viaVoice: true,
      });
      liveOutTranscriptRef.current = '';
      setLiveOutputDraft('');
    }
    if (additions.length > 0) {
      persistMessages([...messagesRef.current, ...additions]);
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
      liveMicStreamRef.current.getTracks().forEach((trTrack) => trTrack.stop());
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
          'Brauzer mikrofonni qo‘llamaydi.',
          'Микрофон недоступен в этом браузере.',
          'Microphone unavailable in this browser.'
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
        mode: 'general',
        voice: voiceName,
      });
      if (selectedCaseId) params.set('caseId', selectedCaseId);

      const ws = new WebSocket(`${wsProto}//${window.location.host}/ws/ai-live?${params.toString()}`);
      wsRef.current = ws;

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
            logActivity('ai', `Widget live voice (${voiceName})`);
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
            setLiveError(msg.message || 'Live voice error.');
            setLiveStatus('error');
          } else if (msg.type === 'closed') {
            stopLiveVoice();
          }
        } catch {
          // ignore
        }
      };

      ws.onerror = () => {
        liveStatusRef.current = 'error';
        setLiveError(
          tr(
            lang,
            'Ovozli WebSocket ulanish xatosi.',
            'Ошибка WebSocket-соединения голосового канала.',
            'Live voice WebSocket error.'
          )
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
        tr(
          lang,
          'Mikrofon yoki jonli audio ulanishini ishga tushirib bo‘lmadi.',
          'Не удалось получить доступ к микрофону или открыть аудиоканал.',
          'Failed to initialize microphone or live audio.'
        )
      );
      setLiveStatus('error');
    }
  };

  /* ======================== TEXT Q&A CHAT ======================== */

  const sendTextMessage = async (overridePrompt?: string) => {
    if (isRecording) {
      stopDictationCleanup();
    }
    const textToSend = (overridePrompt ?? input).trim();
    if (!textToSend || sending) return;
    if (!aiConfigured) {
      onToast(
        tr(
          lang,
          'AI xizmati hozircha sozlanmagan',
          'ИИ-сервис не настроен на сервере',
          'AI service is not configured on the server'
        )
      );
      return;
    }

    const userMsg: WidgetMessage = {
      id: `wm_${Date.now()}_u`,
      role: 'user',
      text: textToSend,
      timestamp: new Date().toISOString(),
    };
    const nextHistory = [...messagesRef.current, userMsg];
    persistMessages(nextHistory);
    if (!overridePrompt) setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          lang,
          mode: 'qa',
          caseId: selectedCaseId || undefined,
          message: textToSend,
          history: messagesRef.current.slice(-10).map((m) => ({
            role: m.role,
            text: m.text,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onToast(
          data?.message ||
            tr(lang, 'AI javobida xatolik', 'Ошибка ответа ИИ', 'AI response error')
        );
        return;
      }

      const replyId = `wm_${Date.now()}_a`;
      const replyText = String(data.reply || '');
      appendMessage({
        id: replyId,
        role: 'assistant',
        text: replyText,
        timestamp: new Date().toISOString(),
      });
      logActivity('ai', `Quick widget QA: ${textToSend.slice(0, 40)}`);

      if (autoSpeak && replyText) {
        void speakMessage(replyId, replyText);
      }
    } catch {
      onToast(
        tr(
          lang,
          'AI serveriga ulanib bo‘lmadi',
          'Не удалось связаться с ИИ-сервером',
          'Unable to reach AI server'
        )
      );
    } finally {
      setSending(false);
    }
  };

  if (hidden) return null;

  const quickPrompts = [
    tr(
      lang,
      'JK 169 / 278-modda bo‘yicha hodisani qanday malakalash kerak?',
      'Как квалифицировать инцидент по ст. 169 / 278 УК РУз?',
      'How should I qualify this incident under Art. 169 / 278 CC RUz?'
    ),
    tr(
      lang,
      'Raqamli dalillarni olish va SHA-256 muhrlash ketma-ketligini bering',
      'Пошаговый порядок фиксации цифровых улик и хэша SHA-256',
      'Step-by-step protocol for seizing digital evidence & SHA-256 sealing'
    ),
    tr(
      lang,
      'Kompyuter-texnik ekspertiza uchun namunaviy savollar tuzib bering',
      'Составь перечень вопросов для компьютерно-технической экспертизы',
      'Draft forensic examination questions for a mobile/PC device'
    ),
  ];

  const liveActive = liveStatus === 'active' || liveStatus === 'connecting';

  return (
    <div className="noprint">
      {/* Expanded Floating AI Drawer */}
      {open && (
        <section
          aria-label={tr(lang, 'Tezkor AI yordamchi', 'Быстрый ИИ-ассистент', 'Quick AI Assistant')}
          className="fixed right-5 bottom-20 z-40 flex w-[395px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--panel2)] px-3.5 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--accent)]">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-extrabold tracking-wide text-[var(--text)]">
                  <span>KIBER AI</span>
                  <span
                    className={`inline-block h-1.5 w-1.5 rounded-full ${
                      aiConfigured ? 'bg-[var(--ok)]' : 'bg-[var(--orange)]'
                    }`}
                  />
                </div>
                <div className="truncate text-[10px] text-[var(--muted)]">
                  {liveActive
                    ? tr(lang, 'Jonli ovozli rejim', 'Голосовой режим активен', 'Live voice active')
                    : tr(lang, 'Tezkor ishchi maslahatchi', 'Оперативный консультант', 'Operational advisor')}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (liveActive) {
                    stopLiveVoice();
                    setVoiceModeOpen(false);
                  } else {
                    void startLiveVoice();
                  }
                }}
                title={
                  liveActive
                    ? tr(lang, 'Ovozli aloqani tugatish', 'Завершить голосовой режим', 'End Voice Mode')
                    : tr(lang, 'Ovozli rejimni yoqish', 'Включить голосовой режим', 'Start Voice Mode')
                }
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition-colors ${
                  liveActive
                    ? 'border-[var(--red)] bg-[var(--red)]/15 text-[var(--red)]'
                    : 'border-[var(--accent)]/50 bg-[var(--accent-soft)] text-[var(--accent)] hover:border-[var(--accent)]'
                }`}
              >
                {liveActive ? <PhoneOff className="h-3.5 w-3.5" /> : <PhoneCall className="h-3.5 w-3.5" />}
                <span>{tr(lang, 'Ovoz', 'Голос', 'Voice')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  stopLiveVoice();
                  setOpen(false);
                  onNavigate('ai');
                }}
                title={tr(lang, 'To‘liq AI laboratoriyani ochish', 'Открыть полный ИИ-центр', 'Open full AI Lab')}
                className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-1.5 text-[var(--secondary-text)] hover:border-[var(--accent)] hover:text-[var(--text)]"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </button>

              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    stopAudioPlayback();
                    persistMessages([]);
                  }}
                  title={tr(lang, 'Tarixni tozalash', 'Очистить диалог', 'Clear chat')}
                  className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-1.5 text-[var(--secondary-text)] hover:border-[var(--red)] hover:text-[var(--red)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  stopLiveVoice();
                  setVoiceModeOpen(false);
                  setOpen(false);
                }}
                aria-label={tr(lang, 'Yopish', 'Закрыть', 'Close')}
                className="rounded-lg border border-[var(--line)] bg-[var(--panel)] p-1.5 text-[var(--secondary-text)] hover:border-[var(--accent)] hover:text-[var(--text)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Case Context Selector */}
          <div className="flex items-center gap-2 border-b border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-[11px]">
            <Briefcase className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
            <select
              value={selectedCaseId}
              onChange={(e) => setSelectedCaseId(e.target.value)}
              aria-label={tr(lang, 'Ish konteksti', 'Контекст дела', 'Case context')}
              className="min-w-0 flex-1 truncate rounded border border-[var(--line)] bg-[var(--input-bg)] px-2 py-1 text-[11px] font-semibold text-[var(--text)]"
            >
              <option value="">
                {tr(lang, 'Umumiy ishchi kontekst', 'Общий рабочий контекст', 'General operational context')}
              </option>
              {accessibleCases.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.caseNumber} — {localizeRecordText(c.title, lang)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setAutoSpeak((v) => !v)}
              title={tr(
                lang,
                'Javoblarni avtomatik ovozda o‘qish',
                'Авто-озвучивание ответов',
                'Auto-speak replies'
              )}
              className={`rounded border p-1 transition-colors ${
                autoSpeak
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                  : 'border-[var(--line)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {autoSpeak ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            </button>
          </div>

          {/* Live Voice Mode Strip */}
          {voiceModeOpen && (
            <div className="border-b border-[var(--accent)]/30 bg-[var(--accent-soft)]/40 px-3.5 py-2.5 text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Radio
                    className={`h-4 w-4 ${
                      liveStatus === 'active'
                        ? 'animate-pulse text-[var(--ok)]'
                        : liveStatus === 'connecting'
                          ? 'animate-spin text-[var(--accent)]'
                          : 'text-[var(--red)]'
                    }`}
                  />
                  <span className="font-bold text-[var(--text)]">
                    {liveStatus === 'connecting'
                      ? tr(lang, 'Ulanmoqda...', 'Подключение...', 'Connecting...')
                      : liveStatus === 'active'
                        ? liveAiSpeaking
                          ? tr(lang, 'AI gapirmoqda', 'ИИ говорит', 'AI speaking')
                          : liveMuted
                            ? tr(lang, 'Mikrofon o‘chiq', 'Микрофон выкл.', 'Mic muted')
                            : tr(lang, 'Tinglamoqda...', 'Слушаю...', 'Listening...')
                        : tr(lang, 'Ovozli kanal xatosi', 'Ошибка канала', 'Channel error')}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <select
                    value={voiceName}
                    onChange={(e) => setVoiceName(e.target.value as VoicePersona)}
                    disabled={liveActive}
                    className="rounded border border-[var(--line)] bg-[var(--panel)] px-1.5 py-0.5 text-[10px] font-semibold"
                  >
                    {VOICE_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setLiveMuted((m) => !m)}
                    className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${
                      liveMuted
                        ? 'border-[var(--orange)] bg-[var(--orange)]/15 text-[var(--orange)]'
                        : 'border-[var(--line)] bg-[var(--panel)] text-[var(--text)]'
                    }`}
                  >
                    {liveMuted ? <MicOff className="h-3 w-3" /> : <Mic className="h-3 w-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopLiveVoice();
                      setVoiceModeOpen(false);
                    }}
                    className="rounded border border-[var(--red)]/60 bg-[var(--red)]/15 px-2 py-0.5 text-[10px] font-bold text-[var(--red)]"
                  >
                    {tr(lang, 'Tugatish', 'Стоп', 'End')}
                  </button>
                </div>
              </div>

              {/* Audio RMS Visualizer */}
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--panel)]">
                <div
                  className="h-full rounded-full bg-[var(--accent)] transition-all duration-75"
                  style={{ width: `${Math.round(Math.max(6, liveLevel * 100))}%` }}
                />
              </div>

              {liveError && <p className="mt-1.5 text-[11px] text-[var(--red)]">{liveError}</p>}
              {(liveInputDraft || liveOutputDraft) && (
                <div className="mt-2 space-y-1 rounded-lg border border-[var(--line)] bg-[var(--panel)] px-2.5 py-1.5 text-[11px]">
                  {liveInputDraft && (
                    <div className="text-[var(--secondary-text)]">
                      <span className="font-bold text-[var(--accent)]">
                        {tr(lang, 'Siz: ', 'Вы: ', 'You: ')}
                      </span>
                      {liveInputDraft}
                    </div>
                  )}
                  {liveOutputDraft && (
                    <div className="text-[var(--text)]">
                      <span className="font-bold text-[var(--ok)]">AI: </span>
                      {liveOutputDraft}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Messages Viewport */}
          <div className="h-[290px] space-y-2.5 overflow-y-auto p-3">
            {messages.length === 0 ? (
              <div className="space-y-2.5 py-2">
                <div className="rounded-xl border border-[var(--line)] bg-[var(--panel2)]/70 p-3 text-xs text-[var(--secondary-text)]">
                  <div className="mb-1 flex items-center gap-1.5 font-bold text-[var(--text)]">
                    <Sparkles className="h-3.5 w-3.5 text-[var(--accent)]" />
                    <span>
                      {tr(
                        lang,
                        'Tezkor tergov maslahatchisi',
                        'Оперативный ИИ-помощник по расследованиям',
                        'Rapid Investigation Assistant'
                      )}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {tr(
                      lang,
                      'JK moddalari, raqamli dalillar, OSINT yoki ekspertiza bo‘yicha yozing yoki ovozli rejimni yoqing.',
                      'Задайте вопрос по квалификации, цифровым уликам, OSINT или экспертизам — текстом или в голосовом режиме.',
                      'Ask about qualification, digital evidence, OSINT, or forensic exams — via text or live voice mode.'
                    )}
                  </p>
                </div>

                <div className="space-y-1.5">
                  {quickPrompts.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => void sendTextMessage(q)}
                      className="block w-full rounded-lg border border-[var(--line)] bg-[var(--panel2)] px-2.5 py-2 text-left text-[11px] font-medium text-[var(--secondary-text)] transition-colors hover:border-[var(--accent)] hover:text-[var(--text)]"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-xl border px-3 py-2 text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'border-[var(--accent)]/40 bg-[var(--accent-soft)] text-[var(--text)]'
                        : 'border-[var(--line)] bg-[var(--panel2)] text-[var(--text)]'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.text}</div>
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-[var(--muted)]">
                      <span>
                        {m.viaVoice && '🎙 '}
                        {new Date(m.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                      {m.role === 'assistant' && (
                        <button
                          type="button"
                          onClick={() => void speakMessage(m.id, m.text)}
                          disabled={ttsLoadingId === m.id}
                          className="inline-flex items-center gap-1 font-semibold text-[var(--accent)] hover:underline"
                        >
                          {ttsLoadingId === m.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : playingMsgId === m.id ? (
                            <Square className="h-2.5 w-2.5" />
                          ) : (
                            <Volume2 className="h-3 w-3" />
                          )}
                          <span>
                            {playingMsgId === m.id
                              ? tr(lang, 'To‘xtatish', 'Стоп', 'Stop')
                              : tr(lang, 'Tinglash', 'Озвучить', 'Listen')}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}

            {sending && (
              <div className="flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--panel2)] px-3 py-2 text-xs text-[var(--secondary-text)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent)]" />
                <span>{tr(lang, 'Tahlil qilinmoqda...', 'Анализ запроса...', 'Analyzing...')}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Composer */}
          <div className="border-t border-[var(--line)] bg-[var(--panel2)] p-2.5">
            {!aiConfigured && (
              <div className="mb-2 rounded-md border border-[var(--orange)]/40 bg-[var(--orange)]/10 px-2 py-1 text-[10px] text-[var(--orange)]">
                {tr(
                  lang,
                  'GEMINI_API_KEY sozlanmagan.',
                  'Ключ GEMINI_API_KEY не настроен.',
                  'GEMINI_API_KEY not configured.'
                )}
              </div>
            )}
            {isRecording && (
              <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-[var(--red)]/40 bg-[var(--red)]/10 px-2.5 py-1.5 text-[11px]">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[var(--red)]" />
                  <span className="truncate text-[var(--text)]">
                    {interimTranscript
                      ? interimTranscript
                      : tr(
                          lang,
                          'Gapiring, matn avtomatik kiritiladi...',
                          'Говорите — речь распознаётся в текст...',
                          'Speak now — transcribing live...'
                        )}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-[10px] font-bold text-[var(--red)]">
                  {dictationSec}s
                </span>
              </div>
            )}
            <div className="flex items-end gap-1.5">
              <button
                type="button"
                onClick={() => void toggleDictation()}
                disabled={isTranscribing}
                aria-pressed={isRecording}
                title={
                  isRecording
                    ? tr(lang, 'Yozishni to‘xtatish', 'Остановить распознавание', 'Stop speech recognition')
                    : tr(lang, 'Mikrofon (nutqni matnga)', 'Микрофон (речь в текст)', 'Microphone (speech-to-text)')
                }
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                  isRecording
                    ? 'animate-pulse border-[var(--red)] bg-[var(--red)]/15 text-[var(--red)]'
                    : 'border-[var(--line)] bg-[var(--panel)] text-[var(--secondary-text)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                }`}
              >
                {isTranscribing ? (
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--accent)]" />
                ) : isRecording ? (
                  <MicOff className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </button>

              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendTextMessage();
                  }
                }}
                placeholder={tr(
                  lang,
                  'Ish bo‘yicha savol yozing...',
                  'Задайте вопрос по работе...',
                  'Ask an investigative question...'
                )}
                className="max-h-24 min-h-[36px] flex-1 resize-none rounded-lg border border-[var(--line)] bg-[var(--input-bg)] px-2.5 py-2 text-xs text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
              />

              <button
                type="button"
                onClick={() => void sendTextMessage()}
                disabled={!input.trim() || sending}
                aria-label={tr(lang, 'Yuborish', 'Отправить', 'Send')}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-ink)] transition-opacity disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Fixed Bottom-Right AI Launcher Icon */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={tr(lang, 'AI yordamchini ochish', 'Открыть ИИ-ассистента', 'Open AI Assistant')}
        title={tr(
          lang,
          'AI yordamchi (matn va ovozli rejim)',
          'ИИ-ассистент (чат и голосовой режим)',
          'AI Assistant (Chat & Voice Mode)'
        )}
        className={`fixed right-5 bottom-5 z-40 flex h-12 items-center gap-2 rounded-full border px-3.5 shadow-xl transition-all hover:-translate-y-0.5 ${
          open || liveActive
            ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)]'
            : 'border-[var(--accent)]/60 bg-[var(--panel)] text-[var(--text)] hover:border-[var(--accent)] hover:bg-[var(--panel2)]'
        }`}
      >
        <div className="relative flex items-center justify-center">
          <Bot className="h-5 w-5" />
          <span
            className={`absolute -top-1 -right-1 h-2 w-2 rounded-full ${
              liveActive
                ? 'animate-ping bg-[var(--ok)]'
                : aiConfigured
                  ? 'bg-[var(--ok)]'
                  : 'bg-[var(--orange)]'
            }`}
          />
        </div>
        <span className="hidden text-xs font-extrabold tracking-wide sm:inline">
          {liveActive ? tr(lang, 'Jonli', 'Эфир', 'Live') : 'AI'}
        </span>
      </button>
    </div>
  );
};
