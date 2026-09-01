import { X, Printer } from 'lucide-react';
import type { Visitor } from '@schoolos/types';

interface VisitorPassModalProps {
  visitor: Visitor;
  onClose: () => void;
}

function fmtDateTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// Printed badge (decision: physical badge, not a QR-on-screen pass — see
// Reception Management Module SRD §11). `print:` utilities scope the actual
// print output to just the badge card, hiding the modal chrome/backdrop.
export function VisitorPassModal({ visitor, onClose }: VisitorPassModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 print:bg-white print:p-0">
      {/* Scopes the print output to just the badge — without this, "Print
          Pass" would print the whole Visitor Log page sitting behind the
          modal, since the rest of the DOM is merely covered, not removed. */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #visitor-pass-badge, #visitor-pass-badge * { visibility: visible; }
          #visitor-pass-badge { position: fixed; inset: 0; }
        }
      `}</style>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden print:shadow-none print:rounded-none print:max-w-none">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 print:hidden">
          <h2 className="text-sm font-bold text-gray-900">Visitor Pass</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100" aria-label="Close">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* ── Printable badge ──────────────────────────────────────────── */}
        <div className="p-6 print:p-8" id="visitor-pass-badge">
          <div className="border-2 border-orange-600 rounded-xl p-5 text-center">
            <p className="text-[10px] font-bold tracking-widest text-orange-600 uppercase mb-3">Visitor Pass</p>
            {visitor.photoUrl ? (
              <img src={visitor.photoUrl} alt={visitor.name} className="w-20 h-20 rounded-full object-cover mx-auto mb-3 border-2 border-gray-100" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-100 mx-auto mb-3 flex items-center justify-center text-xl font-bold text-gray-400">
                {visitor.name.charAt(0).toUpperCase()}
              </div>
            )}
            <p className="text-lg font-bold text-gray-900">{visitor.name}</p>
            <p className="text-sm text-gray-500 mb-3">{visitor.contactNumber}</p>
            <div className="grid grid-cols-2 gap-2 text-left text-xs mb-3">
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-gray-400 font-medium">Visiting</p>
                <p className="text-gray-900 font-semibold truncate">{visitor.personToVisit}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="text-gray-400 font-medium">Purpose</p>
                <p className="text-gray-900 font-semibold truncate">{visitor.purpose.replace(/_/g, ' ')}</p>
              </div>
            </div>
            <div className="border-t border-dashed border-gray-200 pt-3 mt-1">
              <p className="text-sm font-bold text-gray-900 tracking-wide">{visitor.passNumber}</p>
              <p className="text-[11px] text-gray-400">
                Issued {fmtDateTime(visitor.passIssuedAt)} · Valid until {fmtDateTime(visitor.passValidUntil)}
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 pb-4 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full h-10 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" /> Print Pass
          </button>
        </div>
      </div>
    </div>
  );
}
