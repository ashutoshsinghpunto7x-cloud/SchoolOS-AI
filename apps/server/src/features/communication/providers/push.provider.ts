import { createUnimplementedProvider } from './unimplemented-channel.provider';

// Future channel — parent-facing push (distinct from the existing internal
// Firebase push used by features/notifications for staff/teacher alerts).
// Plug in an FCM-to-parent-device integration here and register it in
// provider-registry.ts. No other file in the communication engine needs to change.
export const pushProvider = createUnimplementedProvider('push');
