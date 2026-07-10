import { AuthContext } from '../../lib/auth-context';
import { deviceTokenRepository } from './device-token.repository';
import { registerDeviceTokenSchema } from './device-token.validation';

export const deviceTokenService = {
  async register(rawInput: unknown, ctx: AuthContext): Promise<{ registered: true }> {
    const { token, platform } = registerDeviceTokenSchema.parse(rawInput);
    await deviceTokenRepository.upsert(ctx.userId, ctx.schoolId, token, platform);
    return { registered: true };
  },

  async unregister(token: string, ctx: AuthContext): Promise<void> {
    await deviceTokenRepository.remove(ctx.userId, token);
  },
};
