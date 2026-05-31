/**
 * Light unit checks for the external-integration services. We do NOT hit any
 * network here — we only verify the modules construct and expose their contract.
 */
const emailService = require('../../services/email.service');
const googleService = require('../../services/google.service');

describe('email.service', () => {
  test('exposes the OTP email sender', () => {
    expect(typeof emailService.sendEmailVerificationOTP).toBe('function');
  });
});

describe('google.service', () => {
  test('getAuthUrl builds a Google OAuth consent URL (offline)', () => {
    const url = googleService.getAuthUrl();
    expect(typeof url).toBe('string');
    expect(url).toContain('accounts.google.com');
  });
});
