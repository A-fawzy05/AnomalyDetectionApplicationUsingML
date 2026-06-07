
const bcrypt = require('bcryptjs');
const User = require('../../models/User');

describe('User.comparePassword', () => {
  test('returns true for the matching password', async () => {
    const u = new User();
    u.password = await bcrypt.hash('s3cret!', 12);
    expect(await u.comparePassword('s3cret!')).toBe(true);
  });

  test('returns false for a wrong password', async () => {
    const u = new User();
    u.password = await bcrypt.hash('s3cret!', 12);
    expect(await u.comparePassword('wrong')).toBe(false);
  });
});

describe('User OTP helpers', () => {
  test('generateEmailOTP returns a 6-digit code with a future expiry', () => {
    const u = new User();
    const otp = u.generateEmailOTP();
    expect(otp).toMatch(/^\d{6}$/);
    expect(u.emailVerificationOTP).toBe(otp);
    expect(new Date(u.emailVerificationExpires).getTime()).toBeGreaterThan(Date.now());
  });

  test('clearEmailOTP wipes the OTP and marks the email verified', () => {
    const u = new User();
    u.generateEmailOTP();
    u.clearEmailOTP();
    expect(u.emailVerificationOTP).toBeUndefined();
    expect(u.emailVerificationExpires).toBeUndefined();
    expect(u.isEmailVerified).toBe(true);
  });

  test('teams field exists on the schema (bug-fix regression)', () => {
    
    expect(User.schema.path('teams')).toBeDefined();
  });
});
