
require('../setup'); 
const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { connectMongo, probeFastapi, makeUser, cleanupUsers, mongoose, config } =
  require('./_setup');
const app = require('../../app');

const LABELED_CSV = path.resolve(__dirname, '../../../p2p_anomaly_api/p2p-anomaly-test.csv');
const FAKE = '00000000-0000-0000-0000-000000000000';
const runIds = [];

function show(label, res, opts = {}) {
  let body = res.body;
  if (opts.summaryOnly && body && typeof body === 'object') {
    body = {
      run_id: body.run_id,
      summary: body.summary,
      anomaly_cases_count: Array.isArray(body.anomaly_cases) ? body.anomaly_cases.length : undefined,
      anomaly_type_counts: body.anomaly_type_counts,
      severity_counts: body.severity_counts,
      first_anomaly: Array.isArray(body.anomaly_cases) ? body.anomaly_cases[0] : undefined
    };
  }
  console.log(`\n### ${label}\nHTTP ${res.status}\n${JSON.stringify(body, null, 2)}`);
}

(async () => {
  const mongoOk = await connectMongo();
  const health = await probeFastapi();
  console.log('## health:', JSON.stringify(health), 'mongo:', mongoOk);
  if (!mongoOk || !health) { console.log('NOT READY'); process.exit(0); }

  show('S1 anonymous → analyze',
    await request(app).post('/api/anomaly/analyze')
      .attach('file', Buffer.from('case_id,activity,timestamp\n'), 'x.csv'));

  let u = await makeUser({ role: 'admin', member: false });
  show('S2 non-member admin → analyze',
    await request(app).post('/api/anomaly/analyze')
      .set('Authorization', `Bearer ${u.token}`)
      .attach('file', fs.readFileSync(LABELED_CSV), 'p2p-anomaly-test.csv'));

  u = await makeUser({ role: 'admin', member: false });
  show('S3 non-member admin → generate report (HEADLINE)',
    await request(app).post(`/api/anomaly/runs/${FAKE}/report`)
      .set('Authorization', `Bearer ${u.token}`)
      .send({ user_name: 'The Admin', min_severity: 'Low' }));

  u = await makeUser({ role: 'viewer', member: true });
  show('S4 member viewer → analyze',
    await request(app).post('/api/anomaly/analyze')
      .set('Authorization', `Bearer ${u.token}`)
      .attach('file', fs.readFileSync(LABELED_CSV), 'p2p-anomaly-test.csv'));

  u = await makeUser({ role: 'viewer', member: true });
  {
    const res = await request(app).get('/api/anomaly/runs')
      .set('Authorization', `Bearer ${u.token}`);
    console.log(`\n### S5 member viewer → list runs\nHTTP ${res.status}\n(returned ${Array.isArray(res.body) ? res.body.length : '?'} runs)`);
  }

  u = await makeUser({ role: 'analyst', member: true });
  {
    const res = await request(app).post('/api/anomaly/analyze')
      .set('Authorization', `Bearer ${u.token}`)
      .attach('file', fs.readFileSync(LABELED_CSV), 'p2p-anomaly-test.csv');
    show('S6 member analyst → analyze labeled dataset (end-to-end)', res, { summaryOnly: true });
    if (res.body && res.body.run_id) runIds.push(res.body.run_id);
  }

  u = await makeUser({ role: 'analyst', member: true });
  show('S7 member analyst → report on unknown run',
    await request(app).post(`/api/anomaly/runs/${FAKE}/report`)
      .set('Authorization', `Bearer ${u.token}`)
      .send({ user_name: 'The Analyst', min_severity: 'Low' }));

  for (const id of runIds) {
    try { await fetch(`${config.FASTAPI_URL}/api/v1/runs/${id}`, { method: 'DELETE' }); } catch {}
  }
  await cleanupUsers();
  await mongoose.connection.close();
  process.exit(0);
})();
