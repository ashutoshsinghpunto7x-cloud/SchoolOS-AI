import { SyllabusChapter, ISyllabusChapter } from './chapter.model';
import { classNameKey } from '../../lib/class-name';

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

// Same tolerance approach as marks-extraction's student-name fuzzy match —
// OCR/vision misreads a chapter title slightly often enough ("Nutrition in
// Plants" vs "Nutrtion in Plants") that strict equality would spawn
// duplicate chapters for what a teacher would call the same one.
function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

export const chapterRepository = {
  // `class` is matched via classNameKey (not the raw string) on both read and
  // write — Question Bank's class dropdown and the Timetable-derived class
  // values Planner queries with aren't guaranteed to agree on digit vs Roman
  // numeral for the same grade ("1" vs "I"), which otherwise makes a chapter
  // tagged from one surface invisible from the other. See
  // [[project_planner_chapter_403_bug]].
  async findAll(schoolId: string, cls: string, subject: string): Promise<ISyllabusChapter[]> {
    return SyllabusChapter.find({ schoolId, class: classNameKey(cls), subject }).sort({ order: 1, chapterName: 1 }).lean<ISyllabusChapter[]>();
  },

  async findByIds(schoolId: string, ids: string[]): Promise<ISyllabusChapter[]> {
    return SyllabusChapter.find({ schoolId, _id: { $in: ids } }).lean<ISyllabusChapter[]>();
  },

  /** Fuzzy-matches chapterName against existing chapters for this class+subject, creating one if none matches closely enough. */
  async findOrCreate(schoolId: string, cls: string, subject: string, chapterName: string, topic?: string): Promise<ISyllabusChapter> {
    const classKey = classNameKey(cls);
    const existing = await SyllabusChapter.find({ schoolId, class: classKey, subject }).lean<ISyllabusChapter[]>();
    const nameKey = normalize(chapterName);
    const maxDistance = nameKey.length <= 10 ? 1 : 3;

    let best: ISyllabusChapter | undefined;
    let bestDistance = maxDistance + 1;
    for (const chapter of existing) {
      const distance = levenshtein(nameKey, normalize(chapter.chapterName));
      if (distance < bestDistance) {
        bestDistance = distance;
        best = chapter;
      }
    }

    if (best && bestDistance <= maxDistance) {
      if (topic && !best.topics.some((t) => normalize(t) === normalize(topic))) {
        await SyllabusChapter.updateOne({ _id: best._id }, { $addToSet: { topics: topic } });
        best.topics.push(topic);
      }
      return best;
    }

    return SyllabusChapter.create({
      schoolId,
      class: classKey,
      subject,
      chapterName: chapterName.trim(),
      topics: topic ? [topic] : [],
    });
  },
};
