/**
 * School Life content (homework, news, activities) for the pitch demo, covering
 * the classes of both demo parents: 6-A, 6-B and 7-A.
 *
 * Safe to run on its own and to re-run: posts are matched on kind + title +
 * classes, missing ones are added, and photos are attached only to posts that
 * have none. Nothing is deleted. Posts are written straight to the model, so no
 * alerts are sent.
 *
 * Photos are read from ./photos/<name>.jpg (or .png); a post whose file is
 * missing is saved without that photo.
 *
 * Run alone: npx tsx src/scripts/pitch-demo/school-posts.ts  (from apps/server)
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import dns from 'dns';
import { SchoolPost, ActivityCategory, PostClass, SchoolPostKind } from '../../features/school-posts/school-post.model';
import { User } from '../../features/users/user.model';
import { saveImage, SCHOOL_POST_BUCKET } from '../../lib/image-store';
import { SCHOOL_ID, STAFF, TEACHERS, at, daysAgo, daysFromNow, iso, log } from './common';

const PHOTO_DIR = path.resolve(__dirname, 'photos');

const C6A: PostClass = { class: '6', section: 'A' };
const C6B: PostClass = { class: '6', section: 'B' };
const C7A: PostClass = { class: '7', section: 'A' };

/** 'principal' or the teacher index from TEACHERS. */
type Author = 'principal' | 1 | 2 | 3 | 4 | 5;

interface PostPlan {
  kind: SchoolPostKind;
  title: string;
  description: string;
  author: Author;
  classes?: PostClass[];
  postedDaysAgo: number;
  subject?: string;
  dueInDays?: number;
  category?: ActivityCategory;
  activityDate?: string;
  photos?: string[];
  /** Licence credit for the photos; full sources are in photos/CREDITS.md. */
  credit?: string;
}

const homework = (
  cls: PostClass, author: Exclude<Author, 'principal'>, postedDaysAgo: number, dueInDays: number, title: string, description: string
): PostPlan => ({
  kind: 'homework', title, description, author, classes: [cls], postedDaysAgo, dueInDays,
  subject: TEACHERS[author - 1].subject,
});

const POSTS: PostPlan[] = [
  // ── Homework ──────────────────────────────────────────────────────────────
  homework(C6A, 1, 0, 3, 'Exercise 4.2 — questions 1 to 8', 'Do them in your Maths notebook. Show each step.'),
  homework(C6A, 2, 0, 4, 'Draw a balanced food plate', 'Draw and label the nutrients on one page. Colour it.'),
  homework(C6A, 3, 1, 3, "Read “Taro's Reward”", 'Read the chapter once aloud and write five new words with meanings.'),
  homework(C6A, 4, 1, 5, 'पाठ "नादान दोस्त" के प्रश्न-उत्तर', 'प्रश्न 1 से 5 के उत्तर अपनी कॉपी में साफ़-साफ़ लिखें।'),
  homework(C6A, 5, 2, 6, 'Map work: latitudes and longitudes', 'Mark the Equator, both Tropics and the Prime Meridian on an outline world map.'),

  homework(C6B, 1, 0, 3, 'Fractions worksheet — Class 6-B', 'Solve questions 1 to 10 on adding and subtracting fractions.'),
  homework(C6B, 2, 0, 4, 'Separation of substances at home', 'List three ways your family separates things in the kitchen.'),
  homework(C6B, 3, 1, 3, 'Paragraph: My favourite festival', 'Write 100 to 120 words in your English notebook.'),
  homework(C6B, 4, 2, 5, 'कविता याद करें — "वह चिड़िया जो"', 'पहले दो पद याद करें और सुंदर लिखावट में लिखें।'),
  homework(C6B, 5, 2, 6, 'Timeline of early cities', 'Make a simple timeline from the chapter “In the Earliest Cities”.'),

  homework(C7A, 1, 0, 3, 'Simple equations — practice set', 'Exercise 4.3, questions 1 to 6. Check each answer by putting it back in.'),
  homework(C7A, 2, 0, 4, 'Acids and bases: kitchen test', 'Test three items with turmeric water and note the colour change.'),
  homework(C7A, 3, 1, 3, 'Summary of “Three Questions”', 'Write the story in your own words in about 150 words.'),
  homework(C7A, 4, 1, 5, 'अनुच्छेद लेखन — "मेरी दादी माँ"', 'लगभग 100 शब्दों में अनुच्छेद लिखें।'),
  homework(C7A, 5, 2, 6, 'Diagram: layers of the Earth', 'Draw and label the crust, mantle and core.'),

  // ── News (school-wide) ────────────────────────────────────────────────────
  { kind: 'news', author: 'principal', postedDaysAgo: 0, title: 'Winter timings from Monday', description: 'From Monday, school starts at 9:00 AM and ends at 2:30 PM.' },
  { kind: 'news', author: 'principal', postedDaysAgo: 1, title: 'Annual Sports Day on 18 December', description: 'House-wise athletics, relay races and prize distribution on the school ground. Parents are welcome.' },
  { kind: 'news', author: 'principal', postedDaysAgo: 3, title: 'Winter uniform from 1 December', description: 'Students should come in the school blazer or sweater with black shoes. Please write your child’s name inside.' },
  { kind: 'news', author: 'principal', postedDaysAgo: 5, title: 'Winter break: 25 December to 1 January', description: 'School stays closed for the winter break. Holiday homework will be shared before the break.' },
  { kind: 'news', author: 'principal', postedDaysAgo: 7, title: 'Parent-Teacher Meeting on 14 January', description: '9:00 AM to 1:00 PM in the respective classrooms. Please bring your child’s report card.' },

  // ── Activities ────────────────────────────────────────────────────────────
  {
    kind: 'activity', author: 3, classes: [C7A], postedDaysAgo: 1, category: 'academic', activityDate: '2026-11-26',
    title: 'Class presentation and group discussion',
    description: 'Class 7-A presented to the class and then discussed their ideas in groups. Confident speaking and good teamwork.',
    credit: 'Tomwsulcer (CC BY-SA 3.0), Juby.eipe (CC BY-SA 4.0)',
    photos: ['presentation-7a-1', 'presentation-7a-2'],
  },
  {
    kind: 'activity', author: 1, classes: [C6A], postedDaysAgo: 2, category: 'academic', activityDate: '2026-11-25',
    title: 'Class presentation at the blackboard',
    description: 'Class 6-A took turns presenting number charts and a mind map to the class.',
    credit: 'McKay Savage (CC BY 2.0), Government of NCT of Delhi (CC BY-SA 4.0)',
    photos: ['presentation-6a-1', 'presentation-6a-2'],
  },
  {
    kind: 'activity', author: 2, classes: [C6B], postedDaysAgo: 3, category: 'academic', activityDate: '2026-11-24',
    title: 'Science models and exhibition visit',
    description: 'Class 6-B showed how working models run and took notes at the mobile science exhibition.',
    credit: "Vice President's Secretariat (GODL-India), Biswarup Ganguly (CC BY 3.0)",
    photos: ['science-6b-1', 'science-6b-2'],
  },
  {
    kind: 'activity', author: 'principal', postedDaysAgo: 6, category: 'sports', activityDate: '2026-11-21',
    title: 'Inter-house Athletics Meet',
    description: 'Races, relay and kho-kho across all four houses.',
    credit: 'Jasper van’t Veen (CC BY 2.0), Raihanwali (CC BY-SA 3.0)',
    photos: ['sports-1', 'sports-2'],
  },
  {
    kind: 'activity', author: 'principal', postedDaysAgo: 13, category: 'celebration', activityDate: '2026-11-14',
    title: 'Children’s Day celebration',
    description: 'Dance performances and group games made it a happy day for everyone.',
    credit: 'Indian Navy (GODL-India), Pal85akash (CC BY-SA 4.0)',
    photos: ['childrens-day-1', 'childrens-day-2'],
  },
  {
    kind: 'activity', author: 'principal', postedDaysAgo: 18, category: 'arts_culture', activityDate: '2026-11-07',
    title: 'Diwali rangoli and diya decoration',
    description: 'Students made colourful rangoli and lit diyas before the Diwali break.',
    credit: 'Anugya Chidar, Sunidhi243 (CC BY-SA 4.0)',
    photos: ['rangoli-1', 'rangoli-2'],
  },
];

function photoFile(name: string): { file: string; contentType: string } | null {
  for (const [ext, contentType] of [['jpg', 'image/jpeg'], ['png', 'image/png']]) {
    const file = path.join(PHOTO_DIR, `${name}.${ext}`);
    if (fs.existsSync(file)) return { file, contentType };
  }
  return null;
}

/** Due dates never land on a Sunday. */
function dueDay(inDays: number): string {
  const d = daysFromNow(inDays);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return iso(d);
}

export async function seedSchoolPosts(): Promise<void> {
  const emails: Record<string, string> = { principal: STAFF.find((s) => s.key === 'principal')!.email };
  for (const t of TEACHERS) emails[t.index] = t.email;
  const users = await User.find({ schoolId: SCHOOL_ID, email: { $in: Object.values(emails) } }).select('email firstName lastName role').lean();

  let added = 0;
  let photos = 0;
  const missing: string[] = [];
  for (const p of POSTS) {
    const user = users.find((u) => u.email === emails[p.author]);
    if (!user) throw new Error(`Demo user ${emails[p.author]} not found — run seed:pitch-demo first`);
    const classes = p.classes ?? [];

    let post = await SchoolPost.findOne({ schoolId: SCHOOL_ID, kind: p.kind, title: p.title, classes, isDeleted: false });
    if (!post) {
      const posted = p.postedDaysAgo === 0 ? new Date() : at(daysAgo(p.postedDaysAgo), 15, 30);
      post = new SchoolPost({
        schoolId: SCHOOL_ID, kind: p.kind, title: p.title, classes,
        description: p.credit ? `${p.description}

Photos: ${p.credit}, via Wikimedia Commons.` : p.description,
        subject: p.subject, dueDate: p.dueInDays === undefined ? undefined : dueDay(p.dueInDays),
        category: p.category, activityDate: p.activityDate, photoIds: [],
        createdBy: String(user._id), createdByName: `${user.firstName} ${user.lastName}`, createdByRole: user.role,
        createdAt: posted, updatedAt: posted,
      });
      await post.save({ timestamps: false });
      added++;
    }

    if (post.photoIds.length > 0) continue;
    const ids: string[] = [];
    for (const name of p.photos ?? []) {
      const found = photoFile(name);
      if (!found) { missing.push(name); continue; }
      ids.push(await saveImage(fs.readFileSync(found.file), { schoolId: SCHOOL_ID, contentType: found.contentType }, SCHOOL_POST_BUCKET));
    }
    if (ids.length > 0) {
      await SchoolPost.updateOne({ _id: post._id }, { $set: { photoIds: ids } }, { timestamps: false });
      photos += ids.length;
    }
  }
  log(`  school posts: ${added} added, ${POSTS.length - added} already there, ${photos} photos attached`);
  if (missing.length > 0) log(`  photos not found: ${missing.join(', ')}`);
}

async function main(): Promise<void> {
  // This machine's default resolver refuses SRV lookups (mongodb+srv://); public DNS answers them.
  dns.setServers(['8.8.8.8', '1.1.1.1']);
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI not set');
  await mongoose.connect(process.env.MONGODB_URI);
  await seedSchoolPosts();
  await mongoose.disconnect();
}

if (require.main === module) main().catch((err) => { console.error(err); process.exit(1); });
