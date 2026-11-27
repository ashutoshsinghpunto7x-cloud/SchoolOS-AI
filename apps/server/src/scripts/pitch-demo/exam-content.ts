/**
 * Hand-written Maths content for the demo teacher: six Class 6 exam papers
 * (four 20-mark unit tests, 80-mark Half Yearly and Annual) and five worksheets.
 * `ch` is the chapter's order within its class in the seeded syllabus.
 */
import type { QuestionType, QuestionDifficulty } from '../../features/question-bank/question.model';

export interface DemoQuestion {
  ch: number;
  type: QuestionType;
  difficulty: QuestionDifficulty;
  text: string;
  answer: string;
  options?: string[];
}

export interface DemoSection { name: string; marks: number; questions: DemoQuestion[] }
export interface DemoPaper { examType: string; durationMinutes: number; sections: DemoSection[] }
export interface DemoWorksheet {
  cls: string; title: string; worksheetType: 'practice' | 'homework' | 'revision' | 'hots'; sections: DemoSection[];
}

type D = QuestionDifficulty;
const make = (type: QuestionType) => (ch: number, difficulty: D, text: string, answer: string): DemoQuestion => ({ ch, type, difficulty, text, answer });
/** `correct` is the index of the right option. */
const mcq = (ch: number, difficulty: D, text: string, options: string[], correct: number): DemoQuestion =>
  ({ ch, type: 'mcq', difficulty, text, options, answer: options[correct] });
const fill = make('fill_blank');
const tf = make('true_false');
const veryShort = make('very_short');
const short = make('short');
const long = make('long');
const word = make('word_problem');
const caseStudy = make('case_study');

const sec = (letter: string, title: string, marks: number, questions: DemoQuestion[]): DemoSection =>
  ({ name: `Section ${letter} — ${title}`, marks, questions });

const unitTest = (examType: string, a: DemoQuestion[], b: DemoQuestion[], c: DemoQuestion[], d: DemoQuestion[]): DemoPaper => ({
  examType, durationMinutes: 45,
  sections: [
    sec('A', 'Multiple Choice Questions', 1, a),
    sec('B', 'Fill in the Blanks', 1, b),
    sec('C', 'Short Answer Questions', 2, c),
    sec('D', 'Long Answer Questions', 3, d),
  ],
});

const termExam = (examType: string, parts: [DemoQuestion[], DemoQuestion[], DemoQuestion[], DemoQuestion[], DemoQuestion[], DemoQuestion[]]): DemoPaper => ({
  examType, durationMinutes: 180,
  sections: [
    sec('A', 'Multiple Choice Questions', 1, parts[0]),
    sec('B', 'Fill in the Blanks / True or False', 1, parts[1]),
    sec('C', 'Very Short Answer Questions', 2, parts[2]),
    sec('D', 'Short Answer Questions', 3, parts[3]),
    sec('E', 'Long Answer Questions', 5, parts[4]),
    sec('F', 'Case Study', 4, parts[5]),
  ],
});

export const PAPERS: DemoPaper[] = [
  unitTest('Unit Test 1', [
    mcq(1, 'easy', 'The place value of 7 in 4,72,315 is:', ['7,000', '70,000', '7,00,000', '700'], 1),
    mcq(1, 'easy', 'How many lakhs make one million?', ['1', '10', '100', '1,000'], 1),
    mcq(1, 'medium', 'The Roman numeral for 49 is:', ['XLIX', 'IL', 'XXXXIX', 'LXIX'], 0),
    mcq(1, 'medium', '6,748 rounded off to the nearest hundred is:', ['6,700', '6,800', '6,750', '7,000'], 0),
  ], [
    fill(1, 'easy', '1 crore = ______ lakhs.', '100'),
    fill(1, 'easy', 'The greatest 5-digit number is ______.', '99,999'),
    fill(1, 'medium', 'In the International System, 4567890 is written with commas as ______.', '4,567,890'),
    fill(1, 'easy', '3 km 50 m = ______ m.', '3,050'),
  ], [
    short(1, 'medium', 'Write the number name of 8,05,40,012 in the Indian System of Numeration.', 'Eight crore five lakh forty thousand twelve'),
    short(1, 'easy', 'Arrange in ascending order: 48,261; 48,621; 46,821; 48,126.', '46,821 < 48,126 < 48,261 < 48,621'),
    short(1, 'medium', 'Using the digits 7, 0, 3 and 5 only once, write the greatest and the smallest 4-digit numbers.', 'Greatest 7,530; smallest 3,057'),
  ], [
    long(1, 'medium', 'A school library had 12,450 books. It bought 2,385 new books and gave away 975 old books. How many books does the library have now?', '12,450 + 2,385 - 975 = 13,860 books'),
    long(1, 'hard', 'Estimate 5,290 + 17,986 by rounding off each number to the nearest thousand. Also find the actual sum and the difference between the two answers.', 'Estimate 23,000; actual sum 23,276; difference 276'),
  ]),

  unitTest('Unit Test 2', [
    mcq(2, 'easy', 'The smallest whole number is:', ['0', '1', '10', 'There is none'], 0),
    mcq(2, 'easy', 'The successor of 9,99,999 is:', ['9,99,998', '10,00,000', '1,00,000', '99,99,999'], 1),
    mcq(3, 'medium', 'Which of the following is a prime number?', ['51', '57', '53', '63'], 2),
    mcq(3, 'medium', 'A number divisible by both 2 and 3 is always divisible by:', ['5', '6', '9', '12'], 1),
  ], [
    fill(2, 'easy', 'The number ______ is the identity for multiplication of whole numbers.', '1'),
    fill(2, 'easy', '38 × 17 = 17 × ______.', '38'),
    fill(3, 'easy', 'The only even prime number is ______.', '2'),
    fill(3, 'medium', 'Two numbers whose only common factor is 1 are called ______ numbers.', 'co-prime'),
  ], [
    short(2, 'medium', 'Find the sum by suitable grouping: 837 + 208 + 363.', '(837 + 363) + 208 = 1,408'),
    short(2, 'medium', 'Using the distributive property, find: 297 × 17 + 297 × 3.', '297 × (17 + 3) = 5,940'),
    short(3, 'easy', 'Write all the factors of 36.', '1, 2, 3, 4, 6, 9, 12, 18, 36'),
  ], [
    long(3, 'medium', 'Find the HCF of 48 and 72 by the prime factorisation method.', '48 = 2×2×2×2×3; 72 = 2×2×2×3×3; HCF = 24'),
    long(3, 'hard', 'Three bells ring at intervals of 6, 8 and 12 minutes. If they ring together at 9:00 a.m., at what time will they next ring together?', 'LCM = 24 minutes, so at 9:24 a.m.'),
  ]),

  unitTest('Unit Test 3', [
    mcq(4, 'easy', 'A line segment has:', ['no end point', 'one end point', 'two end points', 'countless end points'], 2),
    mcq(4, 'medium', 'The number of lines that can pass through two given points is:', ['one', 'two', 'three', 'countless'], 0),
    mcq(4, 'easy', 'The polygon with the least number of sides is a:', ['triangle', 'square', 'pentagon', 'hexagon'], 0),
    mcq(4, 'easy', 'The longest chord of a circle is its:', ['radius', 'diameter', 'arc', 'sector'], 1),
  ], [
    fill(4, 'easy', 'A ray has ______ end point(s).', 'one'),
    fill(4, 'easy', 'Two lines that meet at a point are called ______ lines.', 'intersecting'),
    fill(4, 'medium', 'A quadrilateral has ______ diagonals.', '2'),
    fill(4, 'medium', 'If the radius of a circle is 4.5 cm, its diameter is ______ cm.', '9'),
  ], [
    short(4, 'medium', 'Write any two differences between a line and a line segment.', 'A line has no end points and no definite length; a line segment has two end points and a definite length.'),
    short(4, 'medium', 'In quadrilateral ABCD, name (i) the two pairs of opposite sides and (ii) the two pairs of opposite angles.', '(i) AB and CD, BC and DA (ii) angle A and angle C, angle B and angle D'),
    short(4, 'easy', 'Draw one open curve and one closed curve. Write one difference between them.', 'A closed curve starts and ends at the same point; an open curve does not.'),
  ], [
    long(4, 'medium', 'Draw a circle with centre O. Mark and name a radius OA, a diameter BC and a chord DE. Shade one sector of the circle.', 'Neat labelled diagram showing radius, diameter, chord and a shaded sector.'),
    long(4, 'hard', 'Draw a triangle PQR. Name its three sides, three angles and three vertices. Mark a point S in its interior and a point T in its exterior.', 'Sides PQ, QR, RP; angles P, Q, R; vertices P, Q, R; S inside and T outside the triangle.'),
  ]),

  unitTest('Unit Test 4', [
    mcq(5, 'easy', 'Which of the following is a proper fraction?', ['7/4', '3/8', '5/5', '9/2'], 1),
    mcq(5, 'easy', 'Which fraction is equivalent to 2/3?', ['4/9', '8/12', '6/12', '3/2'], 1),
    mcq(6, 'easy', '7/10 written as a decimal is:', ['7.0', '0.07', '0.7', '70'], 2),
    mcq(6, 'medium', 'Which of these is the greatest?', ['0.5', '0.05', '0.55', '0.505'], 2),
  ], [
    fill(5, 'medium', 'The simplest form of 18/24 is ______.', '3/4'),
    fill(5, 'medium', 'The mixed fraction 2 3/5 written as an improper fraction is ______.', '13/5'),
    fill(6, 'medium', '5 cm = ______ m (write as a decimal).', '0.05'),
    fill(6, 'easy', '3 + 4/100 written as a decimal is ______.', '3.04'),
  ], [
    short(5, 'medium', 'Arrange in ascending order: 2/3, 1/2, 5/6.', '1/2 < 2/3 < 5/6'),
    short(5, 'medium', 'Add: 2/7 + 3/14. Write the answer in its simplest form.', '4/14 + 3/14 = 7/14 = 1/2'),
    short(6, 'easy', 'Subtract 8.75 from 15.2.', '6.45'),
  ], [
    long(5, 'medium', 'Reena bought 2 1/2 m of red ribbon and 1 3/4 m of blue ribbon. How much ribbon did she buy in all?', '5/2 + 7/4 = 17/4 = 4 1/4 m'),
    long(6, 'hard', 'Rahul bought a notebook for ₹35.50, a pen for ₹12.75 and an eraser for ₹4.25. He gave the shopkeeper a ₹100 note. How much money did he get back?', 'Bill ₹52.50; money returned ₹47.50'),
  ]),

  termExam('Half Yearly Examination', [
    [
      mcq(1, 'easy', 'The smallest 6-digit number is:', ['1,00,000', '99,999', '10,00,000', '1,11,111'], 0),
      mcq(1, 'medium', 'The difference between the place value and the face value of 6 in 36,521 is:', ['5,994', '6,000', '6', '5,940'], 0),
      mcq(1, 'easy', 'The Roman numeral XC stands for:', ['110', '90', '40', '60'], 1),
      mcq(1, 'medium', '10 million is equal to:', ['1 crore', '10 lakh', '10 crore', '1 lakh'], 0),
      mcq(2, 'easy', 'The predecessor of 1,00,000 is:', ['99,999', '1,00,001', '99,000', '9,999'], 0),
      mcq(2, 'medium', 'Which of the following is not defined?', ['0 + 5', '0 × 5', '0 ÷ 5', '5 ÷ 0'], 3),
      mcq(2, 'easy', 'a × (b + c) = a × b + a × c shows which property?', ['Commutative', 'Associative', 'Distributive', 'Identity'], 2),
      mcq(3, 'medium', 'Which of these numbers is divisible by 9?', ['1,234', '4,356', '5,678', '7,001'], 1),
      mcq(3, 'easy', 'The HCF of two co-prime numbers is:', ['0', '1', '2', 'their product'], 1),
      mcq(3, 'easy', 'The LCM of 4 and 6 is:', ['24', '12', '2', '10'], 1),
    ],
    [
      fill(1, 'easy', '1 lakh = ______ ten thousands.', '10'),
      fill(1, 'easy', '4,967 rounded off to the nearest thousand is ______.', '5,000'),
      fill(2, 'easy', '(15 × 4) × 25 = 15 × (4 × ______).', '25'),
      tf(2, 'medium', 'Every whole number has a predecessor.', 'False'),
      tf(3, 'easy', '1 is neither a prime number nor a composite number.', 'True'),
      fill(3, 'medium', 'The smallest odd composite number is ______.', '9'),
    ],
    [
      veryShort(1, 'medium', 'Write in figures using commas: Seven crore twelve lakh five thousand sixty.', '7,12,05,060'),
      veryShort(1, 'easy', 'Write the expanded form of 5,40,307.', '5×1,00,000 + 4×10,000 + 3×100 + 7×1'),
      veryShort(1, 'easy', 'Write 74 and 95 in Roman numerals.', 'LXXIV and XCV'),
      veryShort(2, 'medium', 'Find by suitable rearrangement: 125 × 48 × 8.', '(125 × 8) × 48 = 48,000'),
      veryShort(2, 'medium', 'Using the distributive property, find 738 × 103.', '73,800 + 2,214 = 76,014'),
      veryShort(3, 'easy', 'Write all the prime numbers between 30 and 50.', '31, 37, 41, 43, 47'),
      veryShort(3, 'medium', 'Using the tests of divisibility, check whether 5,148 is divisible by 4 and by 3.', 'Divisible by both: 48 is divisible by 4, and the digit sum 18 is divisible by 3.'),
      veryShort(3, 'easy', 'Write the first five multiples of 13.', '13, 26, 39, 52, 65'),
    ],
    [
      short(1, 'medium', 'A box contains 2,00,000 medicine tablets, each weighing 20 mg. Find the total weight of the tablets in grams and in kilograms.', '40,00,000 mg = 4,000 g = 4 kg'),
      short(1, 'medium', 'The population of a town was 3,45,678. It increased by 12,345 in one year. Find the new population and write it in words.', '3,58,023 — Three lakh fifty-eight thousand twenty-three'),
      short(1, 'hard', 'To stitch a shirt, 2 m 15 cm of cloth is needed. How many shirts can be stitched out of 40 m of cloth, and how much cloth will remain?', '18 shirts; 1 m 30 cm remains'),
      short(2, 'easy', 'Show 3 + 4 and 4 + 3 on number lines. What do you observe? Name the property.', 'Both equal 7; addition of whole numbers is commutative.'),
      short(2, 'medium', 'A taxi driver filled 40 litres of petrol on Monday and 50 litres on Tuesday. If petrol costs ₹96 per litre, how much did he spend in all? Use the distributive property.', '96 × (40 + 50) = ₹8,640'),
      short(3, 'hard', 'Find the greatest number which divides 245 and 1,029, leaving remainder 5 in each case.', 'HCF of 240 and 1,024 = 16'),
      short(3, 'medium', 'Find the LCM of 12, 18 and 24.', '72'),
      short(2, 'medium', 'Study the pattern and write the next two lines:\n1 × 9 + 1 = 10\n2 × 9 + 2 = 20\n3 × 9 + 3 = 30', '4 × 9 + 4 = 40 and 5 × 9 + 5 = 50'),
    ],
    [
      long(1, 'medium', 'A merchant had ₹78,592 with her. She bought 40 radio sets at ₹1,200 each. How much money is left with her? Also round off the remaining amount to the nearest thousand.', 'Cost ₹48,000; left ₹30,592; about ₹31,000'),
      long(2, 'medium', 'Find the value using suitable properties and name the properties used:\n(a) 1,962 + 453 + 1,538 + 647\n(b) 25 × 8,358 × 4', '(a) 4,600 (b) 8,35,800 — commutative and associative properties'),
      long(3, 'medium', 'Find the HCF of 144, 180 and 192 by the prime factorisation method.', '144 = 2⁴×3²; 180 = 2²×3²×5; 192 = 2⁶×3; HCF = 12'),
      long(3, 'hard', 'Find the smallest number which, when divided by 16, 20 and 24, leaves a remainder of 7 in each case.', 'LCM = 240; required number = 247'),
    ],
    [
      caseStudy(3, 'hard', 'For the annual sports day, 120 students of Class VI and 144 students of Class VII will march past. Every row must have the same number of students, and each row has students of one class only.\n(i) What is the greatest number of students possible in each row?\n(ii) How many rows will Class VI make?\n(iii) How many rows will Class VII make?\n(iv) If every student gets a cap costing ₹35, find the total cost of the caps.', '(i) 24 (ii) 5 (iii) 6 (iv) ₹9,240'),
    ],
  ]),

  termExam('Annual Examination', [
    [
      mcq(1, 'medium', 'Five crore six lakh seven is written as:', ['5,06,00,007', '5,60,00,007', '5,06,07,000', '50,60,007'], 0),
      mcq(2, 'medium', 'Whole numbers are not closed under:', ['addition', 'multiplication', 'subtraction', 'both addition and multiplication'], 2),
      mcq(3, 'easy', 'The number of factors of a prime number is:', ['1', '2', '3', 'countless'], 1),
      mcq(3, 'medium', 'Which of these is a pair of twin primes?', ['11 and 13', '13 and 17', '7 and 11', '2 and 3'], 0),
      mcq(4, 'easy', 'A part of a line with only one end point is called a:', ['line segment', 'ray', 'curve', 'chord'], 1),
      mcq(4, 'easy', 'The number of sides of a pentagon is:', ['4', '5', '6', '8'], 1),
      mcq(4, 'easy', 'A line segment joining any two points on a circle is a:', ['radius', 'chord', 'arc', 'centre'], 1),
      mcq(5, 'easy', '3/4 + 1/4 is equal to:', ['4/8', '1', '3/16', '1/2'], 1),
      mcq(6, 'medium', 'The place value of 5 in 12.356 is:', ['5', '5/10', '5/100', '5/1000'], 2),
      mcq(6, 'medium', '4 kg 25 g written in kilograms is:', ['4.25 kg', '4.025 kg', '4.0025 kg', '42.5 kg'], 1),
    ],
    [
      fill(1, 'easy', 'The Roman numeral XXXVIII represents ______.', '38'),
      fill(2, 'easy', 'The sum of any whole number and zero is ______.', 'the number itself'),
      tf(3, 'medium', 'Every multiple of 6 is also a multiple of 3.', 'True'),
      tf(4, 'easy', 'A circle is a polygon.', 'False'),
      fill(5, 'easy', 'A fraction whose numerator is greater than its denominator is called an ______ fraction.', 'improper'),
      fill(6, 'easy', '0.6 + 0.4 = ______.', '1'),
    ],
    [
      veryShort(1, 'easy', 'Put the sign > or <:\n(a) 45,89,213 ____ 45,98,123\n(b) 7,00,009 ____ 6,99,999', '(a) < (b) >'),
      veryShort(2, 'medium', 'Find 999 × 56 by a short method.', '56,000 - 56 = 55,944'),
      veryShort(3, 'medium', 'Write the prime factorisation of 420.', '2 × 2 × 3 × 5 × 7'),
      veryShort(4, 'easy', 'Draw and name (i) a ray AB and (ii) a line segment CD.', 'Ray starting at A through B; line segment with end points C and D.'),
      veryShort(4, 'medium', 'Rays OP and OQ form an angle. Name the angle in two ways and write its vertex and arms.', 'Angle POQ or angle QOP; vertex O; arms OP and OQ'),
      veryShort(5, 'medium', 'Convert (i) 29/6 into a mixed fraction and (ii) 5 2/7 into an improper fraction.', '(i) 4 5/6 (ii) 37/7'),
      veryShort(5, 'medium', 'Fill in the missing numbers: 3/5 = ___/20 = 18/___', '12 and 30'),
      veryShort(6, 'easy', 'Write as decimals: (a) seventy-two and eight hundredths (b) 13/20', '(a) 72.08 (b) 0.65'),
    ],
    [
      short(1, 'medium', 'A vessel holds 4 L 500 mL of curd. In how many glasses, each of capacity 25 mL, can it be filled?', '4,500 ÷ 25 = 180 glasses'),
      short(2, 'medium', 'Using the distributive property, find 854 × 102.', '85,400 + 1,708 = 87,108'),
      short(3, 'medium', 'Find the HCF of 56 and 84. Use it to write 56/84 in its simplest form.', 'HCF = 28; 56/84 = 2/3'),
      short(4, 'medium', 'Define with a figure: (i) polygon (ii) diagonal (iii) interior of a closed figure.', 'Polygon: simple closed figure of line segments; diagonal: segment joining non-adjacent vertices; interior: region enclosed by the boundary.'),
      short(5, 'hard', 'Subtract: 3 1/3 - 1 5/6.', '20/6 - 11/6 = 9/6 = 1 1/2'),
      short(5, 'medium', 'Arrange in descending order: 3/4, 5/8, 7/12.', '3/4 > 5/8 > 7/12'),
      short(6, 'easy', 'Add: 27.5 + 8.08 + 0.725.', '36.305'),
      short(6, 'medium', 'Nisha’s school is 4 km 350 m from her home. She travels 3 km 75 m by bus and walks the rest. How far does she walk? Give your answer in km.', '4.350 - 3.075 = 1.275 km'),
    ],
    [
      long(1, 'medium', 'A factory made 5,36,890 toys last year and 6,12,450 toys this year.\n(a) How many toys were made in the two years?\n(b) How many more toys were made this year?\n(c) Round off the total to the nearest ten thousand.', '(a) 11,49,340 (b) 75,560 (c) 11,50,000'),
      long(3, 'hard', 'The length, breadth and height of a room are 825 cm, 675 cm and 450 cm. Find the longest tape which can measure all three dimensions exactly.', 'HCF of 825, 675 and 450 = 75 cm'),
      long(4, 'medium', 'Draw a circle of radius 3 cm. Label its centre, a radius, a diameter, a chord and an arc. What is the length of its diameter?', 'Labelled circle; diameter = 6 cm'),
      long(5, 'hard', 'Sarita studied for 1 1/4 hours in the morning and 2 1/3 hours in the evening.\n(a) For how long did she study in all?\n(b) How much longer did she study in the evening?', '(a) 3 7/12 hours (b) 1 1/12 hours'),
    ],
    [
      caseStudy(6, 'hard', 'Meena went to the market with ₹500. She bought rice for ₹212.50, sugar for ₹86.75 and vegetables for ₹100.75.\n(i) How much did she spend on sugar and vegetables together?\n(ii) What was her total bill?\n(iii) How much money was left with her?\n(iv) What fraction of ₹500 was left? Write it in the simplest form.', '(i) ₹187.50 (ii) ₹400 (iii) ₹100 (iv) 1/5'),
    ],
  ]),
];

const worksheet = (
  cls: string, title: string, worksheetType: DemoWorksheet['worksheetType'],
  a: DemoQuestion[], b: DemoQuestion[], c: DemoQuestion[], d: DemoQuestion[],
): DemoWorksheet => ({
  cls, title, worksheetType,
  sections: [
    { name: 'MCQ', marks: 1, questions: a },
    { name: 'Fill', marks: 1, questions: b },
    { name: 'Short', marks: 2, questions: c },
    { name: 'Word', marks: 3, questions: d },
  ],
});

export const WORKSHEETS: DemoWorksheet[] = [
  worksheet('6', 'Knowing Our Numbers — Practice Worksheet', 'practice', [
    mcq(1, 'easy', 'The face value of 8 in 58,204 is:', ['8', '80', '800', '8,000'], 0),
    mcq(1, 'easy', 'Which is the greatest number?', ['9,99,999', '10,00,001', '10,00,000', '9,98,999'], 1),
    mcq(1, 'medium', 'The Roman numeral for 64 is:', ['LXIV', 'XLIV', 'LXVI', 'XLVI'], 0),
    mcq(1, 'easy', '1 metre is equal to:', ['10 mm', '100 mm', '1,000 mm', '10,000 mm'], 2),
  ], [
    fill(1, 'easy', '10 lakh = ______ million.', '1'),
    fill(1, 'medium', 'The smallest 4-digit number with four different digits is ______.', '1,023'),
    fill(1, 'medium', '7,45,000 rounded off to the nearest ten thousand is ______.', '7,50,000'),
    fill(1, 'easy', '2 kg 8 g = ______ g.', '2,008'),
  ], [
    short(1, 'medium', 'Write 3,07,05,009 in words using the Indian System of Numeration.', 'Three crore seven lakh five thousand nine'),
    short(1, 'medium', 'Using the digits 4, 9, 0, 2 and 6 only once, write the largest and the smallest 5-digit numbers.', '96,420 and 20,469'),
    short(1, 'medium', 'Estimate the product 578 × 161 by rounding off each number to the nearest hundred.', '600 × 200 = 1,20,000'),
  ], [
    word(1, 'medium', 'Kiran sold 1,285 tickets on Saturday and 1,947 tickets on Sunday at ₹15 each. How much money was collected?', '3,232 × 15 = ₹48,480'),
    word(1, 'hard', 'A ribbon 24 m long is cut into pieces of 75 cm each. How many pieces are obtained?', '2,400 ÷ 75 = 32 pieces'),
  ]),

  worksheet('6', 'Playing with Numbers — Homework Worksheet', 'homework', [
    mcq(3, 'easy', 'Which of these is a factor of 42?', ['4', '8', '7', '9'], 2),
    mcq(3, 'medium', 'Which number is divisible by 11?', ['1,331', '1,235', '4,567', '8,001'], 0),
    mcq(3, 'easy', 'The smallest prime number is:', ['0', '1', '2', '3'], 2),
    mcq(3, 'easy', 'The LCM of 5 and 7 is:', ['12', '35', '1', '70'], 1),
  ], [
    fill(3, 'medium', 'Every number is a factor of ______.', 'itself'),
    fill(3, 'easy', 'A number having more than two factors is called a ______ number.', 'composite'),
    fill(3, 'easy', 'The HCF of 15 and 25 is ______.', '5'),
    fill(3, 'easy', 'A number is divisible by 5 if its ones digit is ______ or ______.', '0 or 5'),
  ], [
    short(3, 'easy', 'List all the factors of 48.', '1, 2, 3, 4, 6, 8, 12, 16, 24, 48'),
    short(3, 'medium', 'Express 90 as a product of prime factors.', '2 × 3 × 3 × 5'),
    short(3, 'medium', 'Write all the common multiples of 3 and 4 that are less than 50.', '12, 24, 36, 48'),
  ], [
    word(3, 'hard', '60 apples and 84 oranges are to be packed in baskets without mixing, with the same number of fruits in each basket. Find the greatest number of fruits per basket and the total number of baskets.', '12 fruits per basket; 5 + 7 = 12 baskets'),
    word(3, 'medium', 'Two athletes take 40 seconds and 60 seconds to complete one round of a track. If they start together, after how long will they next meet at the starting point?', 'LCM = 120 seconds = 2 minutes'),
  ]),

  worksheet('6', 'Fractions — Revision Worksheet', 'revision', [
    mcq(5, 'easy', 'Which of these is an improper fraction?', ['9/4', '3/7', '1/2', '4/9'], 0),
    mcq(5, 'easy', 'Half of 24 is:', ['12', '6', '48', '22'], 0),
    mcq(5, 'easy', 'A fraction equivalent to 3/7 is:', ['6/14', '9/14', '6/21', '4/8'], 0),
    mcq(5, 'medium', 'Which fraction is the greatest?', ['1/3', '1/5', '1/2', '1/7'], 2),
  ], [
    fill(5, 'easy', 'A fraction with numerator 1 is called a ______ fraction.', 'unit'),
    fill(5, 'medium', '11/4 written as a mixed fraction is ______.', '2 3/4'),
    fill(5, 'easy', '5/9 + 2/9 = ______.', '7/9'),
    fill(5, 'medium', '12/16 in its simplest form is ______.', '3/4'),
  ], [
    short(5, 'medium', 'Subtract: 7/12 - 1/4. Write the answer in its simplest form.', '4/12 = 1/3'),
    short(5, 'easy', 'Write any three fractions equivalent to 2/5.', '4/10, 6/15, 8/20'),
    short(5, 'medium', 'Arrange in ascending order: 3/4, 3/8, 3/5.', '3/8 < 3/5 < 3/4'),
  ], [
    word(5, 'medium', 'Aman ate 2/8 of a pizza and his sister ate 3/8 of it. What part of the pizza was eaten and what part is left?', 'Eaten 5/8; left 3/8'),
    word(5, 'hard', 'A rope is 7 1/2 m long. A piece of 2 3/4 m is cut from it. What length of rope remains?', '15/2 - 11/4 = 4 3/4 m'),
  ]),

  worksheet('7', 'Integers — Practice Worksheet', 'practice', [
    mcq(1, 'easy', '(−8) + 5 is equal to:', ['−13', '−3', '3', '13'], 1),
    mcq(1, 'easy', 'Which integer is the greatest?', ['−12', '−7', '−15', '−9'], 1),
    mcq(1, 'easy', '(−6) × (−4) is equal to:', ['−24', '24', '−10', '10'], 1),
    mcq(1, 'medium', 'The additive inverse of −17 is:', ['17', '−17', '0', '1/17'], 0),
  ], [
    fill(1, 'easy', '(−45) ÷ 9 = ______.', '−5'),
    fill(1, 'easy', '(−13) × 0 = ______.', '0'),
    fill(1, 'medium', '7 − (−3) = ______.', '10'),
    fill(1, 'easy', 'The integer which is neither positive nor negative is ______.', '0'),
  ], [
    short(1, 'medium', 'Evaluate: (−25) + 18 − (−12).', '5'),
    short(1, 'medium', 'Using a suitable property, find: 15 × (−98) + 15 × (−2).', '15 × (−100) = −1,500'),
    short(1, 'hard', 'Find a pair of integers whose sum is −3 and whose product is −40.', '−8 and 5'),
  ], [
    word(1, 'medium', 'The temperature at Shimla was −2 °C at night. It rose by 9 °C by noon and then fell by 4 °C by evening. What was the temperature in the evening?', '−2 + 9 − 4 = 3 °C'),
    word(1, 'hard', 'A submarine is 320 m below sea level. It goes down a further 45 m and then rises 120 m. Find its new position.', '245 m below sea level'),
  ]),

  worksheet('8', 'Linear Equations in One Variable — Practice Worksheet', 'practice', [
    mcq(2, 'easy', 'The solution of x + 7 = 12 is:', ['5', '19', '−5', '7'], 0),
    mcq(2, 'easy', 'Which of these is a linear equation in one variable?', ['2x + 3 = 7', 'x² = 4', 'x + y = 5', 'xy = 1'], 0),
    mcq(2, 'easy', 'If 3x = −21, then x is:', ['−7', '7', '−63', '18'], 0),
    mcq(2, 'easy', 'If x/4 = 9, then x is:', ['36', '13', '5', '9/4'], 0),
  ], [
    fill(2, 'easy', 'The solution of 2y − 5 = 9 is y = ______.', '7'),
    fill(2, 'easy', 'When a term is transposed to the other side of an equation, its sign ______.', 'changes'),
    fill(2, 'medium', 'If 5x = 3x + 10, then x = ______.', '5'),
    fill(2, 'medium', '"Twice a number added to 3 gives 15" written as an equation is ______.', '2x + 3 = 15'),
  ], [
    short(2, 'medium', 'Solve: 5x − 3 = 3x + 11.', 'x = 7'),
    short(2, 'medium', 'Solve: x/2 + x/3 = 10.', 'x = 12'),
    short(2, 'medium', 'Solve: 3(t − 4) = 2(t + 1).', 't = 14'),
  ], [
    word(2, 'medium', 'The sum of three consecutive integers is 72. Find the integers.', '23, 24 and 25'),
    word(2, 'hard', 'The length of a rectangle is 5 m more than its breadth and its perimeter is 54 m. Find its length and breadth.', 'Length 16 m; breadth 11 m'),
  ]),
];
