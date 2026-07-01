import { Enquiry, IEnquiry, EnquiryStage, IConversionData } from './enquiry.model';

export interface CreateEnquiryData {
  schoolId: string;
  studentName: string;
  studentDateOfBirth?: Date;
  interestedClass: string;
  gender?: 'male' | 'female' | 'other';
  currentSchool?: string;
  currentClass?: string;
  parentName: string;
  parentPhone: string;
  alternatePhone?: string;
  parentEmail?: string;
  stage: EnquiryStage;
  source: string;
  referredBy?: string;
  assignedCounsellor?: string;
  followUpDate?: Date;
  tags: string[];
  remarks?: string;
  metadata?: Record<string, unknown>;
  createdBy: string;
}

export interface FindEnquiriesOptions {
  page?: number;
  limit?: number;
  search?: string;
  stage?: EnquiryStage;
  source?: string;
  interestedClass?: string;
  assignedCounsellor?: string;
  followUpBefore?: string;
  followUpAfter?: string;
  sortBy?: 'createdAt' | 'followUpDate' | 'studentName';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedEnquiries {
  enquiries: IEnquiry[];
  total: number;
  page: number;
  limit: number;
}

export interface StageCounts {
  stage: EnquiryStage;
  count: number;
}

export const enquiryRepository = {
  async create(data: CreateEnquiryData): Promise<IEnquiry> {
    const enquiry = new Enquiry({
      ...data,
      stageHistory: [{ stage: data.stage, changedAt: new Date(), changedBy: data.createdBy }],
    });
    return enquiry.save();
  },

  async findById(id: string, schoolId: string): Promise<IEnquiry | null> {
    return Enquiry.findOne({ _id: id, schoolId, isDeleted: false }).lean<IEnquiry>();
  },

  async findAll(schoolId: string, opts: FindEnquiriesOptions = {}): Promise<PaginatedEnquiries> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };

    if (opts.search?.trim()) {
      const escaped = opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'i');
      query.$or = [
        { studentName:  regex },
        { parentName:   regex },
        { parentPhone:  regex },
        { parentEmail:  regex },
        { interestedClass: regex },
      ];
    }
    if (opts.stage)              query.stage           = opts.stage;
    if (opts.source)             query.source          = opts.source;
    if (opts.interestedClass)    query.interestedClass = opts.interestedClass;
    if (opts.assignedCounsellor) query.assignedCounsellor = opts.assignedCounsellor;

    if (opts.followUpBefore || opts.followUpAfter) {
      const range: Record<string, Date> = {};
      if (opts.followUpBefore) range.$lte = new Date(opts.followUpBefore);
      if (opts.followUpAfter)  range.$gte = new Date(opts.followUpAfter);
      query.followUpDate = range;
    }

    const sortField = opts.sortBy ?? 'createdAt';
    const sortDir   = opts.sortOrder === 'asc' ? 1 : -1;

    const [enquiries, total] = await Promise.all([
      Enquiry.find(query).sort({ [sortField]: sortDir }).skip(skip).limit(limit).lean<IEnquiry[]>(),
      Enquiry.countDocuments(query),
    ]);

    return { enquiries, total, page, limit };
  },

  async countByStage(schoolId: string): Promise<StageCounts[]> {
    return Enquiry.aggregate<StageCounts>([
      { $match: { schoolId, isDeleted: false } },
      { $group: { _id: '$stage', count: { $sum: 1 } } },
      { $project: { _id: 0, stage: '$_id', count: 1 } },
    ]);
  },

  async update(
    id: string,
    schoolId: string,
    data: Partial<IEnquiry> & { updatedBy?: string },
  ): Promise<IEnquiry | null> {
    return Enquiry.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: data },
      { new: true, runValidators: true },
    ).lean<IEnquiry>();
  },

  async updateStage(
    id: string,
    schoolId: string,
    stage: EnquiryStage,
    changedBy: string,
    remarks?: string,
  ): Promise<IEnquiry | null> {
    const historyEntry = { stage, changedAt: new Date(), changedBy, ...(remarks ? { remarks } : {}) };
    return Enquiry.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      {
        $set:  { stage, updatedBy: changedBy, lastContactedAt: new Date() },
        $push: { stageHistory: historyEntry },
      },
      { new: true },
    ).lean<IEnquiry>();
  },

  async markConverted(
    id: string,
    schoolId: string,
    conversionData: IConversionData,
    updatedBy: string,
  ): Promise<IEnquiry | null> {
    const historyEntry = { stage: 'converted' as EnquiryStage, changedAt: new Date(), changedBy: updatedBy };
    return Enquiry.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      {
        $set:  { stage: 'converted', conversionData, updatedBy },
        $push: { stageHistory: historyEntry },
      },
      { new: true },
    ).lean<IEnquiry>();
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await Enquiry.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
    );
    return result.modifiedCount > 0;
  },
};
