import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { FileDropzone } from '../components/FileDropzone';
import { useUploadImport } from '../hooks/useImport';
import type { ImportType } from '@schoolos/types';

const IMPORT_TYPES: { value: ImportType; label: string; description: string }[] = [
  { value: 'students',   label: 'Students',    description: 'Roll numbers, class, guardian info' },
  { value: 'teachers',   label: 'Teachers',    description: 'Profiles, subjects, experience' },
  { value: 'fees',       label: 'Fee Records', description: 'Pending/paid fees, amounts, due dates' },
  { value: 'admissions', label: 'Admissions',  description: 'Enquiry and lead pipeline data' },
];

export function UploadCenter() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselected = searchParams.get('type') as ImportType | null;

  const [importType, setImportType] = useState<ImportType | null>(preselected);
  const [file, setFile] = useState<File | null>(null);

  const upload = useUploadImport();

  const handleSubmit = async () => {
    if (!importType || !file) return;
    const session = await upload.mutateAsync({ importType, file });
    navigate(`/import/sessions/${session._id}`);
  };

  const canSubmit = !!importType && !!file && !upload.isPending;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/import')}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Upload File</h1>
          <p className="text-sm text-gray-500">Select what you're importing and upload your spreadsheet</p>
        </div>
      </div>

      {/* Import type */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">1. What are you importing?</p>
        <div className="grid grid-cols-2 gap-3">
          {IMPORT_TYPES.map(({ value, label, description }) => (
            <button
              key={value}
              onClick={() => setImportType(value)}
              className={[
                'text-left rounded-xl border p-4 transition-all',
                importType === value
                  ? 'border-indigo-400 bg-indigo-50/70 ring-1 ring-indigo-400'
                  : 'border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50/30',
              ].join(' ')}
            >
              <p className={`text-sm font-semibold ${importType === value ? 'text-indigo-700' : 'text-gray-800'}`}>{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* File dropzone */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">2. Upload your file</p>
        <FileDropzone onFile={setFile} disabled={upload.isPending} />
      </div>

      {/* Error */}
      {upload.isError && (
        <div className="p-3 bg-red-50 rounded-lg border border-red-100 text-xs text-red-700">
          {upload.error?.message ?? 'Upload failed. Please try again.'}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={() => navigate('/import')}
          className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {upload.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Upload & Validate
        </button>
      </div>
    </div>
  );
}
