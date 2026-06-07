
jest.mock('../../models/User', () => ({ findById: jest.fn() }));

const User = require('../../models/User');
const jwtService = require('../../services/jwt.service');
const { authenticate, authorize } = require('../../middleware/auth.middleware');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authenticate', () => {
  test('401 when Authorization header is missing', async () => {
    const res = mockRes();
    const next = jest.fn();
    await authenticate({ headers: {} }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('401 when token is invalid', async () => {
    const res = mockRes();
    const next = jest.fn();
    await authenticate({ headers: { authorization: 'Bearer garbage' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('401 when the user is inactive', async () => {
    User.findById.mockResolvedValue({ _id: 'u1', email: 'a@b.com', role: 'viewer', isActive: false });
    const token = jwtService.generateToken('u1', 'a@b.com', 'viewer');
    const res = mockRes();
    const next = jest.fn();
    await authenticate({ headers: { authorization: `Bearer ${token}` } }, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('attaches req.user and calls next on a valid token', async () => {
    User.findById.mockResolvedValue({ _id: 'u1', email: 'a@b.com', role: 'admin', isActive: true });
    const token = jwtService.generateToken('u1', 'a@b.com', 'admin');
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = mockRes();
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ userId: 'u1', email: 'a@b.com', role: 'admin' });
  });
});

describe('authorize', () => {
  test('401 when no authenticated user is present', () => {
    const res = mockRes();
    const next = jest.fn();
    authorize('admin')({}, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('403 when the role is not permitted', () => {
    const res = mockRes();
    const next = jest.fn();
    authorize('admin')({ user: { role: 'viewer' } }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('calls next when the role is permitted', () => {
    const res = mockRes();
    const next = jest.fn();
    authorize('admin', 'analyst')({ user: { role: 'analyst' } }, res, next);
    expect(next).toHaveBeenCalled();
  });
});
