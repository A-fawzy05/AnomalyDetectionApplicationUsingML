const { Resend } = require('resend');
const config = require('../config/env.config');

class EmailService {
  constructor() {
    // The Resend SDK throws at construction if the key is empty/undefined. In CI
    // (and any environment without a configured key) we fall back to a harmless
    // placeholder so importing this module never crashes. No network call is made
    // at construction time; a real send still requires a valid RESEND_API_KEY.
    this.resend = new Resend(config.RESEND_API_KEY || 're_placeholder_key');
  }

  async sendEmailVerificationOTP(email, otp, fullName) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: config.EMAIL_FROM || 'onboarding@resend.dev',
        to: [email],
        subject: 'Email Verification - P2P Insight',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
              <h1 style="color: white; margin: 0; font-size: 28px;">P2P Insight</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Process Mining & Anomaly Detection Platform</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
              <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">Email Verification</h2>
              <p style="color: #666; margin: 0 0 20px 0; line-height: 1.6;">
                Hi ${fullName},<br><br>
                Thank you for signing up for P2P Insight! To complete your registration, please use the verification code below:
              </p>
              
              <div style="background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; border-radius: 8px; margin: 30px 0;">
                <p style="color: #666; margin: 0 0 10px 0; font-size: 14px;">Your verification code is:</p>
                <p style="color: #667eea; font-size: 32px; font-weight: bold; margin: 0; letter-spacing: 5px;">${otp}</p>
              </div>
              
              <p style="color: #666; margin: 20px 0 0 0; line-height: 1.6;">
                This code will expire in <strong>10 minutes</strong>. If you didn't request this code, please ignore this email.
              </p>
            </div>
            
            <div style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
              <p> 2024 P2P Insight. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        `
      });

      if (error) {
        throw new Error(`Failed to send verification email: ${error.message}`);
      }

      console.log('Email sent successfully:', data);
      return data;
    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(email, resetLink, fullName) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: config.EMAIL_FROM || 'onboarding@resend.dev',
        to: [email],
        subject: 'Password Reset - P2P Insight',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
              <h1 style="color: white; margin: 0; font-size: 28px;">P2P Insight</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Process Mining & Anomaly Detection Platform</p>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
              <h2 style="color: #333; margin: 0 0 20px 0; font-size: 24px;">Password Reset</h2>
              <p style="color: #666; margin: 0 0 20px 0; line-height: 1.6;">
                Hi ${fullName},<br><br>
                We received a request to reset your password for your P2P Insight account. Click the button below to reset your password:
              </p>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                  Reset Password
                </a>
              </div>
              
              <p style="color: #666; margin: 20px 0 0 0; line-height: 1.6;">
                This link will expire in <strong>1 hour</strong>. If you didn't request this password reset, please ignore this email.
              </p>
            </div>
            
            <div style="text-align: center; color: #999; font-size: 12px; margin-top: 30px;">
              <p> 2024 P2P Insight. All rights reserved.</p>
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        `
      });

      if (error) {
        throw new Error(`Failed to send password reset email: ${error.message}`);
      }

      console.log('Password reset email sent successfully:', data);
      return data;
    } catch (error) {
      console.error('Email service error:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
