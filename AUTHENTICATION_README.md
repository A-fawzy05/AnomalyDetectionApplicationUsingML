# P2P Insight - Authentication System

## Overview

This document describes the complete authentication system implemented for the P2P Insight platform. The system supports both email/password authentication with OTP verification and Google OAuth login.

## Features

- **Email/Password Authentication**: Traditional login with email verification
- **OTP Verification**: 6-digit code sent via email for account verification
- **Google OAuth**: Single sign-on with Google accounts
- **JWT Tokens**: Secure token-based authentication
- **Role-Based Access**: Admin, Analyst, and Viewer roles
- **Protected Routes**: Frontend route protection with automatic redirects
- **Frosted Glass UI**: Modern, responsive authentication interface

## Architecture

### Backend (Node.js)

The backend authentication follows the Model-View-Controller (MVC) pattern:

#### Models
- **User Model** (`Node-js/models/User.js`): MongoDB schema with fields for:
  - Basic info: fullName, email, password
  - Verification: isEmailVerified, emailVerificationOTP, emailVerificationExpires
  - OAuth: googleId, profilePicture
  - Roles: admin, analyst, viewer
  - Metadata: lastLogin, isActive, timestamps

#### Controllers
- **Auth Controller** (`Node-js/controllers/auth.controller.js`): Handles all authentication logic:
  - `signup()`: User registration with OTP generation
  - `login()`: Email/password authentication
  - `verifyEmail()`: OTP verification
  - `resendOTP()`: Resend verification code
  - `googleAuth()`: Google OAuth callback
  - `getGoogleAuthUrl()`: Generate Google auth URL
  - `getProfile()`: Get current user profile

#### Services
- **Email Service** (`Node-js/services/email.service.js`): OTP email sending
- **Google Service** (`Node-js/services/google.service.js`): Google OAuth integration
- **JWT Service** (`Node-js/services/jwt.service.js`): Token generation/verification

#### Middleware
- **Auth Middleware** (`Node-js/middleware/auth.middleware.js`): 
  - `authenticate()`: JWT verification
  - `authorize()`: Role-based access control

#### Routes
- **Auth Routes** (`Node-js/routes/auth.routes.js`): API endpoints mapping

### Frontend (Next.js)

#### Pages
- **Auth Page** (`Frontend/app/auth/page.tsx`): Login/signup interface
- **Auth Callback** (`Frontend/app/auth/callback/page.tsx`): Google OAuth callback

#### Components
- **ProtectedRoute** (`Frontend/components/ProtectedRoute.tsx`): Route protection wrapper

#### Context & Services
- **Auth Context** (`Frontend/contexts/AuthContext.tsx`): Global authentication state
- **Auth Service** (`Frontend/services/auth.service.ts`): API integration

## Setup Instructions

### Backend Setup

1. **Install Dependencies**:
   ```bash
   cd Node-js
   npm install
   ```

2. **Environment Configuration**:
   Copy `.env.example` to `.env` and configure:
   ```env
   # Server Configuration
   PORT=3001
   NODE_ENV=development
   
   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/p2p-process-mining
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-in-production
   JWT_EXPIRE=7d
   
   # Email Configuration (Gmail)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=noreply@p2p-insight.com
   
   # Google OAuth Configuration
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
   
   # Frontend Configuration
   FRONTEND_URL=http://localhost:3000
   ```

3. **Google OAuth Setup**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add authorized redirect URI: `http://localhost:3001/auth/google/callback`
   - Copy Client ID and Secret to `.env`

4. **Email Setup**:
   - For Gmail: Enable 2FA and generate App Password
   - Or configure SMTP settings for your email provider

5. **Start MongoDB**:
   ```bash
   mongod
   ```

6. **Start Backend**:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Install Dependencies**:
   ```bash
   cd Frontend
   npm install
   ```

2. **Start Frontend**:
   ```bash
   npm run dev
   ```

## API Endpoints

### Public Endpoints

| Method | Endpoint | Description |
|--------|-----------|-------------|
| POST | `/api/auth/signup` | User registration |
| POST | `/api/auth/login` | Email/password login |
| POST | `/api/auth/verify-email` | OTP verification |
| POST | `/api/auth/resend-otp` | Resend verification code |
| GET | `/api/auth/google/url` | Get Google OAuth URL |
| GET | `/api/auth/google` | Google OAuth callback |

### Protected Endpoints

| Method | Endpoint | Description |
|--------|-----------|-------------|
| GET | `/api/auth/profile` | Get current user profile |

## Authentication Flow

### Email/Password Flow

1. **Signup**:
   - User submits full name, email, password
   - System creates user with `isEmailVerified: false`
   - Generates 6-digit OTP (expires in 10 minutes)
   - Sends verification email
   - Returns success message

2. **Email Verification**:
   - User enters OTP from email
   - System validates OTP and expiration
   - Sets `isEmailVerified: true`
   - Returns JWT token and user data

3. **Login**:
   - User submits email and password
   - System validates credentials
   - Updates `lastLogin` timestamp
   - Returns JWT token and user data

### Google OAuth Flow

1. **Initiate OAuth**:
   - Frontend calls `/api/auth/google/url`
   - User is redirected to Google consent screen

2. **Google Callback**:
   - Google redirects to `/api/auth/google?code=...`
   - Backend exchanges code for user info
   - Creates or updates user record
   - Sets `isEmailVerified: true` (Google verified)
   - Redirects to frontend with token

## Frontend Integration

### Using Auth Context

```tsx
import { useAuth } from '../contexts/AuthContext';

const MyComponent = () => {
  const { user, token, login, logout, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please login</div>;
  
  return <div>Welcome, {user?.fullName}!</div>;
};
```

### Protecting Routes

```tsx
import ProtectedRoute from '../components/ProtectedRoute';

const ProtectedPage = () => {
  return (
    <ProtectedRoute>
      <div>This page requires authentication</div>
    </ProtectedRoute>
  );
};

// With role requirements
const AdminPage = () => {
  return (
    <ProtectedRoute requiredRole={['admin']}>
      <div>Admin only content</div>
    </ProtectedRoute>
  );
};
```

### API Calls

```tsx
import authService from '../services/auth.service';

// Login
const result = await authService.login({
  email: 'user@example.com',
  password: 'password123'
});

// Signup
const result = await authService.signup({
  fullName: 'John Doe',
  email: 'john@example.com',
  password: 'password123',
  agreeToTerms: true
});

// Google OAuth
const { data } = await authService.getGoogleAuthUrl();
window.location.href = data.authUrl;
```

## Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Security**: Secret key with expiration
- **OTP Expiration**: 10-minute validity
- **Rate Limiting**: Ready for implementation
- **CORS Protection**: Configured for frontend domain
- **Input Validation**: Joi schema validation
- **Role-Based Access**: Middleware authorization

## Error Handling

The system provides comprehensive error handling:

- **Validation Errors**: 400 with detailed messages
- **Authentication Errors**: 401 for invalid credentials
- **Authorization Errors**: 403 for insufficient permissions
- **Not Found Errors**: 404 for missing resources
- **Server Errors**: 500 with generic message

## Testing

To test the complete authentication flow:

1. **Start Services**:
   ```bash
   # Terminal 1 - Backend
   cd Node-js && npm run dev
   
   # Terminal 2 - Frontend
   cd Frontend && npm run dev
   ```

2. **Test Email Signup**:
   - Visit `http://localhost:3000/auth`
   - Click "Sign Up" tab
   - Fill form and submit
   - Check email for OTP
   - Enter OTP to verify

3. **Test Login**:
   - Use verified credentials
   - Should redirect to dashboard

4. **Test Google OAuth**:
   - Click "Continue with Google"
   - Complete Google flow
   - Should redirect with token

## Troubleshooting

### Common Issues

1. **Email Not Received**:
   - Check SMTP configuration
   - Verify email/password in `.env`
   - Check spam folder

2. **Google OAuth Fails**:
   - Verify redirect URI in Google Console
   - Check Client ID/Secret in `.env`
   - Ensure API is enabled

3. **MongoDB Connection**:
   - Ensure MongoDB is running
   - Check connection string in `.env`
   - Verify database permissions

4. **CORS Errors**:
   - Check `FRONTEND_URL` in `.env`
   - Verify CORS configuration

### Logs

Check console logs for detailed error information:
- Backend: Node.js console
- Frontend: Browser developer console

## Future Enhancements

- Password reset functionality
- Two-factor authentication (2FA)
- Session management
- Rate limiting implementation
- Audit logging
- Social login providers (GitHub, LinkedIn)
- Multi-factor authentication options
