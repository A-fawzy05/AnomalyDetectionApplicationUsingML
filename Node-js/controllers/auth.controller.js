const User = require('../models/User');
const emailService = require('../services/email.service');
const googleService = require('../services/google.service');
const jwtService = require('../services/jwt.service');
const Joi = require('joi');
const bcrypt = require('bcryptjs');

class AuthController {
  
  static signupSchema = Joi.object({
    fullName: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    agreeToTerms: Joi.boolean().valid(true).required()
  });

  static loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  });

  static verifyOTPSchema = Joi.object({
    email: Joi.string().email().required(),
    otp: Joi.string().length(6).required()
  });

  static resendOTPSchema = Joi.object({
    email: Joi.string().email().required()
  });

  static async signup(req, res) {
    try {
      const { error } = AuthController.signupSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const { fullName, email, password } = req.body;

      const hashedPassword = await bcrypt.hash(password, 12);

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }

      const user = new User({
        fullName,
        email,
        password: hashedPassword
      });

      const otp = user.generateEmailOTP();

      await user.save();

      try {
        await emailService.sendEmailVerificationOTP(email, otp, fullName);
      } catch (emailError) {
        console.error('Email service error:', emailError);

      }

      res.status(201).json({
        success: true,
        message: 'Account created successfully. Please check your email for verification code.',
        data: {
          userId: user._id,
          email: user.email,
          isEmailVerified: user.isEmailVerified
        }
      });
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async login(req, res) {
    try {
      const { error } = AuthController.loginSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const { email, password } = req.body;

      const user = await User.findOne({ email }).select('+password +emailVerificationOTP +emailVerificationExpires');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password'
        });
      }

      user.lastLogin = new Date();
      await user.save();

      const token = jwtService.generateToken(user._id, user.email, user.role);

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            profilePicture: user.profilePicture
          }
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async verifyEmail(req, res) {
    try {
      const { error } = AuthController.verifyOTPSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const { email, otp } = req.body;

      const user = await User.findOne({ 
        email,
        emailVerificationOTP: otp,
        emailVerificationExpires: { $gt: Date.now() }
      }).select('+emailVerificationOTP +emailVerificationExpires');

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Invalid or expired verification code'
        });
      }

      user.clearEmailOTP();
      await user.save();

      const token = jwtService.generateToken(user._id, user.email, user.role);

      res.json({
        success: true,
        message: 'Email verified successfully',
        data: {
          token,
          user: {
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            profilePicture: user.profilePicture
          }
        }
      });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async resendOTP(req, res) {
    try {
      const { error } = AuthController.resendOTPSchema.validate(req.body);
      if (error) {
        return res.status(400).json({
          success: false,
          message: error.details[0].message
        });
      }

      const { email } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      if (user.isEmailVerified) {
        return res.status(400).json({
          success: false,
          message: 'Email is already verified'
        });
      }

      const otp = user.generateEmailOTP();
      await user.save();

      await emailService.sendEmailVerificationOTP(email, otp, user.fullName);

      res.json({
        success: true,
        message: 'Verification code sent successfully'
      });
    } catch (error) {
      console.error('Resend OTP error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async googleAuth(req, res) {
    try {
      const { code } = req.query;

      if (!code) {
        return res.status(400).json({
          success: false,
          message: 'Authorization code is required'
        });
      }

      const googleUser = await googleService.getGoogleUser(code);

      if (!googleUser.verifiedEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email is not verified with Google'
        });
      }

      let user = await User.findOne({ 
        $or: [
          { email: googleUser.email },
          { googleId: googleUser.id }
        ]
      });

      if (!user) {
        
        user = new User({
          fullName: googleUser.name,
          email: googleUser.email,
          googleId: googleUser.id,
          isEmailVerified: true,
          profilePicture: googleUser.picture,
          role: 'viewer' 
        });
      } else {
        
        user.googleId = googleUser.id;
        user.isEmailVerified = true;
        if (googleUser.picture && !user.profilePicture) {
          user.profilePicture = googleUser.picture;
        }
      }

      user.lastLogin = new Date();
      await user.save();

      const token = jwtService.generateToken(user._id, user.email, user.role);

      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${token}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('Google auth error:', error);
      res.status(500).json({
        success: false,
        message: 'Google authentication failed'
      });
    }
  }

  static async getGoogleAuthUrl(req, res) {
    try {
      const authUrl = googleService.getAuthUrl();
      res.json({
        success: true,
        data: { authUrl }
      });
    } catch (error) {
      console.error('Get Google auth URL error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate Google auth URL'
      });
    }
  }

  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.userId);

      res.json({
        success: true,
        data: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          profilePicture: user.profilePicture,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
          telegramPhone: user.telegramPhone || null
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  static async updateTelegramPhone(req, res) {
    try {
      const { telegramPhone, telegramChatId } = req.body;
      if (!telegramPhone || !telegramChatId) {
        return res.status(400).json({ success: false, message: 'telegramPhone and telegramChatId are required' });
      }
      const phoneRegex = /^\+?[0-9]{7,15}$/;
      if (!phoneRegex.test(telegramPhone)) {
        return res.status(400).json({ success: false, message: 'Invalid phone number format' });
      }
      const chatIdRegex = /^-?[0-9]{5,15}$/;
      if (!chatIdRegex.test(String(telegramChatId).trim())) {
        return res.status(400).json({ success: false, message: 'Invalid chat ID format' });
      }

      const update = {
        telegramPhone,
        telegramChatId: String(telegramChatId).trim(),
      };

      const user = await User.findByIdAndUpdate(req.user.userId, update, { new: true });

      res.json({
        success: true,
        message: 'Telegram account linked',
        data: {
          telegramPhone: user.telegramPhone,
          telegramChatId: user.telegramChatId || null
        }
      });
    } catch (error) {
      console.error('Update telegram phone error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

}

module.exports = AuthController;