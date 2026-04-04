'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';

interface User {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  profilePicture?: string;
}

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showOTP, setShowOTP] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    agreeToTerms: false
  });
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [user, setUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Verify token and redirect if valid
      verifyToken();
    }
  }, []);

  const verifyToken = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUser(data.data);
        router.push('/Home');
      }
    } catch (error) {
      localStorage.removeItem('token');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      const body = isLogin 
        ? { email: formData.email, password: formData.password }
        : { ...formData };

      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        if (!isLogin) {
          // Show OTP verification for signup
          setShowOTP(true);
          setMessage({ type: 'success', text: data.message });
        } else {
          // Login successful
          localStorage.setItem('token', data.data.token);
          setUser(data.data.user);
          setMessage({ type: 'success', text: data.message });
          setTimeout(() => router.push('/Home'), 1500);
        }
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleOTPVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('http://localhost:3001/api/auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          otp: otp
        }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.data.token);
        setUser(data.data.user);
        setMessage({ type: 'success', text: data.message });
        setTimeout(() => router.push('/Home'), 1500);
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('http://localhost:3001/api/auth/resend-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/google/url');
      const data = await response.json();
      
      if (response.ok) {
        window.location.href = data.data.authUrl;
      } else {
        setMessage({ type: 'error', text: 'Failed to initialize Google login' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  if (user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${theme === 'dark' ? 'bg-bg-primary' : 'bg-gray-50'}`}>
        <div className={`text-center ${theme === 'dark' ? 'text-text-primary' : 'text-gray-900'}`}>
          <h1 className="text-4xl font-bold mb-4">Welcome back, {user.fullName}!</h1>
          <p className="text-xl">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen relative flex items-center justify-center ${theme === 'dark' ? 'bg-bg-primary' : 'bg-gray-50'}`}>
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className={`fixed top-6 right-6 z-50 p-3 rounded-full transition-all duration-300 ${
          theme === 'dark' 
            ? 'bg-surface-elevated text-nobel-gold hover:bg-surface-overlay' 
            : 'bg-white text-gray-700 hover:bg-gray-100 shadow-lg'
        }`}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0">
        {theme === 'dark' ? (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--bg-primary)_0%,transparent_100%)] opacity-80" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 opacity-90" />
        )}
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Frosted Glass Container */}
        <div className="backdrop-blur-xl bg-white bg-opacity-10 rounded-2xl shadow-2xl border border-white border-opacity-20 p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
              theme === 'dark' ? 'bg-nobel-gold' : 'bg-gradient-to-br from-yellow-400 to-orange-500'
            }`}>
              <span className="text-white text-3xl font-bold">P2P</span>
            </div>
            <h1 className={`text-3xl font-bold mb-2 ${
              theme === 'dark' ? 'text-text-primary' : 'text-gray-900'
            }`}>P2P Insight</h1>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-text-secondary' : 'text-gray-600'
            }`}>Process Mining & Anomaly Detection</p>
          </div>

          {/* Theme Toggle in Card */}
          <div className="flex justify-end mb-6">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${
                theme === 'dark'
                  ? 'bg-surface-elevated text-nobel-gold hover:bg-surface-overlay'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {!showOTP ? (
            <>
              {/* Tab Toggle */}
              <div className={`flex mb-6 rounded-lg p-1 ${
                theme === 'dark' ? 'bg-surface-elevated' : 'bg-gray-100'
              }`}>
                <button
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                    isLogin
                      ? theme === 'dark' 
                        ? 'bg-nobel-gold text-bg-primary'
                        : 'bg-blue-600 text-white'
                      : theme === 'dark'
                        ? 'text-text-secondary hover:text-text-primary'
                        : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-all ${
                    !isLogin
                      ? theme === 'dark' 
                        ? 'bg-nobel-gold text-bg-primary'
                        : 'bg-blue-600 text-white'
                      : theme === 'dark'
                        ? 'text-text-secondary hover:text-text-primary'
                        : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      theme === 'dark' ? 'text-text-primary' : 'text-gray-700'
                    }`}>
                      Full Name
                    </label>
                    <div className="relative">
                      <User className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                        theme === 'dark' ? 'text-text-secondary' : 'text-gray-400'
                      }`} />
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder="John Doe"
                        className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-colors ${
                          theme === 'dark'
                            ? 'bg-surface-elevated border-border-primary text-text-primary placeholder-text-secondary focus:border-nobel-gold focus:ring-2 focus:ring-nobel-gold/20'
                            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                        }`}
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-text-primary' : 'text-gray-700'
                  }`}>
                    Email
                  </label>
                  <div className="relative">
                    <Mail className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                      theme === 'dark' ? 'text-text-secondary' : 'text-gray-400'
                    }`} />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="john.doe@example.com"
                      className={`w-full pl-10 pr-4 py-3 rounded-lg border transition-colors ${
                        theme === 'dark'
                          ? 'bg-surface-elevated border-border-primary text-text-primary placeholder-text-secondary focus:border-nobel-gold focus:ring-2 focus:ring-nobel-gold/20'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      }`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-text-primary' : 'text-gray-700'
                  }`}>
                    Password
                  </label>
                  <div className="relative">
                    <Lock className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                      theme === 'dark' ? 'text-text-secondary' : 'text-gray-400'
                    }`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="••••••••"
                      className={`w-full pl-10 pr-12 py-3 rounded-lg border transition-colors ${
                        theme === 'dark'
                          ? 'bg-surface-elevated border-border-primary text-text-primary placeholder-text-secondary focus:border-nobel-gold focus:ring-2 focus:ring-nobel-gold/20'
                          : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                        theme === 'dark' ? 'text-text-secondary' : 'text-gray-400'
                      }`}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {!isLogin && (
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="agreeToTerms"
                      id="agreeToTerms"
                      checked={formData.agreeToTerms}
                      onChange={handleInputChange}
                      className={`w-4 h-4 rounded focus:ring-2 focus:ring-nobel-gold ${
                        theme === 'dark' ? 'bg-surface-elevated border-border-primary' : 'bg-white border-gray-300'
                      }`}
                      required
                    />
                    <label htmlFor="agreeToTerms" className={`ml-2 text-sm ${
                      theme === 'dark' ? 'text-text-secondary' : 'text-gray-600'
                    }`}>
                      I agree to terms and conditions
                    </label>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 px-4 font-semibold rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    theme === 'dark'
                      ? 'bg-nobel-gold text-bg-primary hover:bg-nobel-gold/90 focus:ring-2 focus:ring-nobel-gold/20'
                      : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                >
                  {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full border-t ${
                    theme === 'dark' ? 'border-border-primary' : 'border-gray-300'
                  }`}></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className={`px-2 bg-transparent ${
                    theme === 'dark' ? 'text-text-secondary' : 'text-gray-500'
                  }`}>Or continue with</span>
                </div>
              </div>

              {/* Google OAuth */}
              <button
                onClick={handleGoogleLogin}
                className={`w-full mt-4 flex items-center justify-center py-3 px-4 border rounded-lg transition-colors ${
                  theme === 'dark'
                    ? 'border-border-primary text-text-primary hover:bg-surface-elevated'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>
            </>
          ) : (
            /* OTP Verification */
            <div>
              <div className="text-center mb-6">
                <h2 className={`text-2xl font-bold mb-4 ${
                  theme === 'dark' ? 'text-text-primary' : 'text-gray-900'
                }`}>Verify Your Email</h2>
                <p className={`text-sm mb-6 ${
                  theme === 'dark' ? 'text-text-secondary' : 'text-gray-600'
                }`}>
                  We've sent a verification code to {formData.email}
                </p>
              </div>
              <form onSubmit={handleOTPVerification} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className={`w-full px-4 py-3 rounded-lg border transition-colors ${
                      theme === 'dark'
                        ? 'bg-surface-elevated border-border-primary text-text-primary placeholder-text-secondary focus:border-nobel-gold focus:ring-2 focus:ring-nobel-gold/20'
                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                    }`}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3 px-4 font-semibold rounded-lg shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    theme === 'dark'
                      ? 'bg-nobel-gold text-bg-primary hover:bg-nobel-gold/90 focus:ring-2 focus:ring-nobel-gold/20'
                      : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/20'
                  }`}
                >
                  {loading ? 'Verifying...' : 'Verify Email'}
                </button>

                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={loading}
                  className={`w-full py-3 px-4 bg-white bg-opacity-20 border border-white border-opacity-30 text-white font-semibold rounded-lg hover:bg-opacity-30 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 ${
                    theme === 'dark' ? 'text-text-primary' : 'text-gray-700'
                  }`}
                >
                  {loading ? 'Sending...' : 'Resend Code'}
                </button>
              </form>
            </div>
          )}

          {/* Message Display */}
          {message.text && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              message.type === 'success' 
                ? 'bg-green-500 bg-opacity-20 text-green-100 border border-green-500 border-opacity-30' 
                : 'bg-red-500 bg-opacity-20 text-red-100 border border-red-500 border-opacity-30'
            }`}>
              {message.text}
            </div>
          )}

          {/* Back to Login/Signup */}
          {showOTP && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowOTP(false)}
                className={`text-sm ${
                  theme === 'dark' ? 'text-nobel-gold hover:text-nobel-gold/80' : 'text-blue-600 hover:text-blue-700'
                }`}
              >
                Back to {isLogin ? 'Sign In' : 'Sign Up'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}