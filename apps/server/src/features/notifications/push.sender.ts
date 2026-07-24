import { getMessaging } from '../../lib/firebase-admin';
import { deviceTokenRepository } from '../device-tokens/device-token.repository';
import { logger } from '../../lib/logger';
import type { NotificationPriority } from './notification.model';

interface SendPushInput {
  userIds: string[];
  title: string;
  body: string;
  /** Carried through to the client so a tap can deep-link straight to the right screen. */
  data?: Record<string, string>;
  priority?: NotificationPriority;
}

// Best-effort — a push failure never blocks the in-app Notification record
// that notification.service.ts already created, it only means the phone
// alert didn't arrive. Errors are logged, never thrown, by design.
export async function sendPushToUsers(input: SendPushInput): Promise<{ sent: number; failed: number }> {
  const messaging = getMessaging();
  if (!messaging) return { sent: 0, failed: 0 };

  const tokens = await deviceTokenRepository.findTokensForUsers(input.userIds);
  if (tokens.length === 0) return { sent: 0, failed: 0 };

  try {
    const result = await messaging.sendEachForMulticast({
      tokens,
      notification: { title: input.title, body: input.body },
      data: input.data,
      android: {
        priority: input.priority === 'high' ? 'high' : 'normal',
        notification: { channelId: input.priority === 'high' ? 'schoolos_high_priority' : 'schoolos_default' },
      },
      webpush: { fcmOptions: { link: '/' } },
    });

    const deadTokens = result.responses
      .map((r: { success: boolean; error?: { code?: string } }, i: number) =>
        !r.success && isUnregisteredError(r.error?.code) ? tokens[i] : null,
      )
      .filter((t): t is string => t !== null);
    if (deadTokens.length > 0) await deviceTokenRepository.removeByTokens(deadTokens);

    return { sent: result.successCount, failed: result.failureCount };
  } catch (err) {
    logger.error('sendPushToUsers failed', err);
    return { sent: 0, failed: tokens.length };
  }
}

function isUnregisteredError(code?: string): boolean {
  return code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token';
}
