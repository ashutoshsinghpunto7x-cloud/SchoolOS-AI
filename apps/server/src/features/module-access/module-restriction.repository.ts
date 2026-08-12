import { ModuleRestriction, IModuleRestriction } from './module-restriction.model';

export const moduleRestrictionRepository = {
  async findAll(): Promise<IModuleRestriction[]> {
    return ModuleRestriction.find().lean<IModuleRestriction[]>();
  },

  /** Only the keys that are currently restricted — what the public status endpoint ships. */
  async findRestricted(): Promise<IModuleRestriction[]> {
    return ModuleRestriction.find({ restricted: true }).lean<IModuleRestriction[]>();
  },

  async bulkSet(
    moduleKeys: string[],
    data: { restricted: boolean; message?: string; returnAt?: Date | null; showReturnTime?: boolean },
    updatedBy: string
  ): Promise<void> {
    const set: Record<string, unknown> = { restricted: data.restricted, updatedBy };
    if (data.message !== undefined) set.message = data.message;
    if (data.showReturnTime !== undefined) set.showReturnTime = data.showReturnTime;

    const unset: Record<string, unknown> = {};
    if (data.returnAt === null) unset.returnAt = '';
    else if (data.returnAt !== undefined) set.returnAt = data.returnAt;

    // Restoring a module (restricted: false) clears the message/return-time
    // so a future restriction never accidentally inherits stale copy.
    if (!data.restricted) {
      unset.message = '';
      unset.returnAt = '';
      set.showReturnTime = false;
    }

    const update: Record<string, unknown> = { $set: set };
    if (Object.keys(unset).length > 0) update.$unset = unset;

    await ModuleRestriction.bulkWrite(
      moduleKeys.map((moduleKey) => ({
        updateOne: {
          filter: { moduleKey },
          update,
          upsert: true,
        },
      }))
    );
  },
};
