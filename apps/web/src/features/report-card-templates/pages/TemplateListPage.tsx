import { useNavigate } from 'react-router-dom';
import { FileText, ChevronRight } from 'lucide-react';
import { PageContainer } from '@/components/workspace/PageContainer';
import { WorkspaceHeader } from '@/components/workspace/WorkspaceHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { useReportCardTemplates } from '../hooks/useReportCardTemplate';

export const TemplateListPage = () => {
  const navigate = useNavigate();
  const { data: templates, isLoading, isError } = useReportCardTemplates();

  return (
    <PageContainer>
      <WorkspaceHeader
        title="Report Card Templates"
        subtitle="One template per class, per academic year — defines subjects, skill grading and which exams feed each term."
        action={
          <button
            onClick={() => navigate('/report-card-templates/new')}
            className="h-12 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 flex items-center text-sm font-bold text-white transition-colors duration-150"
            type="button"
          >
            New Template
          </button>
        }
      />

      {isLoading && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm h-64 animate-pulse" />}

      {isError && !isLoading && (
        <EmptyState icon={FileText} title="Could not load templates" description="Check your connection and try refreshing." />
      )}

      {!isLoading && !isError && (templates ?? []).length === 0 && (
        <EmptyState
          icon={FileText}
          title="No templates yet"
          description="Create your first report card template by clicking New Template above."
          action={{ label: 'New Template', onClick: () => navigate('/report-card-templates/new') }}
        />
      )}

      {!isLoading && !isError && (templates ?? []).length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50/60">
                  <th className="px-5 py-3">Class</th>
                  <th className="px-5 py-3">Academic Year</th>
                  <th className="px-5 py-3">Subjects</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 w-10" />
                </tr>
              </thead>
              <tbody>
                {(templates ?? []).map((t) => (
                  <tr
                    key={t._id}
                    className="border-t border-gray-50 hover:bg-gray-50/50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/report-card-templates/${t._id}/edit`)}
                  >
                    <td className="px-5 py-3.5 font-semibold text-gray-900">Class {t.class}</td>
                    <td className="px-5 py-3.5 text-gray-600">{t.academicYear}</td>
                    <td className="px-5 py-3.5 text-gray-600">{t.subjects.length}</td>
                    <td className="px-5 py-3.5">
                      <span className={
                        t.status === 'published'
                          ? 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700'
                          : 'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600'
                      }>
                        {t.status === 'published' ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <ChevronRight className="w-4 h-4 text-gray-400 inline-block" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageContainer>
  );
};
