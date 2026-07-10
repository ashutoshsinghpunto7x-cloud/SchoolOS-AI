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
};
