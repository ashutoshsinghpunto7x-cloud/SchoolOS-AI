import cron from 'node-cron';
import { logger } from '../../lib/logger';
import { withLeaderLock } from '../../lib/redis-lock';
import { Visitor } from '../visitors/visitor.model';
import { admissionFormRepository } from '../admission-forms/admission-form.repository';
import { receptionTaskService } from './reception-task.service';

// Reception Management Module SRD, Module 8: "Auto-generated tasks from
// other modules ... this is what makes the module actually useful instead
// of another to-do list nobody opens." Two triggers wired so far: a visitor
// stuck in "waiting" too long, and an admission form issued but never
// submitted. `auto_followup_overdue` and `auto_onboarding` are still
// reserved for Modules 4/6 — Module 4's own missed-follow-up escalation
// ended up living in follow-up-auto.job.ts instead (it needed the 2-day
// stale check either way), so that source value may end up unused; wire it
// here too if a plain reception task turns out to be wanted on top of that.

const WAIT_THRESHOLD_MINUTES = 10;

/** Finds visitors still "waiting" past the threshold with no open task
 *  already raised for them, and creates one assigned to whichever reception
 *  staff checked them in. Exported standalone so it can be triggered
 *  manually (e.g. for verification) without waiting for the schedule. */
export async function runVisitorWaitCheck(): Promise<{ created: number }> {
  const cutoff = new Date(Date.now() - WAIT_THRESHOLD_MINUTES * 60 * 1000);
  const staleWaiting = await Visitor.find({
    status: 'waiting',
    checkInTime: { $lte: cutoff },
    isDeleted: false,
  }).lean();

  let created = 0;
  for (const visitor of staleWaiting) {
    try {
      const task = await receptionTaskService.createAutoTask({
        schoolId:         visitor.schoolId,
        title:            `Visitor waiting: ${visitor.name}`,
        description:      `${visitor.name} has been waiting to see ${visitor.personToVisit} for over ${WAIT_THRESHOLD_MINUTES} minutes.`,
        priority:         'high',
        dueDate:          new Date(),
        assignedToId:     visitor.recordedById,
        assignedById:     'system',
        linkedEntityType: 'visitor',
        linkedEntityId:   String(visitor._id),
        source:           'auto_visitor_wait',
      });
      if (task) created += 1;
    } catch (err) {
      logger.error('[ReceptionTaskAuto] Failed to create visitor-wait task', { visitorId: String(visitor._id), err });
    }
  }

  if (created > 0) {
    logger.info('[ReceptionTaskAuto] Visitor-wait check complete', { checked: staleWaiting.length, created });
  }
  return { created };
}

const FORM_OVERDUE_DAYS = 7;

/** Finds admission forms issued 7+ days ago that were never submitted, and
 *  raises a task for whoever issued them. Exported standalone for the same
 *  reason as runVisitorWaitCheck above. */
export async function runFormOverdueCheck(): Promise<{ created: number }> {
  const cutoff = new Date(Date.now() - FORM_OVERDUE_DAYS * 24 * 60 * 60 * 1000);
  const overdueForms = await admissionFormRepository.findOverdueUnsubmitted(cutoff);

  let created = 0;
  for (const form of overdueForms) {
    try {
      const task = await receptionTaskService.createAutoTask({
        schoolId:         form.schoolId,
        title:            `Admission form not submitted: ${form.formNumber}`,
        description:      `Form ${form.formNumber} was issued over ${FORM_OVERDUE_DAYS} days ago and still hasn't come back.`,
        priority:         'medium',
        dueDate:          new Date(),
        assignedToId:     form.issuedById,
        assignedById:     'system',
        linkedEntityType: 'admission_form',
        linkedEntityId:   String(form._id),
        source:           'auto_form_overdue',
      });
      if (task) created += 1;
    } catch (err) {
      logger.error('[ReceptionTaskAuto] Failed to create form-overdue task', { formId: String(form._id), err });
    }
  }

  if (created > 0) {
    logger.info('[ReceptionTaskAuto] Form-overdue check complete', { checked: overdueForms.length, created });
  }
  return { created };
}

// Same leader-lock pattern as planner-notifications.job.ts — every server
// instance runs its own timer, so without a lock a multi-instance deploy
// would raise the same task once per instance.
const VISITOR_WAIT_LOCK_KEY = 'locks:reception-task-visitor-wait';
const FORM_OVERDUE_LOCK_KEY = 'locks:reception-task-form-overdue';
const LEADER_LOCK_TTL_SECONDS = 240;

/** Registered once at process start (server.ts only, not app.ts, so a
 *  serverless import never owns a timer). Visitor-wait runs every 5 minutes
 *  (it's about minutes of waiting); form-overdue runs hourly (it's about
 *  days, 5-minute granularity would be pointless). */
export function startReceptionTaskAutoScheduler(): void {
  cron.schedule('*/5 * * * *', () => {
    withLeaderLock(VISITOR_WAIT_LOCK_KEY, LEADER_LOCK_TTL_SECONDS, async () => {
      await runVisitorWaitCheck();
    }).catch((err) => logger.error('[ReceptionTaskAuto] Scheduled run failed', { err }));
  });
  cron.schedule('30 * * * *', () => {
    withLeaderLock(FORM_OVERDUE_LOCK_KEY, LEADER_LOCK_TTL_SECONDS, async () => {
      await runFormOverdueCheck();
    }).catch((err) => logger.error('[ReceptionTaskAuto] Scheduled run failed', { err }));
  });
  logger.info('[ReceptionTaskAuto] Scheduler registered (visitor-wait every 5 min, form-overdue hourly)');
}
