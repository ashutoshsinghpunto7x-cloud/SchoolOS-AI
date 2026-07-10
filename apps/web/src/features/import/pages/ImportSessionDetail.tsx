import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Loader2, CheckCircle2, RotateCcw, XCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { useImportSession, useConfirmImport, useCancelImport, useRollbackImport, useUpdateMapping } from '../hooks/useImport';
import { ImportStatusBadge } from '../components/ImportStatusBadge';
import { ImportProgress } from '../components/ImportProgress';
import { ValidationTable } from '../components/ValidationTable';

const ACTIVE_STATUSES = new Set(['processing', 'parsing', 'validating', 'confirmed']);

export function ImportSessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [mappingEditing, setMappingEditing] = useState(false);
  const [localMapping, setLocalMapping] = useState<Record<string, string>>({});

  const { data: session, isLoading, refetch } = useImportSession(id);
  const confirm = useConfirmImport(id!);
  const cancel = useCancelImport(id!);
  const rollback = useRollbackImport(id!);
  const updateMapping = useUpdateMapping(id!);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-6 text-center text-gray-500">Session not found. <Link to="/import" className="text-indigo-600 hover:underline">Back to Import</Link></div>
    );
  }

  const isPreview = session.status === 'preview';
  const isCompleted = session.status === 'completed';
  const canCancel = ['uploading', 'parsing', 'validating', 'preview'].includes(session.status);
  const canRollback = session.status === 'completed' && session.importedIds.length > 0;
  const isRunning = ACTIVE_STATUSES.has(session.status);

  const startMappingEdit = () => {
    setLocalMapping({ ...session.mapping });
    setMappingEditing(true);
  };

  const saveMapping = async () => {
    await updateMapping.mutateAsync(localMapping);
    setMappingEditing(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/import')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900 capitalize">{session.importType} Import</h1>
              <ImportStatusBadge status={session.status} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{session.originalFileName} · {session.totalRows} rows · by {session.createdByName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {isRunning && (
            <button onClick={() => refetch()} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          {canCancel && (
            <button
              onClick={() => cancel.mutate()}
              disabled={cancel.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              <XCircle className="w-4 h-4" />
              Cancel
            </button>
          )}
          {canRollback && (
            <button
              onClick={() => {
                if (window.confirm(`Roll back ${session.importedIds.length} imported records? This cannot be undone.`)) {
                  rollback.mutate();
                }
              }}
              disabled={rollback.isPending}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors"
            >
              {rollback.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              Rollback
            </button>
          )}
          {isPreview && (
            <button
              onClick={() => confirm.mutate()}
              disabled={confirm.isPending || session.validRows + session.warningRows === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              {confirm.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirm Import
            </button>
          )}
        </div>
      </div>

      {/* Progress (visible during processing and after) */}
      {(isRunning || isCompleted || session.status === 'failed') && (
        <ImportProgress session={session} />
      )}

      {/* New classes detected — surfaced before confirming so typos can be caught,
          since confirming creates these permanently in Classes & Sections. */}
      {isPreview && session.detectedNewClasses.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">
                {session.detectedNewClasses.length} new class{session.detectedNewClasses.length === 1 ? '' : 'es'} detected
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                These aren't in Classes &amp; Sections yet. Confirming this import will create them — double-check for typos first.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2.5">
                {session.detectedNewClasses.map((d) => (
                  <span key={`${d.class}-${d.section}`} className="inline-flex items-center gap-1 text-xs font-medium bg-white border border-amber-200 rounded-full px-2.5 py-1 text-amber-800">
                    Class {d.class} - {d.section}
                    {!d.classExists && <span className="text-amber-500">(new class)</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Column mapping */}
      {(isPreview || isCompleted) && Object.keys(session.mapping).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-800">Column Mapping</h2>
            {isPreview && !mappingEditing && (
              <button onClick={startMappingEdit} className="text-xs text-indigo-600 hover:underline">Edit</button>
            )}
            {mappingEditing && (
              <div className="flex gap-2">
                <button onClick={() => setMappingEditing(false)} className="text-xs text-gray-500 hover:underline">Cancel</button>
                <button
                  onClick={saveMapping}
                  disabled={updateMapping.isPending}
                  className="text-xs text-indigo-600 font-medium hover:underline disabled:opacity-40"
                >
                  {updateMapping.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {Object.entries(mappingEditing ? localMapping : session.mapping).map(([src, dst]) => (
              <div key={src} className="flex items-center gap-2 text-xs">
                <span className="font-mono bg-gray-50 border border-gray-200 rounded px-2 py-0.5 flex-1 truncate">{src}</span>
                <span className="text-gray-400">→</span>
                {mappingEditing ? (
                  <input
                    value={localMapping[src] ?? ''}
                    onChange={(e) => setLocalMapping((prev) => ({ ...prev, [src]: e.target.value }))}
                    className="flex-1 font-mono border border-indigo-300 rounded px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                ) : (
                  <span className="font-mono text-indigo-700 flex-1 truncate">{dst}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Validation table (preview + completed) */}
      {(isPreview || isCompleted || session.status === 'failed') && session.totalRows > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Row Details</h2>
          <ValidationTable sessionId={session._id} />
        </div>
      )}

      {/* Timeline */}
      {session.timeline.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-800">Timeline</h2>
          <ol className="space-y-2">
            {session.timeline.map((evt, i) => (
              <li key={i} className="flex items-start gap-3 text-xs">
                <span className="w-2 h-2 mt-1.5 rounded-full bg-indigo-300 flex-shrink-0" />
                <div>
                  <span className="font-medium text-gray-700 capitalize">{evt.event.replace(/_/g, ' ')}</span>
                  {evt.note && <span className="text-gray-500"> — {evt.note}</span>}
                  <p className="text-gray-400">{new Date(evt.at).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
