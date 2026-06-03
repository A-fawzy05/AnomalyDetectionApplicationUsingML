/**
 * CROSS-SERVICE integration: Node gateway ↔ FastAPI anomaly service.
 *
 * These are NOT single-service tests. Each scenario drives a request through
 * BOTH services and asserts the *combined* outcome:
 *
 *     supertest → gateway (authenticates JWT, looks up team membership in Mongo,
 *                 forwards role + membership as signed headers)
 *              → FastAPI (enforces the policy on those forwarded claims)
 *
 * Policy under test (chosen by the team): STRICT MEMBERSHIP EVERYWHERE.
 *   • Every anomaly action requires team membership; a non-member (any role,
 *     including admin) is refused 403 by FastAPI.
 *   • Among members, analyze/report additionally require an admin/analyst role
 *     (a viewer member is refused 403); reads (runs/cases) are open to members.
 *
 * The suite soft-skips if MongoDB or the FastAPI service is unreachable.
 */
const fs = require('fs');
const path = require('path');
const request = require('supertest');

const { connectMongo, probeFastapi, makeUser, cleanupUsers, mongoose, config } =
  require('./_setup');
const app = require('../../app');

const LABELED_CSV = path.resolve(
  __dirname, '../../../p2p_anomaly_api/p2p-anomaly-test.csv'
);
const FAKE_RUN_ID = '00000000-0000-0000-0000-000000000000';

let READY = false;
let HEALTH = null;
const createdRunIds = [];

beforeAll(async () => {
  const mongoOk = await connectMongo();
  HEALTH = await probeFastapi();
  READY = mongoOk && HEALTH !== null;
  if (!READY) {
    // eslint-disable-next-line no-console
    console.warn('\n[cross-service] SKIPPING tier — mongo=%s fastapi=%s\n',
      mongoOk, HEALTH !== null);
  }
}, 30000);

afterAll(async () => {
  // Best-effort: delete any analysis runs we created (DELETE is unauthenticated
  // on the service) and the test users, then close the connection.
  for (const id of createdRunIds) {
    try { await fetch(`${config.FASTAPI_URL}/api/v1/runs/${id}`, { method: 'DELETE' }); }
    catch { /* ignore */ }
  }
  await cleanupUsers();
  if (mongoose.connection.readyState === 1) await mongoose.connection.close();
});

// ---------------------------------------------------------------------------
// Scenario 1 — Unauthenticated upload is stopped at the GATEWAY (never reaches
// FastAPI). Proves the gateway owns *authentication*.
// ---------------------------------------------------------------------------
test('S1: anonymous user → gateway refuses with 401 (request never reaches FastAPI)',
  async () => {
    if (!READY) return;
    const res = await request(app)
      .post('/api/anomaly/analyze')
      .attach('file', Buffer.from('case_id,activity,timestamp\n'), 'x.csv');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/token/i);
  });

// ---------------------------------------------------------------------------
// Scenario 2 — A non-member ADMIN tries to RUN ANALYSIS. The gateway forwards
// X-User-Member: false; FastAPI refuses. Admin role does NOT bypass membership.
// ---------------------------------------------------------------------------
test('S2: non-member admin → analyze → FastAPI 403 "not a member"', async () => {
  if (!READY) return;
  const { token } = await makeUser({ role: 'admin', member: false });
  const res = await request(app)
    .post('/api/anomaly/analyze')
    .set('Authorization', `Bearer ${token}`)
    .attach('file', fs.readFileSync(LABELED_CSV), 'p2p-anomaly-test.csv');
  expect(res.status).toBe(403);
  expect(JSON.stringify(res.body)).toMatch(/not a member/i);
});

// ---------------------------------------------------------------------------
// Scenario 3 — THE HEADLINE. A non-member ADMIN tries to GENERATE A REPORT.
// FastAPI refuses with 403 because he is not a team member — even though he is
// an admin. The refusal happens before the run is even looked up.
// ---------------------------------------------------------------------------
test('S3: non-member admin → generate report → FastAPI 403 "not a member"',
  async () => {
    if (!READY) return;
    const { token } = await makeUser({ role: 'admin', member: false });
    const res = await request(app)
      .post(`/api/anomaly/runs/${FAKE_RUN_ID}/report`)
      .set('Authorization', `Bearer ${token}`)
      .send({ user_name: 'The Admin', min_severity: 'Low' });
    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).toMatch(/not a member/i);
  });

// ---------------------------------------------------------------------------
// Scenario 4 — A VIEWER who IS a member tries to RUN ANALYSIS. Membership gate
// passes, but the role gate refuses (analyze needs admin/analyst). 403 by role.
// ---------------------------------------------------------------------------
test('S4: member viewer → analyze → FastAPI 403 (role not permitted)', async () => {
  if (!READY) return;
  const { token } = await makeUser({ role: 'viewer', member: true });
  const res = await request(app)
    .post('/api/anomaly/analyze')
    .set('Authorization', `Bearer ${token}`)
    .attach('file', fs.readFileSync(LABELED_CSV), 'p2p-anomaly-test.csv');
  expect(res.status).toBe(403);
  expect(JSON.stringify(res.body)).toMatch(/role 'viewer' is not permitted/i);
});

// ---------------------------------------------------------------------------
// Scenario 5 — The same VIEWER member CAN read. Reads are open to any member,
// so listing runs succeeds (200). Demonstrates the role gate applies only to
// write/compute actions.
// ---------------------------------------------------------------------------
test('S5: member viewer → list runs → 200 (reads open to members)', async () => {
  if (!READY) return;
  const { token } = await makeUser({ role: 'viewer', member: true });
  const res = await request(app)
    .get('/api/anomaly/runs')
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});

// ---------------------------------------------------------------------------
// Scenario 6 — END-TO-END HAPPY PATH. A member ANALYST uploads the labeled
// dataset; the gateway forwards it; FastAPI runs the real ML pipeline and
// returns scored anomalies. Needs Postgres + models (skips with a note if the
// service reports them down).
// ---------------------------------------------------------------------------
test('S6: member analyst → analyze labeled dataset → 200 with scored anomalies',
  async () => {
    if (!READY) return;
    if (!HEALTH || HEALTH.db_connected !== true || HEALTH.models_loaded !== true) {
      // eslint-disable-next-line no-console
      console.warn('[cross-service] S6 skipped — FastAPI db/models not ready: %j', HEALTH);
      return;
    }
    const { token } = await makeUser({ role: 'analyst', member: true });
    const res = await request(app)
      .post('/api/anomaly/analyze')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', fs.readFileSync(LABELED_CSV), 'p2p-anomaly-test.csv');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('run_id');
    expect(res.body).toHaveProperty('summary');
    expect(res.body.summary.total_cases).toBe(45);
    expect(Array.isArray(res.body.anomaly_cases)).toBe(true);
    expect(res.body.summary.anomalous_cases).toBeGreaterThan(0);
    createdRunIds.push(res.body.run_id);
    // stash for S8
    global.__xsvc_runId = res.body.run_id;
  }, 180000);

// ---------------------------------------------------------------------------
// Scenario 7 — A member ANALYST generates a report for an UNKNOWN run. Contrast
// with S3: here authorization PASSES (member + analyst), so FastAPI proceeds to
// look up the run and returns 404 — NOT 403. Same endpoint, opposite gate
// outcome, decided purely by membership. (No n8n call — 404 precedes it.)
// ---------------------------------------------------------------------------
test('S7: member analyst → report on unknown run → 404 (authz passed, run missing)',
  async () => {
    if (!READY) return;
    const { token } = await makeUser({ role: 'analyst', member: true });
    const res = await request(app)
      .post(`/api/anomaly/runs/${FAKE_RUN_ID}/report`)
      .set('Authorization', `Bearer ${token}`)
      .send({ user_name: 'The Analyst', min_severity: 'Low' });
    expect(res.status).toBe(404);
    expect(res.status).not.toBe(403);
  });

// ---------------------------------------------------------------------------
// Scenario 8 — The run created in S6 is now visible to a member ANALYST via the
// read path, confirming the analyze→persist→list flow spans both services.
// ---------------------------------------------------------------------------
test('S8: member analyst → list runs includes the run created in S6', async () => {
  if (!READY) return;
  if (!global.__xsvc_runId) {
    // eslint-disable-next-line no-console
    console.warn('[cross-service] S8 skipped — S6 did not create a run');
    return;
  }
  const { token } = await makeUser({ role: 'analyst', member: true });
  const res = await request(app)
    .get('/api/anomaly/runs')
    .set('Authorization', `Bearer ${token}`)
    .query({ page: 1, page_size: 50 });
  expect(res.status).toBe(200);
  const ids = res.body.map((r) => r.run_id);
  expect(ids).toContain(global.__xsvc_runId);
});
