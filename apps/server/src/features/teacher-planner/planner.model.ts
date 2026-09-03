import mongoose, { Document, Schema } from 'mongoose';

export type PlannerTaskType =
  | 'explain' | 'activity' | 'worksheet' | 'homework' | 'doubt_session' | 'revision' | 'unit_test' | 'other';
export type PlannerTaskStatus = 'pending' | 'completed';

export interface IPlannerTask {
  taskId: string;
  title: string;
  type: PlannerTaskType;
  dueDate: Date;
  status: PlannerTaskStatus;
  completedAt?: Date;
  // Topic(s)/subtopic(s) this task covers — only set when the chapter behind it has a topicTree
  // (see planner-week.util.ts's buildChapterDayPlan). Optional so manual/legacy planner weeks
  // (and chapters with no topicTree) keep saving exactly as before.
  topicIds?: string[];
  subtopicIds?: string[];
}

export interface IPlannerWeek {
  weekNumber: number;
  startDate: Date;
  endDate: Date;
  chapterId: string;
  chapterName: string;
  topic?: string;
  tasks: IPlannerTask[];
}

export interface ITeacherPlanner extends Document {
  schoolId: string;
  teacherId: string;
  class: string;
  subject: string;
  academicYearStart: Date;
  academicYearEnd: Date;
  weeks: IPlannerWeek[];
  createdAt: Date;
  updatedAt: Date;
}

const PLANNER_TASK_TYPES: PlannerTaskType[] = [
  'explain', 'activity', 'worksheet', 'homework', 'doubt_session', 'revision', 'unit_test', 'other',
];

const plannerTaskSchema = new Schema<IPlannerTask>(
  {
    taskId:      { type: String, required: true },
    title:       { type: String, required: true, trim: true },
    type:        { type: String, enum: PLANNER_TASK_TYPES, required: true },
    dueDate:     { type: Date, required: true },
    status:      { type: String, enum: ['pending', 'completed'], default: 'pending' },
    completedAt: { type: Date },
    topicIds:    { type: [String], default: undefined },
    subtopicIds: { type: [String], default: undefined },
  },
  { _id: false },
);

const plannerWeekSchema = new Schema<IPlannerWeek>(
  {
    weekNumber:  { type: Number, required: true },
    startDate:   { type: Date, required: true },
    endDate:     { type: Date, required: true },
    chapterId:   { type: String, required: true },
    chapterName: { type: String, required: true, trim: true },
    topic:       { type: String, trim: true },
    tasks:       { type: [plannerTaskSchema], default: [] },
  },
  { _id: false },
);

const teacherPlannerSchema = new Schema<ITeacherPlanner>(
  {
    schoolId:          { type: String, required: true, default: 'DEMO_SCHOOL' },
    teacherId:         { type: String, required: true },
    class:             { type: String, required: true, trim: true },
    subject:           { type: String, required: true, trim: true },
    academicYearStart: { type: Date, required: true },
    academicYearEnd:   { type: Date, required: true },
    weeks:             { type: [plannerWeekSchema], default: [] },
  },
  { timestamps: true, versionKey: false },
);

// One planner per teacher+class+subject+year — re-uploading replaces weeks
// (upsert), matching the "teacher can rename/merge after" spirit already
// used for question-bank's chapter reconciliation.
teacherPlannerSchema.index({ schoolId: 1, teacherId: 1, class: 1, subject: 1, academicYearStart: 1 }, { unique: true });

export const TeacherPlanner = mongoose.model<ITeacherPlanner>('TeacherPlanner', teacherPlannerSchema);
