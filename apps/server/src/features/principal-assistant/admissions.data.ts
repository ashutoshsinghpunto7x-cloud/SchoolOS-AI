import { enquiryRepository } from '../enquiries/enquiry.repository';
import { AuthContext } from '../../lib/auth-context';

// ── Granular data fetchers ────────────────────────────────────────────────────
// Mirrors fees.data.ts / principal-assistant.data.ts's shape — each function
// fetches only what it needs from the existing enquiry repository, and the
// backend does every calculation here. OpenAI never sees anything but the
// plain JSON these return.

function todayString(): string {
  return new Date().toISOString().split('T')[0];
}

export interface TodaysEnquiries {
  date: string;
  count: number;
  enquiries: Array<{ studentName: string; parentName: string; interestedClass: string; source: string }>;
}

export interface PendingFollowUps {
  date: string;
  count: number;
  followUps: Array<{ studentName: string; parentName: string; parentPhone: string; followUpDate: string | null }>;
}

export interface DocumentsPending {
  count: number;
  enquiries: Array<{ studentName: string; parentName: string; interestedClass: string }>;
}

export interface AdmissionStatus {
  total: number;
  byStage: Record<string, number>;
}

export const admissionsAssistantData = {
  async getTodaysEnquiries(ctx: AuthContext): Promise<TodaysEnquiries> {
    const today = todayString();
    const { enquiries } = await enquiryRepository.findAll(ctx.schoolId, {
      createdAfter: today,
      limit: 50,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    return {
      date: today,
      count: enquiries.length,
      enquiries: enquiries.map((e) => ({
        studentName: e.studentName,
        parentName: e.parentName,
        interestedClass: e.interestedClass,
        source: e.source,
      })),
    };
  },

  async getPendingFollowUps(ctx: AuthContext): Promise<PendingFollowUps> {
    const today = todayString();
    const { enquiries } = await enquiryRepository.findAll(ctx.schoolId, {
      followUpBefore: today,
      limit: 50,
      sortBy: 'followUpDate',
      sortOrder: 'asc',
    });
    const active = enquiries.filter((e) => e.stage !== 'converted' && e.stage !== 'lost');

    return {
      date: today,
      count: active.length,
      followUps: active.map((e) => ({
        studentName: e.studentName,
        parentName: e.parentName,
        parentPhone: e.parentPhone,
        followUpDate: e.followUpDate ? new Date(e.followUpDate).toISOString().split('T')[0] : null,
      })),
    };
  },

  async getDocumentsPending(ctx: AuthContext): Promise<DocumentsPending> {
    const { enquiries } = await enquiryRepository.findAll(ctx.schoolId, {
      stage: 'documents_pending',
      limit: 50,
    });

    return {
      count: enquiries.length,
      enquiries: enquiries.map((e) => ({
        studentName: e.studentName,
        parentName: e.parentName,
        interestedClass: e.interestedClass,
      })),
    };
  },

  async getAdmissionStatus(ctx: AuthContext): Promise<AdmissionStatus> {
    const counts = await enquiryRepository.countByStage(ctx.schoolId);
    const byStage: Record<string, number> = {};
    let total = 0;
    for (const c of counts) {
      byStage[c.stage] = c.count;
      total += c.count;
    }
    return { total, byStage };
  },
};
