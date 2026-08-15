import { maintenanceRepository } from './maintenance.repository';
import { maintenanceCache } from './maintenance.cache';
import { IMaintenanceState } from './maintenance.model';
import { scheduleMaintenanceSchema, toggleMaintenanceSchema, ScheduleMaintenanceInput, ToggleMaintenanceInput } from './maintenance.validation';
import { notificationService } from '../notifications/notification.service';
import { auditService } from '../audit/audit.service';
import { AuthContext } from '../../lib/auth-context';
import type { UserRole } from '../users/user.model';

// Roles that keep access while maintenance is active — internal Ops staff
// plus the two tenant roles that need to be able to check on/resolve an
// incident (admin, principal). Everyone else (teacher, reception, accountant)
// is blocked at login and redirected mid-session.
const MAINTENANCE_EXEMPT_ROLES: readonly UserRole[] = [
  'admin', 'principal', 'owner', 'super_admin', 'devops', 'developer', 'support',
];

export interface MaintenanceStatus {
  isActive: boolean;
  reason: 'manual' | 'scheduled' | null;
  message: string;
  scheduledStartAt?: Date;
  scheduledEndAt?: Date;
  manualActive: boolean;
}

function computeStatus(state: IMaintenanceState | null): MaintenanceStatus {
  if (!state) {
    return { isActive: false, reason: null, message: '', manualActive: false };
  }

  if (state.manualActive) {
    return {
      isActive: true,
      reason: 'manual',
      message: state.message,
      scheduledStartAt: state.scheduledStartAt,
      scheduledEndAt: state.scheduledEndAt,
      manualActive: true,
    };
  }

  const now = new Date();
  const withinSchedule =
    !!state.scheduledStartAt && !!state.scheduledEndAt && now >= state.scheduledStartAt && now <= state.scheduledEndAt;

  return {
    isActive: withinSchedule,
    reason: withinSchedule ? 'scheduled' : null,
    message: state.message,
    scheduledStartAt: state.scheduledStartAt,
    scheduledEndAt: state.scheduledEndAt,
    manualActive: false,
  };
}

async function getCachedState(): Promise<IMaintenanceState | null> {
  const cached = await maintenanceCache.get();
  if (cached !== undefined) return cached;
  const state = await maintenanceRepository.getState();
  await maintenanceCache.set(state);
  return state;
}

export const maintenanceService = {
  /** Full raw state — Ops Center management screen. */
  async getState(): Promise<IMaintenanceState | null> {
    return maintenanceRepository.getState();
  },

  /** Computed effective status — what login/ProtectedRoute/UnderMaintenance actually check. */
  async getStatus(): Promise<MaintenanceStatus> {
    const state = await getCachedState();
    return computeStatus(state);
  },

  /** A role can still sign in / stay in the app while maintenance is active. */
  isRoleExempt(role: string): boolean {
    return (MAINTENANCE_EXEMPT_ROLES as readonly string[]).includes(role);
  },

  async schedule(rawInput: unknown, ctx: AuthContext): Promise<IMaintenanceState> {
    const data: ScheduleMaintenanceInput = scheduleMaintenanceSchema.parse(rawInput);

    const updated = await maintenanceRepository.upsert(
      { scheduledStartAt: data.startAt, scheduledEndAt: data.endAt, message: data.message },
      ctx.userId,
    );
    await maintenanceCache.invalidate();

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'maintenance.scheduled', resource: 'maintenance', resourceId: 'singleton',
      details: { startAt: data.startAt, endAt: data.endAt, message: data.message },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    await notificationService.broadcastToStaff({
      type: 'maintenance_scheduled',
      title: 'Scheduled maintenance',
      body: `${data.message} (${data.startAt.toLocaleString()} – ${data.endAt.toLocaleString()})`,
      priority: 'high',
      senderUserId: ctx.userId,
      senderName: ctx.displayName,
    });

    return updated;
  },

  async cancelSchedule(ctx: AuthContext): Promise<IMaintenanceState> {
    const updated = await maintenanceRepository.clearSchedule(ctx.userId);
    await maintenanceCache.invalidate();

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: 'maintenance.schedule_cancelled', resource: 'maintenance', resourceId: 'singleton',
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    return updated;
  },

  /** Immediate on/off kill switch, independent of any schedule. */
  async setActive(rawInput: unknown, ctx: AuthContext): Promise<IMaintenanceState> {
    const data: ToggleMaintenanceInput = toggleMaintenanceSchema.parse(rawInput);

    const updated = await maintenanceRepository.upsert(
      { manualActive: data.isActive, ...(data.message ? { message: data.message } : {}) },
      ctx.userId,
    );
    await maintenanceCache.invalidate();

    auditService.log({
      userId: ctx.userId, userDisplayName: ctx.displayName,
      action: data.isActive ? 'maintenance.enabled' : 'maintenance.disabled',
      resource: 'maintenance', resourceId: 'singleton',
      details: { message: updated.message },
      ip: ctx.ip, schoolId: ctx.schoolId,
    });

    if (data.isActive) {
      await notificationService.broadcastToStaff({
        type: 'maintenance_toggled',
        title: 'Maintenance mode is now ON',
        body: updated.message,
        priority: 'high',
        senderUserId: ctx.userId,
        senderName: ctx.displayName,
      });
    }

    return updated;
  },
};
