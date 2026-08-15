import { describe, it, expect } from 'vitest';
import {
  flattenBlocksToText, blocksToMarkdown, normalizeBlock, parseStructuredPage,
  splitIntoBatches, allocateByWeight, chunkText, salvageTruncatedQuestions, dedupeQuestions,
} from './question-extraction.service';
import type { ContentBlock } from '@schoolos/types';
import type { ExtractedQuestionDraft } from './question-extraction.service';

describe('normalizeBlock', () => {
  it('accepts a well-formed heading block', () => {
    const block = normalizeBlock({ type: 'heading', level: 1, text: 'Chapter 4 — Light', confidence: 'high' });
    expect(block).toEqual({ type: 'heading', level: 1, text: 'Chapter 4 — Light', confidence: 'high' });
  });

  it('drops a heading with no text rather than inventing one', () => {
    expect(normalizeBlock({ type: 'heading', level: 1, text: '' })).toBeNull();
    expect(normalizeBlock({ type: 'heading', level: 1 })).toBeNull();
  });

  it('coerces an invalid heading level to 1 instead of failing', () => {
    const block = normalizeBlock({ type: 'heading', level: 9, text: 'Odd level' });
    expect(block).toMatchObject({ level: 1 });
  });

  it('preserves table rows/headers as structured data, not flattened text', () => {
    const block = normalizeBlock({
      type: 'table',
      headers: ['Term', 'Meaning'],
      rows: [['Reflection', 'Bouncing back of light'], ['Refraction', 'Bending of light']],
    });
    expect(block).toEqual({
      type: 'table',
      headers: ['Term', 'Meaning'],
      rows: [['Reflection', 'Bouncing back of light'], ['Refraction', 'Bending of light']],
      caption: undefined,
      confidence: undefined,
    });
  });

  it('drops an empty table', () => {
    expect(normalizeBlock({ type: 'table', headers: [], rows: [] })).toBeNull();
  });

  it('preserves nested list items', () => {
    const block = normalizeBlock({
      type: 'list',
      ordered: true,
      items: [
        { text: 'First point' },
        { text: 'Second point', items: [{ text: 'Subpoint a' }, { text: 'Subpoint b' }] },
      ],
    });
    expect(block).toEqual({
      type: 'list',
      ordered: true,
      confidence: undefined,
      items: [
        { text: 'First point' },
        { text: 'Second point', items: [{ text: 'Subpoint a' }, { text: 'Subpoint b' }] },
      ],
    });
  });

  it('drops a list with no valid items', () => {
    expect(normalizeBlock({ type: 'list', ordered: false, items: [] })).toBeNull();
    expect(normalizeBlock({ type: 'list', ordered: false, items: [{ text: '' }] })).toBeNull();
  });

  it('requires latex on an equation block', () => {
    expect(normalizeBlock({ type: 'equation', latex: 'E = mc^2', displayText: 'E = mc²' })).toEqual({
      type: 'equation', latex: 'E = mc^2', displayText: 'E = mc²', confidence: undefined,
    });
    expect(normalizeBlock({ type: 'equation', latex: '' })).toBeNull();
  });

  it('rejects an unknown block type rather than guessing its shape', () => {
    expect(normalizeBlock({ type: 'unknown-block', text: 'x' })).toBeNull();
  });

  it('ignores an invalid confidence value instead of trusting it', () => {
    const block = normalizeBlock({ type: 'paragraph', text: 'hello', confidence: 'super-confident' });
    expect(block).toMatchObject({ confidence: undefined });
  });
});

describe('parseStructuredPage', () => {
  it('parses a well-formed structured response', () => {
    const raw = JSON.stringify({
      documentTitle: 'Chapter 4 — Light',
      language: 'English',
      blocks: [
        { type: 'heading', level: 1, text: 'Chapter 4 — Light' },
        { type: 'paragraph', text: 'Light is a form of energy.' },
      ],
    });
    const result = parseStructuredPage(raw);
    expect(result.documentTitle).toBe('Chapter 4 — Light');
    expect(result.language).toBe('English');
    expect(result.blocks).toHaveLength(2);
  });

  it('drops unrecognized/invalid blocks but keeps the valid ones', () => {
    const raw = JSON.stringify({
      blocks: [
        { type: 'paragraph', text: 'Valid paragraph' },
        { type: 'heading', text: '' }, // invalid — empty text
        { type: 'not-a-real-type' },
      ],
    });
    const result = parseStructuredPage(raw);
    expect(result.blocks).toEqual([{ type: 'paragraph', text: 'Valid paragraph', confidence: undefined }]);
  });

  it('throws a friendly error on unparsable JSON rather than crashing silently', () => {
    expect(() => parseStructuredPage('not json at all')).toThrow(/could not read/i);
  });

  it('returns an empty blocks array when "blocks" is missing', () => {
    const result = parseStructuredPage(JSON.stringify({ documentTitle: 'x' }));
    expect(result.blocks).toEqual([]);
  });
});

describe('flattenBlocksToText', () => {
  it('preserves table structure as pipe-delimited rows in the flattened text', () => {
    const blocks: ContentBlock[] = [
      { type: 'heading', level: 1, text: 'Chapter 4 — Light' },
      { type: 'table', headers: ['Term', 'Meaning'], rows: [['Reflection', 'Bouncing back of light']] },
    ];
    const text = flattenBlocksToText(blocks);
    expect(text).toContain('Chapter 4 — Light');
    expect(text).toContain('Term | Meaning');
    expect(text).toContain('Reflection | Bouncing back of light');
  });

  it('strips markdown-lite bold/italic markers from plain text output', () => {
    const blocks: ContentBlock[] = [{ type: 'paragraph', text: 'This is **bold** and *italic* text.' }];
    expect(flattenBlocksToText(blocks)).toBe('This is bold and italic text.');
  });

  it('renders nested list items with indentation and correct numbering', () => {
    const blocks: ContentBlock[] = [
      {
        type: 'list',
        ordered: true,
        items: [
          { text: 'First point' },
          { text: 'Second point', items: [{ text: 'Subpoint a' }, { text: 'Subpoint b' }] },
        ],
      },
    ];
    const text = flattenBlocksToText(blocks);
    expect(text).toContain('1. First point');
    expect(text).toContain('2. Second point');
    expect(text).toContain('1. Subpoint a');
    expect(text).toContain('2. Subpoint b');
  });

  it('renders a figure as a bracketed reference with its caption', () => {
    const blocks: ContentBlock[] = [{ type: 'figure', figureNumber: '3.2', caption: 'Parts of a Flower' }];
    expect(flattenBlocksToText(blocks)).toBe('[Figure 3.2 — Parts of a Flower]');
  });

  it('prefers displayText over latex for equations when present', () => {
    const blocks: ContentBlock[] = [{ type: 'equation', latex: 'E = mc^2', displayText: 'E = mc²' }];
    expect(flattenBlocksToText(blocks)).toBe('E = mc²');
  });

  it('returns an empty string for an empty block list', () => {
    expect(flattenBlocksToText([])).toBe('');
  });
});

describe('blocksToMarkdown', () => {
  it('renders tables as real Markdown tables, not flattened text', () => {
    const blocks: ContentBlock[] = [
      { type: 'table', headers: ['Term', 'Meaning'], rows: [['Reflection', 'Bouncing back of light']] },
    ];
    const md = blocksToMarkdown(blocks);
    expect(md).toContain('| Term | Meaning |');
    expect(md).toContain('| --- | --- |');
    expect(md).toContain('| Reflection | Bouncing back of light |');
  });

  it('renders headings with the correct number of # characters', () => {
    const blocks: ContentBlock[] = [{ type: 'heading', level: 2, text: 'Section 1' }];
    expect(blocksToMarkdown(blocks)).toContain('## Section 1');
  });

  it('wraps equations in $ delimiters', () => {
    const blocks: ContentBlock[] = [{ type: 'equation', latex: 'E = mc^2' }];
    expect(blocksToMarkdown(blocks)).toContain('$E = mc^2$');
  });
});

describe('splitIntoBatches', () => {
  it('splits a large count into batches capped at maxBatch that sum back to the original count', () => {
    expect(splitIntoBatches(20, 8)).toEqual([8, 8, 4]);
    expect(splitIntoBatches(8, 8)).toEqual([8]);
    expect(splitIntoBatches(1, 8)).toEqual([1]);
    expect(splitIntoBatches(0, 8)).toEqual([]);
  });
});

describe('allocateByWeight', () => {
  it('distributes a total proportionally to each weight and always sums back to the total', () => {
    const result = allocateByWeight(10, [100, 100]);
    expect(result).toEqual([5, 5]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(10);
  });

  it('gives more to a longer chunk without losing any of the total to rounding', () => {
    const result = allocateByWeight(7, [9000, 1000]);
    expect(result.reduce((a, b) => a + b, 0)).toBe(7);
    expect(result[0]).toBeGreaterThan(result[1]);
  });

  it('handles a single chunk by giving it everything', () => {
    expect(allocateByWeight(50, [12000])).toEqual([50]);
  });
});

describe('chunkText', () => {
  it('returns the whole text as one chunk when under the limit', () => {
    expect(chunkText('short document', 100)).toEqual(['short document']);
  });

  it('splits long text on paragraph boundaries instead of mid-sentence', () => {
    const text = `${'A'.repeat(40)}\n\n${'B'.repeat(40)}\n\n${'C'.repeat(40)}`;
    const chunks = chunkText(text, 50);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(50);
    // no content lost across the split
    expect(chunks.join('')).toContain('A'.repeat(40));
    expect(chunks.join('')).toContain('C'.repeat(40));
  });

  it('hard-slices a single paragraph that alone exceeds maxChars rather than looping forever', () => {
    const text = 'X'.repeat(250);
    const chunks = chunkText(text, 100);
    expect(chunks).toEqual(['X'.repeat(100), 'X'.repeat(100), 'X'.repeat(50)]);
  });

  it('returns no chunks for empty/whitespace-only text', () => {
    expect(chunkText('   \n\n  ', 100)).toEqual([]);
  });
});

describe('salvageTruncatedQuestions', () => {
  it('recovers complete question objects from a response cut off mid-string (the actual production failure shape)', () => {
    // Mirrors the real truncated payload seen in production logs: a valid opening, two complete
    // question objects, then a third cut off mid-string with no closing brace.
    const truncated = '{"pageText":"...","questions":[' +
      '{"questionText":"What can an elephant lift with?","questionType":"very_short","difficulty":"easy","marks":1,"estimatedTimeMinutes":1,"bloomsLevel":"remember","keywords":["elephant","trunk"],"chapterName":"Be Alert"},' +
      '{"questionText":"What does ivory mean?","questionType":"very_short","difficulty":"easy","marks":1,"estimatedTimeMinutes":1,"bloomsLevel":"understand","keywords":["ivory"],"chapterName":"Be Alert"},' +
      '{"questionText":"Where did Kishan go with his mot';
    const recovered = salvageTruncatedQuestions(truncated);
    expect(recovered).toHaveLength(2);
    expect(recovered[0].questionText).toBe('What can an elephant lift with?');
    expect(recovered[1].questionText).toBe('What does ivory mean?');
  });

  it('does not let a brace inside a quoted string confuse the depth tracking', () => {
    const truncated = '{"questions":[{"questionText":"What does { mean } in math?","chapterName":"Sets"},{"questionText":"cut off';
    const recovered = salvageTruncatedQuestions(truncated);
    expect(recovered).toHaveLength(1);
    expect(recovered[0].questionText).toBe('What does { mean } in math?');
  });

  it('returns an empty array when nothing complete could be recovered', () => {
    expect(salvageTruncatedQuestions('{"questions":[{"questionText":"cut off half')).toEqual([]);
    expect(salvageTruncatedQuestions('not json at all')).toEqual([]);
  });
});

describe('dedupeQuestions', () => {
  const q = (text: string): ExtractedQuestionDraft => ({
    questionText: text, questionType: 'short', difficulty: 'easy', marks: 1,
    estimatedTimeMinutes: 1, bloomsLevel: 'remember', keywords: [], chapterName: 'Ch 1',
  });

  it('drops exact and whitespace/case-insensitive duplicates, keeping the first occurrence', () => {
    const result = dedupeQuestions([q('What is light?'), q('what   is  light?'), q('What is sound?')]);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.questionText)).toEqual(['What is light?', 'What is sound?']);
  });
});
