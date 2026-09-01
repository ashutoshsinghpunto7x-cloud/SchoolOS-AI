import { X, History } from 'lucide-react';
import type { Visitor } from '@schoolos/types';
import { useVisitorHistory } from '../hooks/useVisitors';

interface VisitorHistoryModalProps {
  visitor: Visitor;
  onClose: () => void;
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Past visits by this visitor's phone number — repeat vendors/parents,
// so reception has context before approving them again.
export function VisitorHistoryModal({ visitor, onClose }: VisitorHistoryModalProps) {
  const { data: history, isLoading } = useVisitorHistory(visitor._id, true);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <History className="w-4 h-4 text-orange-600" /> Visit History — {visitor.name}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Close">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-gray-400 text-center py-6">Loading…</p>
          ) : !history || history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No previous visits on this number.</p>
          ) : (
            <ul className="space-y-2.5">
              {history.map((v) => (
                <li key={v._id} className="border border-gray-100 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">{v.purpose.replace(/_/g, ' ')}</p>
                    <span className="text-[11px] text-gray-400">{fmtDate(v.checkInTime)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">Visited: {v.personToVisit}</p>
                  {v.purposeNote && <p className="text-xs text-gray-400 mt-0.5 italic">"{v.purposeNote}"</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
