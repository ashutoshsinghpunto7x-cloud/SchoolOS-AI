import { useState } from 'react';
import { communicationApi } from '@/features/communication/api/communication.api';

interface AbsenteeTarget {
  studentId: string;
  studentName: string;
}

export function useAbsenteeReminder() {
  const [isSending, setIsSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  async function sendReminders(targets: AbsenteeTarget[], buildMessage: (studentName: string) => string) {
    setIsSending(true);
    setSentCount(0);
    setFailedCount(0);

    let sent = 0;
    let failed = 0;

    // Sequential, not Promise.all — small batches (a class's absentees), and keeps
    // progress counters accurate as each WhatsApp send resolves.
    for (const target of targets) {
      try {
        await communicationApi.sendWhatsApp(target.studentId, buildMessage(target.studentName));
        sent += 1;
        setSentCount(sent);
      } catch {
        failed += 1;
        setFailedCount(failed);
      }
    }

    setIsSending(false);
    return { sent, failed };
  }

  return { sendReminders, isSending, sentCount, failedCount };
}
