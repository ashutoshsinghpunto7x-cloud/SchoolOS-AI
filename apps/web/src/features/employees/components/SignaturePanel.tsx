import { useRef, useState } from 'react';
import { PenLine, Upload, Loader2, AlertCircle } from 'lucide-react';
import { useUploadEmployeeSignature } from '../hooks/useEmployees';
import type { Employee } from '@schoolos/types';

interface SignaturePanelProps {
  employee: Employee;
}

export function SignaturePanel({ employee }: SignaturePanelProps) {
  const { mutateAsync, isPending, error } = useUploadEmployeeSignature(employee._id);
  const inputRef = useRef<HTMLInputElement>(null);
  const [localErr, setLocalErr] = useState('');

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLocalErr('');
    try {
      await mutateAsync(file);
    } catch (err) {
      setLocalErr(err instanceof Error ? err.message : 'Failed to upload signature');
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const displayErr = localErr || (error instanceof Error ? error.message : null);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 mb-4">
        <PenLine className="w-4 h-4 text-gray-400" /> Signature
      </h3>

      <div className="h-24 rounded-xl border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden mb-3">
        {employee.signatureUrl ? (
          <img src={employee.signatureUrl} alt="Signature" className="max-h-full max-w-full object-contain" />
        ) : (
          <p className="text-xs text-gray-400">No signature uploaded</p>
        )}
      </div>

      {displayErr && (
        <p className="text-xs text-red-500 mb-2 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {displayErr}
        </p>
      )}

      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleFile} className="hidden" id="signature-upload-input" />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isPending}
        className="w-full h-10 bg-white border border-gray-200 hover:border-gray-300 disabled:opacity-60 text-gray-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
      >
        {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
        {employee.signatureUrl ? 'Replace Signature' : 'Upload Signature'}
      </button>
      <p className="text-[11px] text-gray-400 mt-2 text-center">
        Use dark ink on a white or transparent background — a signature on a dark background will look like a solid block on the printed card.
      </p>
    </div>
  );
}
