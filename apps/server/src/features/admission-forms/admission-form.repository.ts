import {
  AdmissionForm, IAdmissionForm, AdmissionFormPaymentStatus, AdmissionFormVerificationStatus,
  DEFAULT_DOCUMENT_CHECKLIST,
} from './admission-form.model';

export interface CreateAdmissionFormData {
  schoolId: string;
  enquiryId: string;
  formNumber: string;
  dateIssued: Date;
  issuedById: string;
  issuedByName: string;
  formFee: number;
  createdBy: string;
}

export interface FindAdmissionFormsOptions {
  page?: number;
  limit?: number;
  search?: string;
  paymentStatus?: AdmissionFormPaymentStatus;
  verificationStatus?: AdmissionFormVerificationStatus;
}

export interface PaginatedAdmissionForms {
  forms: IAdmissionForm[];
  total: number;
  page: number;
  limit: number;
}

export const admissionFormRepository = {
  async create(data: CreateAdmissionFormData): Promise<IAdmissionForm> {
    const form = new AdmissionForm({
      ...data,
      paymentStatus: 'pending',
      verificationStatus: 'not_submitted',
      documentChecklist: DEFAULT_DOCUMENT_CHECKLIST.map((documentType) => ({ documentType, received: false })),
    });
    return form.save();
  },

  async findById(id: string, schoolId: string): Promise<IAdmissionForm | null> {
    return AdmissionForm.findOne({ _id: id, schoolId, isDeleted: false });
  },

  async findByEnquiryId(enquiryId: string, schoolId: string): Promise<IAdmissionForm | null> {
    return AdmissionForm.findOne({ enquiryId, schoolId, isDeleted: false });
  },

  async findAll(schoolId: string, opts: FindAdmissionFormsOptions = {}): Promise<PaginatedAdmissionForms> {
    const page  = Math.max(1, opts.page ?? 1);
    const limit = Math.min(200, Math.max(1, opts.limit ?? 50));
    const skip  = (page - 1) * limit;

    const query: Record<string, unknown> = { schoolId, isDeleted: false };
    if (opts.search?.trim()) {
      const regex = new RegExp(opts.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.formNumber = regex;
    }
    if (opts.paymentStatus)      query.paymentStatus = opts.paymentStatus;
    if (opts.verificationStatus) query.verificationStatus = opts.verificationStatus;

    const [forms, total] = await Promise.all([
      AdmissionForm.find(query).sort({ dateIssued: -1 }).skip(skip).limit(limit).lean<IAdmissionForm[]>(),
      AdmissionForm.countDocuments(query),
    ]);

    return { forms, total, page, limit };
  },

  async updatePayment(
    id: string, schoolId: string, paymentStatus: AdmissionFormPaymentStatus, paymentTxnId: string | undefined, updatedBy: string,
  ): Promise<IAdmissionForm | null> {
    return AdmissionForm.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: { paymentStatus, paymentTxnId, updatedBy } },
      { new: true },
    );
  },

  async recordSubmission(id: string, schoolId: string, updatedBy: string): Promise<IAdmissionForm | null> {
    return AdmissionForm.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: { submissionDate: new Date(), verificationStatus: 'pending_verification', updatedBy } },
      { new: true },
    );
  },

  async setVerification(
    id: string, schoolId: string,
    update: {
      verificationStatus: AdmissionFormVerificationStatus;
      verifiedById?: string; verifiedByName?: string; verifiedAt?: Date; rejectionReason?: string;
    },
    updatedBy: string,
  ): Promise<IAdmissionForm | null> {
    return AdmissionForm.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $set: { ...update, updatedBy } },
      { new: true },
    );
  },

  async addChecklistItem(id: string, schoolId: string, documentType: string, updatedBy: string): Promise<IAdmissionForm | null> {
    return AdmissionForm.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $push: { documentChecklist: { documentType, received: false } }, $set: { updatedBy } },
      { new: true },
    );
  },

  async removeChecklistItem(id: string, schoolId: string, itemId: string, updatedBy: string): Promise<IAdmissionForm | null> {
    return AdmissionForm.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false },
      { $pull: { documentChecklist: { _id: itemId } }, $set: { updatedBy } },
      { new: true },
    );
  },

  async updateChecklistItem(
    id: string, schoolId: string, itemId: string,
    update: { received?: boolean; fileUrl?: string; fileKey?: string; verifiedAt?: Date },
    updatedBy: string,
  ): Promise<IAdmissionForm | null> {
    const setFields: Record<string, unknown> = { updatedBy };
    for (const [key, value] of Object.entries(update)) {
      setFields[`documentChecklist.$.${key}`] = value;
    }
    return AdmissionForm.findOneAndUpdate(
      { _id: id, schoolId, isDeleted: false, 'documentChecklist._id': itemId },
      { $set: setFields },
      { new: true },
    );
  },

  async softDelete(id: string, schoolId: string, deletedBy: string): Promise<boolean> {
    const result = await AdmissionForm.updateOne(
      { _id: id, schoolId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy } },
    );
    return result.modifiedCount > 0;
  },

  /** Forms issued 7+ days ago that were never submitted — feeds the
   *  reception-task auto-generation (`auto_form_overdue`, reserved for this
   *  module since Module 8 was built). */
  async findOverdueUnsubmitted(cutoff: Date): Promise<IAdmissionForm[]> {
    return AdmissionForm.find({
      verificationStatus: 'not_submitted', dateIssued: { $lte: cutoff }, isDeleted: false,
    }).lean<IAdmissionForm[]>();
  },
};
