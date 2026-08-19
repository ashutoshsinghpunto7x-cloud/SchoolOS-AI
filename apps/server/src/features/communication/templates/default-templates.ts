import { NotificationType } from '../notification-types';

/**
 * Default template body per notification type — seeded into MessageTemplate
 * for a school the first time that type/channel combination is requested
 * (see message-template.repository.ts#getActiveOrSeedDefault). An admin can
 * edit the seeded row afterwards; this file is only ever read once per
 * school/type/channel.
 */
export const DEFAULT_TEMPLATE_BODIES: Record<NotificationType, string> = {
  ATTENDANCE_ABSENT:
    'Dear Parent,\n\n' +
    'This is to inform you that your child {{student_name}} of Class {{class}}-{{section}} was marked absent today.\n\n' +
    'Date:\n{{date}}\n\n' +
    'If this absence is unexpected, kindly contact the school.\n\n' +
    'Regards,\n{{school_name}}',

  FEE_REMINDER:
    'Dear Parent,\n\n' +
    'This is a friendly reminder that the school fee for\n\n' +
    '{{student_name}}\n\n' +
    'is still pending.\n\n' +
    'Outstanding Amount\n₹{{amount}}\n\n' +
    'Due Date\n{{due_date}}\n\n' +
    'Please complete payment at your earliest convenience.\n\n' +
    'Regards,\n{{school_name}}',

  FEE_DEFAULTER:
    'Dear Parent,\n\n' +
    'Our records show that the fee for {{student_name}} (Class {{class}}-{{section}}) remains unpaid past the due date.\n\n' +
    'Outstanding Amount\n₹{{amount}}\n\n' +
    'Due Date\n{{due_date}}\n\n' +
    'Please clear the outstanding balance at the earliest to avoid any inconvenience.\n\n' +
    'Regards,\n{{school_name}}',

  FEE_PAYMENT_RECEIPT:
    'Dear Parent,\n\n' +
    'The school fee payment for {{student_name}} has been successfully received.\n\n' +
    'Amount Paid: ₹{{amount}}\n' +
    'Receipt No: {{receipt_number}}\n' +
    'Payment Date: {{payment_date}}\n\n' +
    'Please find the payment receipt attached with this message.\n\n' +
    'Regards,\n{{school_name}}',

  BIRTHDAY:
    'Dear Parent,\n\n' +
    'Wishing {{student_name}} of Class {{class}}-{{section}} a very Happy Birthday! We hope this year brings joy and success.\n\n' +
    'Warm wishes,\n{{school_name}}',

  PTM_REMINDER:
    'Dear Parent,\n\n' +
    'This is a reminder about the upcoming Parent-Teacher Meeting for {{student_name}} of Class {{class}}-{{section}}.\n\n' +
    'Date:\n{{date}}\n\n' +
    'Your presence is important to discuss your child\'s progress.\n\n' +
    'Regards,\n{{school_name}}',

  HOMEWORK:
    'Dear Parent,\n\n' +
    'Homework has been assigned for {{student_name}} of Class {{class}}-{{section}}, to be completed by {{date}}.\n\n' +
    'Kindly ensure it is completed on time.\n\n' +
    'Regards,\n{{school_name}}',

  EXAM_REMINDER:
    'Dear Parent,\n\n' +
    'This is a reminder that the upcoming examination for {{student_name}} of Class {{class}}-{{section}} is scheduled on {{date}}.\n\n' +
    'Kindly ensure your child is well prepared.\n\n' +
    'Regards,\n{{school_name}}',

  HOLIDAY_ANNOUNCEMENT:
    'Dear Parent,\n\n' +
    'Please note that the school will remain closed on {{date}} on account of a holiday.\n\n' +
    'Regards,\n{{school_name}}',

  ADMISSION_FOLLOWUP:
    'Dear Parent,\n\n' +
    'Thank you for your interest in {{school_name}} regarding the admission of {{student_name}}. Our admissions team would like to follow up with you.\n\n' +
    'Please contact the school office at your convenience.\n\n' +
    'Regards,\n{{school_name}}',

  EMERGENCY_ALERT:
    'URGENT — {{school_name}}\n\n' +
    'This is an emergency alert from the school. Please contact the school office immediately for further information.\n\n' +
    'Regards,\n{{school_name}}',

  GENERAL_BROADCAST:
    'Dear Parent,\n\n' +
    'This is an important announcement from {{school_name}}.\n\n' +
    'Regards,\n{{school_name}}',

  // Placeholder only — not sent through this engine today, see mock-test-whatsapp.stub.ts.
  MOCK_TEST_LINK:
    'Dear Parent,\n\n' +
    'A mock test "{{test_title}}" is now live for {{student_name}}. Take it here: {{test_link}}\n\n' +
    'Regards,\n{{school_name}}',
};
