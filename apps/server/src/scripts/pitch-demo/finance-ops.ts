/**
 * Phase 3 — fees, salary, payroll, expenses, vendors (Accountant) and
 * procurement, inventory, assets, facility tickets (Operations Manager).
 */
import { FeeStructure } from '../../features/fees/fee-structure.model';
import { FeeRecord } from '../../features/fees/fee.model';
import { FeePayment } from '../../features/fees/fee.payment.model';
import { FeeDiscountRequest } from '../../features/fees/fee-discount-request.model';
import { SalaryRecord } from '../../features/salary/salary.model';
import { PayrollRecord } from '../../features/payroll/payroll.model';
import { ExpenseRecord } from '../../features/expenses/expense.model';
import { Vendor } from '../../features/vendors/vendor.model';
import { VendorBill } from '../../features/vendors/vendor.bill.model';
import { VendorPayment } from '../../features/vendors/vendor.payment.model';
import { Asset } from '../../features/assets/asset.model';
import { InventoryItem } from '../../features/inventory/inventory-item.model';
import { StockMovement } from '../../features/inventory/stock-movement.model';
import { PurchaseRequest } from '../../features/purchases/purchase-request.model';
import { PurchaseOrder } from '../../features/purchases/purchase-order.model';
import { FacilityRequest } from '../../features/facility-requests/facility-request.model';

import {
  SCHOOL_ID, ACADEMIC_YEAR, CLASSES, PARENTS, MONTHS, rand, pick, randInt, daysAgo, daysFromNow, utc, log,
} from './common';
import { World } from './core';

const stamp = (d: Date): Date => (d.getTime() > Date.now() ? new Date() : d);
const FEE_MONTHS = [3, 4, 5, 6, 7, 8, 9, 10]; // Apr..Nov (0-indexed month numbers)
const TUITION: Record<string, number> = { '6': 3200, '7': 3500, '8': 3800 };

export async function seedFinance(world: World): Promise<void> {
  const acc = world.staff.accountant;
  const principal = world.staff.principal;

  // ── Fee structure ─────────────────────────────────────────────────────────
  const structure: Record<string, unknown>[] = [];
  for (const cls of CLASSES) {
    structure.push(
      { schoolId: SCHOOL_ID, class: cls, feeHead: 'tuition', academicYear: ACADEMIC_YEAR, month: null, amount: TUITION[cls], updatedBy: acc.name },
      { schoolId: SCHOOL_ID, class: cls, feeHead: 'examination', academicYear: ACADEMIC_YEAR, month: null, amount: 600, updatedBy: acc.name },
      { schoolId: SCHOOL_ID, class: cls, feeHead: 'transport', academicYear: ACADEMIC_YEAR, month: null, amount: 1200, updatedBy: acc.name },
      { schoolId: SCHOOL_ID, class: cls, feeHead: 'admission', academicYear: ACADEMIC_YEAR, month: null, amount: 5000, updatedBy: acc.name },
    );
  }
  await FeeStructure.insertMany(structure);

  // ── Fee records + payments ────────────────────────────────────────────────
  const records: Record<string, unknown>[] = [];
  const payments: Record<string, unknown>[] = [];
  const { Types } = await import('mongoose');
  let receiptSeq = 1000;
  const modes = ['cash', 'upi', 'upi', 'online', 'cheque', 'bank_transfer', 'card'] as const;

  function addRecord(s: World['students'][number], opts: {
    feeHead: string; description: string; month?: string; total: number; due: Date; status: 'paid' | 'partially_paid' | 'pending' | 'overdue';
    discount?: number; discountReason?: string; fine?: number;
  }) {
    const _id = new Types.ObjectId();
    const discount = opts.discount ?? 0;
    const fine = opts.fine ?? 0;
    const payable = opts.total + fine - discount;
    const paid = opts.status === 'paid' ? payable : opts.status === 'partially_paid' ? Math.round(payable * (0.4 + rand() * 0.3) / 50) * 50 : 0;
    records.push({
      _id, studentId: s._id, studentName: s.fullName, admissionNumber: s.admissionNumber, class: s.cls, section: s.section,
      schoolId: SCHOOL_ID, feeHead: opts.feeHead, description: opts.description, academicYear: ACADEMIC_YEAR, month: opts.month,
      totalAmount: opts.total, discountAmount: discount, discountReason: opts.discountReason, waivedAmount: 0, fineAmount: fine,
      paidAmount: paid, balance: payable - paid, dueDate: opts.due, status: opts.status, createdBy: acc.name, isDeleted: false,
      createdAt: stamp(new Date(opts.due.getTime() - 25 * 86400000)), updatedAt: stamp(new Date(opts.due.getTime() - 25 * 86400000)),
    });
    if (paid > 0) {
      const payDate = new Date(Math.min(opts.due.getTime() - randInt(0, 6) * 86400000 + (opts.status === 'paid' && rand() < 0.2 ? 5 * 86400000 : 0), Date.now() - 86400000));
      payments.push({
        feeRecordId: _id.toString(), studentId: s._id, schoolId: SCHOOL_ID, amount: paid, paymentDate: payDate,
        paymentMode: pick(modes), referenceNumber: rand() < 0.5 ? `TXN${randInt(100000, 999999)}` : undefined,
        recordedById: acc._id, recordedByName: acc.name, receiptNumber: `RCPT-2026-${++receiptSeq}`, isDeleted: false,
        createdAt: payDate, updatedAt: payDate,
      });
    }
  }

  const parentKids = new Set(PARENTS.flatMap((p) => p.childIdx.map((i) => world.students[i]._id)));
  for (const s of world.students) {
    const showcase = parentKids.has(s._id);
    const chronic = !showcase && rand() < 0.1; // ~10% families routinely pay late
    for (const m of FEE_MONTHS) {
      const due = utc(2026, m + 1, 10);
      const isLatest = m === 10;
      let status: 'paid' | 'partially_paid' | 'pending' | 'overdue';
      const r = rand();
      if (isLatest) status = r < 0.5 ? 'paid' : r < 0.62 ? 'partially_paid' : 'overdue';
      else if (chronic) status = r < 0.55 ? 'paid' : r < 0.7 ? 'partially_paid' : 'overdue';
      else status = r < 0.96 ? 'paid' : 'overdue';
      if (showcase) status = isLatest ? (s.rollNumber % 2 === 0 ? 'paid' : 'partially_paid') : 'paid';
      const scholarship = s.rollNumber === 3 && s.cls === '7' ? 300 : 0;
      addRecord(s, {
        feeHead: 'tuition', description: `${MONTHS[m]} 2026 Tuition Fee`, month: MONTHS[m], total: TUITION[s.cls], due, status,
        discount: scholarship, discountReason: scholarship ? 'Merit scholarship' : undefined, fine: status === 'overdue' ? 50 : 0,
      });
    }
    // Upcoming December tuition + examination fee (annual) + transport for bus users.
    addRecord(s, { feeHead: 'tuition', description: 'December 2026 Tuition Fee', month: 'December', total: TUITION[s.cls], due: utc(2026, 12, 10), status: 'pending' });
    addRecord(s, { feeHead: 'examination', description: 'Examination Fee — Term 1', total: 600, due: utc(2026, 9, 25), status: showcase || rand() < 0.93 ? 'paid' : 'overdue' });
  }
  const busKids = world.students.filter((_, i) => i % 5 === 0 || i === 0 || i === 20);
  for (const s of busKids) {
    for (const m of [8, 9, 10]) {
      addRecord(s, { feeHead: 'transport', description: `${MONTHS[m]} 2026 Transport Fee`, month: MONTHS[m], total: 1200, due: utc(2026, m + 1, 10), status: m === 10 && !parentKids.has(s._id) && rand() < 0.4 ? 'overdue' : 'paid' });
    }
  }
  await FeeRecord.insertMany(records, { ordered: false });
  await FeePayment.insertMany(payments, { ordered: false });
  log(`  fee records: ${records.length}, payments: ${payments.length}`);

  const disc = [
    ['pending', 'Sibling concession — younger sibling joining next session', 600],
    ['pending', 'Financial hardship — parent job loss, requesting 25% tuition relief', 1500],
    ['pending', 'Sports scholarship — state-level athlete', 1000],
    ['approved', 'Staff-ward concession', 800],
    ['rejected', 'Requested waiver of late fine without supporting reason', 400],
  ] as const;
  for (const [i, [status, reason, amt]] of disc.entries()) {
    const s = world.students[8 + i * 17];
    await FeeDiscountRequest.create({
      schoolId: SCHOOL_ID, studentId: s._id, studentName: s.fullName, class: s.cls, section: s.section,
      requestedAmount: amt, reason, status, requestedByName: acc.name,
      ...(status !== 'pending' ? { reviewedByName: principal.name, reviewNote: status === 'approved' ? 'Approved as per policy.' : 'Please resubmit with documents.', reviewedAt: daysAgo(3) } : {}),
    });
  }

  // ── Salary records (Apr–Nov paid, Nov partly scheduled, Dec scheduled) ─────
  const salaryRows: Record<string, unknown>[] = [];
  for (const e of world.employees) {
    for (let m = 9; m <= 11; m++) {
      const due = utc(2026, m + 2, 1); // paid on the 1st of the next month
      const isDec = m === 11;
      const isNov = m === 10;
      const lwpDays = rand() < 0.12 ? randInt(1, 2) : 0;
      const lwpAmount = Math.round((e.salary / 26) * lwpDays);
      const paid = !isDec && (!isNov || rand() < 0.55);
      salaryRows.push({
        schoolId: SCHOOL_ID, employeeName: e.name, designation: e.designation, month: MONTHS[m], year: 2026,
        amount: e.salary - lwpAmount, dueDate: due, status: paid ? 'paid' : 'scheduled',
        paidDate: paid ? new Date(due.getTime() - 86400000) : undefined, paymentMode: paid ? pick(['bank_transfer', 'bank_transfer', 'cheque']) : undefined,
        lwpDays, lwpAmount, isDeleted: false, createdBy: acc.name,
        createdAt: stamp(new Date(due.getTime() - 20 * 86400000)), updatedAt: paid ? stamp(new Date(due.getTime() - 86400000)) : stamp(new Date(due.getTime() - 20 * 86400000)),
        securityDeposit: m === 9 && e.role === 'peon'
          ? { totalAmount: 5000, mode: 'installments', installmentCount: 5, collectedAmount: 3000, status: 'in_progress', history: [{ amount: 1000, date: utc(2026, 4, 5), recordedBy: acc.name }, { amount: 1000, date: utc(2026, 5, 5), recordedBy: acc.name }, { amount: 1000, date: utc(2026, 6, 5), recordedBy: acc.name }] }
          : undefined,
      });
    }
  }
  await SalaryRecord.insertMany(salaryRows);
  log(`  salary rows: ${salaryRows.length}`);

  // ── Payroll (attendance-derived) for Sep–Nov ──────────────────────────────
  const payroll: Record<string, unknown>[] = [];
  for (const e of world.employees) {
    for (const m of [9, 10, 11]) {
      const absent = rand() < 0.2 ? randInt(1, 2) : 0;
      const late = randInt(0, 3);
      const half = rand() < 0.2 ? 1 : 0;
      const present = 26 - absent - half;
      const dailyRate = Math.round(e.salary / 26);
      const deductions = absent * dailyRate + half * Math.round(dailyRate / 2);
      payroll.push({
        employeeObjectId: e._id, employeeId: e.employeeId, employeeName: e.name, designation: e.designation, department: e.role === 'teacher' ? 'Academics' : 'Administration',
        schoolId: SCHOOL_ID, month: m, year: 2026, workingDaysPerMonth: 26, dailyRate, presentDays: present, lateDays: late, halfDays: half, absentDays: absent,
        grossSalary: e.salary, deductions, netSalary: e.salary - deductions, status: m === 11 ? 'generated' : 'paid',
        generatedAt: utc(2026, m + 1, 1), paidAt: m === 11 ? undefined : utc(2026, m + 1, 3), paidBy: m === 11 ? undefined : acc.name,
        paymentMode: m === 11 ? undefined : 'bank_transfer', createdBy: acc.name,
        createdAt: stamp(utc(2026, m + 1, 1)), updatedAt: stamp(utc(2026, m + 1, 3)),
      });
    }
  }
  await PayrollRecord.insertMany(payroll);

  // ── Vendors, bills, payments ──────────────────────────────────────────────
  const vendorDefs = [
    ['Lucknow Stationers & Co.', 'supplies', 'Mr. Anand Tandon'], ['BrightSpark Electricals', 'maintenance', 'Mr. Imran Qureshi'],
    ['CleanSweep Facility Services', 'services', 'Ms. Rita Fernandes'], ['City Power Distribution', 'utilities', 'Billing Desk'],
    ['TechNova IT Solutions', 'supplies', 'Mr. Gaurav Sethi'], ['GreenLeaf Gardening', 'services', 'Mr. Ramu Prasad'],
    ['Shri Ram Furniture Works', 'supplies', 'Mr. Om Prakash'], ['AquaPure Water Systems', 'maintenance', 'Mr. Nitin Bhalla'],
  ] as const;
  const vendors = [];
  for (const [name, category, contactPerson] of vendorDefs) {
    vendors.push(await Vendor.create({
      schoolId: SCHOOL_ID, name, category, status: 'active', contactPerson, phone: `9${randInt(100000000, 999999999)}`,
      email: `${name.split(' ')[0].toLowerCase()}@vendor-demo.in`, address: 'Lucknow, Uttar Pradesh',
      gstNumber: `09ABCDE${randInt(1000, 9999)}F1Z${randInt(1, 9)}`, createdBy: acc.name, isDeleted: false,
    }));
  }
  const billDefs: [number, string, number, 'unpaid' | 'partially_paid' | 'paid', number][] = [
    [0, 'Notebooks & stationery — Term 2 stock', 38500, 'paid', 45], [0, 'Chart paper, markers and art supplies', 12400, 'unpaid', 12],
    [1, 'Classroom fan & tube-light replacement', 16800, 'paid', 38], [1, 'Lab wiring repair', 9200, 'partially_paid', 18],
    [2, 'Housekeeping contract — November', 42000, 'unpaid', 6], [2, 'Housekeeping contract — October', 42000, 'paid', 36],
    [3, 'Electricity bill — October', 58400, 'paid', 30], [3, 'Electricity bill — November', 61250, 'unpaid', 4],
    [4, 'Projector lamps & HDMI cables', 22750, 'partially_paid', 20], [5, 'Garden maintenance — quarterly', 14500, 'paid', 50],
    [6, 'New classroom desks (20 sets)', 84000, 'partially_paid', 25], [7, 'RO filter service & cartridges', 7800, 'unpaid', 9],
  ];
  const bills = [];
  let billSeq = 100;
  for (const [vi, description, amount, status, ago] of billDefs) {
    const v = vendors[vi];
    const paidAmount = status === 'paid' ? amount : status === 'partially_paid' ? Math.round(amount * 0.5) : 0;
    const bill = await VendorBill.create({
      schoolId: SCHOOL_ID, vendorId: v._id.toString(), vendorName: v.name, billNumber: `INV-${++billSeq}`, description,
      category: v.category, amount, paidAmount, balance: amount - paidAmount, billDate: daysAgo(ago), dueDate: daysAgo(ago - 15),
      status, createdBy: acc.name, isDeleted: false, createdAt: daysAgo(ago), updatedAt: daysAgo(ago),
    });
    bills.push(bill);
    if (paidAmount > 0) {
      await VendorPayment.create({
        vendorId: v._id.toString(), schoolId: SCHOOL_ID, billId: bill._id.toString(), amount: paidAmount, paymentDate: daysAgo(Math.max(1, ago - 10)),
        paymentMode: pick(['bank_transfer', 'cheque', 'online']), recordedById: acc._id, recordedByName: acc.name, receiptNumber: `VPR-2026-${String(bills.length).padStart(3, "0")}`, idempotencyKey: `seed-vendor-payment-${bills.length}`, isDeleted: false, createdAt: daysAgo(Math.max(1, ago - 10)), updatedAt: daysAgo(Math.max(1, ago - 10)),
      } as never);
    }
  }

  // ── Expenses ──────────────────────────────────────────────────────────────
  const expDefs: [string, 'electricity' | 'maintenance' | 'fuel' | 'supplies' | 'other', number][] = [
    ['Electricity bill', 'electricity', 58000], ['Diesel for school buses', 'fuel', 24000], ['Plumbing repairs', 'maintenance', 8500],
    ['Whiteboard markers & dusters', 'supplies', 3200], ['Sports day equipment', 'other', 18500], ['Generator servicing', 'maintenance', 11000],
    ['Printing — exam papers', 'supplies', 9400], ['CCTV maintenance', 'maintenance', 7000], ['First-aid kits refill', 'supplies', 4200],
    ['Staff refreshments — PTM', 'other', 5600],
  ];
  const expenses: Record<string, unknown>[] = [];
  for (let i = 0; i < 28; i++) {
    const [title, category, base] = expDefs[i % expDefs.length];
    const ago = Math.floor(i * 6.2) + randInt(0, 4);
    expenses.push({
      schoolId: SCHOOL_ID, title: i >= expDefs.length ? `${title} (${MONTHS[daysAgo(ago).getMonth()]})` : title, category,
      amount: Math.round(base * 0.5 * (0.85 + rand() * 0.3)), date: daysAgo(ago), status: ago < 8 && rand() < 0.5 ? 'pending' : 'approved',
      paymentMode: pick(['cash', 'cheque', 'bank_transfer', 'online']), notes: rand() < 0.3 ? 'Bill attached with accounts file.' : undefined,
      isDeleted: false, createdBy: acc.name,
      createdAt: daysAgo(ago), updatedAt: daysAgo(ago),
    });
  }
  await ExpenseRecord.insertMany(expenses);
  log(`  vendors: ${vendors.length}, bills: ${bills.length}, expenses: ${expenses.length}`);

  await seedOperations(world, vendors.map((v) => ({ _id: v._id.toString(), name: v.name })));
}

async function seedOperations(world: World, vendors: { _id: string; name: string }[]): Promise<void> {
  const ops = world.staff.operations;
  const principal = world.staff.principal;
  const empOf = (key: string) => world.employees.find((e) => e.userId === world.staff[key]._id)!;

  // ── Assets ────────────────────────────────────────────────────────────────
  const assetDefs: [string, string, string, number, number][] = [
    ['Dell Desktop — Computer Lab PC-01..20', 'computers', 'Computer Lab', 1100000, 14], ['HP LaserJet Printer', 'printers', 'Admin Office', 28000, 20],
    ['Epson Projector — Class 6A', 'projectors', 'Room 6A', 42000, 16], ['Epson Projector — Class 8A', 'projectors', 'Room 8A', 42000, 16],
    ['Voltas 1.5T AC — Principal Office', 'ac_units', "Principal's Office", 38500, 22], ['Voltas 1.5T AC — Staff Room', 'ac_units', 'Staff Room', 38500, 22],
    ['Smart Board — Class 7A', 'smart_boards', 'Room 7A', 145000, 10], ['Smart Board — Class 7B', 'smart_boards', 'Room 7B', 145000, 10],
    ['Student Desks (Class 6)', 'desks', 'Class 6 block', 96000, 30], ['Student Desks (Class 8)', 'desks', 'Class 8 block', 110000, 30],
    ['School Bus — Route 1 (DL-1PC-4041)', 'vehicles', 'Parking Bay 1', 2450000, 28], ['School Bus — Route 2 (UP-32-RT-8830)', 'vehicles', 'Parking Bay 2', 2380000, 26],
    ['Photocopier — Staff Room', 'printers', 'Staff Room', 64000, 34], ['Science Lab Microscopes (set of 10)', 'other', 'Science Lab', 85000, 18],
  ];
  const assets = [];
  const prefix: Record<string, string> = { computers: 'COMP', printers: 'PRN', projectors: 'PROJ', ac_units: 'AC', desks: 'DESK', smart_boards: 'SB', vehicles: 'VEH', other: 'OTH' };
  const seqByCat: Record<string, number> = {};
  for (const [i, [name, category, location, cost, monthsAgo]] of assetDefs.entries()) {
    seqByCat[category] = (seqByCat[category] ?? 0) + 1;
    const purchaseDate = daysAgo(monthsAgo * 30);
    assets.push(await Asset.create({
      schoolId: SCHOOL_ID, assetId: `AST-${prefix[category]}-${String(seqByCat[category]).padStart(3, '0')}`, name, category,
      purchaseDate, purchaseCost: cost, vendorId: vendors[i % vendors.length]._id,
      warrantyExpiry: new Date(purchaseDate.getTime() + 3 * 365 * 86400000), amcExpiry: i % 3 === 0 ? daysFromNow(40 + i * 10) : undefined,
      location, status: i === 3 ? 'under_repair' : 'active', createdBy: ops.name,
    }));
  }

  // ── Inventory + stock movements ───────────────────────────────────────────
  const invDefs: [string, string, string, number, number, number, string][] = [
    ['A4 Copier Paper (ream)', 'STN-A4', 'stationery', 120, 50, 285, 'Store Room A'], ['Whiteboard Markers (box of 10)', 'STN-WBM', 'stationery', 14, 20, 240, 'Store Room A'],
    ['Chalk Boxes', 'STN-CHK', 'stationery', 60, 25, 55, 'Store Room A'], ['Student Notebooks (200 pages)', 'STN-NB200', 'stationery', 380, 150, 48, 'Store Room A'],
    ['LED Tube Lights', 'ELE-LED', 'electrical', 9, 12, 320, 'Maintenance Room'], ['Ceiling Fans', 'ELE-FAN', 'electrical', 6, 4, 2400, 'Maintenance Room'],
    ['HDMI Cables', 'IT-HDMI', 'it_equipment', 11, 6, 450, 'IT Store'], ['Wireless Mouse', 'IT-MSE', 'it_equipment', 18, 8, 420, 'IT Store'],
    ['Football', 'SPT-FB', 'sports_equipment', 8, 4, 780, 'Sports Room'], ['Cricket Bats', 'SPT-BAT', 'sports_equipment', 5, 6, 1250, 'Sports Room'],
    ['Floor Cleaner (5L)', 'CLN-FLR', 'cleaning_materials', 22, 10, 520, 'Housekeeping Store'], ['Hand Wash Liquid (5L)', 'CLN-HW', 'cleaning_materials', 4, 10, 480, 'Housekeeping Store'],
    ['Lab Beakers (set)', 'LAB-BKR', 'lab_equipment', 30, 15, 640, 'Science Lab'], ['Student Chairs', 'FUR-CHR', 'furniture', 42, 20, 1150, 'Furniture Store'],
    ['First-Aid Kits', 'CON-FAK', 'consumables', 7, 5, 650, 'Medical Room'], ['ID Card Lanyards', 'CON-LAN', 'consumables', 260, 100, 18, 'Front Office'],
  ];
  const items = [];
  for (const [itemName, sku, category, qty, min, price, loc] of invDefs) {
    items.push(await InventoryItem.create({
      schoolId: SCHOOL_ID, sku, itemName, category, qtyAvailable: qty, minStockLevel: min, unitPrice: price,
      preferredVendorId: vendors[sku.startsWith('ELE') ? 1 : sku.startsWith('CLN') ? 2 : sku.startsWith('IT') ? 4 : 0]._id, storageLocation: loc, createdBy: ops.name,
    }));
  }
  const moves: Record<string, unknown>[] = [];
  const staffEmployees = world.employees.filter((e) => e.role === 'teacher');
  for (let i = 0; i < 40; i++) {
    const it = items[i % items.length];
    const type = pick(['added', 'issued', 'issued', 'returned', 'damaged'] as const);
    const qty = type === 'added' ? randInt(10, 60) : randInt(1, 6);
    moves.push({
      schoolId: SCHOOL_ID, itemId: it._id.toString(), itemName: it.itemName, type, qty: type === 'added' ? qty : -qty,
      balanceAfter: it.qtyAvailable, refType: type === 'added' ? 'po_receipt' : type === 'issued' ? 'requisition' : 'adjustment',
      issuedTo: type === 'issued' ? pick(staffEmployees)._id : undefined, recordedBy: ops.name,
      note: type === 'damaged' ? 'Damaged during handling' : undefined, createdAt: daysAgo(randInt(1, 60)),
    });
  }
  await StockMovement.insertMany(moves);

  // ── Purchase requests + orders ────────────────────────────────────────────
  const prDefs: [string, string, string, { name: string; quantity: number; unit: string; estimatedCost: number }[], string, string][] = [
    ['teacher1', 'lab_equipment', 'Science', [{ name: 'Digital Weighing Scale', quantity: 3, unit: 'pcs', estimatedCost: 2400 }, { name: 'Test tubes (box)', quantity: 10, unit: 'box', estimatedCost: 350 }], 'Needed for Class 8 practical sessions this term.', 'pending'],
    ['teacher0', 'stationery', 'Maths', [{ name: 'Geometry Boxes', quantity: 40, unit: 'pcs', estimatedCost: 90 }], 'Replacement for worn-out class sets.', 'pending'],
    ['reception', 'stationery', 'Front Office', [{ name: 'Visitor Pass Books', quantity: 6, unit: 'pcs', estimatedCost: 120 }, { name: 'File folders', quantity: 50, unit: 'pcs', estimatedCost: 25 }], 'Admissions season stock.', 'pending'],
    ['accountant', 'it_equipment', 'Accounts', [{ name: 'Receipt Printer Rolls', quantity: 20, unit: 'rolls', estimatedCost: 85 }], 'Fee counter running low.', 'approved'],
    ['teacher3', 'furniture', 'Hindi', [{ name: 'Library Bookshelf', quantity: 2, unit: 'pcs', estimatedCost: 7800 }], 'Class library corner.', 'converted'],
    ['teacher4', 'cleaning_supplies', 'Social Studies', [{ name: 'Dustbins (large)', quantity: 12, unit: 'pcs', estimatedCost: 380 }], 'Replace broken classroom bins.', 'converted'],
    ['principal', 'it_equipment', 'Administration', [{ name: 'Laptop for Admin Office', quantity: 1, unit: 'pcs', estimatedCost: 52000 }], 'Current machine is 7 years old.', 'rejected'],
  ];
  const requests = [];
  let prSeq = 0;
  for (const [who, category, department, items2, justification, status] of prDefs) {
    const raiserName = who.startsWith('teacher') ? world.teachers[Number(who.slice(7))].name : world.staff[who].name;
    const raiserEmp = who.startsWith('teacher') ? world.employees.find((e) => e.userId === world.teachers[Number(who.slice(7))]._id)! : empOf(who);
    const pr = await PurchaseRequest.create({
      schoolId: SCHOOL_ID, requestNo: `PR-2026-${String(++prSeq).padStart(3, '0')}`, raisedBy: raiserEmp._id, raisedByName: raiserName,
      department, category, items: items2, justification, status,
      ...(status !== 'pending' ? { approvedBy: principal.name, decidedAt: daysAgo(randInt(2, 15)), rejectionReason: status === 'rejected' ? 'Deferred to next financial quarter.' : undefined } : {}),
      createdBy: raiserName, createdAt: daysAgo(randInt(4, 25)),
    });
    requests.push(pr);
  }
  const converted = requests.filter((r) => r.status === 'converted');
  const poDefs = [
    { vendor: 6, status: 'received', lines: [{ itemName: 'Library Bookshelf', quantity: 2, unitPrice: 7800, quantityReceived: 2 }], reqs: [converted[0]], bill: true },
    { vendor: 2, status: 'partially_received', lines: [{ itemName: 'Dustbins (large)', quantity: 12, unitPrice: 380, quantityReceived: 8 }], reqs: [converted[1]], bill: false },
    { vendor: 0, status: 'issued', lines: [{ itemName: 'Student Notebooks (200 pages)', quantity: 500, unitPrice: 46, quantityReceived: 0 }, { itemName: 'A4 Copier Paper (ream)', quantity: 100, unitPrice: 280, quantityReceived: 0 }], reqs: [], bill: false },
  ] as const;
  let poSeq = 0;
  for (const p of poDefs) {
    const lineItems = p.lines.map((l) => ({ ...l, total: l.quantity * l.unitPrice }));
    const po = await PurchaseOrder.create({
      schoolId: SCHOOL_ID, poNumber: `PO-2026-${String(++poSeq).padStart(3, '0')}`, vendorId: vendors[p.vendor]._id, vendorName: vendors[p.vendor].name,
      requestIds: p.reqs.map((r) => r._id.toString()), lineItems, totalAmount: lineItems.reduce((a, l) => a + l.total, 0),
      deliveryDate: p.status === 'issued' ? daysFromNow(6) : daysAgo(5), status: p.status, createdBy: ops.name,
    });
    for (const r of p.reqs) await PurchaseRequest.updateOne({ _id: r._id }, { poId: po._id.toString() });
  }

  // ── Facility requests ─────────────────────────────────────────────────────
  const facDefs: [string, string, string, string, string, string][] = [
    ['teacher0', 'ac', 'high', 'Staff Room', 'AC not cooling since Monday.', 'in_progress'], ['teacher1', 'electrical', 'urgent', 'Room 6B', 'Two tube-lights flickering; one switchboard sparking.', 'assigned'],
    ['teacher2', 'furniture', 'medium', 'Room 7A', '4 benches have broken legs.', 'open'], ['reception', 'computer', 'medium', 'Front Desk', 'Reception PC freezes on the visitor app.', 'open'],
    ['teacher3', 'plumbing', 'high', 'Ground floor washroom', 'Tap leaking, water pooling in the corridor.', 'completed'], ['accountant', 'electrical', 'low', 'Accounts Office', 'Power socket near the counter loose.', 'completed'],
    ['teacher4', 'computer', 'medium', 'Computer Lab', 'PC-07 and PC-12 not booting.', 'in_progress'], ['principal', 'ac', 'low', "Principal's Office", 'Annual AC servicing due.', 'assigned'],
    ['teacher1', 'furniture', 'low', 'Room 6A', 'Teacher chair wobbly.', 'cancelled'], ['teacher2', 'other', 'medium', 'Playground', 'Swing set chains need inspection.', 'open'],
  ];
  const techEmp = world.employees.find((e) => e.role === 'peon');
  let fSeq = 0;
  for (const [who, issueType, priority, location, description, status] of facDefs) {
    const isT = who.startsWith('teacher');
    const raiser = isT ? world.teachers[Number(who.slice(7))] : world.staff[who];
    const assigned = ['assigned', 'in_progress', 'completed'].includes(status);
    await FacilityRequest.create({
      schoolId: SCHOOL_ID, ticketNo: `MT-2026-${String(++fSeq).padStart(3, '0')}`, raisedBy: raiser._id, raisedByName: raiser.name,
      raisedByRole: isT ? 'teacher' : who, issueType, priority, location, description, status,
      createdAt: daysAgo(randInt(8, 16)),
      ...(assigned ? {
        assignedToType: fSeq % 3 === 0 ? 'vendor' : 'employee', assignedToId: fSeq % 3 === 0 ? vendors[1]._id : techEmp?._id,
        assignedToName: fSeq % 3 === 0 ? vendors[1].name : techEmp?.name, assignedAt: daysAgo(randInt(2, 6)),
        startedAt: status !== 'assigned' ? daysAgo(randInt(1, 4)) : undefined,
        resolvedAt: status === 'completed' ? daysAgo(1) : undefined, resolutionNotes: status === 'completed' ? 'Fixed and verified by requester.' : undefined,
      } : {}),
    });
  }
  log(`  assets: ${assets.length}, inventory: ${items.length}, PRs: ${requests.length}, POs: ${poDefs.length}, facility tickets: ${facDefs.length}`);
}
