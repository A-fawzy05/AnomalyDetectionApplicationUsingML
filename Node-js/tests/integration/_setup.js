
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../../models/User');
const jwtService = require('../../services/jwt.service');

async function connectTestDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) return false;
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    return true;
  } catch (err) {
    
    console.warn(`[integration] MongoDB unreachable — skipping integration tests: ${err.message}`);
    return false;
  }
}

function uniq(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

async function makeAuthUser(role = 'admin') {
  const user = await User.create({
    fullName: 'Test User',
    email: `${uniq('user')}@example.com`,
    password: await bcrypt.hash('password123', 12),
    isEmailVerified: true,
    role,
  });
  const token = jwtService.generateToken(user._id, user.email, user.role);
  return { user, token };
}

module.exports = { mongoose, connectTestDb, uniq, makeAuthUser };
