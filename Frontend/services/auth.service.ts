const API_BASE_URL = 'http://localhost:3001/api/auth';

export interface LoginData {
  email: string;
  password: string;
}

export interface SignupData {
  fullName: string;
  email: string;
  password: string;
  agreeToTerms: boolean;
}

export interface VerifyOTPData {
  email: string;
  otp: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    user: {
      id: string;
      fullName: string;
      email: string;
      role: string;
      isEmailVerified: boolean;
      profilePicture?: string;
    };
  };
}

export interface GoogleAuthResponse {
  success: boolean;
  data?: {
    authUrl: string;
  };
}

class AuthService {
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    return response.json();
  }

  async signup(data: SignupData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Signup failed');
    }

    return response.json();
  }

  async verifyEmail(data: VerifyOTPData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Email verification failed');
    }

    return response.json();
  }

  async resendOTP(email: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/resend-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to resend OTP');
    }

    return response.json();
  }

  async getGoogleAuthUrl(): Promise<GoogleAuthResponse> {
    const response = await fetch(`${API_BASE_URL}/google/url`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get Google auth URL');
    }

    return response.json();
  }

  async getProfile(token: string): Promise<{ success: boolean; data: unknown }> {
    const response = await fetch(`${API_BASE_URL}/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get profile');
    }

    return response.json();
  }

  async validateToken(token: string): Promise<boolean> {
    try {
      await this.getProfile(token);
      return true;
    } catch {
      return false;
    }
  }
}

const authService = new AuthService();
export default authService;
