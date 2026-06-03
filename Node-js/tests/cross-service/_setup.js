/**
 * Shared helpers for the CROSS-SERVICE tier (gateway ↔ FastAPI anomaly service).
 *
 * Unlike the per-service integration tier (which only exercises Node + MongoDB),
 * these tests drive a real request all the way through:
 *
 *     supertest → Node gateway (auth + membership lookup in MongoDB)
 *               → FastAPI anomaly service (enforces the forwarded claims)
 *
 * The tier soft-skips when EITHER dependency is unavailable: MongoDB Atlas
 * (needed to create users / read membership) or the FastAPI service (probed at
 * `${FASTAPI_URL}/api/v1/health`). This keeps the suite runnable offline.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../../models/User');
const jwtService = require('../../services/jwt.service');
const config = require('../../config/env.config');

/** Connect to the gateway's MongoDB. Returns false (no throw) if unreachable. */
async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return false;
  try {
    if (mongoose.connection.readyState === 1) return true;
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[cross-service] MongoDB unreachable — skipping: ${err.message}`);
    return false;
  }
}

/** Probe the FastAPI anomaly service. Returns the parsed /health body or null. */
async function probeFastapi() {
  try {
    const resp = await fetch(`${config.FASTAPI_URL}/api/v1/health`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(`[cross-service] FastAPI unreachable at ${config.FASTAPI_URL} — skipping: ${err.message}`);
    return null;
  }
}

function uniq(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

/**
 * Create a verified user and return { user, token }.
 *
 * @param {object} opts
 * @param {('admin'|'analyst'|'viewer')} opts.role  the user's platform role
 * @param {boolean} opts.member  if true the user is given a team membership, so
 *                               the gateway forwards X-User-Member: true
 */
async function makeUser({ role = 'analyst', member = true } = {}) {
  const teams = member
    ? [{ teamId: new mongoose.Types.ObjectId(), role: 'member' }]
    : [];
  const user = await User.create({
    fullName: 'XSvc Test User',
    email: `${uniq('xsvc')}@example.com`,
    password: await bcrypt.hash('password123', 12),
    isEmailVerified: true,
    role,
    teams
  });
  const token = jwtService.generateToken(user._id, user.email, user.role);
  return { user, token };
}

/** Delete every user this tier created (called in afterAll). */
async function cleanupUsers() {
  if (mongoose.connection.readyState === 1) {
    await User.deleteMany({ email: /^xsvc_/ });
  }
}

module.exports = {
  mongoose, connectMongo, probeFastapi, makeUser, cleanupUsers, uniq, config
};
