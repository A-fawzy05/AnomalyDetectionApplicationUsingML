const jwt = require('jsonwebtoken');
const config = require('../config/env.config');

class JWTService {
  generateToken(userId, email, role) {
    return jwt.sign(
      { 
        userId, 
        email, 
        role 
      },
      config.JWT_SECRET,
      { 
        expiresIn: config.JWT_EXPIRE 
      }
    );
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, config.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  generateRefreshToken(userId) {
    return jwt.sign(
      { userId, type: 'refresh' },
      config.JWT_SECRET,
      { expiresIn: '30d' }
    );
  }

  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }
      return decoded;
    } catch (error) {
      throw new Error('Invalid or expired refresh token');
    }
  }
}

module.exports = new JWTService();
