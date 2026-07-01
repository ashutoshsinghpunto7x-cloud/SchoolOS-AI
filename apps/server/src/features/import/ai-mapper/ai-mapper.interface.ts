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
    return request.sourceColumns.map((col) => {
      const normalised = col.toLowerCase().replace(/[\s_\-\.]+/g, '');
      const suggestedField = HEURISTIC_MAP[normalised] ?? null;

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

/** Simple heuristic mapping: normalised source name → SchoolOS field */
const HEURISTIC_MAP: Record<string, string> = {
  // Student fields
  fullname: 'fullName',
  name: 'fullName',
  studentname: 'fullName',
  class: 'class',
  grade: 'class',
  section: 'section',
  gender: 'gender',
  sex: 'gender',
  dob: 'dateOfBirth',
  dateofbirth: 'dateOfBirth',
  birthdate: 'dateOfBirth',
  fathername: 'fatherName',
  mothername: 'motherName',
  parentphone: 'parentPhone',
  phone: 'parentPhone',
  mobile: 'parentPhone',
  contact: 'parentPhone',
  alternatephoone: 'alternatePhone',
  email: 'email',
  address: 'address',
  admissionstatus: 'admissionStatus',
  status: 'admissionStatus',
  remarks: 'remarks',

  // Teacher fields
  teachername: 'fullName',
  department: 'department',
  subjects: 'subjects',
  subject: 'subjects',
  assignedclasses: 'assignedClasses',
  joiningdate: 'joiningDate',
  experienceyears: 'experienceYears',
  experience: 'experienceYears',
  employmentstatus: 'employmentStatus',

  // Fee fields
  studentid: 'studentId',
  feehead: 'feeHead',
  feetype: 'feeHead',
  academicyear: 'academicYear',
  month: 'month',
  duedate: 'dueDate',
  totalamount: 'totalAmount',
  amount: 'totalAmount',
  discountamount: 'discountAmount',
  discount: 'discountAmount',

  // Admissions / Enquiry fields
  interestedclass: 'interestedClass',
  parentname: 'parentName',
  parentemail: 'parentEmail',
  source: 'source',
  stage: 'stage',
  referredby: 'referredBy',
  counsellor: 'assignedCounsellor',
};
