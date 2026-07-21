import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Printer, Loader2 } from 'lucide-react';
import { useEmployeeList, useEmployeeQr } from '../hooks/useEmployees';
import { IdCardPreview } from '../components/IdCardPreview';
import type { Employee } from '@schoolos/types';

function initialsOf(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

// Renders a mini non-interactive front-only thumbnail for the grid.
function CardThumbnail({ employee, onPrint }: { employee: Employee; onPrint: () => void }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col items-center">
      <div className="w-16 h-16 rounded-full bg-[#A855F7]/10 border-2 border-[#5B21B6]/40 overflow-hidden flex items-center justify-center mb-2">
        {employee.photoUrl ? (
          <img src={employee.photoUrl} alt={employee.fullName} className="w-full h-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <span className="text-[#5B21B6] font-bold text-sm">{initialsOf(employee.fullName)}</span>
        )}
      </div>
      <p className="text-sm font-bold text-gray-900 text-center truncate w-full">{employee.fullName}</p>
      <p className="text-xs text-gray-400 text-center truncate w-full">{employee.employeeId}</p>
      <p className="text-[11px] text-gray-400 text-center mt-0.5 truncate w-full">{employee.designation}</p>
      <button
        onClick={onPrint}
        className="mt-3 h-8 px-3 bg-[#5B21B6] hover:bg-[#4C1D95] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
      >
        <Printer className="w-3.5 h-3.5" /> Print
      </button>
    </div>
  );
}

// Fetches the selected employee's QR and drives an auto-print of their ID card.
// Kept off-screen (`hidden` — the print-only duplicate inside IdCardPreview is
// what actually gets printed, per its own `@media print` scoping) and unmounted
// again once the print dialog closes, so only one employee's card is ever queued.
function PrintTarget({ employee, onDone }: { employee: Employee; onDone: () => void }) {
  const { data: qr } = useEmployeeQr(employee._id, Boolean(employee.qr));
  return (
    // `hidden` (display:none) on screen — but unlike a plain `hidden`, this
    // must NOT stay display:none during print, or IdCardPreview's own
    // print-only duplicate (which sets itself to `print:flex`) never gets a
    // chance to render at all: display:none on an ancestor removes the whole
    // subtree from the render tree, and no descendant's own `print:` display
    // value can override that. That's exactly why "Print" from the ID Cards
    // grid produced a blank page — this div was `hidden` in every media,
    // print included. `print:contents` un-hides it for print while adding no
    // layout box of its own (its children, including the print-only card,
    // lay out exactly as if this wrapper weren't there).
    <div className="hidden print:contents">
      <IdCardPreview employee={employee} qrDataUri={qr?.dataUri} hideActions autoPrint onPrintDone={onDone} />
    </div>
  );
}

export function IdCardsPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useEmployeeList({ limit: 100, status: 'active' });
  const rows = data?.data ?? [];
  const [printingEmployee, setPrintingEmployee] = useState<Employee | null>(null);

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-gray-200 px-4 py-4 flex items-center gap-3 print:hidden">
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 lg:hidden">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-base font-bold text-gray-900 flex items-center gap-2"><CreditCard className="w-4 h-4 text-gray-400" /> ID Cards</h1>
          <p className="text-xs text-gray-500">Preview and print staff ID cards individually</p>
        </div>
      </div>

      <div className="px-4 py-4 max-w-5xl mx-auto print:hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-gray-300 animate-spin" />
          </div>
        ) : !rows.length ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <CreditCard className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-semibold text-gray-700">No active employees</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {rows.map((e) => (
              <CardThumbnail key={e._id} employee={e} onPrint={() => setPrintingEmployee(e)} />
            ))}
          </div>
        )}
      </div>

      {/* Only the currently selected employee's printable card is mounted at a
          time — this keeps the print output to exactly one ID card. */}
      {printingEmployee && (
        <PrintTarget key={printingEmployee._id} employee={printingEmployee} onDone={() => setPrintingEmployee(null)} />
      )}
    </div>
  );
}
