import { admissionFormRepository, PaginatedAdmissionForms } from './admission-form.repository';
import { AdmissionForm, IAdmissionForm } from './admission-form.model';
import {
  issueAdmissionFormSchema,
  updatePaymentSchema,
  verifyFormSchema,
  addChecklistItemSchema,
  updateChecklistItemSchema,
  listAdmissionFormsSchema,
} from './admission-form.validation';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { uploadToR2 } from '../../lib/r2-storage';
import { nextSequence } from '../../lib/counter.model';
import { enquiryRepository } from '../enquiries/enquiry.repository';

const admissionFormCounterKey = (schoolId: string, year: number): string => `admissionForm:${schoolId}:${year}`;

async function seedAdmissionFormSequence(schoolId: string, year: number): Promise<number> {
  const prefix = `ADM-${year}-`;
  const regex = new RegExp(`^${prefix}(\\d+)$`);
  const docs = await AdmissionForm
    .find({ schoolId, formNumber: { $regex: regex } }, { formNumber: 1 })
    .lean<{ formNumber: string }[]>();
  let max = 0;
  for (const doc of docs) {
    const match = regex.exec(doc.formNumber);
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  return max;
}

async function generateFormNumber(schoolId: string): Promise<string> {
  const year = new Date().getFullYear();
  const seq = await nextSequence(
    admissionFormCounterKey(schoolId, year),
    () => seedAdmissionFormSequence(schoolId, year),
  );
  return `ADM-${year}-${String(seq).padStart(4, '0')}`;
}

export const admissionFormService = {
  async issueForm(rawInput: unknown, ctx: AuthContext): Promise<IAdmissionForm> {
    const data = issueAdmissionFormSchema.parse(rawInput);

    const enquiry = await enquiryRepository.findById(data.enquiryId, ctx.schoolId);
    if (!enquiry) throw new NotFoundError('Enquiry');

    const existing = await admissionFormRepository.findByEnquiryId(data.enquiryId, ctx.schoolId);
    if (existing) throw new ValidationError('An admission form has already been issued for this enquiry.');

    const formNumber = await generateFormNumber(ctx.schoolId);

    const form = await admissionFormRepository.create({
      schoolId:     ctx.schoolId,
      enquiryId:    data.enquiryId,
      formNumber,
      dateIssued:   new Date(),
      issuedById:   ctx.userId,
      issuedByName: ctx.displayName,
      formFee:      data.formFee,
      createdBy:    ctx.displayName,
    });

    await enquiryRepository.update(data.enquiryId, ctx.schoolId, { admissionFormId: form._id.toString() });

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'admission_form.issued',
      resource: 'admission_forms', resourceId: form._id.toString(),
      details: { enquiryId: data.enquiryId, formNumber, formFee: data.formFee }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return form;
  },

  async listForms(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedAdmissionForms> {
    const opts = listAdmissionFormsSchema.parse(rawQuery);
    return admissionFormRepository.findAll(ctx.schoolId, opts);
  },

  async getForm(id: string, ctx: AuthContext): Promise<IAdmissionForm> {
    const form = await admissionFormRepository.findById(id, ctx.schoolId);
    if (!form) throw new NotFoundError('Admission form');
    return form;
  },

  async getFormByEnquiry(enquiryId: string, ctx: AuthContext): Promise<IAdmissionForm | null> {
    return admissionFormRepository.findByEnquiryId(enquiryId, ctx.schoolId);
  },

  async updatePayment(id: string, rawInput: unknown, ctx: AuthContext): Promise<IAdmissionForm> {
    const data = updatePaymentSchema.parse(rawInput);
    const existing = await admissionFormService.getForm(id, ctx);

    const form = await admissionFormRepository.updatePayment(id, ctx.schoolId, data.paymentStatus, data.paymentTxnId, ctx.displayName);
    if (!form) throw new NotFoundError('Admission form');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'admission_form.payment_updated',
      resource: 'admission_forms', resourceId: id,
      details: { formNumber: existing.formNumber, paymentStatus: data.paymentStatus }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return form;
  },

  async recordSubmission(id: string, ctx: AuthContext): Promise<IAdmissionForm> {
    const existing = await admissionFormService.getForm(id, ctx);
    if (existing.verificationStatus === 'verified') {
      throw new ValidationError('This form is already verified.');
    }

    const form = await admissionFormRepository.recordSubmission(id, ctx.schoolId, ctx.displayName);
    if (!form) throw new NotFoundError('Admission form');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'admission_form.submitted',
      resource: 'admission_forms', resourceId: id, details: { formNumber: existing.formNumber }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return form;
  },

  /** Approves or rejects the form. Approval also moves the linked Enquiry to
   *  `admission_approved` — the SRD's Module 3 status flow explicitly "feeds
   *  Enquiry: admission_approved" on verification, so this isn't an optional
   *  side effect, it's the whole point of verifying a form. */
  async verifyForm(id: string, rawInput: unknown, ctx: AuthContext): Promise<IAdmissionForm> {
    const data = verifyFormSchema.parse(rawInput);
    const existing = await admissionFormService.getForm(id, ctx);
    if (existing.verificationStatus === 'not_submitted') {
      throw new ValidationError('This form has not been submitted yet — nothing to verify.');
    }
    if (existing.verificationStatus === 'verified') {
      throw new ValidationError('This form is already verified.');
    }

    const form = await admissionFormRepository.setVerification(id, ctx.schoolId, {
      verificationStatus: data.approve ? 'verified' : 'rejected',
      verifiedById:   data.approve ? ctx.userId : undefined,
      verifiedByName: data.approve ? ctx.displayName : undefined,
      verifiedAt:     data.approve ? new Date() : undefined,
      rejectionReason: data.approve ? undefined : data.rejectionReason,
    }, ctx.displayName);
    if (!form) throw new NotFoundError('Admission form');

    if (data.approve) {
      const enquiry = await enquiryRepository.findById(existing.enquiryId, ctx.schoolId);
      if (enquiry && enquiry.stage !== 'converted' && enquiry.stage !== 'admission_approved') {
        await enquiryRepository.updateStage(existing.enquiryId, ctx.schoolId, 'admission_approved', ctx.displayName,
          `Auto-updated: admission form ${existing.formNumber} verified.`);
      }
    }

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: data.approve ? 'admission_form.verified' : 'admission_form.rejected',
      resource: 'admission_forms', resourceId: id,
      details: { formNumber: existing.formNumber, rejectionReason: data.rejectionReason }, ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return form;
  },

  /** Reception fixes the flagged documents and sends it back through
   *  verification — the SRD's "Rejected → Resubmission Required → Submitted"
   *  loop, implemented as: rejected form + a fresh submission call. */
  async resubmit(id: string, ctx: AuthContext): Promise<IAdmissionForm> {
    const existing = await admissionFormService.getForm(id, ctx);
    if (existing.verificationStatus !== 'rejected') {
      throw new ValidationError('Only a rejected form can be resubmitted.');
    }
    const form = await admissionFormRepository.recordSubmission(id, ctx.schoolId, ctx.displayName);
    if (!form) throw new NotFoundError('Admission form');
    return form;
  },

  async addChecklistItem(id: string, rawInput: unknown, ctx: AuthContext): Promise<IAdmissionForm> {
    const { documentType } = addChecklistItemSchema.parse(rawInput);
    const form = await admissionFormRepository.addChecklistItem(id, ctx.schoolId, documentType, ctx.displayName);
    if (!form) throw new NotFoundError('Admission form');
    return form;
  },

  async removeChecklistItem(id: string, itemId: string, ctx: AuthContext): Promise<IAdmissionForm> {
    const form = await admissionFormRepository.removeChecklistItem(id, ctx.schoolId, itemId, ctx.displayName);
    if (!form) throw new NotFoundError('Admission form or document');
    return form;
  },

  async updateChecklistItem(id: string, itemId: string, rawInput: unknown, ctx: AuthContext): Promise<IAdmissionForm> {
    const data = updateChecklistItemSchema.parse(rawInput);
    const form = await admissionFormRepository.updateChecklistItem(id, ctx.schoolId, itemId, data, ctx.displayName);
    if (!form) throw new NotFoundError('Admission form or document');
    return form;
  },

  async uploadChecklistItemFile(id: string, itemId: string, file: Express.Multer.File, ctx: AuthContext): Promise<IAdmissionForm> {
    await admissionFormService.getForm(id, ctx); // 404s cleanly before hitting R2
    const { key, url } = await uploadToR2(file.buffer, file.mimetype, 'admission-forms/documents', ctx.schoolId);
    const form = await admissionFormRepository.updateChecklistItem(id, ctx.schoolId, itemId, {
      received: true, fileUrl: url, fileKey: key,
    }, ctx.displayName);
    if (!form) throw new NotFoundError('Admission form or document');
    return form;
  },

  async deleteForm(id: string, ctx: AuthContext): Promise<void> {
    const existing = await admissionFormService.getForm(id, ctx);
    const deleted = await admissionFormRepository.softDelete(id, ctx.schoolId, ctx.displayName);
    if (!deleted) throw new NotFoundError('Admission form');

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName, action: 'admission_form.deleted',
      resource: 'admission_forms', resourceId: id, details: { formNumber: existing.formNumber }, ip: ctx.ip, schoolId: ctx.schoolId,
    });
  },
};
