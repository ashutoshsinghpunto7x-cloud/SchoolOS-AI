import { useState } from 'react';
import { X } from 'lucide-react';
import type { ReportCategory, ReportFilters, CreateSavedReportPayload } from '@schoolos/types';
import { useSaveReport } from '../hooks/useReports';

interface SaveReportModalProps {
  category: ReportCategory;
  filters: ReportFilters;
  onClose: () => void;
}

export const SaveReportModal = ({ category, filters, onClose }: SaveReportModalProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const { mutate, isPending, error } = useSaveReport();

  const handleSave = () => {
    if (!name.trim()) return;
    const payload: CreateSavedReportPayload = {
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      filters,
    };
    mutate(payload, { onSuccess: onClose });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold text-gray-900">Save Report</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Report Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Monthly Attendance — Class 5"
              className="w-full h-9 px-3 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes about this report"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
            <span className="font-medium capitalize">{category}</span> report with current filters will be saved.
          </div>

          {error && (
            <p className="text-xs text-red-600">{error.message}</p>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 h-9 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || isPending}
            className="flex-1 h-9 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? 'Saving…' : 'Save Report'}
          </button>
        </div>
      </div>
    </div>
  );
};
