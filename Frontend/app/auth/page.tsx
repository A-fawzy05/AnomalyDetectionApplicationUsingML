'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
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
        router.push('/profile');
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
          
          setShowOTP(true);
          setMessage({ type: 'success', text: data.message });
        } else {
          
          localStorage.setItem('token', data.data.token);
          setUser(data.data.user);
          setMessage({ type: 'success', text: data.message });
          setTimeout(() => router.push('/profile'), 1500);
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
        setTimeout(() => router.push('/profile'), 1500);
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
      <div className={`min-h-screen flex items-center justify-center transition-colors duration-300 ${theme === 'dark' ? 'bg-bg-primary' : 'bg-gray-50'}`}>
        <div className={`text-center ${theme === 'dark' ? 'text-text-primary' : 'text-gray-900'}`}>
          <h1 className="text-4xl font-bold mb-4">Welcome back, {user.fullName}!</h1>
          <p className="text-xl">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen relative flex flex-col items-center justify-center p-4 sm:p-8 transition-colors duration-300 ${
      theme === 'dark' ? 'bg-bg-primary' : 'bg-gray-50'
    }`}>
      {}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        {theme === 'dark' ? (
          <>
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-nobel-gold/5 blur-[120px] rounded-full" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 blur-[120px] rounded-full" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50" />
        )}
      </div>

      <div className={`relative z-10 w-full max-w-5xl flex rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden transition-all duration-300 ${
        theme === 'dark' ? 'bg-surface-elevated border border-border-primary' : 'bg-white border border-gray-100'
      }`}>
        
        {}
        <div className="hidden lg:block relative w-1/2 flex-shrink-0 bg-black">
          <Image
            src="/auth-bg.png"
            alt="Process Mining & Anomaly Detection"
            fill
            className="object-cover opacity-90"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none" />
          <div className="absolute bottom-10 left-10 right-10">
            <div className="inline-flex items-center justify-center p-3 rounded-xl mb-4 bg-white/10 backdrop-blur-md border border-white/20 text-white">
               <span className="text-xl font-bold tracking-tight">P2P Insight</span>
            </div>
            <h2 className="text-white text-3xl font-bold mb-3 leading-tight">Enterprise Process Mining & Detection</h2>
            <p className="text-gray-300 text-base">Uncover hidden inefficiencies, detect compliance anomalies, and optimize your Purchase-to-Pay workflow.</p>
          </div>
        </div>

        {}
        <div className="w-full lg:w-1/2 p-8 sm:p-12 lg:p-16 relative flex flex-col justify-center">
          {}
          <div className="absolute top-8 right-8">
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-full transition-all duration-300 shadow-sm ${
                theme === 'dark'
                  ? 'bg-bg-primary text-nobel-gold hover:bg-surface-overlay border border-border-primary'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          <div className="mb-8 mt-4 lg:mt-0">
            <h1 className={`text-3xl font-bold mb-2 ${
              theme === 'dark' ? 'text-text-primary' : 'text-gray-900'
            }`}>
              {showOTP ? 'Verify Email' : (isLogin ? 'Welcome back' : 'Create new account')}
            </h1>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-text-secondary' : 'text-gray-500'
            }`}>
              {showOTP ? `We've sent a code to ${formData.email}` : (isLogin ? 'Enter your details to access your dashboard' : 'Let\'s create your profile')}
            </p>
          </div>

          {!showOTP ? (
            <>
              {}
              <div className={`flex mb-8 p-1.5 rounded-xl transition-colors ${
                theme === 'dark' ? 'bg-bg-primary border border-border-primary' : 'bg-gray-100 border border-transparent'
              }`}>
                <button
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                    isLogin
                      ? theme === 'dark' 
                        ? 'bg-surface-elevated text-nobel-gold shadow-sm'
                        : 'bg-white text-blue-600 shadow-sm'
                      : theme === 'dark'
                        ? 'text-text-secondary hover:text-text-primary'
                        : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                    !isLogin
                      ? theme === 'dark' 
                        ? 'bg-surface-elevated text-nobel-gold shadow-sm'
                        : 'bg-white text-blue-600 shadow-sm'
                      : theme === 'dark'
                        ? 'text-text-secondary hover:text-text-primary'
                        : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Sign Up
                </button>
              </div>

              {}
              <form onSubmit={handleSubmit} className="space-y-5">
                {!isLogin && (
                  <div>
                    <div className="relative">
                      <User className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                        theme === 'dark' ? 'text-text-secondary' : 'text-gray-400'
                      }`} />
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        placeholder="Enter full name"
                        className={`w-full pl-12 pr-4 py-3.5 rounded-xl border text-sm transition-all outline-none ${
                          theme === 'dark'
                            ? 'bg-bg-primary border-border-primary text-text-primary placeholder-text-secondary focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold'
                            : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                        }`}
                        required
                      />
                    </div>
                  </div>
                )}

                <div>
                  <div className="relative">
                    <Mail className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                      theme === 'dark' ? 'text-text-secondary' : 'text-gray-400'
                    }`} />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="Enter your email here"
                      className={`w-full pl-12 pr-4 py-3.5 rounded-xl border text-sm transition-all outline-none ${
                        theme === 'dark'
                          ? 'bg-bg-primary border-border-primary text-text-primary placeholder-text-secondary focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold'
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      }`}
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="relative">
                    <Lock className={`absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                      theme === 'dark' ? 'text-text-secondary' : 'text-gray-400'
                    }`} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter password"
                      className={`w-full pl-12 pr-12 py-3.5 rounded-xl border text-sm transition-all outline-none ${
                        theme === 'dark'
                          ? 'bg-bg-primary border-border-primary text-text-primary placeholder-text-secondary focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold'
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className={`absolute right-4 top-1/2 transform -translate-y-1/2 transition-colors ${
                        theme === 'dark' ? 'text-text-secondary hover:text-nobel-gold' : 'text-gray-400 hover:text-blue-500'
                      }`}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {!isLogin && (
                  <div className="flex items-center mt-2">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        name="agreeToTerms"
                        id="agreeToTerms"
                        checked={formData.agreeToTerms}
                        onChange={handleInputChange}
                        className={`w-4 h-4 rounded border transition-colors cursor-pointer ${
                          theme === 'dark' 
                            ? 'bg-bg-primary border-border-primary text-nobel-gold focus:ring-nobel-gold focus:ring-offset-bg-primary' 
                            : 'bg-gray-50 border-gray-300 text-blue-600 focus:ring-blue-500'
                        }`}
                        required
                      />
                    </div>
                    <label htmlFor="agreeToTerms" className={`ml-3 text-sm cursor-pointer ${
                      theme === 'dark' ? 'text-text-secondary' : 'text-gray-600'
                    }`}>
                      I agree to terms and conditions
                    </label>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 px-4 font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mt-4 shadow-sm ${
                    theme === 'dark'
                      ? 'bg-nobel-gold text-bg-primary hover:bg-yellow-400 focus:ring-2 focus:ring-nobel-gold/50 focus:outline-none'
                      : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/50 focus:outline-none'
                  }`}
                >
                  {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
                </button>
              </form>

              {}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className={`w-full border-t ${
                    theme === 'dark' ? 'border-border-primary/50' : 'border-gray-200'
                  }`}></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className={`px-4 text-xs font-medium uppercase tracking-wider ${
                    theme === 'dark' ? 'bg-surface-elevated text-text-secondary' : 'bg-white text-gray-400'
                  }`}>
                    Or continue with
                  </span>
                </div>
              </div>

              {}
              <button
                onClick={handleGoogleLogin}
                className={`w-full flex items-center justify-center py-3.5 px-4 border rounded-xl text-sm font-medium transition-colors ${
                  theme === 'dark'
                    ? 'border-border-primary bg-bg-primary text-text-primary hover:bg-surface-overlay'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>
            </>
          ) : (
            
            <div className="mt-4">
              <form onSubmit={handleOTPVerification} className="space-y-5">
                <div>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                    className={`w-full px-4 py-4 rounded-xl border text-center text-lg tracking-widest font-medium transition-colors outline-none ${
                      theme === 'dark'
                        ? 'bg-bg-primary border-border-primary text-text-primary placeholder-text-secondary/50 focus:border-nobel-gold focus:ring-1 focus:ring-nobel-gold'
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500'
                    }`}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-4 px-4 font-semibold rounded-xl shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    theme === 'dark'
                      ? 'bg-nobel-gold text-bg-primary hover:bg-yellow-400 focus:ring-2 focus:ring-nobel-gold/50'
                      : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500/50'
                  }`}
                >
                  {loading ? 'Verifying...' : 'Verify Email'}
                </button>

                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={loading}
                  className={`w-full py-3.5 px-4 font-semibold rounded-xl border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                    theme === 'dark' 
                      ? 'bg-transparent border-border-primary text-text-secondary hover:text-text-primary hover:bg-bg-primary' 
                      : 'bg-transparent border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {loading ? 'Sending...' : 'Resend Code'}
                </button>
              </form>
            </div>
          )}

          {}
          {message.text && (
            <div className={`mt-6 p-4 rounded-xl text-sm border flex items-start ${
              message.type === 'success' 
                ? theme === 'dark'
                  ? 'bg-green-500/10 text-green-400 border-green-500/20'
                  : 'bg-green-50 text-green-700 border-green-200'
                : theme === 'dark'
                  ? 'bg-red-500/10 text-red-400 border-red-500/20'
                  : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {message.text}
            </div>
          )}

          {}
          {showOTP && (
            <div className="mt-8 text-center">
              <button
                onClick={() => setShowOTP(false)}
                className={`text-sm font-medium transition-colors ${
                  theme === 'dark' ? 'text-text-secondary hover:text-nobel-gold' : 'text-gray-500 hover:text-blue-600'
                }`}
              >
                ← Back to {isLogin ? 'Sign In' : 'Sign Up'}
              </button>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}