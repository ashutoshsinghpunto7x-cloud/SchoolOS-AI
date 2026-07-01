import {
  enquiryRepository,
  CreateEnquiryData,
  PaginatedEnquiries,
  StageCounts,
} from './enquiry.repository';
import { enquiryNoteRepository } from './enquiry.note.repository';
import { IEnquiry } from './enquiry.model';
import { IEnquiryNote } from './enquiry.note.model';
import {
  createEnquirySchema,
  updateEnquirySchema,
  updateStageSchema,
  listEnquiriesSchema,
  convertToStudentSchema,
  createEnquiryNoteSchema,
  updateEnquiryNoteSchema,
} from './enquiry.validation';
import { NotFoundError, ValidationError } from '../../middlewares/errorHandler';
import { AuthContext } from '../../lib/auth-context';
import { auditService } from '../audit/audit.service';
import { studentService } from '../students/student.service';
import { IStudent } from '../students/student.model';

// ── Service ───────────────────────────────────────────────────────────────────

export const enquiryService = {
  // ── Enquiry CRUD ────────────────────────────────────────────────────────────

  async createEnquiry(rawInput: unknown, ctx: AuthContext): Promise<IEnquiry> {
    const data = createEnquirySchema.parse(rawInput);

    const createData: CreateEnquiryData = {
      schoolId:           ctx.schoolId,
      studentName:        data.studentName,
      studentDateOfBirth: data.studentDateOfBirth ? new Date(data.studentDateOfBirth) : undefined,
      interestedClass:    data.interestedClass,
      gender:             data.gender,
      currentSchool:      data.currentSchool,
      currentClass:       data.currentClass,
      parentName:         data.parentName,
      parentPhone:        data.parentPhone,
      alternatePhone:     data.alternatePhone || undefined,
      parentEmail:        data.parentEmail || undefined,
      stage:              data.stage,
      source:             data.source,
      referredBy:         data.referredBy,
      assignedCounsellor: data.assignedCounsellor,
      followUpDate:       data.followUpDate ? new Date(data.followUpDate) : undefined,
      tags:               data.tags,
      remarks:            data.remarks,
      metadata:           data.metadata,
      createdBy:          ctx.displayName,
    };

    const enquiry = await enquiryRepository.create(createData);

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'enquiry.created',
      resource:        'enquiries',
      resourceId:      enquiry._id.toString(),
      details:         { studentName: data.studentName, source: data.source, stage: data.stage },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    return enquiry;
  },

  async listEnquiries(rawQuery: unknown, ctx: AuthContext): Promise<PaginatedEnquiries> {
    const opts = listEnquiriesSchema.parse(rawQuery);
    return enquiryRepository.findAll(ctx.schoolId, opts);
  },

  async getEnquiry(id: string, ctx: AuthContext): Promise<IEnquiry> {
    const enquiry = await enquiryRepository.findById(id, ctx.schoolId);
    if (!enquiry) throw new NotFoundError('Enquiry');
    return enquiry;
  },

  async getStageCounts(ctx: AuthContext): Promise<StageCounts[]> {
    return enquiryRepository.countByStage(ctx.schoolId);
  },

  async updateEnquiry(id: string, rawInput: unknown, ctx: AuthContext): Promise<IEnquiry> {
    const data = updateEnquirySchema.parse(rawInput);
    if (!Object.keys(data).length) throw new ValidationError('No fields to update');

    const existing = await enquiryRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Enquiry');

    const update: Partial<IEnquiry> & { updatedBy: string } = {
      ...data,
      studentDateOfBirth: data.studentDateOfBirth ? new Date(data.studentDateOfBirth) : undefined,
      followUpDate:       data.followUpDate ? new Date(data.followUpDate) : undefined,
      alternatePhone:     data.alternatePhone || undefined,
      parentEmail:        data.parentEmail || undefined,
      updatedBy:          ctx.displayName,
    };

    const enquiry = await enquiryRepository.update(id, ctx.schoolId, update);
    if (!enquiry) throw new NotFoundError('Enquiry');

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'enquiry.updated',
      resource:        'enquiries',
      resourceId:      id,
      details:         { fields: Object.keys(data) },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    return enquiry;
  },

  async updateStage(id: string, rawInput: unknown, ctx: AuthContext): Promise<IEnquiry> {
    const { stage, remarks } = updateStageSchema.parse(rawInput);

    const existing = await enquiryRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Enquiry');

    if (existing.stage === 'converted') {
      throw new ValidationError('Converted enquiries cannot change stage');
    }

    const enquiry = await enquiryRepository.updateStage(
      id, ctx.schoolId, stage, ctx.displayName, remarks
    );
    if (!enquiry) throw new NotFoundError('Enquiry');

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'enquiry.stage_changed',
      resource:        'enquiries',
      resourceId:      id,
      details:         { from: existing.stage, to: stage, remarks },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });

    return enquiry;
  },

  async convertToStudent(
    id: string,
    rawInput: unknown,
    ctx: AuthContext,
  ): Promise<{ enquiry: IEnquiry; student: IStudent }> {
    const existing = await enquiryRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Enquiry');

    if (existing.stage === 'converted' || existing.conversionData?.studentId) {
      throw new ValidationError('This enquiry has already been converted to a student');
    }

    const data = convertToStudentSchema.parse(rawInput);

    // Build student payload using enquiry data as foundation
    const studentPayload = {
      fullName:        existing.studentName,
      class:           data.class,
      section:         data.section,
      gender:          data.gender,
      dateOfBirth:     data.dateOfBirth,
      fatherName:      data.fatherName,
      motherName:      data.motherName,
      parentPhone:     existing.parentPhone,
      alternatePhone:  existing.alternatePhone || '',
      address:         data.address,
      admissionStatus: data.admissionStatus,
      tags:            existing.tags,
      remarks:         existing.remarks,
    };

    // Reuse student service — handles admission number generation + audit
    const student = await studentService.createStudent(studentPayload, ctx);

    const updatedEnquiry = await enquiryRepository.markConverted(
      id,
      ctx.schoolId,
      {
        studentId:   student._id.toString(),
        convertedAt: new Date(),
        convertedBy: ctx.displayName,
      },
      ctx.displayName,
    );
    if (!updatedEnquiry) throw new NotFoundError('Enquiry');

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'enquiry.converted',
      resource:        'enquiries',
      resourceId:      id,
      details:         {
        studentId:      student._id.toString(),
        studentName:    student.fullName,
        admissionNumber: student.admissionNumber,
      },
      ip:       ctx.ip,
      schoolId: ctx.schoolId,
    });

    return { enquiry: updatedEnquiry, student };
  },

  async deleteEnquiry(id: string, ctx: AuthContext): Promise<void> {
    const existing = await enquiryRepository.findById(id, ctx.schoolId);
    if (!existing) throw new NotFoundError('Enquiry');

    const deleted = await enquiryRepository.softDelete(id, ctx.schoolId, ctx.displayName);
    if (!deleted) throw new NotFoundError('Enquiry');

    auditService.log({
      userId:          ctx.userId,
      userDisplayName: ctx.displayName,
      action:          'enquiry.deleted',
      resource:        'enquiries',
      resourceId:      id,
      details:         { studentName: existing.studentName, parentPhone: existing.parentPhone },
      ip:              ctx.ip,
      schoolId:        ctx.schoolId,
    });
  },

  // ── Notes ───────────────────────────────────────────────────────────────────

  async listNotes(enquiryId: string, ctx: AuthContext): Promise<IEnquiryNote[]> {
    const enquiry = await enquiryRepository.findById(enquiryId, ctx.schoolId);
    if (!enquiry) throw new NotFoundError('Enquiry');
    return enquiryNoteRepository.findByEnquiry(enquiryId, ctx.schoolId);
  },

  async createNote(enquiryId: string, rawInput: unknown, ctx: AuthContext): Promise<IEnquiryNote> {
    const enquiry = await enquiryRepository.findById(enquiryId, ctx.schoolId);
    if (!enquiry) throw new NotFoundError('Enquiry');

    const { content, type } = createEnquiryNoteSchema.parse(rawInput);

    return enquiryNoteRepository.create({
      enquiryId,
      schoolId:      ctx.schoolId,
      type,
      content,
      createdByName: ctx.displayName,
      createdById:   ctx.userId,
    });
  },

  async updateNote(
    enquiryId: string,
    noteId: string,
    rawInput: unknown,
    ctx: AuthContext,
  ): Promise<IEnquiryNote> {
    const note = await enquiryNoteRepository.findNoteById(noteId, enquiryId, ctx.schoolId);
    if (!note) throw new NotFoundError('Note');

    const data = updateEnquiryNoteSchema.parse(rawInput);
    if (!Object.keys(data).length) throw new ValidationError('No fields to update');

    const updated = await enquiryNoteRepository.update(noteId, data);
    if (!updated) throw new NotFoundError('Note');
    return updated;
  },

  async deleteNote(enquiryId: string, noteId: string, ctx: AuthContext): Promise<void> {
    const note = await enquiryNoteRepository.findNoteById(noteId, enquiryId, ctx.schoolId);
    if (!note) throw new NotFoundError('Note');

    const deleted = await enquiryNoteRepository.softDelete(noteId, enquiryId);
    if (!deleted) throw new NotFoundError('Note');
  },
};
