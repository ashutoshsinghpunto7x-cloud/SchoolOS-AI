import { MaintenanceState, IMaintenanceState, MAINTENANCE_SINGLETON_KEY } from './maintenance.model';

export const maintenanceRepository = {
  async getState(): Promise<IMaintenanceState | null> {
    return MaintenanceState.findOne({ key: MAINTENANCE_SINGLETON_KEY }).lean<IMaintenanceState>();
  },

  async upsert(data: Partial<IMaintenanceState>, updatedBy: string): Promise<IMaintenanceState> {
    return MaintenanceState.findOneAndUpdate(
      { key: MAINTENANCE_SINGLETON_KEY },
      { $set: { ...data, updatedBy } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean<IMaintenanceState>();
  },

  /** Clears the schedule window without touching manualActive — a plain
   *  $set with undefined values would be stripped by Mongoose, so this needs $unset. */
  async clearSchedule(updatedBy: string): Promise<IMaintenanceState> {
    return MaintenanceState.findOneAndUpdate(
      { key: MAINTENANCE_SINGLETON_KEY },
      { $unset: { scheduledStartAt: '', scheduledEndAt: '' }, $set: { updatedBy } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).lean<IMaintenanceState>();
  },
};
