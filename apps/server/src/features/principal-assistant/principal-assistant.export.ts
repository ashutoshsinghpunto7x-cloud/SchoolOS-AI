import { z } from 'zod';
import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';
import { env } from '../../config/env';

// ── Download an assistant answer as PDF or Excel ──────────────────────────────
// Takes the answer text the Principal is already looking at (it was produced from
// their own school's data), so nothing new is read from the database here.

export const exportSchema = z.object({
  title: z.string().trim().min(1).max(120).default('Assistant answer'),
  text: z.string().trim().min(1).max(20000),
  format: z.enum(['pdf', 'xlsx']),
});
export type ExportInput = z.infer<typeof exportSchema>;

export interface ExportedFile { buffer: Buffer; contentType: string; fileName: string }

const safeName = (t: string) => t.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '').slice(0, 50) || 'answer';

function toPdf(title: string, text: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.font('Helvetica-Bold').fontSize(16).text(title);
    doc.font('Helvetica').fontSize(9).fillColor('#64748b')
      .text(`${env.SCHOOL_NAME} - ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`).moveDown();
    doc.fillColor('#000000').fontSize(11);
    for (const line of text.split('\n')) doc.text(line.trim() === '' ? ' ' : line, { lineGap: 2 });
    doc.end();
  });
}

function toXlsx(title: string, text: string): Buffer {
  // Lines like "- Name: detail" become two columns so lists sort and filter in Excel.
  const rows: string[][] = [];
  for (const raw of text.split('\n')) {
    const line = raw.replace(/^\s*[-•*]\s*/, '').trimEnd();
    if (!line.trim()) continue;
    const i = line.indexOf(':');
    rows.push(i > 0 && i < 60 ? [line.slice(0, i).trim(), line.slice(i + 1).trim()] : [line]);
  }
  const ws = XLSX.utils.aoa_to_sheet([[title], [], ...rows]);
  ws['!cols'] = [{ wch: 36 }, { wch: 70 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Answer');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}

export async function exportAnswer(rawInput: unknown): Promise<ExportedFile> {
  const { title, text, format } = exportSchema.parse(rawInput);
  const base = `${safeName(title)}_${new Date().toISOString().slice(0, 10)}`;
  if (format === 'pdf') return { buffer: await toPdf(title, text), contentType: 'application/pdf', fileName: `${base}.pdf` };
  return {
    buffer: toXlsx(title, text),
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    fileName: `${base}.xlsx`,
  };
}
