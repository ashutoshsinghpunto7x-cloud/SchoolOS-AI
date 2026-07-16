import { useCallback, useState } from 'react';
import { Upload, FileSpreadsheet, X } from 'lucide-react';

interface FileDropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

const ACCEPT = '.xlsx,.xls,.csv';
const MAX_MB = 10;

export function FileDropzone({ onFile, disabled = false }: FileDropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const [selected, setSelected] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const validate = (file: File): string | null => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) return 'Only .xlsx, .xls, and .csv files are allowed.';
    if (file.size > MAX_MB * 1024 * 1024) return `File must be under ${MAX_MB} MB.`;
    return null;
  };

  const pick = useCallback((file: File) => {
    const err = validate(file);
    if (err) { setError(err); return; }
    setError(null);
    setSelected(file);
    onFile(file);
  }, [onFile]);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const file = e.dataTransfer.files[0];
    if (file) pick(file);
  }, [disabled, pick]);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) pick(file);
    e.target.value = '';
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(null);
    setError(null);
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
      >
        <label
          className={[
            'block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
            dragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/40',
            disabled ? 'opacity-50 cursor-not-allowed' : '',
          ].join(' ')}
        >
          <input type="file" accept={ACCEPT} className="sr-only" onChange={onInputChange} disabled={disabled} />

          {selected ? (
            <div className="flex items-center justify-center gap-3">
              <FileSpreadsheet className="w-8 h-8 text-gray-500 flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-800">{selected.name}</p>
                <p className="text-xs text-gray-500">{(selected.size / 1024).toFixed(1)} KB</p>
              </div>
              {!disabled && (
                <button onClick={clear} className="ml-2 p-1 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="w-8 h-8 text-gray-400 mx-auto" />
              <p className="text-sm font-medium text-gray-700">Drop your file here or click to browse</p>
              <p className="text-xs text-gray-400">Excel (.xlsx, .xls) or CSV — max {MAX_MB} MB</p>
            </div>
          )}
        </label>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
