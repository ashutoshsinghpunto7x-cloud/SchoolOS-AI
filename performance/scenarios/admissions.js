// Endpoint-focused scenario: volume of new enquiry creation + stage
// transitions, simulating an admissions-season burst (many receptionists /
// front-desk kiosks creating enquiries concurrently) independent of the rest
// of the receptionist.js workflow.
import http from 'k6/http';
import { sleep } from 'k6';
import { env } from '../config/base.js';
import { loginCached, authHeaders } from '../helpers/auth.js';
import { randomFromRole } from '../helpers/users.js';
import { assertOk, safeJson } from '../helpers/assertions.js';
import { randomEnquiryPayload } from '../helpers/randomData.js';

const NEXT_STAGE = {
  new_enquiry: 'contacted',
  contacted: 'follow_up_scheduled',
  follow_up_scheduled: 'campus_visit',
  campus_visit: 'application_submitted',
};

export function admissionsStress() {
  const account = randomFromRole('reception');
  const session = loginCached(account.email, account.password);
  if (!session) return;
  const opts = authHeaders(session.accessToken);

  const createRes = http.post(
    `${env.baseUrl}/enquiries`,
    JSON.stringify(randomEnquiryPayload()),
    { ...opts, tags: { name: 'POST /enquiries (stress)' } }
  );
  const ok = assertOk(createRes, 'POST /enquiries (stress)', [200, 201]);
  if (!ok) return;

  sleep(0.1);

  const body = safeJson(createRes);
  const enquiry = body && body.data;
  const enquiryId = enquiry && (enquiry._id || enquiry.id);
  const currentStage = enquiry && enquiry.stage;
  const nextStage = currentStage && NEXT_STAGE[currentStage];
  if (!enquiryId || !nextStage) return;

  const stageRes = http.patch(
    `${env.baseUrl}/enquiries/${enquiryId}/stage`,
    JSON.stringify({ stage: nextStage, remarks: 'k6 perf-test stage transition' }),
    { ...opts, tags: { name: 'PATCH /enquiries/:id/stage' } }
  );
  assertOk(stageRes, 'PATCH /enquiries/:id/stage');

  sleep(0.1);
}
