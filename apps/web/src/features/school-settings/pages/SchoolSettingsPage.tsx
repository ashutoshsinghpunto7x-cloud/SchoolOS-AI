import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Upload, X, Loader2, ShieldCheck, LogOut, ChevronRight } from 'lucide-react';
import { PageContainer } from '@/components/workspace/PageContainer';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useSchoolSettings, useUploadSchoolLogo, useRemoveSchoolLogo } from '../hooks/useSchoolSettings';

export function SchoolSettingsPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { data: settings, isLoading } = useSchoolSettings();
  const { mutateAsync: uploadLogo, isPending: uploading } = useUploadSchoolLogo();
  const { mutateAsync: removeLogo, isPending: removing } = useRemoveSchoolLogo();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    try {
      await uploadLogo(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload logo');
    }
    e.target.value = '';
  }

  return (
    <PageContainer narrow>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-6">School branding and system configuration.</p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4 text-gray-400" />
          <h2 className="text-sm font-bold text-gray-900">School Logo</h2>
        </div>
        <p className="text-xs text-gray-400 mb-4">
          Shown in the sidebar across the app. Recommended: square image, under 2MB.
        </p>

        {isLoading ? (
          <div className="w-20 h-20 rounded-2xl bg-gray-100 animate-pulse" />
        ) : (
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
              {settings?.logoUrl ? (
                <img src={settings.logoUrl} alt="School logo" className="w-full h-full object-cover" />
              ) : (
                <Building2 className="w-8 h-8 text-gray-300" />
              )}
            </div>

            <div className="flex flex-col gap-2">
              <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => void handleFileChange(e)} className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 h-10 px-4 rounded-xl bg-[#5B21B6] hover:bg-[#4C1D95] disabled:opacity-50 text-white text-sm font-semibold transition-colors"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? 'Uploading…' : settings?.logoUrl ? 'Replace Logo' : 'Upload Logo'}
              </button>
              {settings?.logoUrl && (
                <button
                  type="button"
                  onClick={() => void removeLogo()}
                  disabled={removing}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" /> Remove logo
                </button>
              )}
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
      </div>

      {user?.role === 'principal' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-5 overflow-hidden divide-y divide-gray-50">
          <button
            type="button"
            onClick={() => navigate('/principal/change-password')}
            className="w-full flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-gray-500" />
            </div>
            <span className="flex-1 text-sm font-semibold text-gray-800">Change Password</span>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>
          <button
            type="button"
            onClick={() => void logout()}
            className="w-full flex items-center gap-3 px-6 py-4 hover:bg-red-50 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4 text-red-500" />
            </div>
            <span className="flex-1 text-sm font-semibold text-red-600">Log Out</span>
          </button>
        </div>
      )}
    </PageContainer>
  );
}
