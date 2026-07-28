import { createUnimplementedProvider } from './unimplemented-channel.provider';

// Future channel — plug in an SMS gateway here and register it in
// provider-registry.ts. No other file in the communication engine needs to change.
export const smsProvider = createUnimplementedProvider('sms');
