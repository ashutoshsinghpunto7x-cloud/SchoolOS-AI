interface DraftKeyParams {
  schoolId: string;
  teacherId: string;
  module: string;
  [segment: string]: string | undefined;
}

/** Central key builder — every module (attendance, marks, homework, …) calls this
 *  with its own params instead of inlining template strings, so drafts across the
 *  app stay namespaced and collision-free by construction. */
export function buildDraftKey({ schoolId, teacherId, module, ...rest }: DraftKeyParams): string {
  const restSegments = Object.values(rest).filter((v): v is string => !!v);
  return ['draft', schoolId, teacherId, module, ...restSegments].join(':');
}
