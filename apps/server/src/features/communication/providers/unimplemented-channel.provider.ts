import { NotificationChannel } from '../notification-types';
import { ICommunicationChannelProvider, SendResult } from './provider.interface';

/**
 * Shared scaffold for channels that are registered (so settings/enums/UI never
 * need to change) but have no real send integration yet. Every method fails
 * cleanly with a descriptive error instead of throwing, so a caller that
 * accidentally enables an unconfigured channel gets a logged/auditable FAILED
 * NotificationLog entry rather than a crash.
 *
 * To make a channel real: replace its `createUnimplementedProvider(...)` call
 * below with a real provider module (see whatsapp-cloud.provider.ts for the
 * pattern) and register it in provider-registry.ts — CommunicationService
 * itself never changes.
 */
export function createUnimplementedProvider(channel: NotificationChannel): ICommunicationChannelProvider {
  const notConfigured: SendResult = {
    success: false,
    errorMessage: `The '${channel}' channel has no provider implementation yet — enable it only once a real integration is wired up`,
  };

  return {
    channel,
    isConfigured: () => false,
    sendText: async () => notConfigured,
    sendTemplate: async () => notConfigured,
    sendMedia: async () => notConfigured,
    sendBulk: async (recipients) => recipients.map(() => notConfigured),
  };
}
