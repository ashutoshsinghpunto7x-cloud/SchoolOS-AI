import { useMemo, useState } from 'react';
import { X, Loader2, AlertCircle, Download, FileWarning } from 'lucide-react';
import { feesApi } from '@/features/fees/api/fees.api';
import { useSchoolClasses } from '@/features/school-classes/hooks/useSchoolClasses';
import type { FeeRecord } from '@schoolos/types';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

function exportDefaultersCSV(records: FeeRecord[], klass: string, section: string) {
  const header = ['Student Name', 'Admission No.', 'Class', 'Section', 'Fee Head', 'Month', 'Due Date', 'Total Amount', 'Paid Amount', 'Balance', 'Status'];
  const rows = records.map((r) => [
    r.studentName, r.admissionNumber, r.class, r.section, r.feeHead, r.month ?? '',
    r.dueDate.slice(0, 10), r.totalAmount, r.paidAmount, r.balance, r.status,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `fee-defaulters-${klass}-${section}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

interface Props {
  onClose: () => void;
}

export function GenerateDefaultersListModal({ onClose }: Props) {
  const { data: classes } = useSchoolClasses();
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [results, setResults] = useState<FeeRecord[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const sections = classes?.find((c) => c.name === selectedClass)?.sections ?? [];
  const canGenerate = !!selectedClass && !!selectedSection && selectedMonths.length > 0;

  function toggleMonth(m: string) {
    setSelectedMonths((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  async function handleGenerate() {
    if (!canGenerate) return;
    setIsGenerating(true);
    setError('');
    setResults(null);
    try {
      // Server caps `limit` at 100 per request, so page through everything
      // for this class/section instead of asking for 500 in one shot (that
      // was failing validation outright and blocking generation entirely).
      const records: FeeRecord[] = [];
      let pageNum = 1;
      let total = Infinity;
      while (records.length < total) {
        const res = await feesApi.list({ class: selectedClass, section: selectedSection, page: pageNum, limit: 100 });
        records.push(...res.data);
        total = res.meta.total;
        if (res.data.length === 0) break;
        pageNum += 1;
      }
      const defaulters = records.filter(
        (r) => selectedMonths.includes(r.month ?? '') && r.status !== 'paid' && r.status !== 'waived',
      );
      setResults(defaulters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate the list');
    } finally {
      setIsGenerating(false);
    }
  }

  const totalDue = useMemo(() => (results ?? []).reduce((s, r) => s + r.balance, 0), [results]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-base font-bold text-gray-900">Generate Fee Defaulters List</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-4">Pick a class, section, and the month(s) to check — then generate and export the list.</p>

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Class</label>
            <select
              value={selectedClass}
              onChange={(e) => { setSelectedClass(e.target.value); setSelectedSection(''); setResults(null); }}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30"
            >
              <option value="">Select class</option>
              {classes?.map((c) => <option key={c._id} value={c.name}>Class {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => { setSelectedSection(e.target.value); setResults(null); }}
              disabled={!selectedClass}
              className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#A855F7]/30 disabled:opacity-50"
            >
              <option value="">Select section</option>
              {sections.map((s) => <option key={s} value={s}>Section {s}</option>)}
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Month(s)</label>
          <div className="flex flex-wrap gap-1.5">
            {MONTHS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { toggleMonth(m); setResults(null); }}
                className={`h-8 px-2.5 rounded-lg text-xs font-semibold border transition-colors ${
                  selectedMonths.includes(m)
                    ? 'bg-[#5B21B6] border-[#5B21B6] text-white'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                {m.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2 mb-3">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        <button
          type="button"
          disabled={!canGenerate || isGenerating}
          onClick={handleGenerate}
          className="w-full h-11 bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-50 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 mb-4"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileWarning className="w-4 h-4" />}
          {isGenerating ? 'Generating…' : 'Generate Defaulters List'}
        </button>

        {results && (
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-gray-800">
                {results.length} record{results.length !== 1 ? 's' : ''} · {fmt(totalDue)} outstanding
              </p>
              <button
                type="button"
                disabled={!results.length}
                onClick={() => exportDefaultersCSV(results, selectedClass, selectedSection)}
                className="h-8 px-3 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>

            {results.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No defaulters for this selection.</p>
            ) : (
              <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-50">
                {results.map((r) => (
                  <div key={r._id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{r.studentName}</p>
                      <p className="text-xs text-gray-400">{r.feeHead} · {r.month}</p>
                    </div>
                    <p className="text-sm font-bold text-gray-800 shrink-0">{fmt(r.balance)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
