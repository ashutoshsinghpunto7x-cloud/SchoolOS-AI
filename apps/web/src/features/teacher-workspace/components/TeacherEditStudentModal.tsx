import { toast } from 'sonner';
import { X } from 'lucide-react';
import { StudentForm, StudentFormValues } from '@/features/students/components/StudentForm';
import { useCreateChangeRequest } from '@/features/student-change-requests/hooks/useStudentChangeRequests';
import { useUpdateStudentName } from '@/features/students/hooks/useStudents';
import type { Student } from '@schoolos/types';

interface Props {
  student: Student;
  onClose: () => void;
}

const normalizeStatus = (status: Student['admissionStatus']) =>
  status === 'inquiry' ? 'enquiry' : status === 'enrolled' || status === 'withdrawn' ? 'active' : status;

const normalizeDob = (dob?: string) => (dob ? new Date(dob).toISOString().split('T')[0] : '');

/** Only the fields that actually changed, in the shape the backend's updateStudentSchema expects. */
function diffChanges(values: StudentFormValues, student: Student): Record<string, unknown> {
  const changes: Record<string, unknown> = {};

  const scalarFields: (keyof StudentFormValues & keyof Student)[] = [
    'fullName', 'rollNumber', 'class', 'section', 'gender',
    'fatherName', 'motherName', 'parentPhone', 'alternatePhone', 'email', 'address', 'remarks',
  ];
  for (const field of scalarFields) {
    const nextValue = values[field] ?? '';
    const prevValue = (student[field] as string | undefined) ?? '';
    if (nextValue !== prevValue) changes[field] = values[field];
  }

  if (values.dateOfBirth !== normalizeDob(student.dateOfBirth)) {
    changes.dateOfBirth = values.dateOfBirth;
  }

  if (values.admissionStatus !== normalizeStatus(student.admissionStatus)) {
    changes.admissionStatus = values.admissionStatus;
  }

  const prevTags = student.tags ?? [];
  if (JSON.stringify(values.tags) !== JSON.stringify(prevTags)) {
    changes.tags = values.tags;
  }

  const nextFee = values.monthlyTuitionFee ? Number(values.monthlyTuitionFee) : undefined;
  if (nextFee !== student.monthlyTuitionFee) {
    changes.monthlyTuitionFee = nextFee;
  }

  return changes;
}

export function TeacherEditStudentModal({ student, onClose }: Props) {
  const { mutateAsync, isPending: isSendingRequest } = useCreateChangeRequest();
  const { mutateAsync: updateName, isPending: isSavingName } = useUpdateStudentName(student._id);
  const isPending = isSendingRequest || isSavingName;

  async function handleSubmit(values: StudentFormValues) {
    const changes = diffChanges(values, student);

    if (Object.keys(changes).length === 0) {
      toast.info('No changes to submit');
      return;
    }

    // Name typo fixes apply immediately (no admin approval needed) — everything
    // else still goes through the change-request review flow.
    const { fullName: nameChange, ...otherChanges } = changes;

    try {
      if (nameChange !== undefined) {
        await updateName(nameChange as string);
      }

      if (Object.keys(otherChanges).length > 0) {
        await mutateAsync({ studentId: student._id, changes: otherChanges });
        toast.success(nameChange !== undefined ? 'Name updated. Other changes sent for approval.' : 'Change request sent', {
          description: 'A school admin will review the remaining changes before they apply.',
        });
      } else {
        toast.success('Name updated');
      }
      onClose();
    } catch (err) {
      toast.error(nameChange !== undefined ? 'Failed to update name' : 'Failed to send change request', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-5 py-4 border-b border-gray-100 z-10">
          <div>
            <h3 className="text-base font-bold text-gray-900">Edit Student</h3>
            <p className="text-xs text-gray-400 mt-0.5">Name updates apply immediately. Other changes go to a school admin for approval.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100" type="button">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5">
          <StudentForm
            initialData={student}
            onSubmit={handleSubmit}
            isLoading={isPending}
            submitLabel="Save Changes"
            showMonthlyFee={false}
          />
        </div>
      </div>
    </div>
  );
}
