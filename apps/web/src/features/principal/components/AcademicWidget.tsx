import { LayoutGrid, FileEdit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import type { PrincipalTimetableStats, PrincipalTeacherStats } from '@schoolos/types';

interface Props {
  timetable?: PrincipalTimetableStats;
  teachers?: PrincipalTeacherStats;
  isLoading?: boolean;
}

export const AcademicWidget = ({ timetable, teachers, isLoading }: Props) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  if (isLoading || !timetable || !teachers) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-gray-100 rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Timetable status */}
      <div
        className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#A855F7]/30 hover:bg-[#A855F7]/10 cursor-pointer transition-colors"
        onClick={() => navigate('/timetable')}
      >
        <div className="w-9 h-9 bg-[#A855F7]/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <LayoutGrid className="w-4 h-4 text-[#5B21B6]" strokeWidth={2} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800">{t('widget.academic.timetables')}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-green-600 font-medium">{timetable.published} {t('widget.academic.published')}</span>
            {timetable.draft > 0 && (
              <span className="text-xs text-amber-600 font-medium">{timetable.draft} {t('widget.academic.draft')}</span>
            )}
          </div>
        </div>
      </div>

      {/* Teacher strength */}
      <div
        className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[#A855F7]/30 hover:bg-[#A855F7]/10 cursor-pointer transition-colors"
        onClick={() => navigate('/teachers')}
      >
        <div className="w-9 h-9 bg-[#A855F7]/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <FileEdit className="w-4 h-4 text-[#5B21B6]" strokeWidth={2} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800">{t('widget.academic.teachingStaff')}</p>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-xs text-[#5B21B6] font-medium">{teachers.active} {t('widget.academic.active')}</span>
            <span className="text-xs text-gray-400">{t('widget.academic.ofTotal')} {teachers.total} {t('widget.academic.total')}</span>
          </div>
        </div>
      </div>

      {/* Draft timetable warning */}
      {timetable.draft > 0 && (
        <div className="px-3 py-2 bg-amber-50 rounded-xl border border-amber-100">
          <p className="text-xs font-medium text-amber-700">
            {timetable.draft} {t('widget.academic.timetables')} {t('widget.academic.draftWarning')}
          </p>
        </div>
      )}
    </div>
  );
};
