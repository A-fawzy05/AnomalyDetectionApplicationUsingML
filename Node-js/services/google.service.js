const { google } = require('googleapis');
const config = require('../config/env.config');

class GoogleService {
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      config.GOOGLE_CLIENT_ID,
      config.GOOGLE_CLIENT_SECRET,
      config.GOOGLE_REDIRECT_URI
    );
  }

  getAuthUrl() {
    const scopes = [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  async getGoogleUser(code) {
    try {
      const { tokens } = await this.oauth2Client.getAccessToken(code);
      this.oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const { data } = await oauth2.userinfo.get();

      return {
        id: data.id,
        email: data.email,
        name: data.name,
        picture: data.picture,
        verifiedEmail: data.verified_email
      };
    } catch (error) {
      console.error('Error getting Google user info:', error);
      throw new Error('Failed to authenticate with Google');
    }
  }

  async verifyGoogleToken(token) {
    try {
      const ticket = await this.oauth2Client.verifyIdToken({
        idToken: token,
        audience: config.GOOGLE_CLIENT_ID
      });

      const payload = ticket.getPayload();
      
      return {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        verifiedEmail: payload.email_verified
      };
    } catch (error) {
      console.error('Error verifying Google token:', error);
      throw new Error('Invalid Google token');
    }
  }
}

module.exports = new GoogleService();
