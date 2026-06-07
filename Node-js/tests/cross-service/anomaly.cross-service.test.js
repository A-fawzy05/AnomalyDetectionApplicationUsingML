
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
    
    console.warn('\n[cross-service] SKIPPING tier — mongo=%s fastapi=%s\n',
      mongoOk, HEALTH !== null);
  }
}, 30000);

afterAll(async () => {

  for (const id of createdRunIds) {
    try { await fetch(`${config.FASTAPI_URL}/api/v1/runs/${id}`, { method: 'DELETE' }); }
    catch {  }
  }
  await cleanupUsers();
  if (mongoose.connection.readyState === 1) await mongoose.connection.close();
});

test('S1: anonymous user → gateway refuses with 401 (request never reaches FastAPI)',
  async () => {
    if (!READY) return;
    const res = await request(app)
      .post('/api/anomaly/analyze')
      .attach('file', Buffer.from('case_id,activity,timestamp\n'), 'x.csv');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/token/i);
  });

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

test('S5: member viewer → list runs → 200 (reads open to members)', async () => {
  if (!READY) return;
  const { token } = await makeUser({ role: 'viewer', member: true });
  const res = await request(app)
    .get('/api/anomaly/runs')
    .set('Authorization', `Bearer ${token}`);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
});

test('S6: member analyst → analyze labeled dataset → 200 with scored anomalies',
  async () => {
    if (!READY) return;
    if (!HEALTH || HEALTH.db_connected !== true || HEALTH.models_loaded !== true) {
      
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
    
    global.__xsvc_runId = res.body.run_id;
  }, 180000);

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

test('S8: member analyst → list runs includes the run created in S6', async () => {
  if (!READY) return;
  if (!global.__xsvc_runId) {
    
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
