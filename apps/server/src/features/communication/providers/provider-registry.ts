import { NotificationChannel } from '../notification-types';
import { ICommunicationChannelProvider } from './provider.interface';
import { whatsAppCloudProvider } from './whatsapp-cloud.provider';
import { emailProvider } from './email.provider';
import { smsProvider } from './sms.provider';
import { pushProvider } from './push.provider';
import { voiceProvider } from './voice.provider';

const PROVIDERS: Record<NotificationChannel, ICommunicationChannelProvider> = {
  whatsapp: whatsAppCloudProvider,
  email: emailProvider,
  sms: smsProvider,
  push: pushProvider,
  voice: voiceProvider,
};

/**
 * Single lookup point business code goes through to reach a channel's
 * provider. Adding a real channel later means changing this map's entry
 * (and PROVIDERS above), never CommunicationService or any business-module caller.
 */
export function getProvider(channel: NotificationChannel): ICommunicationChannelProvider {
  return PROVIDERS[channel];
}
