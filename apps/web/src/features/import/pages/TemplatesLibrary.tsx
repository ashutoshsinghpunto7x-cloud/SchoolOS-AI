import { Link } from 'react-router-dom';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { useImportTemplates } from '../hooks/useImport';
import { importApi } from '../api/import.api';

const TYPE_COLORS: Record<string, string> = {
  students:   'bg-blue-50 border-blue-100',
  teachers:   'bg-purple-50 border-purple-100',
  fees:       'bg-gray-50 border-gray-200',
  admissions: 'bg-orange-50 border-orange-100',
  attendance: 'bg-teal-50 border-teal-100',
};

export function TemplatesLibrary() {
  const { data: templates, isLoading } = useImportTemplates();

  const handleDownload = (importType: string) => {
    const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api/v1';
    const path = importApi.getTemplateDownloadUrl(importType as Parameters<typeof importApi.getTemplateDownloadUrl>[0]);
    const a = document.createElement('a');
    a.href = `${base}${path}`;
    a.download = `${importType}_template.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/import" className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Import Templates</h1>
          <p className="text-sm text-gray-500 mt-0.5">Download templates, fill them in, then upload to start an import</p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Loading templates…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(templates ?? []).map((tpl) => (
            <div
              key={tpl.importType}
              className={`rounded-xl border p-5 space-y-4 ${TYPE_COLORS[tpl.importType] ?? 'bg-gray-50 border-gray-100'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-800">{tpl.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{tpl.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDownload(tpl.importType)}
                  className="flex items-center px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors flex-shrink-0"
                >
                  Download
                </button>
              </div>

              {/* Column headers preview */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Columns ({tpl.headers.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {tpl.headers.map((col) => (
                    <span key={col} className="px-2 py-0.5 text-xs font-mono bg-white border border-gray-200 rounded text-gray-600">
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              <Link
                to={`/import/upload?type=${tpl.importType}`}
                className="block text-center py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors"
              >
                Start Import
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
