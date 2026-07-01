import { ChevronDown, ChevronUp, Loader2, Bot, Clock, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { useAiConversation } from '@/features/ai/hooks/useAiConversation';
import type { Communication } from '@schoolos/types';

interface CallTranscriptViewerProps {
  communication: Communication;
}

export const CallTranscriptViewer = ({ communication }: CallTranscriptViewerProps) => {
  const [expanded, setExpanded] = useState(false);
  const { data: conv, isLoading, isError } = useAiConversation(
    expanded ? communication._id : null
  );

  // Only render for calls that are completed or have an AI conversation
  if (communication.type !== 'call') return null;

  const isTerminal = ['COMPLETED', 'FAILED', 'CANCELLED'].includes(communication.status);
  if (!isTerminal) return null;

  return (
    <div className="mt-2 border-t border-gray-50 pt-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700
                   transition-colors focus:outline-none"
      >
        <Bot className="w-3.5 h-3.5" />
        <span>View AI Transcript</span>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 rounded-xl bg-gray-50 border border-gray-100 p-4">
          {isLoading ? (
            <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading transcript…</span>
            </div>
          ) : isError ? (
            <div className="flex items-center gap-2 text-xs text-red-500">
              <AlertCircle className="w-4 h-4" />
              <span>Failed to load transcript.</span>
            </div>
          ) : !conv ? (
            <p className="text-xs text-gray-400 py-2">
              No AI conversation record found for this call.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Metadata row */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Provider
                </span>
                <span className="text-xs font-semibold text-gray-700 uppercase">
                  {conv.provider}
                </span>
                {conv.durationSeconds != null && (
                  <>
                    <span className="text-gray-200">·</span>
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {Math.round(conv.durationSeconds)}s
                    </span>
                  </>
                )}
                <span className="text-gray-200">·</span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                    conv.status === 'completed'
                      ? 'bg-green-50 text-green-600'
                      : conv.status === 'failed'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  {conv.status}
                </span>
              </div>

              {/* Transcript */}
              {conv.transcript ? (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">
                    Transcript
                  </p>
                  <div
                    className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap
                               max-h-48 overflow-y-auto bg-white rounded-lg border border-gray-100 p-3"
                  >
                    {conv.transcript}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">
                  Transcript not yet available.
                </p>
              )}

              {/* AI Summary */}
              {conv.summary && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
                    AI Summary
                  </p>
                  <p className="text-xs text-gray-700 leading-relaxed">{conv.summary}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
