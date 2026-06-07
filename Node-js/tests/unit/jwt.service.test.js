
const jwt = require('jsonwebtoken');
const jwtService = require('../../services/jwt.service');
const config = require('../../config/env.config');

describe('JWTService', () => {
  test('generateToken → verifyToken round-trips the claims', () => {
    const token = jwtService.generateToken('user123', 'a@b.com', 'analyst');
    const decoded = jwtService.verifyToken(token);
    expect(decoded.userId).toBe('user123');
    expect(decoded.email).toBe('a@b.com');
    expect(decoded.role).toBe('analyst');
  });

  test('verifyToken throws on a tampered/invalid token', () => {
    expect(() => jwtService.verifyToken('not.a.jwt')).toThrow('Invalid or expired token');
  });

  test('verifyToken throws on an expired token', () => {
    const expired = jwt.sign({ userId: 'u' }, config.JWT_SECRET, { expiresIn: -10 });
    expect(() => jwtService.verifyToken(expired)).toThrow('Invalid or expired token');
  });

  test('refresh token carries the refresh type and verifies', () => {
    const refresh = jwtService.generateRefreshToken('user123');
    const decoded = jwtService.verifyRefreshToken(refresh);
    expect(decoded.userId).toBe('user123');
    expect(decoded.type).toBe('refresh');
  });

  test('verifyRefreshToken rejects a normal access token', () => {
    const access = jwtService.generateToken('user123', 'a@b.com', 'viewer');
    expect(() => jwtService.verifyRefreshToken(access)).toThrow('Invalid or expired refresh token');
  });
});
