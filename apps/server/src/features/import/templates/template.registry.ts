import * as XLSX from 'xlsx';
import { ImportType } from '../import-session.model';

export interface ImportTemplate {
  importType: ImportType;
  name: string;
  description: string;
  headers: string[];
  sampleRows: Array<Record<string, string>>;
}

const TEMPLATES: Record<ImportType, ImportTemplate> = {
  students: {
    importType: 'students',
    name: 'Student Import Template',
    description: 'Import or update student records. Required: fullName, class, section, gender, dateOfBirth, fatherName, motherName, parentPhone. If Admission Number matches an existing student, that record is updated instead of duplicated.',
    headers: [
      'admissionNumber', 'fullName', 'class', 'section', 'gender', 'dateOfBirth',
      'fatherName', 'motherName', 'parentPhone', 'locality', 'address',
    ],
    sampleRows: [
      {
        admissionNumber: 'ADM-2024-0001',
        fullName: 'Arjun Sharma',
        class: '10',
        section: 'A',
        gender: 'male',
        dateOfBirth: '2009-04-15',
        fatherName: 'Ramesh Sharma',
        motherName: 'Sunita Sharma',
        parentPhone: '9876543210',
        locality: 'Kothrud',
        address: '12 MG Road, Pune',
      },
      {
        admissionNumber: 'ADM-2024-0002',
        fullName: 'Priya Patel',
        class: '9',
        section: 'B',
        gender: 'female',
        dateOfBirth: '2010-08-22',
        fatherName: 'Nilesh Patel',
        motherName: 'Rekha Patel',
        parentPhone: '9012345678',
        locality: 'Baner',
        address: '',
      },
    ],
  },

  teachers: {
    importType: 'teachers',
    name: 'Teacher Import Template',
    description: 'Import teacher records. Required: fullName, gender, phone.',
    headers: [
      'fullName', 'gender', 'phone', 'alternatePhone', 'email',
      'address', 'department', 'subjects', 'assignedClasses',
      'experienceYears', 'joiningDate', 'employmentStatus', 'remarks',
    ],
    sampleRows: [
      {
        fullName: 'Meena Joshi',
        gender: 'female',
        phone: '9876500001',
        alternatePhone: '',
        email: 'meena@school.edu',
        address: 'Flat 5, Shivaji Nagar',
        department: 'Science',
        subjects: 'Physics,Chemistry',
        assignedClasses: '11A,12A',
        experienceYears: '8',
        joiningDate: '2016-06-01',
        employmentStatus: 'active',
        remarks: '',
      },
    ],
  },

  fees: {
    importType: 'fees',
    name: 'Fee Records Import Template',
    description: 'Import fee records. Required: admissionNumber (or studentId), feeHead, academicYear, dueDate, totalAmount. Matched by student + fee head + academic year + month — re-uploading updates the existing record instead of duplicating it.',
    headers: [
      'admissionNumber', 'studentId', 'feeHead', 'customHead', 'description',
      'academicYear', 'month', 'dueDate', 'totalAmount',
      'discountAmount', 'discountReason', 'notes',
    ],
    sampleRows: [
      {
        admissionNumber: 'ADM-2024-0001',
        feeHead: 'tuition',
        customHead: '',
        description: 'Term 1 Tuition Fee',
        academicYear: '2024-25',
        month: 'April',
        dueDate: '2024-04-15',
        totalAmount: '15000',
        discountAmount: '0',
        discountReason: '',
        notes: '',
      },
    ],
  },

  admissions: {
    importType: 'admissions',
    name: 'Admissions Enquiry Import Template',
    description: 'Import admission enquiries. Required: studentName, interestedClass, parentName, parentPhone, source.',
    headers: [
      'studentName', 'studentDateOfBirth', 'interestedClass', 'gender',
      'currentSchool', 'currentClass', 'parentName', 'parentPhone',
      'alternatePhone', 'parentEmail', 'stage', 'source',
      'referredBy', 'assignedCounsellor', 'followUpDate', 'remarks',
    ],
    sampleRows: [
      {
        studentName: 'Rohan Mehta',
        studentDateOfBirth: '2011-03-10',
        interestedClass: '6',
        gender: 'male',
        currentSchool: 'St. Mary School',
        currentClass: '5',
        parentName: 'Vikram Mehta',
        parentPhone: '9988776655',
        alternatePhone: '',
        parentEmail: 'vikram@example.com',
        stage: 'new_enquiry',
        source: 'walk_in',
        referredBy: '',
        assignedCounsellor: '',
        followUpDate: '',
        remarks: '',
      },
    ],
  },

  attendance: {
    importType: 'attendance',
    name: 'Attendance History Import Template',
    description: 'Backfill historical attendance from past registers. Required: admissionNumber, class, section, date, status. Matched by Admission Number + Date — re-uploading updates the existing record for that student/date instead of duplicating it.',
    headers: ['admissionNumber', 'class', 'section', 'date', 'status', 'note'],
    sampleRows: [
      {
        admissionNumber: 'ADM-2024-0001',
        class: '10',
        section: 'A',
        date: '2024-04-15',
        status: 'present',
        note: '',
      },
      {
        admissionNumber: 'ADM-2024-0002',
        class: '9',
        section: 'B',
        date: '2024-04-15',
        status: 'absent',
        note: 'Informed by parent',
      },
    ],
  },
};

/** Returns template metadata for the given import type */
export const getTemplate = (importType: ImportType): ImportTemplate => {
  const template = TEMPLATES[importType];
  if (!template) throw new Error(`No template found for import type: ${importType}`);
  return template;
};

/** Returns all template metadata (without sample data for list endpoints) */
export const listTemplates = (): Array<Omit<ImportTemplate, 'sampleRows'>> =>
  Object.values(TEMPLATES).map(({ sampleRows: _s, ...rest }) => rest);

/**
 * Generates a downloadable .xlsx buffer for the given import type.
 * The first row is headers; the next rows are sample data.
 */
export const generateTemplateBuffer = (importType: ImportType): Buffer => {
  const template = getTemplate(importType);
  const wb = XLSX.utils.book_new();
  const rows = [template.headers, ...template.sampleRows.map((r) => template.headers.map((h) => r[h] ?? ''))];
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws['!cols'] = template.headers.map(() => ({ wch: 22 }));

  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  return Buffer.from(buf);
};
