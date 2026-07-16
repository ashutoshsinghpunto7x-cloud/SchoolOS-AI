import { useState, useEffect, useId } from 'react';
import {
  Printer, Download, Mail, Loader2, CheckCircle2,
  ShieldCheck, User, GraduationCap, FolderKanban, CreditCard, MapPin, FileText, Calendar, IndianRupee,
  type LucideIcon,
} from 'lucide-react';
import { useUpdateStudent } from '@/features/students/hooks/useStudents';
import { useSendReceiptEmail } from '../hooks/useAccountantWorkspace';
import fnicLogo from '@/assets/illustrations/fnic-logo.jpg';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

export const SCHOOL_NAME = 'Florence Nightingale Inter College';
export const SCHOOL_ADDRESS = 'Tulsi Puram, Triveni Nagar - 2, Triveni Nagar, Lucknow, Uttar Pradesh 226020';

export interface CollectContext {
  studentId?: string;
  studentName: string;
  class: string;
  section: string;
  fatherName?: string;
  parentPhone?: string;
  email?: string;
}

export interface ReceiptLineItem { label: string; amount: number; }

// ── Receipt ────────────────────────────────────────────────────────────────────

function ReceiptRow({
  icon: Icon, label, value,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-dotted border-gray-200 last:border-b-0">
      <span className="flex items-center gap-2 text-sm text-gray-500">
        <Icon className="w-4 h-4 text-gray-400" />
        {label}
      </span>
      <span className="font-semibold text-gray-900 text-right">{value}</span>
    </div>
  );
}

// On-screen preview — a wide, invoice-style landscape card (school brand + receipt
// meta on top, student info / fee breakdown side-by-side, signatures on the bottom).
export function ReceiptCopy({
  context, lineItems, total, paymentMode, receiptNumber, copyLabel,
}: {
  context: CollectContext; lineItems: ReceiptLineItem[]; total: number;
  paymentMode: string; receiptNumber?: string; copyLabel: string;
}) {
  const dateLabel = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="receipt-copy relative bg-white rounded-[28px] border border-gray-200 shadow-sm p-10 text-left w-full">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1 mb-5">
        <ShieldCheck className="w-3.5 h-3.5" />
        {copyLabel.toUpperCase()}
      </span>

      {/* Centered brand header — logo, school name, full address, "Fee Receipt" banner */}
      <div className="flex flex-col items-center text-center pb-5 border-b border-gray-200">
        <img src={fnicLogo} alt={SCHOOL_NAME} className="w-20 h-20 rounded-full object-cover shrink-0 mb-3" />
        <p className="font-serif text-2xl font-bold text-gray-900 leading-tight">{SCHOOL_NAME}</p>
        <p className="text-sm text-gray-400 mt-1 flex items-center justify-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-gray-300 shrink-0" />{SCHOOL_ADDRESS}
        </p>
        <p className="text-lg font-bold text-emerald-600 mt-2">Fee Receipt</p>
      </div>

      <div className="flex items-center justify-between pt-4">
        <div>
          <p className="text-[11px] font-semibold text-gray-400 tracking-wide">RECEIPT NO.</p>
          <p className="text-base font-bold text-gray-900 mt-0.5">{receiptNumber || '—'}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold text-gray-400 tracking-wide">DATE</p>
          <p className="text-base font-bold text-gray-900 mt-0.5">{dateLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-10 py-6">
        <div>
          <ReceiptRow icon={User} label="Student Name" value={context.studentName} />
          <ReceiptRow icon={User} label="Father's Name" value={context.fatherName || '—'} />
          <ReceiptRow icon={GraduationCap} label="Class" value={context.class} />
          <ReceiptRow icon={FolderKanban} label="Section" value={context.section} />
          <ReceiptRow icon={CreditCard} label="Payment Mode" value={<span className="capitalize">{paymentMode}</span>} />
        </div>

        <div>
          <p className="text-[11px] font-bold text-gray-400 tracking-wide mb-2">FEE DETAILS</p>
          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-2 bg-gray-50 px-5 py-2.5 border-b border-dashed border-gray-200">
              <span className="text-[11px] font-bold text-gray-400 tracking-wide">DESCRIPTION</span>
              <span className="text-[11px] font-bold text-gray-400 tracking-wide text-right">AMOUNT (₹)</span>
            </div>
            {lineItems.map((li, i) => (
              <div key={i} className="grid grid-cols-2 px-5 py-3 text-sm text-gray-700">
                <span>{li.label}</span>
                <span className="text-right font-medium text-gray-800">{fmt(li.amount)}</span>
              </div>
            ))}
            <div className="grid grid-cols-2 px-5 py-3.5 bg-emerald-50/70 border-t-2 border-emerald-500">
              <span className="text-sm font-bold text-emerald-700 tracking-wide">TOTAL AMOUNT PAID</span>
              <span className="text-right text-lg font-bold text-emerald-700">{fmt(total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between pt-8 mt-2 border-t border-dashed border-gray-200">
        <div className="w-56">
          <div className="border-t-2 border-gray-800 mb-2" />
          <p className="text-[11px] text-gray-400">Student/Guardian Signature</p>
        </div>
        <StampSeal className="w-20 h-20 shrink-0" />
        <div className="w-56 text-right">
          <div className="border-t-2 border-gray-800 mb-2" />
          <p className="text-[11px] text-gray-400">Accountant Stamp/Signature</p>
        </div>
      </div>
    </div>
  );
}

// Compact label/value pair used inside the landscape print layout.
function PrintReceiptRow({
  icon: Icon, label, value, last,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-[1.8mm] ${last ? '' : 'border-b border-dotted border-gray-200'}`}>
      <span className="flex items-center gap-[2mm] text-[7.5px] text-gray-500">
        <Icon className="w-[3mm] h-[3mm] text-gray-400" />
        {label}
      </span>
      <span className="text-[8.5px] font-semibold text-gray-900 text-right">{value}</span>
    </div>
  );
}

// Print copy — the exact same visual design as the on-screen ReceiptCopy above,
// scaled down in real mm units so it fits cleanly within half of an A4 landscape
// sheet (see the @page rule in FeeReceiptSuccessScreen below) with nothing clipped.
export function PrintReceiptCopy({
  context, lineItems, total, paymentMode, receiptNumber, copyLabel,
}: {
  context: CollectContext; lineItems: ReceiptLineItem[]; total: number;
  paymentMode: string; receiptNumber?: string; copyLabel: string;
}) {
  const dateLabel = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="print-receipt-copy relative bg-white rounded-[3mm] border border-gray-200 p-[6mm] text-left w-full h-full flex flex-col">
      <span className="inline-flex items-center gap-[1mm] text-[7px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-[3mm] py-[1mm] mb-[2mm] self-start">
        <ShieldCheck className="w-[3mm] h-[3mm]" />
        {copyLabel.toUpperCase()}
      </span>

      {/* Centered brand header — logo, school name, full address, "Fee Receipt" banner */}
      <div className="flex flex-col items-center text-center pb-[2mm] border-b border-gray-200">
        <img src={fnicLogo} alt={SCHOOL_NAME} className="w-[16mm] h-[16mm] rounded-full object-cover shrink-0 mb-[1.5mm]" />
        <p className="font-serif text-[13px] font-bold text-gray-900 leading-tight">{SCHOOL_NAME}</p>
        <p className="text-[7.5px] text-gray-400 mt-[0.5mm] flex items-center justify-center gap-[1mm]">
          <MapPin className="w-[2.5mm] h-[2.5mm] text-gray-300 shrink-0" />{SCHOOL_ADDRESS}
        </p>
        <p className="text-[11px] font-bold text-emerald-600 mt-[1.5mm]">Fee Receipt</p>
      </div>

      <div className="flex items-center justify-between pt-[2mm]">
        <div>
          <p className="text-[7px] font-semibold text-gray-400 tracking-wide">RECEIPT NO.</p>
          <p className="text-[10px] font-bold text-gray-900">{receiptNumber || '—'}</p>
        </div>
        <div className="text-right">
          <p className="text-[7px] font-semibold text-gray-400 tracking-wide">DATE</p>
          <p className="text-[10px] font-bold text-gray-900">{dateLabel}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-[8mm] py-[3mm] flex-1">
        <div>
          <PrintReceiptRow icon={User} label="Student Name" value={context.studentName} />
          <PrintReceiptRow icon={User} label="Father's Name" value={context.fatherName || '—'} />
          <PrintReceiptRow icon={GraduationCap} label="Class" value={context.class} />
          <PrintReceiptRow icon={FolderKanban} label="Section" value={context.section} />
          <PrintReceiptRow icon={CreditCard} label="Payment Mode" value={<span className="capitalize">{paymentMode}</span>} last />
        </div>

        <div>
          <p className="text-[7px] font-bold text-gray-400 tracking-wide mb-[1.5mm]">FEE DETAILS</p>
          <div className="rounded-[2mm] border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-2 bg-gray-50 px-[4mm] py-[1.5mm] border-b border-dashed border-gray-200">
              <span className="text-[7px] font-bold text-gray-400 tracking-wide">DESCRIPTION</span>
              <span className="text-[7px] font-bold text-gray-400 tracking-wide text-right">AMOUNT (₹)</span>
            </div>
            {lineItems.map((li, i) => (
              <div key={i} className="grid grid-cols-2 px-[4mm] py-[1.5mm] text-[8.5px] text-gray-700">
                <span>{li.label}</span>
                <span className="text-right font-medium text-gray-800">{fmt(li.amount)}</span>
              </div>
            ))}
            <div className="grid grid-cols-2 px-[4mm] py-[2mm] bg-emerald-50 border-t-2 border-emerald-500">
              <span className="text-[8px] font-bold text-emerald-700 tracking-wide">TOTAL AMOUNT PAID</span>
              <span className="text-right text-[12px] font-bold text-emerald-700">{fmt(total)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between pt-[3mm] mt-[1mm] border-t border-dashed border-gray-200">
        <div className="w-[40mm]">
          <div className="border-t-2 border-gray-800 mb-[1.5mm]" />
          <p className="text-[7px] text-gray-400">Student/Guardian Signature</p>
        </div>
        <StampSeal className="w-[16mm] h-[16mm] shrink-0" />
        <div className="w-[40mm] text-right">
          <div className="border-t-2 border-gray-800 mb-[1.5mm]" />
          <p className="text-[7px] text-gray-400">Accountant Stamp/Signature</p>
        </div>
      </div>
    </div>
  );
}

// ── "Classic" template — a formal, portrait certificate-style receipt ──────────
// Alternative to the landscape design above; selectable via the toggle in
// FeeReceiptSuccessScreen and remembered per-browser (localStorage).

function BuildingWatermark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 160" className={className} fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="160,14 260,64 60,64" />
      <circle cx="160" cy="40" r="9" />
      <rect x="40" y="64" width="240" height="72" />
      {[64, 92, 120, 148, 176, 204, 232, 260].map((x) => (
        <line key={x} x1={x} y1="64" x2={x} y2="136" />
      ))}
      <line x1="40" y1="136" x2="280" y2="136" />
    </svg>
  );
}

function StampSeal({ className = '' }: { className?: string }) {
  const uid = useId().replace(/[:]/g, '');
  return (
    <svg viewBox="0 0 100 100" className={className}>
      <defs>
        <path id={`stampPath-${uid}`} d="M 50,50 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" />
      </defs>
      <circle cx="50" cy="50" r="44" fill="none" stroke="#0F5132" strokeWidth="1.2" opacity="0.7" />
      <circle cx="50" cy="50" r="36" fill="none" stroke="#0F5132" strokeWidth="1" opacity="0.7" />
      <text fontSize="6.2" fill="#0F5132" letterSpacing="1.5" opacity="0.85">
        <textPath href={`#stampPath-${uid}`} startOffset="1%">
          ★ FLORENCE NIGHTINGALE INTER COLLEGE ★ TRIVENI NAGAR
        </textPath>
      </text>
      <text x="50" y="47" textAnchor="middle" fontSize="8" fontWeight="700" fill="#0F5132" opacity="0.85">TRIVENI</text>
      <text x="50" y="58" textAnchor="middle" fontSize="8" fontWeight="700" fill="#0F5132" opacity="0.85">NAGAR</text>
    </svg>
  );
}

function ClassicRow({
  icon: Icon, label, value,
}: { icon: LucideIcon; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-gray-200 last:border-b-0">
      <span className="flex items-center gap-3 text-gray-500">
        <Icon className="w-[18px] h-[18px] text-gray-400" strokeWidth={1.5} />
        {label}
      </span>
      <span className="font-bold text-gray-900 text-right">{value}</span>
    </div>
  );
}

export function ClassicReceiptCopy({
  context, lineItems, total, paymentMode, receiptNumber, copyLabel,
}: {
  context: CollectContext; lineItems: ReceiptLineItem[]; total: number;
  paymentMode: string; receiptNumber?: string; copyLabel: string;
}) {
  const dateLabel = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="classic-receipt-copy relative bg-white rounded-[32px] shadow-sm border border-gray-200 overflow-hidden p-10 text-left w-full">
      {/* Decorative corner accent */}
      <div
        className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#14532D] to-[#0B3D2E]"
        style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }}
      />
      <BuildingWatermark className="absolute top-10 right-6 w-64 text-gray-300 opacity-[0.15] pointer-events-none" />

      <span className="relative z-10 inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-3.5 py-1.5">
        <ShieldCheck className="w-3.5 h-3.5" />
        {copyLabel.toUpperCase()}
      </span>

      <div className="relative z-10 text-center pt-2 pb-4">
        <img src={fnicLogo} alt={SCHOOL_NAME} className="w-24 h-24 rounded-full object-cover mx-auto mb-3" />
        <p className="font-serif text-3xl font-bold text-gray-900">{SCHOOL_NAME}</p>
        <p className="text-sm text-gray-400 mt-2 flex items-center justify-center gap-3">
          <span className="w-8 h-px bg-amber-200" />{SCHOOL_ADDRESS.split(',')[0]}<span className="w-8 h-px bg-amber-200" />
        </p>
        <p className="text-xl font-bold text-emerald-600 mt-2">Fee Receipt</p>
      </div>

      <div className="relative z-10 bg-gray-50 rounded-2xl p-4 flex items-center gap-4 mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <FileText className="w-[18px] h-[18px] text-emerald-700" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-xs text-gray-400">Bill No.</p>
            <p className="font-bold text-gray-900 text-sm">{receiptNumber || '—'}</p>
          </div>
        </div>
        <div className="w-px h-9 bg-gray-200" />
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
            <Calendar className="w-[18px] h-[18px] text-emerald-700" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-xs text-gray-400">Date</p>
            <p className="font-bold text-gray-900 text-sm">{dateLabel}</p>
          </div>
        </div>
      </div>

      <div className="relative z-10 bg-white rounded-2xl border border-gray-200 px-4 mb-4">
        <ClassicRow icon={User} label="Student Name" value={context.studentName} />
        <ClassicRow icon={User} label="Father's Name" value={context.fatherName || '—'} />
        <ClassicRow icon={GraduationCap} label="Class" value={context.class} />
        <ClassicRow icon={FolderKanban} label="Section" value={context.section} />
        <ClassicRow icon={CreditCard} label="Payment Mode" value={<span className="capitalize">{paymentMode}</span>} />
      </div>

      <div className="relative z-10 bg-gray-50 rounded-2xl p-4">
        {lineItems.map((li, i) => (
          <div key={i} className="flex items-center justify-between text-sm py-1.5">
            <span className="flex items-center gap-2.5 text-gray-500">
              <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
                <IndianRupee className="w-3.5 h-3.5 text-gray-400" />
              </span>
              {li.label}
            </span>
            <span className="font-semibold text-gray-800">{fmt(li.amount)}</span>
          </div>
        ))}
        <div className="border-t border-dashed border-gray-300 my-2.5" />
        <div className="flex items-center justify-between bg-emerald-50 rounded-xl px-3 py-2.5">
          <span className="flex items-center gap-2.5 font-bold text-emerald-700 text-sm">
            <span className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center shrink-0">
              <IndianRupee className="w-3.5 h-3.5 text-white" />
            </span>
            Amount Paid
          </span>
          <span className="font-bold text-emerald-700 text-lg">{fmt(total)}</span>
        </div>
      </div>

      <div className="relative z-10 flex items-end justify-between mt-10 pt-2 gap-4">
        <div className="text-center flex-1">
          <div className="h-9" />
          <p className="text-[11px] text-gray-400 border-t border-gray-300 pt-1.5 mt-1">Student/Guardian Signature</p>
        </div>
        <StampSeal className="w-20 h-20 shrink-0 mb-2" />
        <div className="text-center flex-1">
          <div className="h-9" />
          <p className="text-[11px] text-gray-400 border-t border-gray-300 pt-1.5 mt-1">Accountant Stamp/Signature</p>
        </div>
      </div>
    </div>
  );
}

// Compact label/value row for the Classic print layout (no icon circle, dotted divider).
function ClassicPrintRow({
  icon: Icon, label, value,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-[1mm] border-b border-dotted border-gray-200">
      <span className="flex items-center gap-[1.5mm] text-[6.5px] text-gray-500">
        <Icon className="w-[2.5mm] h-[2.5mm] text-gray-400" />
        {label}
      </span>
      <span className="text-[7.5px] font-semibold text-gray-900 text-right">{value}</span>
    </div>
  );
}

// Classic print copy — same visual design as ClassicReceiptCopy, scaled down in
// real mm units so BOTH copies fit as two halves of a single A4 portrait sheet
// (see the @page rule in FeeReceiptSuccessScreen) instead of spanning two separate pages.
export function ClassicPrintCopy({
  context, lineItems, total, paymentMode, receiptNumber, copyLabel,
}: {
  context: CollectContext; lineItems: ReceiptLineItem[]; total: number;
  paymentMode: string; receiptNumber?: string; copyLabel: string;
}) {
  const dateLabel = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="classic-print-copy relative bg-white rounded-[4mm] border border-gray-200 overflow-hidden p-[5mm] text-left w-full h-full flex flex-col">
      <div
        className="absolute top-0 right-0 w-[20mm] h-[20mm] bg-gradient-to-br from-[#14532D] to-[#0B3D2E]"
        style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 0)' }}
      />
      <BuildingWatermark className="absolute top-[4mm] right-[3mm] w-[40mm] text-gray-300 opacity-[0.15] pointer-events-none" />

      <span className="relative z-10 inline-flex items-center gap-[1mm] text-[6px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-[2.5mm] py-[0.8mm] self-start">
        <ShieldCheck className="w-[2.5mm] h-[2.5mm]" />
        {copyLabel.toUpperCase()}
      </span>

      <div className="relative z-10 text-center pt-[1mm] pb-[2mm]">
        <img src={fnicLogo} alt={SCHOOL_NAME} className="w-[15mm] h-[15mm] rounded-full object-cover mx-auto mb-[1mm]" />
        <p className="font-serif text-[12px] font-bold text-gray-900 leading-tight">{SCHOOL_NAME}</p>
        <p className="text-[7px] text-gray-400 mt-[0.5mm] flex items-center justify-center gap-[2mm]">
          <span className="w-[5mm] h-px bg-amber-200" />{SCHOOL_ADDRESS.split(',')[0]}<span className="w-[5mm] h-px bg-amber-200" />
        </p>
        <p className="text-[9px] font-bold text-emerald-600 mt-[1mm]">Fee Receipt</p>
      </div>

      <div className="relative z-10 flex-1 flex flex-col justify-center gap-[2.5mm]">
        <div className="bg-gray-50 rounded-[2mm] px-[3mm] py-[1.5mm] flex items-center gap-[3mm]">
          <div className="flex items-center gap-[2mm] flex-1">
            <p className="text-[6px] text-gray-400">Bill No.</p>
            <p className="font-bold text-gray-900 text-[7.5px]">{receiptNumber || '—'}</p>
          </div>
          <div className="w-px h-[4mm] bg-gray-200" />
          <div className="flex items-center gap-[2mm] flex-1">
            <p className="text-[6px] text-gray-400">Date</p>
            <p className="font-bold text-gray-900 text-[7.5px]">{dateLabel}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-[6mm]">
          <ClassicPrintRow icon={User} label="Student Name" value={context.studentName} />
          <ClassicPrintRow icon={GraduationCap} label="Class" value={context.class} />
          <ClassicPrintRow icon={User} label="Father's Name" value={context.fatherName || '—'} />
          <ClassicPrintRow icon={FolderKanban} label="Section" value={context.section} />
          <ClassicPrintRow icon={CreditCard} label="Payment Mode" value={<span className="capitalize">{paymentMode}</span>} />
        </div>

        <div className="bg-gray-50 rounded-[2mm] px-[3mm] py-[1.5mm]">
          {lineItems.map((li, i) => (
            <div key={i} className="flex items-center justify-between text-[7px] text-gray-600 py-[0.5mm]">
              <span>{li.label}</span>
              <span className="font-semibold text-gray-800">{fmt(li.amount)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between bg-emerald-50 rounded-[1.5mm] px-[2.5mm] py-[1mm] mt-[1mm]">
            <span className="font-bold text-emerald-700 text-[7px]">Amount Paid</span>
            <span className="font-bold text-emerald-700 text-[9px]">{fmt(total)}</span>
          </div>
        </div>
      </div>

      <div className="relative z-10 flex items-end justify-between pt-[2mm] mt-[1mm] border-t border-dashed border-gray-200 gap-[4mm]">
        <div className="text-center flex-1">
          <div className="h-[3mm]" />
          <p className="text-[6px] text-gray-400 border-t border-gray-300 pt-[1mm]">Student/Guardian Signature</p>
        </div>
        <StampSeal className="w-[13mm] h-[13mm] shrink-0" />
        <div className="text-center flex-1">
          <div className="h-[3mm]" />
          <p className="text-[6px] text-gray-400 border-t border-gray-300 pt-[1mm]">Accountant Stamp/Signature</p>
        </div>
      </div>
    </div>
  );
}

type ReceiptTemplate = 'modern' | 'classic';
const RECEIPT_TEMPLATE_KEY = 'schoolos.receiptTemplate';

/** Post-payment screen: on-screen receipt preview, print (2 copies), download, and email. Shared by every fee-collection flow so every receipt in the app looks identical. */
export function FeeReceiptSuccessScreen({
  context, lineItems, total, paymentMode, receiptNumber, onDone,
}: {
  context: CollectContext; lineItems: ReceiptLineItem[]; total: number;
  paymentMode: string; receiptNumber?: string; onDone: () => void;
}) {
  const { mutateAsync: sendEmail, isPending: sending, error, isSuccess } = useSendReceiptEmail();
  const { mutateAsync: updateStudent } = useUpdateStudent(context.studentId ?? '');
  const [email, setEmail] = useState(context.email ?? '');
  const paymentDate = new Date().toISOString().slice(0, 10);

  // Remembered per-browser so the accountant doesn't have to re-pick it every time.
  const [template, setTemplate] = useState<ReceiptTemplate>(() => {
    const saved = localStorage.getItem(RECEIPT_TEMPLATE_KEY);
    return saved === 'classic' || saved === 'modern' ? saved : 'modern';
  });
  useEffect(() => {
    localStorage.setItem(RECEIPT_TEMPLATE_KEY, template);
  }, [template]);

  async function handleSendEmail() {
    const toEmail = email.trim();
    if (!toEmail) return;
    await sendEmail({
      toEmail,
      studentName: context.studentName,
      class: context.class,
      section: context.section,
      feeDescription: lineItems.map((l) => l.label).join(', '),
      amount: total,
      paymentDate,
    });
    // Remember this email on the student record for future receipts, until changed again.
    if (context.studentId && toEmail !== context.email) {
      updateStudent({ email: toEmail }).catch(() => {});
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-6 text-center py-10">
      {/*
        Both copies print on a single standard A4 sheet — the parent/student
        copy on the top half, the school copy on the bottom half, separated
        by a dashed cut-line — rather than one copy per page. `@page` stays
        OUTSIDE `@media print` — nesting it inside the media block is
        unreliable across browsers.
      */}
      <style>{`
        @page { size: A4 portrait; margin: 8mm; }
        @media print {
          body * { visibility: hidden; }
          #receipt-print-area, #receipt-print-area * { visibility: visible; }
          #receipt-print-area {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            display: flex; flex-direction: column;
          }
          #receipt-print-area .print-page {
            width: 100%; height: calc(50% - 4mm);
            display: flex; align-items: stretch; justify-content: center;
          }
          #receipt-print-area .print-cut-line {
            width: 100%; height: 8mm; flex-shrink: 0;
            display: flex; align-items: center; justify-content: center;
            border-top: 1px dashed #9CA3AF;
          }
        }
      `}</style>

      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-5 print:hidden">
        <CheckCircle2 className="w-10 h-10 text-emerald-600" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 print:hidden">Payment Collected!</h2>

      {/* Template toggle — remembered in this browser via localStorage */}
      <div className="print:hidden inline-flex items-center gap-1 bg-gray-100 rounded-full p-1 mt-4">
        <button
          type="button"
          onClick={() => setTemplate('modern')}
          className={`px-4 h-8 rounded-full text-xs font-semibold transition-colors ${template === 'modern' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Modern
        </button>
        <button
          type="button"
          onClick={() => setTemplate('classic')}
          className={`px-4 h-8 rounded-full text-xs font-semibold transition-colors ${template === 'classic' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Classic
        </button>
      </div>

      <div className={`print:hidden w-full mt-5 ${template === 'classic' ? 'max-w-xl' : 'max-w-4xl'}`}>
        {template === 'classic' ? (
          <ClassicReceiptCopy context={context} lineItems={lineItems} total={total} paymentMode={paymentMode} receiptNumber={receiptNumber} copyLabel="School Copy" />
        ) : (
          <ReceiptCopy context={context} lineItems={lineItems} total={total} paymentMode={paymentMode} receiptNumber={receiptNumber} copyLabel="School Copy" />
        )}
      </div>

      {/* Both copies, only rendered for print — stacked as the top and bottom halves of one A4 page, split by a dashed cut-line. */}
      <div id="receipt-print-area" className="hidden print:block">
        {template === 'classic' ? (
          <>
            <div className="print-page">
              <ClassicPrintCopy context={context} lineItems={lineItems} total={total} paymentMode={paymentMode} receiptNumber={receiptNumber} copyLabel="Student / Parent Copy" />
            </div>
            <div className="print-cut-line" />
            <div className="print-page">
              <ClassicPrintCopy context={context} lineItems={lineItems} total={total} paymentMode={paymentMode} receiptNumber={receiptNumber} copyLabel="School Copy" />
            </div>
          </>
        ) : (
          <>
            <div className="print-page">
              <PrintReceiptCopy context={context} lineItems={lineItems} total={total} paymentMode={paymentMode} receiptNumber={receiptNumber} copyLabel="Student / Parent Copy" />
            </div>
            <div className="print-cut-line" />
            <div className="print-page">
              <PrintReceiptCopy context={context} lineItems={lineItems} total={total} paymentMode={paymentMode} receiptNumber={receiptNumber} copyLabel="School Copy" />
            </div>
          </>
        )}
      </div>

      <div className="flex flex-col gap-3 mt-6 w-full max-w-4xl print:hidden">
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="flex-1 h-12 bg-emerald-700 text-white font-semibold rounded-xl text-sm hover:bg-emerald-800 transition-colors flex items-center justify-center gap-2"
          >
            <Printer className="w-4 h-4" /> Print / Save Receipt (2 copies)
          </button>
          <button
            onClick={() => window.print()}
            className="h-12 px-5 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>

        {/* Email receipt */}
        <div className="bg-white border border-gray-200 rounded-xl p-3.5">
          <label className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email Receipt</label>
          <div className="flex gap-2">
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="parent@email.com"
              className="flex-1 h-10 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-200"
            />
            <button
              onClick={handleSendEmail}
              disabled={!email.trim() || sending}
              className="h-10 px-3.5 bg-gray-800 hover:bg-gray-900 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Send'}
            </button>
          </div>
          {isSuccess ? (
            <p className="text-xs text-emerald-600 mt-1.5">Receipt sent — this email is now saved on the student's record.</p>
          ) : context.email ? (
            <p className="text-xs text-gray-400 mt-1.5">Pre-filled from the student's saved email. Change it to update.</p>
          ) : null}
          {error && <p className="text-xs text-red-500 mt-1.5">{error instanceof Error ? error.message : 'Failed to send'}</p>}
        </div>

        <button
          onClick={onDone}
          className="h-12 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 transition-colors"
        >
          Collect Another Payment
        </button>
      </div>
    </div>
  );
}
