/**
 * Phase 4 — Reception front office (enquiries, follow-ups, admission forms,
 * visitors, candidates, interviews, tasks), principal approval queues,
 * messaging/notifications, and transport.
 */
import { Types } from 'mongoose';
import { Enquiry } from '../../features/enquiries/enquiry.model';
import { EnquiryNote } from '../../features/enquiries/enquiry.note.model';
import { FollowUp } from '../../features/follow-ups/follow-up.model';
import { AdmissionForm } from '../../features/admission-forms/admission-form.model';
import { Visitor } from '../../features/visitors/visitor.model';
import { VisitorAppointment } from '../../features/visitors/visitor-appointment.model';
import { Candidate } from '../../features/candidates/candidate.model';
import { Interview } from '../../features/interviews/interview.model';
import { ReceptionTask } from '../../features/reception-tasks/reception-task.model';
import { LeaveRequest } from '../../features/leave-requests/leave-request.model';
import { StudentChangeRequest } from '../../features/student-change-requests/student-change-request.model';
import { Notification } from '../../features/notifications/notification.model';
import { InternalMessage } from '../../features/internal-messages/internal-message.model';
import { Communication } from '../../features/communications/communication.model';
import { Vehicle, VehicleLocation, StudentTransportAssignment } from '../../features/transport/transport.model';

import {
  SCHOOL_ID, SCHOOL_NAME, SEEDER, SURNAMES, BOYS, GIRLS, FATHERS, rand, pick, randInt, phone, iso, daysAgo, daysFromNow, at, log,
} from './common';
import { World } from './core';

export async function seedFrontOffice(world: World): Promise<void> {
  const rec = world.staff.reception;
  const principal = world.staff.principal;

  // ── Enquiries across the admission funnel ─────────────────────────────────
  type Stage = 'new_enquiry' | 'contacted' | 'follow_up_scheduled' | 'campus_visit' | 'application_submitted' | 'documents_pending' | 'admission_approved' | 'converted' | 'lost';
  const stagePlan: [Stage, number][] = [
    ['new_enquiry', 5], ['contacted', 4], ['follow_up_scheduled', 5], ['campus_visit', 3], ['application_submitted', 3],
    ['documents_pending', 2], ['admission_approved', 2], ['converted', 4], ['lost', 3],
  ];
  const sources = ['walk_in', 'website', 'referral', 'social_media', 'phone'] as const;
  const stageOrder: Stage[] = ['new_enquiry', 'contacted', 'follow_up_scheduled', 'campus_visit', 'application_submitted', 'documents_pending', 'admission_approved', 'converted'];
  const enquiries = [];
  for (const [stage, count] of stagePlan) {
    for (let k = 0; k < count; k++) {
      const boy = rand() < 0.5;
      const surname = pick(SURNAMES);
      const idx = stageOrder.indexOf(stage);
      const history = (stage === 'lost' ? stageOrder.slice(0, 3) : stageOrder.slice(0, idx + 1)).map((st, i) => ({
        stage: st, changedAt: daysAgo(40 - i * 5 - k), changedBy: rec.name,
      }));
      if (stage === 'lost') history.push({ stage: 'lost', changedAt: daysAgo(6), changedBy: rec.name });
      enquiries.push(await Enquiry.create({
        schoolId: SCHOOL_ID, studentName: `${boy ? pick(BOYS) : pick(GIRLS)} ${surname}`, interestedClass: pick(['6', '7', '8', '6', '7']),
        gender: boy ? 'male' : 'female', parentName: `${pick(FATHERS)} ${surname}`, parentPhone: phone(), stage, source: pick(sources),
        followUpDate: ['converted', 'lost', 'admission_approved'].includes(stage) ? undefined : daysFromNow(randInt(-2, 6)),
        stageHistory: history,
        conversionData: stage === 'converted' ? { studentId: world.students[60 + k]._id, convertedAt: daysAgo(10 + k), convertedBy: rec.name } : undefined,
        tags: [], createdBy: rec.name,
        assignedCounsellor: pick(['Kavita Rao', 'Kavita Rao', 'Meera Kapoor', 'Arvind Mehta']),
        createdAt: daysAgo(randInt(0, 25)),
      }));
    }
  }
  const noteTexts = [
    'Parent keen on the school’s smart classrooms; asked about transport on Gomti Nagar route.',
    'Child currently in a CBSE school; moving cities. Wants admission before January.',
    'Spoke to mother — will visit campus on Saturday with father.',
    'Fee structure shared on WhatsApp. Parent will confirm after discussing with family.',
    'Sibling already studying here — eligible for sibling concession.',
  ];
  for (const e of enquiries) {
    if (e.stage === 'new_enquiry' && rand() < 0.5) continue;
    await EnquiryNote.create({ enquiryId: e._id.toString(), schoolId: SCHOOL_ID, type: rand() < 0.2 ? 'pinned' : 'general', content: pick(noteTexts), createdByName: rec.name, createdById: rec._id });
  }

  // ── Follow-ups (pending / completed / missed) ─────────────────────────────
  const followable = enquiries.filter((e) => !['converted', 'lost'].includes(e.stage));
  const followUps: Record<string, unknown>[] = [];
  followable.forEach((e, i) => {
    const status = i % 5 === 0 ? 'missed' : i % 3 === 0 ? 'completed' : 'pending';
    followUps.push({
      schoolId: SCHOOL_ID, enquiryId: e._id.toString(), dueDate: status === 'missed' ? daysAgo(randInt(2, 5)) : status === 'completed' ? daysAgo(randInt(1, 4)) : daysFromNow(randInt(0, 5)),
      assignedToId: rec._id, channel: pick(['call', 'whatsapp', 'in_person'] as const), status,
      outcome: status === 'completed' ? 'Spoke to parent; interested, will visit campus.' : undefined,
      completedAt: status === 'completed' ? daysAgo(1) : undefined, createdBy: rec.name,
    });
  });
  await FollowUp.insertMany(followUps);

  // ── Admission forms ───────────────────────────────────────────────────────
  const docTypes = ['Birth Certificate', 'Previous School Transfer Certificate', 'Previous Report Card', 'Aadhaar / ID Proof', 'Passport-size Photographs'];
  const formEnq = enquiries.filter((e) => ['application_submitted', 'documents_pending', 'admission_approved', 'converted'].includes(e.stage));
  let formSeq = 0;
  for (const e of formEnq) {
    const verified = ['admission_approved', 'converted'].includes(e.stage);
    const docsDone = verified ? 5 : e.stage === 'documents_pending' ? 2 : 4;
    await AdmissionForm.create({
      schoolId: SCHOOL_ID, enquiryId: e._id.toString(), formNumber: `ADM-2026-${String(++formSeq).padStart(3, '0')}`, dateIssued: daysAgo(30 - formSeq),
      issuedById: rec._id, issuedByName: rec.name, formFee: 500, paymentStatus: 'paid', paymentTxnId: `TXN${randInt(100000, 999999)}`,
      submissionDate: daysAgo(20 - formSeq), verificationStatus: verified ? 'verified' : e.stage === 'application_submitted' ? 'pending_verification' : 'pending_verification',
      verifiedById: verified ? principal._id : undefined, verifiedByName: verified ? principal.name : undefined, verifiedAt: verified ? daysAgo(8) : undefined,
      documentChecklist: docTypes.map((documentType, i) => ({ documentType, received: i < docsDone, verifiedAt: i < docsDone && verified ? daysAgo(8) : undefined })),
      createdBy: rec.name,
    });
  }

  // ── Visitors (today + past two weeks) + appointments ──────────────────────
  const purposes = ['meet_student', 'meet_staff', 'admission_enquiry', 'fee_payment', 'delivery', 'vendor', 'interview'] as const;
  const people = ['Mrs. Meera Kapoor (Principal)', 'Arpit Gupta (Accounts)', 'Anjali Sharma', 'Rahul Verma', 'Reception', 'Harish Malhotra (Operations)'];
  const visitors: Record<string, unknown>[] = [];
  const todayStatuses = ['waiting', 'waiting', 'approved', 'in_meeting', 'in_meeting', 'completed', 'completed', 'completed', 'cancelled'] as const;
  let passSeq = 0;
  todayStatuses.forEach((status, i) => {
    const surname = pick(SURNAMES);
    const checkIn = at(new Date(), 8 + Math.floor(i / 2), (i * 11) % 60);
    visitors.push({
      schoolId: SCHOOL_ID, name: `${rand() < 0.5 ? pick(FATHERS) : pick(BOYS)} ${surname}`, contactNumber: phone(), purpose: purposes[i % purposes.length],
      purposeNote: i % 3 === 0 ? 'Has an appointment' : undefined, personToVisit: people[i % people.length], status,
      idProofType: 'aadhaar', passNumber: status === 'waiting' || status === 'cancelled' ? undefined : `VP-${iso(new Date()).replace(/-/g, '')}-${String(++passSeq).padStart(3, '0')}`,
      passIssuedAt: status === 'waiting' || status === 'cancelled' ? undefined : checkIn, passValidUntil: status === 'waiting' ? undefined : at(new Date(), 17),
      checkInTime: checkIn, checkOutTime: status === 'completed' ? new Date(checkIn.getTime() + randInt(15, 50) * 60000) : undefined,
      cancelledAt: status === 'cancelled' ? new Date(checkIn.getTime() + 10 * 60000) : undefined, cancelReason: status === 'cancelled' ? 'Visitor left without meeting' : undefined,
      recordedById: rec._id, recordedByName: rec.name,
    });
  });
  for (let d = 1; d <= 14; d++) {
    const n = randInt(2, 5);
    for (let k = 0; k < n; k++) {
      const checkIn = at(daysAgo(d), randInt(8, 14), randInt(0, 59));
      visitors.push({
        schoolId: SCHOOL_ID, name: `${pick(FATHERS)} ${pick(SURNAMES)}`, contactNumber: phone(), purpose: pick(purposes), personToVisit: pick(people),
        status: 'completed', idProofType: pick(['aadhaar', 'driving_license', 'voter_id'] as const), passNumber: `VP-${iso(daysAgo(d)).replace(/-/g, '')}-${String(k + 1).padStart(3, '0')}`,
        passIssuedAt: checkIn, passValidUntil: at(daysAgo(d), 17), checkInTime: checkIn, checkOutTime: new Date(checkIn.getTime() + randInt(10, 60) * 60000),
        recordedById: rec._id, recordedByName: rec.name,
      });
    }
  }
  await Visitor.insertMany(visitors);

  const apptDefs: [string, string, number, string, string][] = [
    ['Mr. Alok Saxena', 'admission_enquiry', 0.2, 'Mrs. Meera Kapoor (Principal)', 'scheduled'], ['Mrs. Nisha Tiwari', 'meet_staff', 0.4, 'Anjali Sharma', 'scheduled'],
    ['Mr. Rakesh Pandey', 'vendor', 1, 'Harish Malhotra (Operations)', 'scheduled'], ['Ms. Shreya Mishra', 'interview', 1.5, 'Mrs. Meera Kapoor (Principal)', 'scheduled'],
    ['Mr. Sunil Yadav', 'meet_student', -0.3, 'Rahul Verma', 'arrived'], ['Mrs. Rashmi Joshi', 'admission_enquiry', -2, 'Mrs. Meera Kapoor (Principal)', 'no_show'],
  ];
  for (const [visitorName, purpose, dayOffset, personToVisit, status] of apptDefs) {
    await VisitorAppointment.create({
      schoolId: SCHOOL_ID, visitorName, visitorPhone: phone(), purpose, scheduledFor: at(daysFromNow(Math.round(dayOffset)), 9 + Math.floor(rand() * 6), rand() < 0.5 ? 0 : 30),
      personToVisit, bookedById: rec._id, bookedByName: rec.name, status,
    });
  }

  // ── Recruitment: candidates + interviews ──────────────────────────────────
  const candDefs: [string, string, string, number, string, string][] = [
    ['Nidhi Agarwal', 'Primary Teacher — English', 'M.A. English, B.Ed', 4, 'new', 'job_portal'],
    ['Pankaj Srivastava', 'PGT Physics', 'M.Sc Physics, B.Ed', 7, 'forwarded_to_principal', 'referral'],
    ['Swati Chauhan', 'Art & Craft Teacher', 'BFA', 3, 'interview_scheduled', 'walk_in'],
    ['Imran Khan', 'Computer Science Teacher', 'MCA', 5, 'interview_completed', 'email'],
    ['Rekha Bhatia', 'Receptionist', 'B.Com', 2, 'selected', 'walk_in'],
    ['Sandeep Malhotra', 'Lab Assistant', 'B.Sc Chemistry', 1, 'hold', 'job_portal'],
    ['Aditi Verma', 'Primary Teacher — Maths', 'B.Sc, B.Ed', 3, 'rejected', 'job_portal'],
    ['Kunal Joshi', 'Sports Coach', 'B.P.Ed', 6, 'under_review', 'referral'],
  ];
  const cands: { _id: { toString(): string } }[] = [];
  for (const [name, positionApplied, qualification, experienceYears, status, source] of candDefs) {
    cands.push(await Candidate.create({
      schoolId: SCHOOL_ID, name, mobile: phone(), email: `${name.split(' ')[0].toLowerCase()}@mail-demo.in`, positionApplied, qualification, experienceYears,
      resumeUrl: 'https://example.com/demo-resume.pdf', source, dateReceived: daysAgo(randInt(5, 30)), receivedById: rec._id, receivedByName: rec.name, status,
      rejectionReason: status === 'rejected' ? 'Insufficient classroom experience for the role.' : undefined,
      forwardedTo: ['forwarded_to_principal', 'under_review', 'interview_scheduled', 'interview_completed', 'selected'].includes(status) ? principal._id : undefined,
      forwardedToName: ['forwarded_to_principal', 'under_review', 'interview_scheduled', 'interview_completed', 'selected'].includes(status) ? principal.name : undefined,
      forwardedAt: daysAgo(9), offeredSalary: status === 'selected' ? 28000 : undefined, joiningDate: status === 'selected' ? daysFromNow(14) : undefined,
    }));
  }
  const interviewOf = (idx: number, status: 'scheduled' | 'completed', dayOffset: number, feedback = false) =>
    Interview.create({
      schoolId: SCHOOL_ID, candidateId: cands[idx]._id.toString(), round: 1, scheduledAt: at(daysFromNow(dayOffset), 11), mode: 'in_person',
      interviewerIds: [principal._id], interviewerNames: [principal.name], status, createdBy: rec.name,
      feedback: feedback ? [{ _id: new Types.ObjectId(), interviewerId: principal._id, interviewerName: principal.name, score: 8, comments: 'Confident, strong subject knowledge and good rapport with children.', recommendation: 'yes', submittedAt: daysAgo(2) }] : [],
    });
  await interviewOf(2, 'scheduled', 2);
  await interviewOf(3, 'completed', -3, true);
  await interviewOf(4, 'completed', -9, true);

  // ── Reception tasks ───────────────────────────────────────────────────────
  const taskDefs: [string, string, string, number, string, string][] = [
    ['Call parents of 5 new enquiries from yesterday', 'high', 'manual', 0, 'open', 'none'], ['Collect pending documents from admission applicants', 'medium', 'auto_form_overdue', -1, 'in_progress', 'admission_form'],
    ['Follow up missed enquiry calls', 'urgent', 'auto_followup_overdue', -1, 'open', 'enquiry'], ['Visitor waiting more than 20 minutes — attend', 'high', 'auto_visitor_wait', 0, 'open', 'visitor'],
    ['Prepare joining kit for selected candidate (Rekha Bhatia)', 'medium', 'auto_onboarding', 3, 'open', 'candidate'], ['Print PTM invitation list', 'low', 'manual', 5, 'open', 'none'],
    ['Update visitor register for last week', 'low', 'manual', -3, 'completed', 'none'], ['Confirm Saturday campus tour slots', 'medium', 'manual', -1, 'completed', 'enquiry'],
  ];
  for (const [title, priority, source, due, status, linked] of taskDefs) {
    await ReceptionTask.create({
      schoolId: SCHOOL_ID, title, priority, dueDate: daysFromNow(due), assignedToId: rec._id, assignedById: principal._id, status,
      completedAt: status === 'completed' ? daysAgo(1) : undefined, completionNotes: status === 'completed' ? 'Done.' : undefined,
      linkedEntityType: linked, source,
    });
  }

  // ── Leave requests, change requests (principal approvals) ─────────────────
  const leaves: [number, 'full_day' | 'half_day', number, number, string, 'pending' | 'approved' | 'rejected'][] = [
    [0, 'full_day', 3, 3, 'Family function out of town.', 'pending'], [2, 'half_day', 1, 1, 'Medical appointment.', 'pending'],
    [1, 'full_day', -12, -11, 'Fever and rest as advised by doctor.', 'approved'], [3, 'full_day', -25, -25, 'Sister’s wedding.', 'approved'],
    [4, 'half_day', -8, -8, 'Bank work.', 'approved'], [2, 'full_day', -18, -18, 'Personal reasons.', 'rejected'],
  ];
  for (const [ti, leaveType, from, to, reason, status] of leaves) {
    const t = world.teachers[ti];
    await LeaveRequest.create({
      schoolId: SCHOOL_ID, teacherId: t.teacherId, teacherName: t.name, requestedByUserId: t._id, leaveType,
      dateFrom: iso(daysFromNow(from)), dateTo: iso(daysFromNow(to)), reason, status,
      ...(status !== 'pending' ? { reviewedByName: principal.name, reviewNote: status === 'approved' ? 'Approved.' : 'Exams ongoing — please reschedule.', reviewedAt: daysAgo(Math.abs(from) + 1) } : {}),
    });
  }
  const changeDefs: [number, Record<string, unknown>, Record<string, unknown>, string][] = [
    [3, { parentPhone: '9876501234' }, { parentPhone: world.students[3].parentPhone }, 'pending'],
    [27, { address: '14, Rose Villa, Gomti Nagar, Lucknow' }, { address: 'Old address' }, 'pending'],
    [45, { fatherName: 'Ashok Tiwari' }, { fatherName: world.students[45].fatherName }, 'approved'],
  ];
  for (const [si, changes, previousValues, status] of changeDefs) {
    const s = world.students[si];
    const t = world.teachers.find((x) => x.plan.classTeacherOf.cls === s.cls && x.plan.classTeacherOf.section === s.section) ?? world.teachers[0];
    await StudentChangeRequest.create({
      studentId: s._id, studentName: s.fullName, schoolId: SCHOOL_ID, requestedByUserId: t._id, requestedByName: t.name, changes, previousValues, status,
      ...(status !== 'pending' ? { reviewedByName: principal.name, reviewedAt: daysAgo(4) } : {}),
    });
  }

  // ── Notifications + internal messages + parent communications ─────────────
  const notifs: Record<string, unknown>[] = [];
  const add = (userId: string, type: string, title: string, body: string, read = false) =>
    notifs.push({ recipientUserId: userId, schoolId: SCHOOL_ID, type, title, body, priority: 'normal', senderUserId: principal._id, senderName: principal.name, isRead: read });
  add(principal._id, 'leave_request', 'New leave request', 'Anjali Sharma applied for full-day leave.');
  add(principal._id, 'leave_request', 'New leave request', 'Priya Nair applied for half-day leave.');
  add(principal._id, 'change_request', 'Student detail change', 'A class teacher requested a parent phone number update.', true);
  for (const t of world.teachers) {
    add(t._id, 'message', 'Staff meeting on 2 Dec', 'Term review meeting at 3:45 PM in the Conference Room.');
    add(t._id, 'plan_alert', 'Syllabus pace check', 'Your plan is on track — keep going!', true);
  }
  await Notification.insertMany(notifs);

  const msgs: [string, string, string][] = [
    ['Unit Test 3 results', 'Please finalise and submit your Unit Test 3 marks by Friday so we can publish before the PTM.', 'normal'],
    ['PTM preparation', 'Prepare a one-page progress summary for each student ahead of the 14 January PTM.', 'normal'],
    ['Annual Sports Day volunteers', 'Kindly share the names of 4 student volunteers per class by next Wednesday.', 'normal'],
  ];
  for (const [i, [subject, body, priority]] of msgs.entries()) {
    for (const t of world.teachers) {
      await InternalMessage.create({
        schoolId: SCHOOL_ID, senderUserId: principal._id, senderName: principal.name, recipientUserId: t._id, subject, body, priority, isRead: i > 0 && rand() < 0.6,
      });
    }
  }

  const comms: Record<string, unknown>[] = [];
  for (const s of world.students.slice(0, 40)) {
    comms.push({
      studentId: new Types.ObjectId(s._id), type: 'whatsapp', status: pick(['DELIVERED', 'READ', 'READ'] as const), provider: 'whatsapp-cloud', direction: 'outbound',
      title: pick(['Fee reminder', 'Attendance alert', 'PTM invitation']), message: `Dear parent, this is an automated message from ${SCHOOL_NAME}.`,
      summary: 'Automated WhatsApp notification delivered to parent.', createdBy: SEEDER, schoolId: SCHOOL_ID,
    });
  }
  await Communication.insertMany(comms);

  // ── Transport ─────────────────────────────────────────────────────────────
  const d1 = world.staff.driver1;
  const d2 = world.staff.driver2;
  const v1 = await Vehicle.create({ schoolId: SCHOOL_ID, vehicleNumber: 'DL-1PC-4041', routeName: 'Route 1 — Gomti Nagar', driverUserId: d1._id, driverName: d1.name, status: 'active' });
  const v2 = await Vehicle.create({ schoolId: SCHOOL_ID, vehicleNumber: 'UP-32-RT-8830', routeName: 'Route 2 — Indira Nagar', driverUserId: d2._id, driverName: d2.name, status: 'active' });
  await VehicleLocation.insertMany([
    { schoolId: SCHOOL_ID, vehicleId: v1._id.toString(), latitude: 26.8467, longitude: 80.9462, routeStatus: 'active' },
    { schoolId: SCHOOL_ID, vehicleId: v2._id.toString(), latitude: 26.8851, longitude: 80.9981, routeStatus: 'active' },
  ]);
  const busIds = world.students.filter((_, i) => i % 5 === 0 || i === 0 || i === 20);
  await StudentTransportAssignment.insertMany(busIds.map((s, i) => ({ schoolId: SCHOOL_ID, studentId: s._id, vehicleId: (i % 2 === 0 ? v1 : v2)._id.toString() })));
  log(`  enquiries: ${enquiries.length}, follow-ups: ${followUps.length}, visitors: ${visitors.length}, candidates: ${cands.length}, vehicles: 2`);
}
