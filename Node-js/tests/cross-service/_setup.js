
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../../models/User');
const jwtService = require('../../services/jwt.service');
const config = require('../../config/env.config');

async function connectMongo() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return false;
  try {
    if (mongoose.connection.readyState === 1) return true;
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    return true;
  } catch (err) {
    
    console.warn(`[cross-service] MongoDB unreachable — skipping: ${err.message}`);
    return false;
  }
}

async function probeFastapi() {
  try {
    const resp = await fetch(`${config.FASTAPI_URL}/api/v1/health`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!resp.ok) return null;
    return await resp.json();
  } catch (err) {
    
    console.warn(`[cross-service] FastAPI unreachable at ${config.FASTAPI_URL} — skipping: ${err.message}`);
    return null;
  }
}

function uniq(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

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

async function cleanupUsers() {
  if (mongoose.connection.readyState === 1) {
    await User.deleteMany({ email: /^xsvc_/ });
  }
}

module.exports = {
  mongoose, connectMongo, probeFastapi, makeUser, cleanupUsers, uniq, config
};
