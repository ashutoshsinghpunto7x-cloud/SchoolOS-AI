import { useCallback, useEffect, useRef, useState } from 'react';
import { Sparkles, Send, X, Mic, Square, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { extractErrorMessage } from '@/services/api';
import { usePrincipalAssistant } from '../hooks/usePrincipalAssistant';
import { useVoice, type VoiceLang } from '../hooks/useVoice';
import { ChatMessage } from './ChatMessage';

// Floating AI assistant for the Principal. Mounted once in AppLayout so it
// survives page changes — which is what lets a spoken "open leave requests"
// navigate away and still keep the conversation (and the mic) available.

const SUGGESTIONS = [
  'Open leave requests',
  "Today's attendance",
  'How many students are absent?',
  'Fee collection summary',
  'Show school timetable',
  'Schedule a staff meeting tomorrow at 10 AM',
];

const SUGGESTIONS_HI = [
  'छुट्टी के अनुरोध खोलो',
  'आज की उपस्थिति',
  'आज कितने छात्र अनुपस्थित हैं?',
  'फीस का सारांश बताओ',
  'टाइमटेबल दिखाओ',
  'कल सुबह 10 बजे स्टाफ मीटिंग रखो',
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
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [speakReplies, setSpeakReplies] = useState(() => readStored(STORAGE_SPEAK) === '1');
  const [lang, setLang] = useState<VoiceLang>(() => (readStored(STORAGE_LANG) === 'hi-IN' ? 'hi-IN' : 'en-IN'));
  const scrollRef = useRef<HTMLDivElement>(null);

  // Replies to a spoken command are always read back; typed ones only if the speaker toggle is on.
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
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  // Stop listening/speaking when the panel is closed.
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
    'h-7 min-w-7 px-1.5 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer text-[11px] font-bold';

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="SchoolOS AI assistant"
          className="fixed bottom-24 right-4 sm:right-6 z-50 w-[380px] max-w-[calc(100vw-24px)] h-[540px] max-h-[calc(100vh-130px)] bg-white rounded-[24px] shadow-[0_20px_50px_rgba(27,42,78,0.28)] border border-[#E8E2D6] flex flex-col overflow-hidden font-['DM_Sans','Plus_Jakarta_Sans',sans-serif]"
        >
          <div className="px-4 py-3.5 bg-gradient-to-r from-[#1B2A4E] to-[#254A9A] text-white flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-[#F5B332]" />
              <h3 className="text-[15px] font-bold m-0">SchoolOS AI</h3>
            </div>
            <div className="flex items-center gap-1.5">
              {voice.supported && (
                <button
                  type="button"
                  onClick={toggleLang}
                  className={headerBtn}
                  aria-label={`Voice language: ${lang === 'en-IN' ? 'English' : 'Hindi'}. Tap to switch`}
                  title="Voice language"
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
                  aria-label={speakReplies ? 'Turn off spoken replies' : 'Turn on spoken replies'}
                  title={speakReplies ? 'Spoken replies on' : 'Spoken replies off'}
                >
                  {speakReplies ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
              )}
              <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" className={headerBtn}>
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div ref={scrollRef} className="p-4 flex-1 overflow-y-auto space-y-3 min-h-0 bg-[#FAF8F5]">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-[13px] text-[#55607A] m-0">
                  {voice.supported
                    ? (lang === 'hi-IN'
                      ? 'माइक दबाकर बोलिए — कोई स्क्रीन खोलिए, आँकड़े पूछिए या कुछ शेड्यूल कराइए।'
                      : 'Tap the mic and tell me what to do — open a screen, check numbers, or schedule something. Tap EN to switch to Hindi.')
                    : 'Ask me to open a screen, check numbers, or schedule something.'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(lang === 'hi-IN' ? SUGGESTIONS_HI : SUGGESTIONS).map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={isLoading}
                      onClick={() => send(s)}
                      className="px-3 py-1.5 rounded-full text-[12px] font-medium bg-white border border-[#E8E2D6] text-[#1B2A4E] hover:bg-[#F3EEE3] cursor-pointer disabled:opacity-50"
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
            {isLoading && <p className="text-[12px] text-[#55607A] m-0">Thinking…</p>}
            {error && <p className="text-[12px] text-red-600 m-0">{extractErrorMessage(error)}</p>}
            {voice.voiceError && <p className="text-[12px] text-red-600 m-0">{voice.voiceError}</p>}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="p-3 bg-white border-t border-[#E8E2D6] flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={voice.listening ? voice.interim : input}
              onChange={(e) => setInput(e.target.value)}
              readOnly={voice.listening}
              placeholder={voice.listening ? 'Listening… speak now' : 'Type or tap the mic…'}
              disabled={isLoading}
              aria-label="Message the assistant"
              className="flex-1 min-w-0 bg-[#F3EEE3] rounded-full px-3.5 py-2 text-[13px] text-[#1B2A4E] outline-none"
            />
            {voice.supported && (
              <button
                type="button"
                onClick={onMic}
                disabled={isLoading}
                aria-label={voice.listening ? 'Stop listening' : 'Speak a command'}
                aria-pressed={voice.listening}
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 transition-colors',
                  voice.listening ? 'bg-red-500 text-white animate-pulse' : 'bg-[#F5B332] text-[#1B2A4E] hover:bg-[#e9a622]',
                )}
              >
                {voice.listening ? <Square className="w-3.5 h-3.5 fill-current" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
            <button
              type="submit"
              disabled={!input.trim() || isLoading || voice.listening}
              aria-label="Send"
              className="w-9 h-9 rounded-full bg-[#1B2A4E] text-white flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Ask AI Assistant"
        title="Ask AI Assistant"
        className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-tr from-[#1B2A4E] to-[#254A9A] text-white flex items-center justify-center shadow-[0_8px_24px_rgba(27,42,78,0.28)] hover:scale-105 active:scale-95 transition-all cursor-pointer"
      >
        <Sparkles className="w-6 h-6 text-[#F5B332]" />
      </button>
    </>
  );
};
