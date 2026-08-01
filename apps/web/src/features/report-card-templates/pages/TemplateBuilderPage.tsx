import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PageContainer } from '@/components/workspace/PageContainer';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { useSchoolClasses } from '@/features/school-classes/hooks/useSchoolClasses';
import {
  useReportCardTemplate, useCreateReportCardTemplate, useUpdateReportCardTemplate, usePublishReportCardTemplate, useUnpublishReportCardTemplate,
} from '../hooks/useReportCardTemplate';
import { SubjectMarksEditor } from '../components/SubjectMarksEditor';
import { SkillSectionsEditor } from '../components/SkillSectionsEditor';
import { GradingKeyEditor } from '../components/GradingKeyEditor';
import { ExamSlotPicker } from '../components/ExamSlotPicker';
import type { TemplateSubjectRow, TemplateSkillSection, TemplateGradingKeyEntry, TemplateExamSlots } from '@schoolos/types';

const TABS = ['Subjects', 'Skill Sections', 'Grading Key', 'Exam Mapping'] as const;
type Tab = typeof TABS[number];

const inputCls =
  'w-full h-12 px-4 rounded-xl border border-gray-200 text-base text-gray-900 placeholder:text-gray-400 bg-white ' +
  'transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 hover:border-gray-300';

export const TemplateBuilderPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { data: schoolClasses } = useSchoolClasses();
  const { data: existing, isLoading } = useReportCardTemplate(id);

  const { mutateAsync: createTemplate, isPending: isCreating } = useCreateReportCardTemplate();
  const { mutateAsync: updateTemplate, isPending: isUpdating } = useUpdateReportCardTemplate(id ?? '');
  const { mutateAsync: publishTemplate, isPending: isPublishing } = usePublishReportCardTemplate(id ?? '');
  const { mutateAsync: unpublishTemplate, isPending: isUnpublishing } = useUnpublishReportCardTemplate(id ?? '');

  const [tab, setTab] = useState<Tab>('Subjects');
  const [cls, setCls] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [subjects, setSubjects] = useState<TemplateSubjectRow[]>([]);
  const [skillSections, setSkillSections] = useState<TemplateSkillSection[]>([]);
  const [gradingKey, setGradingKey] = useState<TemplateGradingKeyEntry[]>([]);
  const [examSlots, setExamSlots] = useState<TemplateExamSlots>({ firstTerm: {}, finalTerm: {} });

  useEffect(() => {
    if (!existing) return;
    setCls(existing.class);
    setAcademicYear(existing.academicYear);
    setSubjects(existing.subjects);
    setSkillSections(existing.skillSections);
    setGradingKey(existing.gradingKey);
    setExamSlots(existing.examSlots);
  }, [existing]);

  const save = async () => {
    if (!cls.trim() || !academicYear.trim()) {
      toast.error('Class and academic year are required');
      return;
    }
    try {
      if (isEdit) {
        await updateTemplate({ subjects, skillSections, gradingKey, examSlots });
        toast.success('Template saved');
      } else {
        const created = await createTemplate({ class: cls, academicYear, subjects, skillSections, gradingKey, examSlots });
        toast.success('Template created');
        navigate(`/report-card-templates/${created._id}/edit`);
      }
    } catch (err) {
      toast.error('Failed to save template', { description: err instanceof Error ? err.message : 'Please try again.' });
    }
  };

  const handlePublish = async () => {
    try {
      if (existing?.status === 'published') {
        await unpublishTemplate();
        toast.success('Moved back to draft');
      } else {
        await publishTemplate();
        toast.success('Template published — report cards can now be generated for this class');
      }
    } catch (err) {
      toast.error('Failed to update status', { description: err instanceof Error ? err.message : 'Please try again.' });
    }
  };

  if (isEdit && isLoading) {
    return (
      <PageContainer>
        <div className="h-64 rounded-2xl bg-white border border-gray-100 animate-pulse" />
      </PageContainer>
    );
  }

  const isSaving = isCreating || isUpdating;

  return (
    <PageContainer>
      <button
        onClick={() => navigate('/report-card-templates')}
        className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors mb-6"
        type="button"
      >
        <ArrowLeft className="w-4 h-4" /> All Templates
      </button>

      <WorkspaceHeader
        title={isEdit ? `Class ${cls} · ${academicYear}` : 'New Report Card Template'}
        subtitle="Subjects, skill sections, grading key and exam mapping — fully editable, no code changes needed."
        action={
          isEdit ? (
            <button
              type="button" onClick={handlePublish} disabled={isPublishing || isUnpublishing}
              className={cn(
                'h-11 px-5 rounded-xl text-sm font-bold transition-colors',
                existing?.status === 'published' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-emerald-600 text-white hover:bg-emerald-700',
              )}
            >
              {existing?.status === 'published' ? 'Unpublish' : 'Publish'}
            </button>
          ) : undefined
        }
      />

      {!isEdit && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div>
            <label className="text-sm font-bold text-gray-700 tracking-wide block mb-2">Class</label>
            <select value={cls} onChange={(e) => setCls(e.target.value)} className={cn(inputCls, 'cursor-pointer')}>
              <option value="">Select class…</option>
              {(schoolClasses ?? []).map((c) => <option key={c._id} value={c.name}>Class {c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-bold text-gray-700 tracking-wide block mb-2">Academic Year</label>
            <input value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} placeholder="e.g. 2026-27" className={inputCls} />
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 px-2">
          {TABS.map((t) => (
            <button
              key={t} type="button" onClick={() => setTab(t)}
              className={cn(
                'px-4 py-3.5 text-sm font-semibold border-b-2 -mb-px transition-colors',
                tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === 'Subjects' && <SubjectMarksEditor subjects={subjects} onChange={setSubjects} />}
          {tab === 'Skill Sections' && <SkillSectionsEditor sections={skillSections} onChange={setSkillSections} />}
          {tab === 'Grading Key' && <GradingKeyEditor entries={gradingKey} onChange={setGradingKey} />}
          {tab === 'Exam Mapping' && <ExamSlotPicker cls={cls} examSlots={examSlots} onChange={setExamSlots} />}
        </div>
      </div>

      <button
        type="button" onClick={() => void save()} disabled={isSaving}
        className={cn(
          'w-full h-14 rounded-2xl flex items-center justify-center gap-3 text-base font-bold text-white mt-6',
          'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-colors duration-150',
          'disabled:opacity-60 disabled:cursor-not-allowed',
        )}
      >
        {isSaving ? (<><Loader2 className="w-5 h-5 animate-spin" />Saving…</>) : isEdit ? 'Save Changes' : 'Create Template'}
      </button>
    </PageContainer>
  );
};
