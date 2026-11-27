// Mirrors the server shapes in apps/server/src/features/school-posts.

export type SchoolPostKind = 'homework' | 'news' | 'activity';

export type ActivityCategory = 'academic' | 'sports' | 'arts_culture' | 'competition' | 'celebration' | 'other';

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  academic: 'Academic',
  sports: 'Sports',
  arts_culture: 'Arts & Culture',
  competition: 'Competition',
  celebration: 'Celebration',
  other: 'Other',
};

export const MAX_POST_PHOTOS = 4;

export interface PostClass {
  class: string;
  section: string;
}

export interface SchoolPost {
  _id: string;
  kind: SchoolPostKind;
  title: string;
  description?: string;
  /** Empty = the whole school. */
  classes: PostClass[];
  subject?: string;
  dueDate?: string;
  category?: ActivityCategory;
  activityDate?: string;
  photoIds: string[];
  createdByName: string;
  createdByRole: string;
  createdAt: string;
  canDelete: boolean;
}

export interface PostTarget extends PostClass {
  subjects: string[];
}

export interface PostTargets {
  classes: PostTarget[];
  kinds: SchoolPostKind[];
  canPostSchoolWide: boolean;
}

export interface NewSchoolPost {
  kind: SchoolPostKind;
  title: string;
  description: string;
  classes: PostClass[];
  subject?: string;
  dueDate?: string;
  category?: ActivityCategory;
  activityDate?: string;
  photos: Blob[];
}
