import { useEffect, useRef, useState } from 'react';
import { Camera, Mic, Square, X, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useExtractMarksFromImage, useExtractMarksFromVoice, useExtractMarksFromTranscript } from '../hooks/useMarks';
import type { MarksBatchTarget, MarksExtractionResult, ExtractedMarksRow } from '@schoolos/types';

interface Props {
  target: MarksBatchTarget;
  onApply: (result: MarksExtractionResult) => void;
  onClose: () => void;
}

// Minimal shape of the Web Speech API — not part of TS's DOM lib.
interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: { transcript: string };
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

// A matched row with its scores shown inline and editable — lets the teacher
// fix a misheard number on the spot instead of waiting to correct it later
// in the full entry grid.
function EditableExtractedRow({
  row, onEditScore,
}: {
  row: ExtractedMarksRow;
  onEditScore: (studentId: string, componentName: string, value: number | undefined) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs bg-emerald-50 dark:bg-emerald-500/10 rounded-lg px-2.5 py-1.5">
      <span className="flex items-center gap-1.5 text-gray-700 dark:text-white/80 font-medium truncate min-w-0">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
        <span className="truncate">{row.fullName}</span>
      </span>
      <div className="flex items-center gap-1.5 shrink-0">
        {row.componentScores.filter((c) => c.score !== undefined).map((c) => (
          <label key={c.componentName} className="flex items-center gap-1">
            <span className="text-[10px] text-gray-400 dark:text-white/40">{c.componentName}</span>
            <input
              type="number"
              inputMode="decimal"
              value={c.score ?? ''}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onEditScore(row.studentId, c.componentName, e.target.value === '' ? undefined : Number(e.target.value))}
              className="w-12 h-6 px-1 rounded border border-gray-200 dark:border-white/10 bg-white dark:bg-white/10 text-[11px] text-center text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30"
            />
          </label>
        ))}
      </div>
    </div>
  );
}

// While the teacher keeps talking, the Web Speech API fires "interim" result
// events multiple times a second. A debounce that resets on every event would
// never fire during continuous speech — nothing would ever appear to update.
// A fixed poll interval instead checks periodically for new finalized text,
// independent of how often (or rarely) speech pauses.
const LIVE_EXTRACT_POLL_MS = 2200;
// Short timeout for live polls — this is a best-effort preview, not the save
// itself, so a slow response should fail fast and free up the next poll
// rather than sit on the default 60s request timeout and make the panel
// look frozen.
const LIVE_EXTRACT_TIMEOUT_MS = 12_000;

export function AiCaptureModal({ target, onApply, onClose }: Props) {
  const [tab, setTab] = useState<'photo' | 'voice'>('photo');
  const [result, setResult] = useState<MarksExtractionResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Live dictation (Web Speech API) — used when supported so the teacher sees
  // captions and matched rows fill in as they talk, in English/Latin script.
  const speechSupported = useRef(Boolean(getSpeechRecognitionCtor())).current;
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef('');
  const lastExtractedRef = useRef('');
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const extractSeqRef = useRef(0);
  // A plain ref, not transcriptMutation.isPending — the poll interval's
  // closure is created once when recording starts, so reading a value off
  // the (new-every-render) mutation object there would always see whatever
  // it was at that moment, never the live state. That silently let polls
  // pile up concurrently, which is what caused the panel to appear stuck.
  const extractingRef = useRef(false);
  const [liveCaption, setLiveCaption] = useState('');
  const [liveResult, setLiveResult] = useState<MarksExtractionResult | null>(null);
  const [finalizing, setFinalizing] = useState(false);
  const recordingRef = useRef(false);

  // Manual corrections the teacher types over an AI-read score — kept
  // separately so a fresh AI response (from more dictation) never silently
  // wipes out a fix that was just made by hand.
  const [overrides, setOverrides] = useState<Record<string, Record<string, number>>>({});
  const overridesRef = useRef(overrides);
  useEffect(() => { overridesRef.current = overrides; }, [overrides]);

  const imageMutation = useExtractMarksFromImage();
  const voiceMutation = useExtractMarksFromVoice();
  const transcriptMutation = useExtractMarksFromTranscript();
  const isBusy = imageMutation.isPending || voiceMutation.isPending;

  useEffect(() => () => {
    recognitionRef.current?.stop();
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
  }, []);

  async function handlePhotoSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const res = await imageMutation.mutateAsync({ target, file });
      setResult(res);
    } catch (err) {
      toast.error('Could not read the photo', { description: err instanceof Error ? err.message : undefined });
    }
  }

  function withOverrides(res: MarksExtractionResult): MarksExtractionResult {
    const current = overridesRef.current;
    if (Object.keys(current).length === 0) return res;
    return {
      ...res,
      extracted: res.extracted.map((row) => {
        const rowOverride = current[row.studentId];
        if (!rowOverride) return row;
        return {
          ...row,
          componentScores: row.componentScores.map((cs) => (
            rowOverride[cs.componentName] !== undefined
              ? { ...cs, score: rowOverride[cs.componentName], status: 'present' as const }
              : cs
          )),
        };
      }),
    };
  }

  function runLiveExtraction(final: boolean) {
    const transcript = finalTranscriptRef.current.trim();
    if (!transcript) return;
    if (!final && transcript === lastExtractedRef.current) return;
    if (!final) lastExtractedRef.current = transcript;
    const seq = ++extractSeqRef.current;
    if (!final) extractingRef.current = true;
    transcriptMutation.mutate(
      { target, transcript, timeoutMs: final ? undefined : LIVE_EXTRACT_TIMEOUT_MS },
      {
        onSuccess: (res) => {
          // Drop stale live responses that a later call has already superseded —
          // otherwise a slow response could overwrite newer results and look
          // like the panel "isn't updating".
          if (!final && seq !== extractSeqRef.current) return;
          const merged = withOverrides(res);
          if (final) setResult(merged); else setLiveResult(merged);
        },
        onError: (err) => {
          if (final) toast.error('Could not read the dictation', { description: err instanceof Error ? err.message : undefined });
          // A failed live poll just means we try again next tick with
          // whatever new speech has come in — no need to surface an error
          // for a background preview refresh.
        },
        onSettled: () => {
          if (final) setFinalizing(false); else extractingRef.current = false;
        },
      },
    );
  }

  function startSpeechRecognition() {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return false;
    finalTranscriptRef.current = '';
    lastExtractedRef.current = '';
    extractingRef.current = false;
    setLiveCaption('');
    setLiveResult(null);
    setOverrides({});
    setFinalizing(false);

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN'; // dictates in English/Latin script so names match the roster
    recognition.onresult = (e) => {
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i];
        if (chunk.isFinal) {
          finalTranscriptRef.current = `${finalTranscriptRef.current} ${chunk[0].transcript}`.trim();
        } else {
          interim += chunk[0].transcript;
        }
      }
      setLiveCaption(`${finalTranscriptRef.current} ${interim}`.trim());
    };
    recognition.onerror = (e) => {
      const error = (e as { error?: string })?.error;
      if (error === 'not-allowed' || error === 'service-not-allowed') {
        toast.error('Microphone access denied');
        setRecording(false);
      }
      // Other errors (no-speech, network blip, aborted) are transient —
      // onend fires right after and the restart logic below picks it back up.
    };
    recognition.onend = () => {
      // Some browsers end the session after a pause even while "recording" —
      // restart automatically unless the teacher explicitly stopped. A brief
      // delay avoids "recognition already started" errors some browsers throw
      // when start() is called again in the same tick as onend — which,
      // swallowed silently, would otherwise kill the session for good and
      // leave the UI looking stuck with a frozen caption.
      if (!recordingRef.current) return;
      setTimeout(() => {
        if (!recordingRef.current) return;
        try { recognition.start(); } catch { /* already running — fine */ }
      }, 250);
    };

    try {
      recognition.start();
    } catch {
      return false;
    }
    recognitionRef.current = recognition;
    pollTimerRef.current = setInterval(() => {
      if (extractingRef.current) return; // let the in-flight call finish first
      runLiveExtraction(false);
    }, LIVE_EXTRACT_POLL_MS);
    return true;
  }

  useEffect(() => { recordingRef.current = recording; }, [recording]);

  function editScore(list: 'live' | 'final', studentId: string, componentName: string, value: number | undefined) {
    setOverrides((prev) => {
      const rowNext = { ...(prev[studentId] ?? {}) };
      if (value === undefined) delete rowNext[componentName];
      else rowNext[componentName] = value;
      const next = { ...prev };
      if (Object.keys(rowNext).length === 0) delete next[studentId];
      else next[studentId] = rowNext;
      return next;
    });
    const patch = (res: MarksExtractionResult | null): MarksExtractionResult | null => {
      if (!res) return res;
      return {
        ...res,
        extracted: res.extracted.map((row) => (
          row.studentId !== studentId ? row : {
            ...row,
            componentScores: row.componentScores.map((cs) => (
              cs.componentName !== componentName ? cs : { ...cs, score: value, status: 'present' as const }
            )),
          }
        )),
      };
    };
    if (list === 'live') setLiveResult(patch); else setResult(patch);
  }

  async function startRecording() {
    setRecording(true);
    if (speechSupported && startSpeechRecognition()) {
      return; // live captions + incremental matching handle everything else
    }
    // Fallback for browsers without live speech recognition: record audio,
    // send it once stopped, translated to English server-side by Whisper.
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        try {
          const res = await voiceMutation.mutateAsync({ target, file: blob, filename: 'voice-note.webm' });
          setResult(res);
        } catch (err) {
          toast.error('Could not read the recording', { description: err instanceof Error ? err.message : undefined });
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
    } catch {
      toast.error('Microphone access denied');
      setRecording(false);
    }
  }

  function stopRecording() {
    setRecording(false);
    if (recognitionRef.current) {
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
      if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
      // runLiveExtraction(true) is a no-op when nothing was ever heard, and
      // onSettled (which clears finalizing) would then never fire — only
      // show the spinner when there's actually a transcript to resolve.
      if (finalTranscriptRef.current.trim()) setFinalizing(true);
      runLiveExtraction(true);
      return;
    }
    mediaRecorderRef.current?.stop();
  }

  function handleApply() {
    if (!result) return;
    onApply(result);
    onClose();
  }

  const showingLiveDictation = tab === 'voice' && speechSupported && (recording || liveCaption) && !result;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end lg:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#0F0821] rounded-t-2xl lg:rounded-2xl w-full lg:max-w-md max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/5">
          <h2 className="text-sm font-bold text-gray-900 dark:text-white">AI Fill Marks</h2>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-white/5">
            <X className="w-4 h-4 text-gray-500 dark:text-white/50" />
          </button>
        </div>

        {!result && (
          <>
            <div className="flex gap-2 px-4 pt-3">
              <button
                type="button"
                onClick={() => setTab('photo')}
                disabled={recording}
                className={cn('flex-1 h-9 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50', tab === 'photo' ? 'bg-violet-600 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/60')}
              >
                Photo
              </button>
              <button
                type="button"
                onClick={() => setTab('voice')}
                disabled={recording}
                className={cn('flex-1 h-9 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50', tab === 'voice' ? 'bg-violet-600 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/60')}
              >
                Voice
              </button>
            </div>

            <div className="p-4">
              {tab === 'photo' ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBusy}
                  className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center gap-2 text-gray-500 dark:text-white/50 disabled:opacity-50"
                >
                  {imageMutation.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />}
                  <span className="text-xs font-semibold px-4 text-center">
                    {imageMutation.isPending ? 'Reading photo…' : 'Take or upload a photo of the marks sheet'}
                  </span>
                </button>
              ) : showingLiveDictation ? (
                <div className="space-y-3">
                  <div className="w-full rounded-xl border-2 border-dashed border-violet-300 dark:border-violet-500/30 bg-violet-50/50 dark:bg-violet-500/5 p-3 min-h-[5rem]">
                    <p className="text-xs text-gray-600 dark:text-white/60 leading-relaxed">
                      {liveCaption || <span className="text-gray-400 dark:text-white/30">Listening…</span>}
                    </p>
                  </div>

                  <div className="min-h-[3rem]">
                    {transcriptMutation.isPending && !liveResult && (
                      <p className="text-xs text-gray-400 dark:text-white/40 flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Matching students…</p>
                    )}
                    {liveResult && liveResult.extracted.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[11px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide">Filled so far — tap a score to fix it</p>
                        {liveResult.extracted.map((row) => (
                          <EditableExtractedRow
                            key={row.studentId}
                            row={row}
                            onEditScore={(studentId, componentName, value) => editScore('live', studentId, componentName, value)}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={stopRecording}
                    disabled={finalizing}
                    className="w-full h-10 rounded-xl bg-red-500 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {finalizing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Finishing up…</>
                    ) : (
                      <><Square className="w-4 h-4" /> Stop &amp; Review</>
                    )}
                  </button>
                </div>
              ) : (
                <div className="w-full h-32 rounded-xl border-2 border-dashed border-gray-200 dark:border-white/10 flex flex-col items-center justify-center gap-2">
                  {voiceMutation.isPending ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin text-gray-500 dark:text-white/50" />
                      <span className="text-xs font-semibold text-gray-500 dark:text-white/50">Reading recording…</span>
                    </>
                  ) : recording ? (
                    <button type="button" onClick={stopRecording} className="flex flex-col items-center gap-2 text-red-500">
                      <Square className="w-6 h-6" />
                      <span className="text-xs font-semibold">Stop recording</span>
                    </button>
                  ) : (
                    <button type="button" onClick={startRecording} className="flex flex-col items-center gap-2 text-gray-500 dark:text-white/50">
                      <Mic className="w-6 h-6" />
                      <span className="text-xs font-semibold">Tap to dictate marks</span>
                    </button>
                  )}
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoSelected} />
            </div>
          </>
        )}

        {result && (
          <div className="p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {result.extracted.length} student{result.extracted.length === 1 ? '' : 's'} read — review before saving
            </p>
            {result.transcript && (
              <p className="text-xs text-gray-500 dark:text-white/50 bg-gray-50 dark:bg-white/5 rounded-lg p-2">&ldquo;{result.transcript}&rdquo;</p>
            )}
            {result.extracted.length > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-gray-500 dark:text-white/40 uppercase tracking-wide">Tap a score to fix it</p>
                {result.extracted.map((row) => (
                  <EditableExtractedRow
                    key={row.studentId}
                    row={row}
                    onEditScore={(studentId, componentName, value) => editScore('final', studentId, componentName, value)}
                  />
                ))}
              </div>
            )}
            {result.warnings.length > 0 && (
              <div className="space-y-1">
                {result.warnings.map((w, i) => (
                  <p key={i} className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> {w}
                  </p>
                ))}
              </div>
            )}
            {result.unmatched.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-500/10 rounded-lg p-3">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-1">
                  Couldn&apos;t match {result.unmatched.length} entr{result.unmatched.length === 1 ? 'y' : 'ies'} to a student — enter these by hand:
                </p>
                {result.unmatched.map((u, i) => (
                  <p key={i} className="text-xs text-amber-600 dark:text-amber-400/80">
                    {u.rawName ?? u.rawRollNumber ?? 'Unknown'} — {Object.entries(u.scores).map(([k, v]) => `${k}: ${v}`).join(', ') || 'no scores read'}
                  </p>
                ))}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setResult(null)} className="flex-1 h-10 rounded-xl border border-gray-200 dark:border-white/10 text-xs font-semibold text-gray-600 dark:text-white/60">
                Retry
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={result.extracted.length === 0}
                className="flex-1 h-10 rounded-xl bg-gradient-to-r from-violet-600 to-pink-500 text-white text-xs font-bold disabled:opacity-40"
              >
                Fill {result.extracted.length} Row{result.extracted.length === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
