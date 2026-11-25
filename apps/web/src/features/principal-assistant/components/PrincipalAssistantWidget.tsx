import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowUp, X, Mic, Square, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { extractErrorMessage } from '@/services/api';
import { usePrincipalAssistant } from '../hooks/usePrincipalAssistant';
import { useVoice, type VoiceLang } from '../hooks/useVoice';
import { ChatMessage } from './ChatMessage';
import {
  CompanionBuddy,
  SIRI_ORB_SIZE,
  SiriMiniOrb,
  useStaticOrbBottom,
} from '@/features/companion/CompanionBuddy';
import { companionConfigFor } from '@/features/companion/companionConfigs';

const BUDDY_CONFIG = companionConfigFor('principal')!;

const SUGGESTIONS = [
  "Today's attendance",
  'Open leave requests',
  'Absent students today',
  'Fee collection summary',
  'School timetable',
];

const SUGGESTIONS_HI = [
  'आज की उपस्थिति',
  'छुट्टी के अनुरोध खोलो',
  'आज कितने छात्र अनुपस्थित हैं?',
  'फीस का सारांश',
  'टाइमटेबल दिखाओ',
];

const STORAGE_SPEAK = 'principalAssistant.speakReplies';
const STORAGE_LANG = 'principalAssistant.voiceLang';

function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable — preference just won't persist */
  }
}

export const PrincipalAssistantWidget = () => {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const orbBottom = useStaticOrbBottom(BUDDY_CONFIG);

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [speakReplies, setSpeakReplies] = useState(() => readStored(STORAGE_SPEAK) === '1');
  const [lang, setLang] = useState<VoiceLang>(() => (readStored(STORAGE_LANG) === 'hi-IN' ? 'hi-IN' : 'en-IN'));
  const scrollRef = useRef<HTMLDivElement>(null);

  const voiceSentRef = useRef(false);
  const speakRef = useRef<(text: string) => void>(() => {});
  const sendRef = useRef<(text: string) => void>(() => {});

  const onAssistantText = useCallback(
    (text: string) => {
      if (voiceSentRef.current || speakReplies) speakRef.current(text);
      voiceSentRef.current = false;
    },
    [speakReplies],
  );

  const { messages, sendMessage, onEditField, onApprove, onCancel, isLoading, error } = usePrincipalAssistant({
    onAssistantText,
  });

  const voice = useVoice({
    lang,
    onFinalTranscript: (text) => {
      voiceSentRef.current = true;
      sendRef.current(text);
    },
  });
  speakRef.current = voice.speak;

  const send = useCallback(
    (text?: string) => {
      const value = (text ?? input).trim();
      if (!value || isLoading) return;
      if (text === undefined) voiceSentRef.current = false;
      sendMessage(value);
      setInput('');
    },
    [input, isLoading, sendMessage],
  );
  sendRef.current = send;

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [open, messages, isLoading, voice.interim]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (!target) return;
      if (panelRef.current?.contains(target) || target.closest('[data-siri-orb="true"]')) return;
      setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      voice.stopListening();
      voice.cancelSpeech();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggleSpeak = () => {
    const next = !speakReplies;
    setSpeakReplies(next);
    writeStored(STORAGE_SPEAK, next ? '1' : '0');
    if (!next) voice.cancelSpeech();
  };
  const toggleLang = () => {
    const next: VoiceLang = lang === 'en-IN' ? 'hi-IN' : 'en-IN';
    setLang(next);
    writeStored(STORAGE_LANG, next);
  };
  const onMic = () => (voice.listening ? voice.stopListening() : voice.startListening());

  const headerBtn =
    'h-7 min-w-7 px-2 rounded-full text-[#55607A] hover:text-[#1B2A4E] hover:bg-[#F5F1E8] flex items-center justify-center cursor-pointer text-[11px] font-semibold transition-colors';

  return (
    <>
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-labelledby={titleId}
          style={{ bottom: `calc(${orbBottom + SIRI_ORB_SIZE + 12}px + env(safe-area-inset-bottom, 0px))` }}
          className="fixed right-4 sm:right-6 z-50 w-[374px] max-w-[calc(100vw-32px)] h-[502px] max-h-[calc(100vh-120px)] p-[2px] rounded-[22px] bg-gradient-to-br from-[#1B2A4E] via-[#254A9A] to-[#D9822B] shadow-[0_14px_42px_rgba(27,42,78,0.18)] flex flex-col font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]"
        >
          <div className="flex-1 min-h-0 bg-white rounded-[20px] flex flex-col overflow-hidden">
          {/* Minimalist White Header */}
          <div className="px-4 py-3 bg-white border-b border-[#EFEAE0] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <SiriMiniOrb />
              <h2 id={titleId} className="text-[14px] font-semibold text-[#1B2A4E] tracking-tight m-0">
                Assistant
              </h2>
            </div>
            <div className="flex items-center gap-1">
              {voice.supported && (
                <button
                  type="button"
                  onClick={toggleLang}
                  className={cn(headerBtn, 'border border-[#E8E2D6] bg-[#FBF8F3]')}
                  aria-label="Switch voice language"
                >
                  {lang === 'en-IN' ? 'EN' : 'हिं'}
                </button>
              )}
              {voice.ttsSupported && (
                <button
                  type="button"
                  onClick={toggleSpeak}
                  className={headerBtn}
                  aria-pressed={speakReplies}
                  aria-label="Spoken replies"
                >
                  {speakReplies ? <Volume2 className="w-3.5 h-3.5 text-[#1B2A4E]" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close assistant"
                className="h-7 w-7 rounded-full text-[#55607A] hover:text-[#1B2A4E] hover:bg-[#F5F1E8] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Minimalist Chat Stream */}
          <div ref={scrollRef} className="p-4 flex-1 overflow-y-auto space-y-3 min-h-0 bg-[#FBF8F3]/60">
            {messages.length === 0 && (
              <div className="space-y-3 pt-1">
                <p className="text-[13px] text-[#55607A] m-0 leading-relaxed">
                  {lang === 'hi-IN'
                    ? 'कुछ भी पूछिए, स्क्रीन खोलिए या शेड्यूल कीजिए।'
                    : 'Ask a question, jump to any screen, or schedule an update.'}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(lang === 'hi-IN' ? SUGGESTIONS_HI : SUGGESTIONS).map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={isLoading}
                      onClick={() => send(s)}
                      className="px-3 py-1.5 rounded-full text-[12px] font-medium bg-white border border-[#E8E2D6] text-[#1B2A4E] hover:bg-[#F5F1E8] transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m) => (
              <ChatMessage
                key={m.id}
                message={m}
                onEditField={onEditField}
                onApprove={onApprove}
                onCancel={onCancel}
                onQuickReply={send}
              />
            ))}
            {isLoading && (
              <div className="inline-flex items-center gap-1.5 rounded-2xl bg-white border border-[#E8E2D6] px-3.5 py-2 text-[12px] text-[#55607A]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1B2A4E]/60 animate-pulse" />
                Thinking…
              </div>
            )}
            {error && <p className="text-[12px] text-red-600 m-0">{extractErrorMessage(error)}</p>}
            {voice.voiceError && <p className="text-[12px] text-red-600 m-0">{voice.voiceError}</p>}
          </div>

          {/* Minimalist Pill Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="p-2.5 bg-white border-t border-[#EFEAE0] shrink-0"
          >
            <div className="flex items-center gap-1 bg-[#FBF8F3] border border-[#E8E2D6] focus-within:border-[#1B2A4E]/40 focus-within:bg-white rounded-full pl-3.5 pr-1.5 py-1 transition-colors">
              <input
                type="text"
                autoFocus
                value={voice.listening ? voice.interim : input}
                onChange={(e) => setInput(e.target.value)}
                readOnly={voice.listening}
                placeholder={voice.listening ? 'Listening…' : 'Message assistant…'}
                disabled={isLoading}
                aria-label="Message the assistant"
                className="flex-1 min-w-0 bg-transparent py-1 text-[13px] text-[#1B2A4E] placeholder:text-[#8A93A8] outline-none"
              />
              {voice.supported && (
                <button
                  type="button"
                  onClick={onMic}
                  disabled={isLoading}
                  aria-label="Voice input"
                  aria-pressed={voice.listening}
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 transition-colors',
                    voice.listening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'text-[#55607A] hover:text-[#1B2A4E] hover:bg-[#EFEAE0]',
                  )}
                >
                  {voice.listening ? <Square className="w-3 h-3 fill-current" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
              )}
              <button
                type="submit"
                disabled={!input.trim() || isLoading || voice.listening}
                aria-label="Send"
                className="w-7 h-7 rounded-full bg-[#1B2A4E] text-white flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-25 transition-opacity"
              >
                <ArrowUp className="w-3.5 h-3.5" strokeWidth={2.2} />
              </button>
            </div>
          </form>
          </div>
        </div>
      )}
      <CompanionBuddy
        config={BUDDY_CONFIG}
        open={open}
        thinking={isLoading}
        label="SchoolOS Assistant"
        onActivate={() => setOpen((v) => !v)}
      />
    </>
  );
};
