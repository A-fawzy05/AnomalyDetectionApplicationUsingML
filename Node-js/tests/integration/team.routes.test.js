
jest.mock('../../config/db.config', () => jest.fn());
jest.mock('../../services/email.service', () => ({
  sendEmailVerificationOTP: jest.fn().mockResolvedValue({}),
}));

const request = require('supertest');
const { mongoose, connectTestDb, uniq, makeAuthUser } = require('./_setup');
const User = require('../../models/User');
const Team = require('../../models/Team');

let app;
let dbOk = false;
const userIds = [];
const teamIds = [];

beforeAll(async () => {
  dbOk = await connectTestDb();
  if (dbOk) app = require('../../app');
});

afterAll(async () => {
  if (dbOk) {
    await Team.deleteMany({ _id: { $in: teamIds } });
    await User.deleteMany({ _id: { $in: userIds } });
    await mongoose.connection.close();
  }
});

async function auth(role = 'admin') {
  const { user, token } = await makeAuthUser(role);
  userIds.push(user._id);
  return { userId: user._id, token };
}

describe('/api/teams', () => {
  test('create team records membership in User.teams, not organizations (bug fix)', async () => {
    if (!dbOk) return;
    const { userId, token } = await auth();
    const name = uniq('Team');

    const created = await request(app).post('/api/teams/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ name, joinPassword: 'teampw', confirmPassword: 'teampw' });
    expect(created.status).toBe(201);
    teamIds.push(created.body.data.id);

    const user = await User.findById(userId);
    const inTeams = user.teams.some(t => t.teamId.toString() === created.body.data.id.toString());
    const inOrgs = (user.organizations || []).some(
      o => o.organizationId && o.organizationId.toString() === created.body.data.id.toString(),
    );
    expect(inTeams).toBe(true);   
    expect(inOrgs).toBe(false);   
  });

  test('duplicate team name returns 409', async () => {
    if (!dbOk) return;
    const { token } = await auth();
    const name = uniq('DupTeam');
    const first = await request(app).post('/api/teams/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ name, joinPassword: 'teampw', confirmPassword: 'teampw' });
    teamIds.push(first.body.data.id);
    const second = await request(app).post('/api/teams/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ name, joinPassword: 'teampw', confirmPassword: 'teampw' });
    expect(second.status).toBe(409);
  });

  test('join and create/get a subteam', async () => {
    if (!dbOk) return;
    const { token: adminToken } = await auth();
    const name = uniq('SubTeam');
    const created = await request(app).post('/api/teams/create')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name, joinPassword: 'teampw', confirmPassword: 'teampw' });
    const teamId = created.body.data.id;
    teamIds.push(teamId);

    const { token: memberToken } = await auth('viewer');
    const joined = await request(app).post('/api/teams/join')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ name, joinPassword: 'teampw' });
    expect(joined.status).toBe(200);
    expect(joined.body.data.memberCount).toBe(2);

    const sub = await request(app).post(`/api/teams/${teamId}/subteams`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Procurement' });
    expect(sub.status).toBe(201);

    const got = await request(app).get(`/api/teams/${teamId}/subteams/${sub.body.data.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(got.status).toBe(200);
    expect(got.body.data.name).toBe('Procurement');
  });

  test('admin-telegram reports no Telegram linked by default', async () => {
    if (!dbOk) return;
    const { token } = await auth();
    const created = await request(app).post('/api/teams/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: uniq('TgTeam'), joinPassword: 'teampw', confirmPassword: 'teampw' });
    teamIds.push(created.body.data.id);

    const resp = await request(app).get(`/api/teams/${created.body.data.id}/admin-telegram`)
      .set('Authorization', `Bearer ${token}`);
    expect(resp.status).toBe(200);
    expect(resp.body.data.hasTelegram).toBe(false);
  });

  test('send-telegram-report posts to the n8n webhook (mocked fetch)', async () => {
    if (!dbOk) return;
    
    const { user, token } = await makeAuthUser('admin');
    userIds.push(user._id);
    user.telegramChatId = '123456789';
    await user.save();

    const created = await request(app).post('/api/teams/create')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: uniq('ReportTeam'), joinPassword: 'teampw', confirmPassword: 'teampw' });
    teamIds.push(created.body.data.id);

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'queued' }),
    });

    const resp = await request(app).post(`/api/teams/${created.body.data.id}/send-telegram-report`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reportMarkdown: '# Report' });

    expect(resp.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });
});
