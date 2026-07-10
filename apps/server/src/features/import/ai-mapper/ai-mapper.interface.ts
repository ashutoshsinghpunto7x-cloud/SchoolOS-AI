/**
 * AI Column Mapping — Architecture Interface Only.
 *
 * This interface defines the contract for an AI-assisted column mapping service.
 * No implementation is provided. A future service (e.g., using OpenAI function-calling)
 * should implement this interface and be registered in the import engine.
 *
 * The mapping process:
 *   1. User uploads file with their own column headers (e.g., "Student Full Name", "DOB", "Mobile")
 *   2. AI suggests SchoolOS field mappings (e.g., "fullName", "dateOfBirth", "parentPhone")
 *   3. User can accept, reject, or manually override each suggestion
 *   4. Confirmed mapping is stored on the ImportSession and applied during validation
 */

export interface ColumnMappingSuggestion {
  /** Original column header from the uploaded file */
  sourceColumn: string;
  /** Suggested SchoolOS schema field name */
  suggestedField: string | null;
  /** AI confidence score 0–1 */
  confidence: number;
  /** Human-readable display name for the suggested field */
  fieldLabel: string;
  /** Whether the suggestion requires user confirmation */
  requiresConfirmation: boolean;
}

export interface ColumnMappingRequest {
  importType: string;
  sourceColumns: string[];
  /** Sample data rows for context (first 3 rows) */
  sampleRows: Array<Record<string, unknown>>;
}

export interface IAIMapper {
  /**
   * Suggest field mappings for the uploaded file's columns.
   * Returns one suggestion per source column.
   */
  suggestMappings(request: ColumnMappingRequest): Promise<ColumnMappingSuggestion[]>;
}

/**
 * Heuristic (non-AI) fallback mapper.
 * Used when AI mapping is not configured.
 * Matches source columns to schema fields via normalized string comparison.
 */
export class HeuristicMapper implements IAIMapper {
  async suggestMappings(request: ColumnMappingRequest): Promise<ColumnMappingSuggestion[]> {
    // Scoped per import type — a bare "Phone"/"Email"/"Remarks" column means a
    // different schema field depending on whether it's a student, teacher, or
    // admissions file (e.g. teacher.phone vs. student.parentPhone), so the same
    // header must resolve differently per type instead of one shared table.
    const map = HEURISTIC_MAPS[request.importType] ?? {};
    return request.sourceColumns.map((col) => {
      const normalised = col.toLowerCase().replace(/[\s_\-\.]+/g, '');
      const suggestedField = map[normalised] ?? null;

      return {
        sourceColumn: col,
        suggestedField,
        confidence: suggestedField ? 0.9 : 0,
        fieldLabel: suggestedField ?? col,
        requiresConfirmation: !suggestedField,
      };
    });
  }
}

/** Heuristic mapping per import type: normalised source column name → SchoolOS field. */
const HEURISTIC_MAPS: Record<string, Record<string, string>> = {
  students: {
    fullname: 'fullName',
    name: 'fullName',
    studentname: 'fullName',
    studentfullname: 'fullName',
    class: 'class',
    grade: 'class',
    section: 'section',
    gender: 'gender',
    sex: 'gender',
    dob: 'dateOfBirth',
    dateofbirth: 'dateOfBirth',
    birthdate: 'dateOfBirth',
    fathername: 'fatherName',
    fatherfullname: 'fatherName',
    mothername: 'motherName',
    motherfullname: 'motherName',
    parentphone: 'parentPhone',
    guardianphone: 'parentPhone',
    phone: 'parentPhone',
    mobile: 'parentPhone',
    mobilenumber: 'parentPhone',
    phonenumber: 'parentPhone',
    contact: 'parentPhone',
    contactnumber: 'parentPhone',
    alternatephone: 'alternatePhone',
    alternatephoone: 'alternatePhone', // legacy typo, kept for backward compatibility
    secondaryphone: 'alternatePhone',
    email: 'email',
    emailid: 'email',
    emailaddress: 'email',
    address: 'address',
    admissionstatus: 'admissionStatus',
    status: 'admissionStatus',
    remarks: 'remarks',
    notes: 'remarks',
    rollnumber: 'rollNumber',
    rollno: 'rollNumber',
    admissionnumber: 'admissionNumber',
    admissionno: 'admissionNumber',
  },

  teachers: {
    fullname: 'fullName',
    name: 'fullName',
    teachername: 'fullName',
    employeename: 'fullName',
    facultyname: 'fullName',
    staffname: 'fullName',
    gender: 'gender',
    sex: 'gender',
    dob: 'dateOfBirth',
    dateofbirth: 'dateOfBirth',
    birthdate: 'dateOfBirth',
    phone: 'phone',
    mobile: 'phone',
    mobilenumber: 'phone',
    phonenumber: 'phone',
    contact: 'phone',
    contactnumber: 'phone',
    alternatephone: 'alternatePhone',
    secondaryphone: 'alternatePhone',
    email: 'email',
    emailid: 'email',
    emailaddress: 'email',
    address: 'address',
    department: 'department',
    dept: 'department',
    subjects: 'subjects',
    subject: 'subjects',
    assignedclasses: 'assignedClasses',
    classes: 'assignedClasses',
    class: 'assignedClasses',
    joiningdate: 'joiningDate',
    dateofjoining: 'joiningDate',
    doj: 'joiningDate',
    experienceyears: 'experienceYears',
    experience: 'experienceYears',
    yearsofexperience: 'experienceYears',
    employmentstatus: 'employmentStatus',
    status: 'employmentStatus',
    remarks: 'remarks',
    notes: 'remarks',
  },

  fees: {
    studentid: 'studentId',
    feehead: 'feeHead',
    feetype: 'feeHead',
    customhead: 'customHead',
    description: 'description',
    academicyear: 'academicYear',
    month: 'month',
    duedate: 'dueDate',
    totalamount: 'totalAmount',
    amount: 'totalAmount',
    discountamount: 'discountAmount',
    discount: 'discountAmount',
    discountreason: 'discountReason',
    notes: 'notes',
  },

  admissions: {
    studentname: 'studentName',
    fullname: 'studentName',
    name: 'studentName',
    dob: 'studentDateOfBirth',
    studentdateofbirth: 'studentDateOfBirth',
    interestedclass: 'interestedClass',
    gender: 'gender',
    currentschool: 'currentSchool',
    currentclass: 'currentClass',
    parentname: 'parentName',
    guardianname: 'parentName',
    parentphone: 'parentPhone',
    phone: 'parentPhone',
    mobile: 'parentPhone',
    alternatephone: 'alternatePhone',
    parentemail: 'parentEmail',
    email: 'parentEmail',
    stage: 'stage',
    source: 'source',
    referredby: 'referredBy',
    counsellor: 'assignedCounsellor',
    assignedcounsellor: 'assignedCounsellor',
    followupdate: 'followUpDate',
    remarks: 'remarks',
    notes: 'remarks',
  },

  attendance: {
    admissionnumber: 'admissionNumber',
    admissionno: 'admissionNumber',
    class: 'class',
    section: 'section',
    date: 'date',
    status: 'status',
    remarks: 'note',
    notes: 'note',
    note: 'note',
  },
};
