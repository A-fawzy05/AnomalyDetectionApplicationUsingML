
jest.mock('../../config/db.config', () => jest.fn());
jest.mock('../../services/email.service', () => ({
  sendEmailVerificationOTP: jest.fn().mockResolvedValue({}),
}));

const request = require('supertest');
const { mongoose, connectTestDb, uniq, makeAuthUser } = require('./_setup');
const User = require('../../models/User');
const Organization = require('../../models/Organization');

let app;
let dbOk = false;
const userIds = [];
const orgIds = [];

beforeAll(async () => {
  dbOk = await connectTestDb();
  if (dbOk) app = require('../../app');
});

afterAll(async () => {
  if (dbOk) {
    await Organization.deleteMany({ _id: { $in: orgIds } });
    await User.deleteMany({ _id: { $in: userIds } });
    await mongoose.connection.close();
  }
});

async function auth() {
  const { user, token } = await makeAuthUser('admin');
  userIds.push(user._id);
  return token;
}

describe('/api/org', () => {
  test('create → my-orgs → delete', async () => {
    if (!dbOk) return;
    const token = await auth();
    const name = uniq('Org');

    const created = await request(app).post('/api/org/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ name, joinPassword: 'secret', confirmPassword: 'secret' });
    expect(created.status).toBe(201);
    orgIds.push(created.body.data.id);

    const mine = await request(app).get('/api/org/my-orgs').set('Authorization', `Bearer ${token}`);
    expect(mine.status).toBe(200);
    expect(mine.body.data.some(o => o.name === name)).toBe(true);

    const del = await request(app).delete(`/api/org/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(del.status).toBe(200);
  });

  test('duplicate organization name returns 409', async () => {
    if (!dbOk) return;
    const token = await auth();
    const name = uniq('DupOrg');
    const first = await request(app).post('/api/org/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ name, joinPassword: 'secret', confirmPassword: 'secret' });
    orgIds.push(first.body.data.id);
    const second = await request(app).post('/api/org/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ name, joinPassword: 'secret', confirmPassword: 'secret' });
    expect(second.status).toBe(409);
  });

  test('join with correct vs wrong password', async () => {
    if (!dbOk) return;
    const creatorToken = await auth();
    const name = uniq('JoinOrg');
    const created = await request(app).post('/api/org/create')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ name, joinPassword: 'rightpw', confirmPassword: 'rightpw' });
    orgIds.push(created.body.data.id);

    const joinerToken = await auth();
    const wrong = await request(app).post('/api/org/join')
      .set('Authorization', `Bearer ${joinerToken}`)
      .send({ name, joinPassword: 'wrongpw' });
    expect(wrong.status).toBe(401);

    const ok = await request(app).post('/api/org/join')
      .set('Authorization', `Bearer ${joinerToken}`)
      .send({ name, joinPassword: 'rightpw' });
    expect(ok.status).toBe(200);
    expect(ok.body.data.memberCount).toBe(2);
  });

  test('non-creator cannot delete the organization (403)', async () => {
    if (!dbOk) return;
    const creatorToken = await auth();
    const name = uniq('PermOrg');
    const created = await request(app).post('/api/org/create')
      .set('Authorization', `Bearer ${creatorToken}`)
      .send({ name, joinPassword: 'secret', confirmPassword: 'secret' });
    orgIds.push(created.body.data.id);

    const otherToken = await auth();
    const del = await request(app).delete(`/api/org/${created.body.data.id}`)
      .set('Authorization', `Bearer ${otherToken}`);
    expect(del.status).toBe(403);
  });

  test('create without a token returns 401', async () => {
    if (!dbOk) return;
    const resp = await request(app).post('/api/org/create')
      .send({ name: uniq('NoAuth'), joinPassword: 'secret', confirmPassword: 'secret' });
    expect(resp.status).toBe(401);
  });
});
