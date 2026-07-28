// Endpoint-focused scenario: hammers POST /fees/payment concurrently,
// including deliberately having multiple VUs target the *same* feeRecordId
// (by only sampling from a small slice of the payable pool once concurrency
// is high) to check whether the API's idempotency/locking actually prevents
// double-charging a single fee record — the "duplicate fee payment" and
// "race conditions" failure modes the framework spec calls out.
import http from 'k6/http';
import { sleep } from 'k6';
import { env } from '../config/base.js';
import { loginCached, authHeaders } from '../helpers/auth.js';
import { randomFromRole, randomPayableFeeRecord } from '../helpers/users.js';
import { assertOk, safeJson } from '../helpers/assertions.js';
import { duplicateFeePaymentRate, raceConditionRate } from '../helpers/metrics.js';
import { idempotencyKey, todayIso } from '../helpers/randomData.js';

export function feeStress(vuId, iterationId) {
  const account = randomFromRole('accountant');
  const session = loginCached(account.email, account.password);
  if (!session) return;
  const opts = authHeaders(session.accessToken);

  const feeRecord = randomPayableFeeRecord();
  if (!feeRecord) return;

  const payRes = http.post(
    `${env.baseUrl}/fees/payment`,
    JSON.stringify({
      feeRecordId: feeRecord.feeRecordId,
      amount: feeRecord.amount,
      paymentDate: todayIso(),
      paymentMode: 'online',
      idempotencyKey: idempotencyKey(vuId, iterationId),
    }),
    { ...opts, tags: { name: 'POST /fees/payment (stress)' } }
  );
  const ok = assertOk(payRes, 'POST /fees/payment (stress)', [200, 201, 409]);

  if (ok) {
    const body = safeJson(payRes);
    const alreadyPaid = body && body.data && body.data.alreadyPaid === true;
    const wasConflict = payRes.status === 409;
    duplicateFeePaymentRate.add(alreadyPaid ? 1 : 0);
    raceConditionRate.add(alreadyPaid && !wasConflict ? 1 : 0);
  }

  sleep(0.1);
}
