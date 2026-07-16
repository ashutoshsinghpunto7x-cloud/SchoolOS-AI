import { useId, useState, useEffect, useRef } from 'react';
import { Printer, Download, MapPin, Phone, Globe, QrCode as QrCodeIcon, Camera, Loader2 } from 'lucide-react';
import { useSchoolSettings } from '@/features/school-settings/hooks/useSchoolSettings';
import { SCHOOL_NAME, SCHOOL_ADDRESS } from '@/features/accountant-workspace/components/FeeReceipt';
import fnicLogo from '@/assets/illustrations/fnic-logo.jpg';
import type { Employee } from '@schoolos/types';

const ROLE_LABEL: Record<string, string> = {
  teacher: 'Teacher',
  principal: 'Principal',
  vice_principal: 'Vice Principal',
  receptionist: 'Receptionist',
  accountant: 'Accountant',
  librarian: 'Librarian',
  driver: 'Driver',
  peon: 'Peon',
  other: 'Staff',
};

// Navy + orange, matching the reference ID card design.
const NAVY = '#152A54';
const ORANGE = '#F3861D';
const SCHOOL_PHONE = '0522-XXXXXXX';
const SCHOOL_WEBSITE = 'www.fniclucknow.edu.in';

function initialsOf(name: string): string {
  return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
}

/** Splits a school name into a "main" line (navy) and a "suffix" line
 *  (orange) — e.g. "Florence Nightingale Inter College" → "FLORENCE
 *  NIGHTINGALE" / "INTER COLLEGE" — matching the reference card's two-tone
 *  name treatment. Falls back to one navy line if the name is short. */
function splitSchoolName(name: string): [string, string] {
  const words = name.trim().split(/\s+/);
  if (words.length <= 2) return [name.toUpperCase(), ''];
  const splitAt = Math.max(1, words.length - 2);
  return [words.slice(0, splitAt).join(' ').toUpperCase(), words.slice(splitAt).join(' ').toUpperCase()];
}

// ── On-screen front/back (credit-card proportions, CSS px) ─────────────────────

interface CardFrontProps {
  employee: Employee;
  logoUrl: string;
  schoolName: string;
  mm?: boolean;
  /** When provided, the photo box becomes clickable — tapping it opens a file
   *  picker and uploads directly, so the admin doesn't have to hunt for a
   *  separate photo control elsewhere on the page. Only wired up in editable
   *  contexts (e.g. EmployeeProfilePage) — read-only views (grids, self-service) omit it. */
  onUploadPhoto?: (file: File) => void;
  uploadingPhoto?: boolean;
}

function CardFront({ employee, logoUrl, schoolName, mm, onUploadPhoto, uploadingPhoto }: CardFrontProps) {
  const u = mm ? 'mm' : 'px';
  const scale = mm ? 1 : 3.4; // px card is ~3.4x the mm card for on-screen legibility
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nameLine1, nameLine2] = splitSchoolName(schoolName);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onUploadPhoto?.(file);
    e.target.value = '';
  }

  const photoBox = (
    <>
      {employee.photoUrl ? (
        <img src={employee.photoUrl} alt={employee.fullName} className="w-full h-full object-cover" />
      ) : (
        <span className="font-bold" style={{ fontSize: '16px', color: NAVY }}>{initialsOf(employee.fullName)}</span>
      )}
    </>
  );

  return (
    <div
      className="relative bg-white rounded-[3mm] border border-gray-200 overflow-hidden flex flex-col items-center text-center shadow-sm"
      style={{ width: `${54 * scale}${u === 'mm' ? 'mm' : 'px'}`, height: `${86 * scale}${u === 'mm' ? 'mm' : 'px'}` }}
    >
      <div className="w-full pt-[6%] px-[8%] flex flex-col items-center">
        <img src={logoUrl} alt={schoolName} className="object-contain shrink-0" style={{ width: '30%' }} />
        <p className="font-serif font-bold leading-tight mt-[2%]" style={{ fontSize: '9px', color: NAVY }}>{nameLine1}</p>
        {nameLine2 && <p className="font-serif font-bold leading-tight" style={{ fontSize: '9px', color: ORANGE }}>{nameLine2}</p>}
      </div>

      {/* Photo + name/designation/EMP-ID side by side, matching the reference layout */}
      <div className="mt-[5%] w-full px-[8%] flex items-start gap-[4%] text-left">
        {onUploadPhoto ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md border overflow-hidden flex items-center justify-center shrink-0 relative group"
            style={{ width: '32%', aspectRatio: '3/4', borderColor: '#D1D5DB', backgroundColor: '#FFF8F1' }}
          >
            {photoBox}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {uploadingPhoto ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              className="hidden"
            />
          </button>
        ) : (
          <div
            className="rounded-md border overflow-hidden flex items-center justify-center shrink-0"
            style={{ width: '32%', aspectRatio: '3/4', borderColor: '#D1D5DB', backgroundColor: '#FFF8F1' }}
          >
            {photoBox}
          </div>
        )}

        <div className="flex-1 min-w-0 pt-[2%]">
          <p className="font-bold leading-tight break-words" style={{ fontSize: '11px', color: NAVY }}>{employee.fullName}</p>
          <div className="w-[30%] h-[1.5px] my-[4%]" style={{ backgroundColor: ORANGE }} />
          <p className="leading-tight text-gray-800" style={{ fontSize: '7.5px' }}>{employee.designation}</p>
          {employee.department && <p className="leading-tight text-gray-400 mt-[2%]" style={{ fontSize: '7px' }}>{employee.department}</p>}
        </div>
      </div>

      <div className="w-full px-[8%] mt-[5%] text-left">
        <p className="text-gray-400 tracking-widest font-semibold" style={{ fontSize: '5.5px' }}>EMP ID</p>
        <p className="font-bold" style={{ fontSize: '10px', color: ORANGE }}>{employee.employeeId}</p>
      </div>

      {/* Wave footer — a thin orange sliver peeking above a navy band gives the
          curved-transition look from the reference without needing a bezier SVG. */}
      <div className="mt-auto w-full relative">
        <div className="w-full" style={{ height: '3%', background: `linear-gradient(100deg, ${ORANGE} 0%, ${ORANGE} 45%, ${NAVY} 55%, ${NAVY} 100%)` }} />
        <div className="w-full text-white text-left px-[8%]" style={{ paddingTop: '4%', paddingBottom: '4%', backgroundColor: NAVY }}>
          <div className="flex items-start gap-[2%]">
            <MapPin className="shrink-0 mt-[1px]" style={{ width: 7, height: 7 }} />
            <p className="leading-tight" style={{ fontSize: '5px' }}>{SCHOOL_ADDRESS}</p>
          </div>
          <div className="flex items-center gap-[2%] mt-[3%]">
            <Phone className="shrink-0" style={{ width: 7, height: 7 }} />
            <p className="leading-tight" style={{ fontSize: '5px' }}>{SCHOOL_PHONE}</p>
          </div>
          <div className="flex items-center gap-[2%] mt-[3%]">
            <Globe className="shrink-0" style={{ width: 7, height: 7 }} />
            <p className="leading-tight" style={{ fontSize: '5px' }}>{SCHOOL_WEBSITE}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardBack({
  employee, logoUrl, schoolName, qrDataUri,
}: { employee: Employee; logoUrl: string; schoolName: string; qrDataUri?: string }) {
  const [nameLine1, nameLine2] = splitSchoolName(schoolName);
  return (
    <div
      className="relative bg-white rounded-[3mm] border border-gray-200 overflow-hidden flex flex-col items-center text-center shadow-sm px-[7%] py-[6%]"
      style={{ width: '183.6px', height: '292.4px' }}
    >
      <img src={logoUrl} alt={schoolName} className="object-contain shrink-0" style={{ width: '24%' }} />
      <p className="font-serif font-bold leading-tight mt-[2%]" style={{ fontSize: '7.5px', color: NAVY }}>{nameLine1}</p>
      {nameLine2 && <p className="font-serif font-bold leading-tight" style={{ fontSize: '7.5px', color: ORANGE }}>{nameLine2}</p>}

      <div className="w-full flex items-center gap-[3%] mt-[5%]">
        <div className="flex-1 h-px" style={{ backgroundColor: NAVY, opacity: 0.3 }} />
        <p className="font-bold tracking-wide shrink-0" style={{ fontSize: '8px', color: NAVY }}>STAFF IDENTITY CARD</p>
        <div className="flex-1 h-px" style={{ backgroundColor: NAVY, opacity: 0.3 }} />
      </div>

      <div className="mt-[5%] p-[4%] border-2 rounded-lg bg-white flex items-center justify-center" style={{ width: '62%', borderColor: ORANGE }}>
        {qrDataUri ? (
          <img src={qrDataUri} alt="Attendance QR" className="w-full h-full object-contain" />
        ) : (
          <QrCodeIcon className="text-gray-300 w-full h-full" />
        )}
      </div>

      <ul className="text-left mt-[5%] space-y-[3%] list-disc pl-[5%]" style={{ fontSize: '5.5px', color: '#4B5563' }}>
        <li>This card is the property of {schoolName}.</li>
        <li>This card is non-transferable.</li>
        <li>If found, please return to the school office.</li>
      </ul>

      <div className="mt-auto w-full pt-[4%]">
        <div className="h-[8%] flex items-end justify-center">
          {employee.signatureUrl ? (
            <img src={employee.signatureUrl} alt="Signature" className="max-h-full object-contain" />
          ) : (
            <div className="w-[70%] border-b border-gray-300" />
          )}
        </div>
        <p className="text-gray-400 mt-[2%]" style={{ fontSize: '5.5px' }}>Authorised Signatory</p>
      </div>
    </div>
  );
}

// ── Print copies (real mm units, matching the FeeReceipt print pattern) ────────

function PrintCardFront({ employee, logoUrl, schoolName }: { employee: Employee; logoUrl: string; schoolName: string }) {
  const [nameLine1, nameLine2] = splitSchoolName(schoolName);
  return (
    <div className="print-id-card relative bg-white overflow-hidden flex flex-col items-center text-center" style={{ width: '54mm', height: '86mm' }}>
      <div className="w-full pt-[4mm] px-[4mm] flex flex-col items-center">
        <img src={logoUrl} alt={schoolName} className="object-contain shrink-0" style={{ width: '16mm' }} />
        <p className="font-serif font-bold leading-tight mt-[1mm]" style={{ fontSize: '6px', color: NAVY }}>{nameLine1}</p>
        {nameLine2 && <p className="font-serif font-bold leading-tight" style={{ fontSize: '6px', color: ORANGE }}>{nameLine2}</p>}
      </div>

      <div className="mt-[3mm] w-full px-[4mm] flex items-start gap-[2mm] text-left">
        <div className="rounded-md border overflow-hidden flex items-center justify-center shrink-0" style={{ width: '16mm', height: '21mm', borderColor: '#D1D5DB', backgroundColor: '#FFF8F1' }}>
          {employee.photoUrl ? (
            <img src={employee.photoUrl} alt={employee.fullName} className="w-full h-full object-cover" />
          ) : (
            <span className="font-bold" style={{ fontSize: '11px', color: NAVY }}>{initialsOf(employee.fullName)}</span>
          )}
        </div>
        <div className="flex-1 min-w-0 pt-[1mm]">
          <p className="font-bold leading-tight" style={{ fontSize: '7px', color: NAVY }}>{employee.fullName}</p>
          <div className="w-[6mm] h-[0.4mm] my-[1mm]" style={{ backgroundColor: ORANGE }} />
          <p className="leading-tight text-gray-800" style={{ fontSize: '5.5px' }}>{employee.designation}</p>
          {employee.department && <p className="leading-tight text-gray-400 mt-[0.5mm]" style={{ fontSize: '5px' }}>{employee.department}</p>}
        </div>
      </div>

      <div className="w-full px-[4mm] mt-[3mm] text-left">
        <p className="text-gray-400 tracking-widest font-semibold" style={{ fontSize: '4px' }}>EMP ID</p>
        <p className="font-bold" style={{ fontSize: '7px', color: ORANGE }}>{employee.employeeId}</p>
      </div>

      <div className="mt-auto w-full">
        <div className="w-full" style={{ height: '2mm', background: `linear-gradient(100deg, ${ORANGE} 0%, ${ORANGE} 45%, ${NAVY} 55%, ${NAVY} 100%)` }} />
        <div className="w-full text-white text-left px-[4mm] py-[2mm]" style={{ backgroundColor: NAVY }}>
          <div className="flex items-start gap-[1mm]">
            <MapPin className="shrink-0 mt-[0.3mm]" style={{ width: 5, height: 5 }} />
            <p className="leading-tight" style={{ fontSize: '3.5px' }}>{SCHOOL_ADDRESS}</p>
          </div>
          <div className="flex items-center gap-[1mm] mt-[1mm]">
            <Phone className="shrink-0" style={{ width: 5, height: 5 }} />
            <p className="leading-tight" style={{ fontSize: '3.5px' }}>{SCHOOL_PHONE}</p>
          </div>
          <div className="flex items-center gap-[1mm] mt-[1mm]">
            <Globe className="shrink-0" style={{ width: 5, height: 5 }} />
            <p className="leading-tight" style={{ fontSize: '3.5px' }}>{SCHOOL_WEBSITE}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PrintCardBack({
  employee, logoUrl, schoolName, qrDataUri,
}: { employee: Employee; logoUrl: string; schoolName: string; qrDataUri?: string }) {
  const [nameLine1, nameLine2] = splitSchoolName(schoolName);
  return (
    <div className="print-id-card relative bg-white overflow-hidden flex flex-col items-center text-center px-[4mm] py-[3mm]" style={{ width: '54mm', height: '86mm' }}>
      <img src={logoUrl} alt={schoolName} className="object-contain shrink-0" style={{ width: '12mm' }} />
      <p className="font-serif font-bold leading-tight mt-[1mm]" style={{ fontSize: '5px', color: NAVY }}>{nameLine1}</p>
      {nameLine2 && <p className="font-serif font-bold leading-tight" style={{ fontSize: '5px', color: ORANGE }}>{nameLine2}</p>}

      <div className="w-full flex items-center gap-[1.5mm] mt-[2mm]">
        <div className="flex-1 h-px" style={{ backgroundColor: NAVY, opacity: 0.3 }} />
        <p className="font-bold tracking-wide shrink-0" style={{ fontSize: '5.5px', color: NAVY }}>STAFF IDENTITY CARD</p>
        <div className="flex-1 h-px" style={{ backgroundColor: NAVY, opacity: 0.3 }} />
      </div>

      <div className="mt-[3mm] p-[1.5mm] border-2 rounded-md bg-white flex items-center justify-center" style={{ width: '32mm', height: '32mm', borderColor: ORANGE }}>
        {qrDataUri ? (
          <img src={qrDataUri} alt="Attendance QR" className="w-full h-full object-contain" />
        ) : (
          <QrCodeIcon className="text-gray-300 w-full h-full" />
        )}
      </div>
      <ul className="text-left mt-[3mm] space-y-[1mm] list-disc pl-[3mm]" style={{ fontSize: '4px', color: '#4B5563' }}>
        <li>This card is the property of {schoolName}.</li>
        <li>This card is non-transferable.</li>
        <li>If found, please return to the school office.</li>
      </ul>
      <div className="mt-auto w-full pt-[2mm]">
        <div className="h-[6mm] flex items-end justify-center">
          {employee.signatureUrl ? (
            <img src={employee.signatureUrl} alt="Signature" className="max-h-full object-contain" />
          ) : (
            <div className="w-[30mm] border-b border-gray-300" />
          )}
        </div>
        <p className="text-gray-400 mt-[1mm]" style={{ fontSize: '4px' }}>Authorised Signatory</p>
      </div>
    </div>
  );
}

// ── Public component ────────────────────────────────────────────────────────

interface IdCardPreviewProps {
  employee: Employee;
  qrDataUri?: string;
  /** Hides the Print/Download action bar — used for read-only/grid contexts. */
  hideActions?: boolean;
  /** Triggers the print flow immediately on mount (e.g. from a grid's per-card
   *  "Print" button) instead of waiting for a click inside this component. */
  autoPrint?: boolean;
  /** Called once the print dialog has closed (fires after an autoPrint run). */
  onPrintDone?: () => void;
  /** When provided, makes the front card's photo box clickable to upload a new
   *  photo directly from the card — used by the editable EmployeeProfilePage view. */
  onUploadPhoto?: (file: File) => void;
  uploadingPhoto?: boolean;
}

export function IdCardPreview({ employee, qrDataUri, hideActions, autoPrint, onPrintDone, onUploadPhoto, uploadingPhoto }: IdCardPreviewProps) {
  const { data: schoolSettings } = useSchoolSettings();
  const logoUrl = schoolSettings?.logoUrl || fnicLogo;
  const schoolName = schoolSettings?.schoolName || SCHOOL_NAME;
  const roleLabel = ROLE_LABEL[employee.role] ?? employee.role;
  const printAreaId = `id-card-print-${useId().replace(/[:]/g, '')}`;
  const [printing, setPrinting] = useState(false);

  function handlePrint() {
    setPrinting(true);
  }

  // The print-only markup below only mounts while `printing` is true, so it never
  // collides with another print-scoped block elsewhere on the page (e.g. a grid's
  // other cards, or QrPanel's own "print just the QR" button). Because it mounts
  // fresh each time, window.print() has to wait until the browser has actually
  // painted that new DOM — a fixed setTimeout raced this and produced blank pages
  // when the print snapshot was taken before paint. Two nested requestAnimationFrame
  // calls reliably wait for "after the next paint" instead.
  useEffect(() => {
    if (!printing) return;
    const reset = () => { setPrinting(false); onPrintDone?.(); window.removeEventListener('afterprint', reset); };
    window.addEventListener('afterprint', reset);

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => window.print());
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.removeEventListener('afterprint', reset);
    };
  }, [printing, onPrintDone]);

  useEffect(() => {
    if (autoPrint) setPrinting(true);
    // Only fire once per mount — this component is (re)mounted fresh each time
    // a grid's "Print" button selects a new employee to print.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      {/* @page stays OUTSIDE @media print, matching FeeReceipt's pattern — nesting
          it inside the media block is unreliable across browsers. The visibility
          trick scopes printing to ONLY this card, regardless of what else (sidebar,
          topbar, other cards) is mounted on the page. */}
      {printing && (
        <style>{`
          @page { size: 54mm 86mm; margin: 0; }
          @media print {
            body * { visibility: hidden; }
            #${printAreaId}, #${printAreaId} * { visibility: visible; }
            #${printAreaId} {
              /* position:fixed pins content to a single page in Chrome's print
                 engine — the back card (which only appears on the 2nd page,
                 after .print-id-card-break) never got its own page, so only
                 the front ever printed. position:absolute participates in
                 normal pagination instead, matching FeeReceipt's working
                 print pattern. */
              position: absolute; top: 0; left: 0;
              display: flex; flex-direction: column; align-items: center;
            }
            .print-id-card-break { break-after: page; }
          }
        `}</style>
      )}

      {/* On-screen preview */}
      <div className="flex flex-wrap items-start gap-6 justify-center">
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2 text-center">Front</p>
          <CardFront employee={employee} logoUrl={logoUrl} schoolName={schoolName} onUploadPhoto={onUploadPhoto} uploadingPhoto={uploadingPhoto} />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-2 text-center">Back</p>
          <CardBack employee={employee} logoUrl={logoUrl} schoolName={schoolName} qrDataUri={qrDataUri} />
        </div>
      </div>

      {/* Print-only duplicate — front then back, each its own 54x86mm page — only
          rendered while `printing` is true. */}
      {printing && (
        <div id={printAreaId} className="hidden print:flex print:flex-col print:items-center">
          <PrintCardFront employee={employee} logoUrl={logoUrl} schoolName={schoolName} />
          <div className="print-id-card-break" />
          <PrintCardBack employee={employee} logoUrl={logoUrl} schoolName={schoolName} qrDataUri={qrDataUri} />
        </div>
      )}

      {!hideActions && (
        <div className="flex items-center justify-center gap-3 mt-5">
          <button
            onClick={handlePrint}
            className="h-10 px-4 text-white rounded-xl text-sm font-semibold flex items-center gap-2"
            style={{ backgroundColor: NAVY }}
          >
            <Printer className="w-4 h-4" /> Print
          </button>
          <button
            onClick={handlePrint}
            className="h-10 px-4 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold flex items-center gap-2"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      )}
      <p className="print:hidden text-center text-[11px] text-gray-400 mt-2">{roleLabel}</p>
    </div>
  );
}
