import { createUnimplementedProvider } from './unimplemented-channel.provider';

// Future channel — outbound voice call notifications (distinct from the
// existing AI conversational voice calls in features/communications, which
// stay on their own Vapi/n8n path). Plug in a calling provider here and
// register it in provider-registry.ts. No other file in the communication
// engine needs to change.
export const voiceProvider = createUnimplementedProvider('voice');
