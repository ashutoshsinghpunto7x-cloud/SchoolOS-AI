import { WorkflowDefinition } from '@schoolos/types';

export const WORKFLOW_DEFINITIONS: WorkflowDefinition[] = [
  {
    id: 'WF-001',
    name: 'Voice Call — Fee Reminder',
    description: 'Automated voice call reminding parents of outstanding fee dues.',
    jobType: 'VOICE_CALL',
    defaultConfig: {
      enabled: false,
      delayMinutes: 0,
      retryCount: 2,
      retryIntervalMinutes: 60,
      channels: ['VOICE_CALL'],
    },
    configurable: ['enabled', 'delayMinutes', 'retryCount', 'retryIntervalMinutes'],
  },
  {
    id: 'WF-002',
    name: 'WhatsApp — Fee Reminder',
    description: 'WhatsApp message to parents with fee due details and payment link.',
    jobType: 'FEE_REMINDER',
    defaultConfig: {
      enabled: false,
      delayMinutes: 0,
      retryCount: 1,
      retryIntervalMinutes: 30,
      channels: ['WHATSAPP'],
    },
    configurable: ['enabled', 'delayMinutes', 'channels'],
  },
  {
    id: 'WF-003',
    name: 'PTM Reminder',
    description: 'Automated reminder to parents about upcoming Parent-Teacher Meetings.',
    jobType: 'PTM_REMINDER',
    defaultConfig: {
      enabled: false,
      delayMinutes: 1440,
      retryCount: 1,
      retryIntervalMinutes: 60,
      channels: ['WHATSAPP', 'SMS'],
    },
    configurable: ['enabled', 'delayMinutes', 'channels'],
  },
  {
    id: 'WF-004',
    name: 'General Broadcast',
    description: 'Send school-wide announcements to all parents via multiple channels.',
    jobType: 'GENERAL_BROADCAST',
    defaultConfig: {
      enabled: false,
      delayMinutes: 0,
      retryCount: 0,
      retryIntervalMinutes: 0,
      channels: ['WHATSAPP', 'SMS'],
    },
    configurable: ['enabled', 'channels'],
  },
  {
    id: 'WF-005',
    name: 'Attendance Alert',
    description: 'Notify parents when a student is marked absent.',
    jobType: 'GENERAL_BROADCAST',
    defaultConfig: {
      enabled: false,
      delayMinutes: 30,
      retryCount: 1,
      retryIntervalMinutes: 30,
      channels: ['WHATSAPP'],
    },
    configurable: ['enabled', 'delayMinutes', 'channels'],
  },
  {
    id: 'WF-006',
    name: 'Birthday Wishes',
    description: 'Send automated birthday greetings to students and their parents.',
    jobType: 'WHATSAPP',
    defaultConfig: {
      enabled: false,
      delayMinutes: 0,
      retryCount: 0,
      retryIntervalMinutes: 0,
      channels: ['WHATSAPP'],
    },
    configurable: ['enabled', 'channels'],
  },
  {
    id: 'WF-007',
    name: 'Admission Follow-up',
    description: 'Automated follow-up calls and messages for admission enquiries.',
    jobType: 'VOICE_CALL',
    defaultConfig: {
      enabled: false,
      delayMinutes: 60,
      retryCount: 3,
      retryIntervalMinutes: 1440,
      channels: ['VOICE_CALL', 'WHATSAPP'],
    },
    configurable: ['enabled', 'delayMinutes', 'retryCount', 'retryIntervalMinutes', 'channels'],
  },
  {
    id: 'WF-008',
    name: 'SMS — Fee Reminder',
    description: 'SMS reminder for parents with outstanding fee dues.',
    jobType: 'SMS',
    defaultConfig: {
      enabled: false,
      delayMinutes: 0,
      retryCount: 1,
      retryIntervalMinutes: 120,
      channels: ['SMS'],
    },
    configurable: ['enabled', 'delayMinutes'],
  },
];

export const getWorkflowDefinition = (id: string): WorkflowDefinition | undefined =>
  WORKFLOW_DEFINITIONS.find((d) => d.id === id);
