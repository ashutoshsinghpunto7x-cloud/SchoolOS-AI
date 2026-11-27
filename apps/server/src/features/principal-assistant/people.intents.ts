import { IntentDefinition } from './intent-router';
import { peopleAssistantData } from './people.data';
import { AuthContext } from '../../lib/auth-context';

// Name-level questions: who is absent, and what a named student has scored.
export const peopleIntents: IntentDefinition<AuthContext, unknown>[] = [
  {
    id: 'ABSENT_TEACHERS_LIST',
    description:
      'WHO / the NAMES of teachers or staff absent today — e.g. "which teachers are absent", "absent teachers ke naam", ' +
      '"aaj kaun se teacher nahi aaye". (For just a count, use TEACHER_ABSENT_COUNT.)',
    fetchData: peopleAssistantData.getAbsentTeachers,
  },
  {
    id: 'ABSENT_STUDENTS_LIST',
    description:
      'WHO / the NAMES of students absent today, optionally for one class — e.g. "which students are absent in class 5", ' +
      '"absent bachon ki list". (For just a count, use STUDENT_ABSENT_COUNT.)',
    fetchData: peopleAssistantData.getAbsentStudents,
  },
  {
    id: 'STUDENT_LOOKUP',
    description:
      'Anything about ONE named student: marks/score/result in a subject or exam, their attendance, fees due, class or ' +
      'parent — e.g. "how many marks did Arav score in Hindi", "Riya ka maths result", "show me Rohan\'s attendance".',
    fetchData: peopleAssistantData.getStudentLookup,
  },
];
