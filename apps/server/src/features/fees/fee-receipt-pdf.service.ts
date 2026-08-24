import PDFDocument from 'pdfkit';
import { IFeeRecord } from './fee.model';
import { IFeePayment } from './fee.payment.model';
import { IStudent } from '../students/student.model';
import { ISchoolSettings } from '../school-settings/school-settings.model';
import { FNIC_LOGO_BASE64 } from '../../assets/fnic-logo';
import { NOTO_SANS_REGULAR_BASE64 } from '../../assets/noto-sans-regular';
import { NOTO_SANS_BOLD_BASE64 } from '../../assets/noto-sans-bold';

// Matches the web receipt's Intl.NumberFormat('en-IN', { style: 'currency',
// currency: 'INR', maximumFractionDigits: 0 }) exactly — e.g. "₹2,100".
// PDFKit's built-in Helvetica can't render ₹ (not in WinAnsi encoding), so
// every call site that prints a fmtCurrency() result must use the embedded
// NotoSans/NotoSans-Bold font (registered below), not Helvetica.
const fmtCurrency = (n: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const fmtDate = (d: Date): string => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const PAYMENT_MODE_LABELS: Record<string, string> = {
  cash: 'Cash',
  upi: 'UPI',
  sse_upi: 'SSE UPI',
  online: 'Online',
  sse_online: 'SSE Online',
  challan: 'Challan',
  cheque: 'Cheque',
  bank_transfer: 'Bank Transfer',
  demand_draft: 'DD',
  card: 'Card',
};

// Mirrors apps/web/src/features/accountant-workspace/components/FeeReceipt.tsx
// (SCHOOL_NAME / SCHOOL_ADDRESS, fnicLogo, StampSeal) — that component
// hardcodes the branding rather than reading it from school settings, so
// this does the same rather than falling back to the abbreviated
// settings.schoolName ("FNIC"). If FeeReceipt.tsx's branding ever changes,
// update these to match.
const SCHOOL_NAME = 'Florence Nightingale Inter College';
const SCHOOL_ADDRESS = 'Tulsi Puram, Triveni Nagar - 2, Triveni Nagar, Lucknow, Uttar Pradesh 226020';
const LOGO_BUFFER = Buffer.from(FNIC_LOGO_BASE64, 'base64');
const NOTO_SANS_REGULAR_BUFFER = Buffer.from(NOTO_SANS_REGULAR_BASE64, 'base64');
const NOTO_SANS_BOLD_BUFFER = Buffer.from(NOTO_SANS_BOLD_BASE64, 'base64');

/**
 * Renders the official fee receipt as a PDF buffer, in-memory only — nothing
 * is written to disk. Regenerated on demand every time it's needed (WhatsApp
 * send, retry, or the accountant's "Download Receipt" button) rather than
 * stored, so there's no file-storage/signed-URL surface to secure at all.
 * Visually mirrors the on-screen/print receipt
 * (apps/web/.../FeeReceipt.tsx#ReceiptCopy) — logo, full school name +
 * address, signature lines, stamp seal — so every place a receipt is viewed
 * or delivered looks identical, not just carries the same data fields.
 */
export function generateReceiptPdf(
  record: IFeeRecord,
  payment: IFeePayment,
  student: IStudent,
  _settings: ISchoolSettings,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.registerFont('NotoSans', NOTO_SANS_REGULAR_BUFFER);
      doc.registerFont('NotoSans-Bold', NOTO_SANS_BOLD_BUFFER);

      // ── Header — circular logo, school name, address, "Fee Receipt" banner ─
      const pageCenterX = doc.page.width / 2;
      const logoRadius = 34;
      const logoCenterY = doc.y + logoRadius;
      doc.save();
      doc.circle(pageCenterX, logoCenterY, logoRadius).clip();
      doc.image(LOGO_BUFFER, pageCenterX - logoRadius, logoCenterY - logoRadius, {
        width: logoRadius * 2,
        height: logoRadius * 2,
      });
      doc.restore();
      // doc.circle()/clip() move PDFKit's internal text cursor (doc.x) as a
      // side effect of drawing the path — every text() call below must pin
      // an explicit x (not rely on the cursor left over from the circle),
      // or it silently inherits that shifted x, same as the receipt-meta and
      // fee-table sections already do further down.
      doc.x = 50;
      doc.y = logoCenterY + logoRadius + 10;

      doc.fontSize(19).font('Helvetica-Bold').fillColor('#111827').text(SCHOOL_NAME, 50, doc.y, { width: 495, align: 'center' });
      doc.fontSize(9).font('Helvetica').fillColor('#9CA3AF').text(SCHOOL_ADDRESS, 50, doc.y, { width: 495, align: 'center' });
      doc.moveDown(0.4);
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#047857').text('Fee Receipt', 50, doc.y, { width: 495, align: 'center' });
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
      // Explicit label/value columns at a fixed x, not PDFKit's "continued"
      // implicit-cursor text flow — that flow inherits whatever x the last
      // drawing call left doc.x at (the logo circle above, in particular),
      // which is what shifted every row to the right previously.
      let rowY = doc.y;
      const row = (label: string, value: string) => {
        doc.fontSize(9).font('Helvetica').fillColor('#6B7280').text(label, 50, rowY, { width: 150, lineBreak: false });
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#111827').text(value, 205, rowY, { width: 340, lineBreak: false });
        rowY += 16;
      };

      row('Student Name', student.fullName);
      row('Admission No.', student.admissionNumber);
      row("Father's Name", student.fatherName || student.motherName || '—');
      row('Class / Section', `${record.class} - ${record.section}`);
      row('Payment Mode', PAYMENT_MODE_LABELS[payment.paymentMode] || payment.paymentMode);
      if (payment.referenceNumber) row('Reference No.', payment.referenceNumber);
      row('Collected By', payment.recordedByName);

      doc.x = 50;
      doc.y = rowY;
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
        .text(description, 60, lineTop + 8);
      doc.font('NotoSans').text(fmtCurrency(payment.amount), 400, lineTop + 8, { width: 135, align: 'right' });

      const totalTop = lineTop + 28;
      doc.rect(50, totalTop, 495, 26).fill('#ECFDF5');
      doc.fillColor('#047857').fontSize(10).font('Helvetica-Bold')
        .text('TOTAL AMOUNT PAID', 60, totalTop + 7);
      doc.font('NotoSans-Bold').fontSize(12).text(fmtCurrency(payment.amount), 400, totalTop + 6, { width: 135, align: 'right' });

      doc.y = totalTop + 26;
      doc.moveDown(1.2);

      if (record.balance > 0) {
        doc.fontSize(9).font('NotoSans').fillColor('#B45309')
          .text(`Outstanding balance on this fee record: ${fmtCurrency(record.balance)}`, 50, doc.y, { width: 495 });
        doc.moveDown(0.8);
      }

      // ── Signatures + stamp seal ─────────────────────────────────────────
      doc.moveDown(1.5);
      doc.dash(3, { space: 3 }).strokeColor('#E5E7EB').moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.undash();
      doc.moveDown(1.4);

      const sigY = doc.y;
      const sigLineY = sigY + 24;
      doc.strokeColor('#1F2937').lineWidth(1.2).moveTo(50, sigLineY).lineTo(210, sigLineY).stroke();
      doc.fontSize(8).font('Helvetica').fillColor('#9CA3AF').text('Student/Guardian Signature', 50, sigLineY + 4, { width: 160 });

      doc.strokeColor('#1F2937').lineWidth(1.2).moveTo(385, sigLineY).lineTo(545, sigLineY).stroke();
      doc.fontSize(8).font('Helvetica').fillColor('#9CA3AF').text('Accountant Stamp/Signature', 385, sigLineY + 4, { width: 160, align: 'right' });

      // Simplified round stamp seal, centered between the two signature lines.
      const stampCenterX = pageCenterX;
      const stampCenterY = sigY + 22;
      const stampR = 26;
      doc.save();
      doc.strokeColor('#0F5132').opacity(0.7);
      doc.lineWidth(1.2).circle(stampCenterX, stampCenterY, stampR).stroke();
      doc.lineWidth(1).circle(stampCenterX, stampCenterY, stampR - 6).stroke();
      doc.restore();
      doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#0F5132').opacity(0.85)
        .text('TRIVENI', stampCenterX - stampR, stampCenterY - 6, { width: stampR * 2, align: 'center' })
        .text('NAGAR', stampCenterX - stampR, stampCenterY + 2, { width: stampR * 2, align: 'center' });
      doc.opacity(1);

      doc.y = sigLineY + 40;

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
