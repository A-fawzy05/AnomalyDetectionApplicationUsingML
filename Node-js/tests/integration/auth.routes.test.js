/**
 * Integration tests for the authentication flow against the dev MongoDB.
 *   signup → verify-email → login → GET /profile
 * plus duplicate-email, bad-credentials and missing-token error paths.
 *
 * The email service is mocked (no real Resend call) and connectDB is neutralised
 * so the app does not open a second connection / exit on failure.
 */
jest.mock('../../config/db.config', () => jest.fn());
jest.mock('../../services/email.service', () => ({
  sendEmailVerificationOTP: jest.fn().mockResolvedValue({}),
  sendPasswordResetEmail: jest.fn().mockResolvedValue({}),
}));

const request = require('supertest');
const { mongoose, connectTestDb, uniq } = require('./_setup');
const User = require('../../models/User');

let app;
let dbOk = false;
const createdEmails = [];

beforeAll(async () => {
  dbOk = await connectTestDb();
  if (dbOk) app = require('../../app');
});

afterAll(async () => {
  if (dbOk) {
    await User.deleteMany({ email: { $in: createdEmails } });
    await mongoose.connection.close();
  }
});

describe('POST /api/auth/signup → verify → login → profile', () => {
  test('full happy path', async () => {
    if (!dbOk) return;
    const email = `${uniq('auth')}@example.com`;
    createdEmails.push(email);

    // 1. Signup
    const signup = await request(app).post('/api/auth/signup').send({
      fullName: 'Jane Tester',
      email,
      password: 'password123',
      agreeToTerms: true,
    });
    expect(signup.status).toBe(201);
    expect(signup.body.data.email).toBe(email);

    // Password is stored hashed, not in plaintext.
    const stored = await User.findOne({ email }).select('+password +emailVerificationOTP');
    expect(stored.password).not.toBe('password123');
    expect(stored.password.startsWith('$2')).toBe(true);

    // 2. Verify email with the stored OTP
    const verify = await request(app).post('/api/auth/verify-email').send({
      email,
      otp: stored.emailVerificationOTP,
    });
    expect(verify.status).toBe(200);
    expect(verify.body.data.token).toBeTruthy();

    // 3. Login
    const login = await request(app).post('/api/auth/login').send({ email, password: 'password123' });
    expect(login.status).toBe(200);
    const token = login.body.data.token;
    expect(token).toBeTruthy();

    // 4. Protected profile with the token
    const profile = await request(app).get('/api/auth/profile').set('Authorization', `Bearer ${token}`);
    expect(profile.status).toBe(200);
    expect(profile.body.data.email).toBe(email);
  });

  test('duplicate email is rejected with 400', async () => {
    if (!dbOk) return;
    const email = `${uniq('dup')}@example.com`;
    createdEmails.push(email);
    const body = { fullName: 'Dup', email, password: 'password123', agreeToTerms: true };
    const first = await request(app).post('/api/auth/signup').send(body);
    expect(first.status).toBe(201);
    const second = await request(app).post('/api/auth/signup').send(body);
    expect(second.status).toBe(400);
    expect(second.body.message).toMatch(/already exists/i);
  });

  test('login with wrong password returns 401', async () => {
    if (!dbOk) return;
    const email = `${uniq('badpw')}@example.com`;
    createdEmails.push(email);
    await request(app).post('/api/auth/signup').send({
      fullName: 'Bad PW', email, password: 'password123', agreeToTerms: true,
    });
    const login = await request(app).post('/api/auth/login').send({ email, password: 'WRONGpass' });
    expect(login.status).toBe(401);
  });

  test('protected route without a token returns 401', async () => {
    if (!dbOk) return;
    const profile = await request(app).get('/api/auth/profile');
    expect(profile.status).toBe(401);
  });

  test('signup with invalid payload returns 400', async () => {
    if (!dbOk) return;
    const bad = await request(app).post('/api/auth/signup').send({ email: 'not-an-email' });
    expect(bad.status).toBe(400);
  });
});
