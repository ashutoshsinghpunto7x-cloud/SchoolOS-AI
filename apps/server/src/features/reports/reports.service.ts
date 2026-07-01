import {
  getStudentAnalytics,
  getAttendanceAnalytics,
  getFeeAnalytics,
  getAdmissionsAnalytics,
  getTimetableAnalytics,
  getCalendarAnalytics,
  savedReportRepository,
} from './reports.repository';
import { NotFoundError } from '../../middlewares/errorHandler';
import { logger } from '../../lib/logger';
import type {
  ReportCategory,
  ReportFilters,
  ReportAnalyticsData,
  SavedReport,
} from '@schoolos/types';
import type { ISavedReport } from './reports.model';

// ── Serialise saved report ─────────────────────────────────────────────────────

function toDto(r: ISavedReport): SavedReport {
  return {
    id:            (r._id as { toString(): string }).toString(),
    schoolId:      r.schoolId,
    name:          r.name,
    description:   r.description,
    category:      r.category,
    filters:       r.filters,
    isPublic:      r.isPublic,
    createdBy:     r.createdBy,
    createdByName: r.createdByName,
    lastRunAt:     r.lastRunAt?.toISOString(),
    createdAt:     r.createdAt.toISOString(),
    updatedAt:     r.updatedAt.toISOString(),
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

export const reportsService = {
  async getAnalytics(
    schoolId: string,
    category: ReportCategory,
    filters: ReportFilters,
  ): Promise<ReportAnalyticsData> {
    logger.info('Report analytics requested', { schoolId, category });

    switch (category) {
      case 'students':
        return { category, data: await getStudentAnalytics(schoolId, filters) };
      case 'attendance':
        return { category, data: await getAttendanceAnalytics(schoolId, filters) };
      case 'fees':
        return { category, data: await getFeeAnalytics(schoolId, filters) };
      case 'admissions':
        return { category, data: await getAdmissionsAnalytics(schoolId, filters) };
      case 'timetable':
        return { category, data: await getTimetableAnalytics(schoolId) };
      case 'calendar':
        return { category, data: await getCalendarAnalytics(schoolId, filters) };
    }
  },

  async listSavedReports(schoolId: string): Promise<SavedReport[]> {
    const records = await savedReportRepository.findAll(schoolId);
    return records.map(toDto);
  },

  async saveReport(
    schoolId: string,
    userId: string,
    displayName: string,
    input: {
      name: string;
      description?: string;
      category: ReportCategory;
      filters: ReportFilters;
      isPublic: boolean;
    },
  ): Promise<SavedReport> {
    const record = await savedReportRepository.create({
      schoolId,
      name:          input.name,
      description:   input.description,
      category:      input.category,
      filters:       input.filters as Record<string, unknown>,
      isPublic:      input.isPublic,
      createdBy:     userId,
      createdByName: displayName,
    });
    return toDto(record);
  },

  async getSavedReport(id: string, schoolId: string): Promise<SavedReport> {
    const record = await savedReportRepository.findById(id, schoolId);
    if (!record) throw new NotFoundError('Saved report');
    await savedReportRepository.touchLastRun(id);
    return toDto(record);
  },

  async deleteSavedReport(id: string, schoolId: string): Promise<void> {
    const deleted = await savedReportRepository.softDelete(id, schoolId);
    if (!deleted) throw new NotFoundError('Saved report');
  },
};
