import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { PageContainer } from '@/components/workspace/PageContainer';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { useSchoolClasses } from '@/features/school-classes/hooks/useSchoolClasses';

const selectCls =
  'h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 font-medium ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer';

const inputCls =
  'h-12 px-4 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500';

export const TermReportCardHubPage = () => {
  const navigate = useNavigate();
  const { data: schoolClasses } = useSchoolClasses();
  const [cls, setCls] = useState('');
  const [section, setSection] = useState('');
  const [academicYear, setAcademicYear] = useState('');

  const sections = (schoolClasses ?? []).find((c) => c.name === cls)?.sections ?? [];

  const canContinue = Boolean(cls && section && academicYear.trim());

  return (
    <PageContainer narrow>
      <WorkspaceHeader title="Term Report Cards" subtitle="Pick a class, section and academic year to generate two-term report cards." />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col gap-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-bold text-gray-700 block mb-2">Class</label>
            <select value={cls} onChange={(e) => { setCls(e.target.value); setSection(''); }} className={selectCls}>
              <option value="">Select…</option>
              {(schoolClasses ?? []).map((c) => <option key={c._id} value={c.name}>Class {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-bold text-gray-700 block mb-2">Section</label>
            <select value={section} onChange={(e) => setSection(e.target.value)} className={selectCls} disabled={!cls}>
              <option value="">Select…</option>
              {sections.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-bold text-gray-700 block mb-2">Academic Year</label>
            <input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="e.g. 2026-27" className={inputCls} />
          </div>
        </div>

        <button
          type="button"
          disabled={!canContinue}
          onClick={() => navigate(`/term-report-cards/${cls}/${section}/${academicYear.trim()}`)}
          className="h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <GraduationCap className="w-4 h-4" /> View Roster
        </button>
      </div>
    </PageContainer>
  );
};
