import PDFDocument from 'pdfkit';
import { IFeeRecord } from './fee.model';
import { IFeePayment } from './fee.payment.model';
import { IStudent } from '../students/student.model';
import { ISchoolSettings } from '../school-settings/school-settings.model';

const fmtCurrency = (n: number): string => `Rs. ${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const fmtDate = (d: Date): string => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const PAYMENT_MODE_LABELS: Record<string, string> = {
  cash: 'Cash',
  cheque: 'Cheque',
  bank_transfer: 'Bank Transfer',
  online: 'Online',
  demand_draft: 'Demand Draft',
};

/**
 * Renders the official fee receipt as a PDF buffer, in-memory only — nothing
 * is written to disk. Regenerated on demand every time it's needed (WhatsApp
 * send, retry, or the accountant's "Download Receipt" button) rather than
 * stored, so there's no file-storage/signed-URL surface to secure at all.
 * Field set intentionally mirrors the on-screen receipt
 * (apps/web/.../FeeReceipt.tsx#ReceiptCopy) so every place a receipt is
 * viewed shows the same information.
 */
export function generateReceiptPdf(
  record: IFeeRecord,
  payment: IFeePayment,
  student: IStudent,
  settings: ISchoolSettings,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const schoolName = settings.schoolName || 'School';

      // ── Header ──────────────────────────────────────────────────────────
      doc.fontSize(20).font('Helvetica-Bold').fillColor('#111827').text(schoolName, { align: 'center' });
      if (settings.reportCardBranding?.address) {
        doc.fontSize(9).font('Helvetica').fillColor('#6B7280').text(settings.reportCardBranding.address, { align: 'center' });
      }
      doc.moveDown(0.3);
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#047857').text('Fee Receipt', { align: 'center' });
      doc.moveDown(0.8);
      doc.strokeColor('#E5E7EB').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.8);

      // ── Receipt meta ────────────────────────────────────────────────────
      const metaTop = doc.y;
      doc.fontSize(9).font('Helvetica').fillColor('#9CA3AF').text('RECEIPT NO.', 50, metaTop);
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text(payment.receiptNumber || '—', 50, metaTop + 12);
      doc.fontSize(9).font('Helvetica').fillColor('#9CA3AF').text('DATE', 350, metaTop, { width: 195, align: 'right' });
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text(fmtDate(payment.paymentDate), 350, metaTop + 12, { width: 195, align: 'right' });
      doc.moveDown(2);

      // ── Student details ─────────────────────────────────────────────────
      const row = (label: string, value: string) => {
        doc.fontSize(9).font('Helvetica').fillColor('#6B7280').text(label, { continued: true, width: 495 });
        doc.font('Helvetica-Bold').fillColor('#111827').text(`   ${value}`);
        doc.moveDown(0.35);
      };

      row('Student Name', student.fullName);
      row('Admission No.', student.admissionNumber);
      row("Father's Name", student.fatherName || student.motherName || '—');
      row('Class / Section', `${record.class} - ${record.section}`);
      row('Payment Mode', PAYMENT_MODE_LABELS[payment.paymentMode] || payment.paymentMode);
      if (payment.referenceNumber) row('Reference No.', payment.referenceNumber);
      row('Collected By', payment.recordedByName);

      doc.moveDown(0.5);
      doc.strokeColor('#E5E7EB').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.8);

      // ── Fee breakdown ───────────────────────────────────────────────────
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#6B7280').text('FEE DETAILS');
      doc.moveDown(0.4);

      const description = record.customHead || record.description || `${record.feeHead.charAt(0).toUpperCase()}${record.feeHead.slice(1)} Fee`;
      const tableTop = doc.y;
      doc.rect(50, tableTop, 495, 22).fill('#F9FAFB');
      doc.fillColor('#9CA3AF').fontSize(9).font('Helvetica-Bold')
        .text('DESCRIPTION', 60, tableTop + 6)
        .text('AMOUNT', 400, tableTop + 6, { width: 135, align: 'right' });

      const lineTop = tableTop + 22;
      doc.fillColor('#374151').fontSize(10).font('Helvetica')
        .text(description, 60, lineTop + 8)
        .text(fmtCurrency(payment.amount), 400, lineTop + 8, { width: 135, align: 'right' });

      const totalTop = lineTop + 28;
      doc.rect(50, totalTop, 495, 26).fill('#ECFDF5');
      doc.fillColor('#047857').fontSize(10).font('Helvetica-Bold')
        .text('TOTAL AMOUNT PAID', 60, totalTop + 7)
        .fontSize(12).text(fmtCurrency(payment.amount), 400, totalTop + 6, { width: 135, align: 'right' });

      doc.y = totalTop + 26;
      doc.moveDown(1.2);

      if (record.balance > 0) {
        doc.fontSize(9).font('Helvetica').fillColor('#B45309')
          .text(`Outstanding balance on this fee record: ${fmtCurrency(record.balance)}`);
        doc.moveDown(0.8);
      }

      // ── Footer ──────────────────────────────────────────────────────────
      doc.moveDown(1.5);
      doc.strokeColor('#E5E7EB').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.6);
      doc.fontSize(8).font('Helvetica').fillColor('#9CA3AF')
        .text('This is a computer-generated receipt and does not require a physical signature.', { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err instanceof Error ? err : new Error('Failed to generate receipt PDF'));
    }
  });
}
