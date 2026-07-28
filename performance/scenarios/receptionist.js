// Receptionist workflow:
//   Login -> Admissions (enquiry list) -> Search student -> Create admission
//   -> Collect fee -> Generate receipt (session reused across iterations, matching real user behavior)
import http from 'k6/http';
import { sleep, group } from 'k6';
import { env } from '../config/base.js';
import { loginCached, authHeaders } from '../helpers/auth.js';
import { randomFromRole, randomPayableFeeRecord } from '../helpers/users.js';
import { assertOk, safeJson } from '../helpers/assertions.js';
import { workflowDuration, duplicateFeePaymentRate } from '../helpers/metrics.js';
import { randomEnquiryPayload, randomStudentName, idempotencyKey, todayIso } from '../helpers/randomData.js';

export function receptionistWorkflow(vuId, iterationId, account) {
  const start = Date.now();
  account = account || randomFromRole('reception');

  const session = loginCached(account.email, account.password);
  if (!session) return;
  const opts = authHeaders(session.accessToken);

  group('receptionist: admissions pipeline', () => {
    const listRes = http.get(`${env.baseUrl}/enquiries?page=1&limit=20`, { ...opts, tags: { name: 'GET /enquiries' } });
    assertOk(listRes, 'GET /enquiries');
  });
  sleep(0.3);

  group('receptionist: search student', () => {
    const searchRes = http.get(`${env.baseUrl}/students/search?q=A`, { ...opts, tags: { name: 'GET /students/search' } });
    assertOk(searchRes, 'GET /students/search');
  });
  sleep(0.3);

  group('receptionist: create admission (enquiry)', () => {
    const enquiryRes = http.post(
      `${env.baseUrl}/enquiries`,
      JSON.stringify(randomEnquiryPayload()),
      { ...opts, tags: { name: 'POST /enquiries' } }
    );
    assertOk(enquiryRes, 'POST /enquiries', [200, 201]);
  });
  sleep(0.3);

  let receiptNumber = null;
  group('receptionist: collect fee', () => {
    const feeRecord = randomPayableFeeRecord();
    if (!feeRecord) return;

    const payRes = http.post(
      `${env.baseUrl}/fees/payment`,
      JSON.stringify({
        feeRecordId: feeRecord.feeRecordId,
        amount: feeRecord.amount,
        paymentDate: todayIso(),
        paymentMode: 'cash',
        idempotencyKey: idempotencyKey(vuId, iterationId),
      }),
      { ...opts, tags: { name: 'POST /fees/payment' } }
    );
    const ok = assertOk(payRes, 'POST /fees/payment', [200, 201]);
    if (ok) {
      const body = safeJson(payRes);
      receiptNumber = body && body.data && (body.data.receiptNumber || (body.data.payment && body.data.payment.receiptNumber));
      // A second, concurrent VU may have grabbed the same feeRecordId out of
      // the shared fixture pool between reads — if the API instead returns
      // success twice for the same record, that's the double-payment bug the
      // framework spec calls out. Detect it via the response, not a re-fetch,
      // since the balance may already reflect either VU's write by the time
      // we'd re-check.
      const alreadyPaid = body && body.data && body.data.alreadyPaid === true;
      duplicateFeePaymentRate.add(alreadyPaid ? 1 : 0);
    }
  });
  sleep(0.2);

  if (receiptNumber) {
    group('receptionist: receipt', () => {
      const receiptRes = http.get(
        `${env.baseUrl}/fees/payments/receipt/${receiptNumber}`,
        { ...opts, tags: { name: 'GET /fees/payments/receipt/:receiptNumber' } }
      );
      assertOk(receiptRes, 'GET /fees/payments/receipt/:receiptNumber');
    });
  }
  sleep(0.2);

  workflowDuration.add(Date.now() - start, { workflow: 'receptionist' });
}
