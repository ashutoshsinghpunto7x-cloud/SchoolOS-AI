import { useCallback, useEffect, useRef, useState } from 'react';

// Browser-native voice I/O (Web Speech API) — no extra service or cost. Speech
// recognition works in Chrome/Edge/Safari; where it is missing `supported` is
// false and the UI hides the mic. Text-to-speech is used to read replies aloud.

export type VoiceLang = 'en-IN' | 'hi-IN';

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone access is blocked. Allow the microphone in your browser settings and try again.',
  'service-not-allowed': 'Microphone access is blocked. Allow the microphone in your browser settings and try again.',
  'no-speech': "I didn't hear anything. Tap the mic and try again.",
  'audio-capture': 'No microphone was found on this device.',
  network: 'Voice recognition needs an internet connection.',
};

interface UseVoiceOptions {
  lang: VoiceLang;
  /** Called once with the final transcript when the user stops speaking. */
  onFinalTranscript: (text: string) => void;
}

export const useVoice = ({ lang, onFinalTranscript }: UseVoiceOptions) => {
  const supported = getRecognitionCtor() !== null;
  const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef('');
  const onFinalRef = useRef(onFinalTranscript);
  onFinalRef.current = onFinalTranscript;

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const startListening = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    // Don't talk over ourselves — silence any reply that is still being read.
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    recognitionRef.current?.abort();
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;
    finalRef.current = '';
    setInterim('');
    setVoiceError(null);

    rec.onresult = (e) => {
      let interimText = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript;
        else interimText += r[0].transcript;
      }
      setInterim((finalRef.current + interimText).trim());
    };
    rec.onerror = (e) => {
      if (e.error === 'aborted') return;
      setVoiceError(ERROR_MESSAGES[e.error] ?? 'Voice input failed. Please try again.');
    };
    rec.onend = () => {
      setListening(false);
      setInterim('');
      const text = finalRef.current.trim();
      finalRef.current = '';
      if (text) onFinalRef.current(text);
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  }, [lang]);

  const speak = useCallback(
    (text: string) => {
      if (!ttsSupported || !text) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      // Devanagari text is read with a Hindi voice regardless of the mic language.
      utter.lang = /[ऀ-ॿ]/.test(text) ? 'hi-IN' : lang;
      utter.rate = 1;
      window.speechSynthesis.speak(utter);
    },
    [lang, ttsSupported],
  );

  const cancelSpeech = useCallback(() => {
    if (ttsSupported) window.speechSynthesis.cancel();
  }, [ttsSupported]);

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    },
    [],
  );

  return {
    supported,
    ttsSupported,
    listening,
    interim,
    voiceError,
    clearVoiceError: () => setVoiceError(null),
    startListening,
    stopListening,
    speak,
    cancelSpeech,
  };
};
