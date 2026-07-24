import { BehaviorOption, IBehaviorOption, BehaviorCategory } from './behavior-option.model';

// The 6 school-wide defaults seeded the first time a school looks at its
// behaviour options. Wording chosen to read naturally as a quick-tap chip
// label and to cover the common positive/negative cases a homeroom or
// subject teacher would want to log day to day.
export const DEFAULT_BEHAVIOR_OPTIONS: { label: string; category: BehaviorCategory }[] = [
  { label: 'Excellent Participation', category: 'positive' },
  { label: 'Helped a Classmate',      category: 'positive' },
  { label: 'Late to Class',           category: 'negative' },
  { label: 'Incomplete Homework',     category: 'negative' },
  { label: 'Disruptive in Class',     category: 'negative' },
  { label: 'Argued with Teacher',     category: 'negative' },
];

export const behaviorOptionRepository = {
  /** Seeds the 6 defaults the first time a school has none configured yet — mirrors
   *  schoolSettingsService.getSettings' create-on-first-read pattern. */
  async ensureDefaults(schoolId: string): Promise<void> {
    const count = await BehaviorOption.countDocuments({ schoolId, isDefault: true });
    if (count > 0) return;
    await BehaviorOption.insertMany(
      DEFAULT_BEHAVIOR_OPTIONS.map((o) => ({
        schoolId, label: o.label, category: o.category, isDefault: true, isActive: true,
      })),
      { ordered: false },
    );
  },

  /** Options visible to the caller: all active school-wide options, plus — when a
   *  teacherId is given — that teacher's own custom options. Admin/principal pass
   *  includeInactive=true to also see deactivated options for management screens. */
  async findVisible(schoolId: string, teacherId?: string, includeInactive = false): Promise<IBehaviorOption[]> {
    const scopeFilter = teacherId
      ? [{ createdByTeacherId: { $exists: false } }, { createdByTeacherId: teacherId }]
      : [{ createdByTeacherId: { $exists: false } }];

    const query: Record<string, unknown> = { schoolId, $or: scopeFilter };
    if (!includeInactive) query.isActive = true;

    return BehaviorOption.find(query).sort({ isDefault: -1, createdAt: 1 }).lean<IBehaviorOption[]>();
  },

  async findById(id: string, schoolId: string): Promise<IBehaviorOption | null> {
    return BehaviorOption.findOne({ _id: id, schoolId }).lean<IBehaviorOption>();
  },

  async create(data: {
    schoolId: string;
    label: string;
    category: BehaviorCategory;
    createdByTeacherId?: string;
    createdBy?: string;
  }): Promise<IBehaviorOption> {
    return BehaviorOption.create({ ...data, isDefault: false, isActive: true });
  },

  async update(
    id: string,
    schoolId: string,
    data: { label?: string; category?: BehaviorCategory; isActive?: boolean },
  ): Promise<IBehaviorOption | null> {
    return BehaviorOption.findOneAndUpdate(
      { _id: id, schoolId },
      { $set: data },
      { new: true, runValidators: true },
    ).lean<IBehaviorOption>();
  },
};
