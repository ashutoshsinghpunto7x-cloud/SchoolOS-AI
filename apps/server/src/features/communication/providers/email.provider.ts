import { createUnimplementedProvider } from './unimplemented-channel.provider';

// Future channel — plug in an SMTP/SES/SendGrid provider here and register it
// in provider-registry.ts. No other file in the communication engine needs to change.
export const emailProvider = createUnimplementedProvider('email');
