import type { ProviderDefinition } from './provider.interface';

export const PROVIDER_CATALOG: ProviderDefinition[] = [
  // ── Attendance Providers ──────────────────────────────────────────────────

  {
    providerKey: 'generic_rest_attendance',
    providerType: 'attendance',
    name: 'Generic REST Attendance',
    description: 'Connect any REST-based biometric attendance system via configurable API endpoints.',
    credentialFields: [
      { key: 'baseUrl',  label: 'API Base URL',  type: 'url',      required: true,  placeholder: 'https://your-device.local/api' },
      { key: 'apiKey',   label: 'API Key',        type: 'password', required: false, helpText: 'Bearer token or API key if required' },
      { key: 'username', label: 'Username',        type: 'text',     required: false },
      { key: 'password', label: 'Password',        type: 'password', required: false },
    ],
    configDefaults: { syncInterval: 60, timeout: 30000, retryCount: 3 },
    capabilities: ['sync_pull', 'test_connection', 'health_check', 'incremental_sync', 'manual_sync'],
    comingSoon: false,
  },

  {
    providerKey: 'zkteco',
    providerType: 'attendance',
    name: 'ZKTeco Biometric',
    description: 'Direct integration with ZKTeco biometric attendance devices.',
    credentialFields: [
      { key: 'deviceIp',   label: 'Device IP',    type: 'text',    required: true,  placeholder: '192.168.1.100' },
      { key: 'devicePort', label: 'Device Port',   type: 'number',  required: false, placeholder: '4370' },
      { key: 'password',   label: 'Device Password', type: 'password', required: false },
    ],
    configDefaults: { syncInterval: 30, timeout: 15000, retryCount: 5 },
    capabilities: ['sync_pull', 'test_connection', 'incremental_sync', 'manual_sync'],
    comingSoon: false,
  },

  {
    providerKey: 'essl',
    providerType: 'attendance',
    name: 'eSSL Biometric',
    description: 'Integration with eSSL biometric attendance devices and cloud platform.',
    credentialFields: [
      { key: 'baseUrl',   label: 'eSSL API URL',   type: 'url',      required: true },
      { key: 'siteId',    label: 'Site ID',          type: 'text',     required: true },
      { key: 'apiKey',    label: 'API Key',           type: 'password', required: true },
    ],
    configDefaults: { syncInterval: 60, timeout: 30000, retryCount: 3 },
    capabilities: ['sync_pull', 'test_connection', 'incremental_sync', 'manual_sync'],
    comingSoon: true,
  },

  // ── Payment Providers ─────────────────────────────────────────────────────

  {
    providerKey: 'razorpay',
    providerType: 'payment',
    name: 'Razorpay',
    description: 'Accept fee payments through Razorpay. Payment events are forwarded to the Fee module.',
    credentialFields: [
      { key: 'keyId',     label: 'Key ID',     type: 'text',     required: true,  placeholder: 'rzp_live_...' },
      { key: 'keySecret', label: 'Key Secret', type: 'password', required: true },
      { key: 'webhookSecret', label: 'Webhook Secret', type: 'password', required: false, helpText: 'For validating Razorpay webhook signatures' },
    ],
    configDefaults: { syncInterval: 0, timeout: 30000, retryCount: 3 },
    capabilities: ['webhook_inbound', 'test_connection', 'manual_sync'],
    comingSoon: false,
  },

  {
    providerKey: 'stripe',
    providerType: 'payment',
    name: 'Stripe',
    description: 'Accept international payments through Stripe with automatic fee reconciliation.',
    credentialFields: [
      { key: 'secretKey',     label: 'Secret Key',      type: 'password', required: true,  placeholder: 'sk_live_...' },
      { key: 'publishableKey', label: 'Publishable Key', type: 'text',     required: true,  placeholder: 'pk_live_...' },
      { key: 'webhookSecret', label: 'Webhook Secret',   type: 'password', required: false },
    ],
    configDefaults: { syncInterval: 0, timeout: 30000, retryCount: 3 },
    capabilities: ['webhook_inbound', 'test_connection', 'manual_sync'],
    comingSoon: true,
  },

  // ── Communication Providers ───────────────────────────────────────────────

  {
    providerKey: 'whatsapp_business',
    providerType: 'communication',
    name: 'WhatsApp Business API',
    description: 'Send WhatsApp messages using the official Business API. Works with the Communication Platform.',
    credentialFields: [
      { key: 'phoneNumberId', label: 'Phone Number ID', type: 'text',     required: true },
      { key: 'accessToken',   label: 'Access Token',    type: 'password', required: true },
      { key: 'verifyToken',   label: 'Webhook Verify Token', type: 'text', required: false, helpText: 'For verifying incoming webhooks' },
    ],
    configDefaults: { syncInterval: 0, timeout: 15000, retryCount: 3 },
    capabilities: ['webhook_inbound', 'webhook_outbound', 'test_connection'],
    comingSoon: false,
  },

  {
    providerKey: 'twilio_sms',
    providerType: 'communication',
    name: 'Twilio SMS',
    description: 'Send SMS notifications through Twilio.',
    credentialFields: [
      { key: 'accountSid', label: 'Account SID',   type: 'text',     required: true },
      { key: 'authToken',  label: 'Auth Token',     type: 'password', required: true },
      { key: 'fromNumber', label: 'From Number',    type: 'text',     required: true, placeholder: '+1234567890' },
    ],
    configDefaults: { syncInterval: 0, timeout: 15000, retryCount: 3 },
    capabilities: ['webhook_inbound', 'test_connection'],
    comingSoon: true,
  },

  // ── ERP Providers ─────────────────────────────────────────────────────────

  {
    providerKey: 'generic_erp',
    providerType: 'erp',
    name: 'Generic ERP Connector',
    description: 'Connect any ERP system via REST API. Synchronize student, teacher, and fee records.',
    credentialFields: [
      { key: 'baseUrl',  label: 'ERP API URL',  type: 'url',      required: true },
      { key: 'apiKey',   label: 'API Key',        type: 'password', required: false },
      { key: 'username', label: 'Username',        type: 'text',     required: false },
      { key: 'password', label: 'Password',        type: 'password', required: false },
    ],
    configDefaults: { syncInterval: 1440, timeout: 60000, retryCount: 3 },
    capabilities: ['sync_pull', 'sync_push', 'test_connection', 'incremental_sync', 'manual_sync'],
    comingSoon: false,
  },

  // ── Future Providers (Coming Soon) ────────────────────────────────────────

  {
    providerKey: 'google_workspace',
    providerType: 'calendar',
    name: 'Google Workspace',
    description: 'Sync calendars, directories, and classroom data with Google Workspace.',
    credentialFields: [
      { key: 'serviceAccountJson', label: 'Service Account JSON', type: 'password', required: true },
      { key: 'domain', label: 'Domain', type: 'text', required: true },
    ],
    configDefaults: { syncInterval: 60, timeout: 30000, retryCount: 3 },
    capabilities: ['sync_pull', 'sync_push', 'test_connection', 'manual_sync'],
    comingSoon: true,
  },

  {
    providerKey: 'microsoft_365',
    providerType: 'calendar',
    name: 'Microsoft 365',
    description: 'Integrate with Microsoft 365 for calendar, Teams, and directory synchronization.',
    credentialFields: [
      { key: 'tenantId',     label: 'Tenant ID',     type: 'text',     required: true },
      { key: 'clientId',     label: 'Client ID',      type: 'text',     required: true },
      { key: 'clientSecret', label: 'Client Secret',  type: 'password', required: true },
    ],
    configDefaults: { syncInterval: 60, timeout: 30000, retryCount: 3 },
    capabilities: ['sync_pull', 'sync_push', 'test_connection', 'manual_sync'],
    comingSoon: true,
  },
];

export const getProviderDefinition = (providerKey: string): ProviderDefinition | undefined =>
  PROVIDER_CATALOG.find((p) => p.providerKey === providerKey);

export const getProvidersByType = (type: string): ProviderDefinition[] =>
  PROVIDER_CATALOG.filter((p) => p.providerType === type);
