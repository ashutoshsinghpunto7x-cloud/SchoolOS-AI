import { DeviceToken, DevicePlatform } from './device-token.model';

export const deviceTokenRepository = {
  async upsert(userId: string, schoolId: string, token: string, platform: DevicePlatform) {
    return DeviceToken.findOneAndUpdate(
      { userId, token },
      { userId, schoolId, token, platform },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  },

  async remove(userId: string, token: string): Promise<void> {
    await DeviceToken.deleteOne({ userId, token });
  },

  async findTokensForUsers(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return [];
    const rows = await DeviceToken.find({ userId: { $in: userIds } }, { token: 1 }).lean();
    return rows.map((r) => r.token);
  },

  async removeByTokens(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    await DeviceToken.deleteMany({ token: { $in: tokens } });
  },
};
