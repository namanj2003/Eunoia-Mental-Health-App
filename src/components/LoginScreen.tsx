import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Brain, Mail, Lock, Eye, EyeOff, User, Loader2, ArrowLeft } from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

type ViewMode = 'login' | 'signup' | 'forgot-password' | 'verify-otp' | 'reset-password';

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Helper function for email validation
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Clear form when switching views
  const switchView = (mode: ViewMode) => {
    setViewMode(mode);
    setName('');
    setEmail('');
    setPassword('');
    setOtp('');
    setNewPassword('');
    setError('');
    setSuccess('');
    setShowPassword(false);
    setShowNewPassword(false);
  };

const handleSubmit = async (e?: React.FormEvent) => {
  if (e) e.preventDefault();
  
  setError('');
  setSuccess('');

  // Check if all required fields are empty based on view mode
  if (viewMode === 'login') {
    if (!email && !password) {
      setError('Please fill in all fields');
      return;
    }
  }

  if (viewMode === 'signup') {
    if (!name && !email && !password) {
      setError('Please fill in all fields');
      return;
    }
  }

  if (viewMode === 'forgot-password') {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
  }

  if (viewMode === 'verify-otp') {
    if (!otp) {
      setError('Please enter the 6-digit OTP');
      return;
    }
  }

  if (viewMode === 'reset-password') {
    if (!newPassword) {
      setError('Please enter your new password');
      return;
    }
  }

  // Individual field validation for login and signup
  if (viewMode === 'login' || viewMode === 'signup') {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (!password) {
      setError('Please enter your password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (viewMode === 'signup' && !name) {
      setError('Please enter your name');
      return;
    }
  }

  // Email validation for forgot-password
  if (viewMode === 'forgot-password') {
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    setLoading(true);
    try {
      const { authService } = await import('../services/api.service');
      await authService.forgotPassword(email);
      setSuccess('OTP sent to your email! Please check your inbox.');
      setViewMode('verify-otp');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
    return;
  }

  // OTP verification flow
  if (viewMode === 'verify-otp') {
    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }
    
    setLoading(true);
    try {
      const { authService } = await import('../services/api.service');
      await authService.verifyOTP(email, otp);
      setSuccess('OTP verified! Please enter your new password.');
      setViewMode('reset-password');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
    return;
  }

  // Reset password flow
  if (viewMode === 'reset-password') {
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    try {
      const { authService } = await import('../services/api.service');
      await authService.resetPasswordWithOTP(email, otp, newPassword);
      setSuccess('Password reset successful! Logging you in...');
      setTimeout(() => onLoginSuccess(), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
    return;
  }
  
  setLoading(true);
  
  try {
    const { authService } = await import('../services/api.service');
    
    if (viewMode === 'login') {
      console.log('Attempting login...', { email });
      const response = await authService.login(email, password);
      console.log('Login response:', response);
      
      // Validate the response before calling success callback
      if (response.success && response.data && response.data.token) {
        console.log('Login successful - token received');
        onLoginSuccess();
      } else {
        console.error('Login failed - no token in response');
        setError('Login failed. Please try again.');
      }
    } else if (viewMode === 'signup') {
      console.log('Attempting registration...', { name, email });
      const response = await authService.register(name, email, password);
      console.log('Registration response:', response);
      
      // Validate the response
      if (response.success) {
        console.log('Registration successful');
        // After successful registration, show success message and switch to login
        setSuccess('Account created successfully! Please log in.');
        setName('');
        setEmail('');
        setPassword('');
        setViewMode('login');
      } else {
        setError('Registration failed. Please try again.');
      }
    }
  } catch (err: any) {
    console.error('Authentication error:', err);
    
    let errorMessage = 'Authentication failed';
    
    if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
      errorMessage = 'Cannot connect to server. Please check if the backend is running.';
    } else if (err.response?.data?.message) {
      // Use the specific error message from backend
      errorMessage = err.response.data.message;
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    setError(errorMessage);
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f093fb] flex flex-col items-center justify-center p-4 max-w-md mx-auto overflow-y-auto" style={{ 
      paddingTop: 'max(1rem, env(safe-area-inset-top))',
      paddingBottom: 'max(1rem, env(safe-area-inset-bottom))'
    }}>
      <div className="w-full max-w-sm space-y-4 py-4">
        {/* Logo and Brand */}
        <div className="text-center space-y-3">
          <div className="relative">
            <div className="w-20 h-20 mx-auto bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center shadow-lg">
              <div className="text-4xl font-bold text-white flex items-center">
                <Brain className="mr-1" size={28} />
                ε
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-white">Eunoia</h1>
            <p className="text-white/80 text-sm">Your mindful companion</p>
          </div>
        </div>

        {/* Login/Register/Forgot Password Form */}
        <Card className="p-5 bg-white/10 backdrop-blur-lg border-white/20 shadow-xl">
          <CardContent className="p-0 space-y-4">
            {/* Back button for forgot password and OTP views */}
            {(viewMode === 'forgot-password' || viewMode === 'verify-otp' || viewMode === 'reset-password') && (
              <button
                onClick={() => switchView('login')}
                className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                disabled={loading}
              >
                <ArrowLeft size={20} />
                <span>Back to Login</span>
              </button>
            )}

            {/* Title based on view mode */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-white">
                {viewMode === 'login' && 'Welcome Back'}
                {viewMode === 'signup' && 'Create Account'}
                {viewMode === 'forgot-password' && 'Reset Password'}
                {viewMode === 'verify-otp' && 'Verify OTP'}
                {viewMode === 'reset-password' && 'New Password'}
              </h2>
              <p className="text-white/70 text-sm mt-1.5">
                {viewMode === 'login' && 'Continue your journey to wellness'}
                {viewMode === 'signup' && 'Begin your mindful journey'}
                {viewMode === 'forgot-password' && 'Enter your email to receive an OTP'}
                {viewMode === 'verify-otp' && 'Enter the 6-digit code sent to your email'}
                {viewMode === 'reset-password' && 'Choose a strong new password'}
              </p>
            </div>

            {/* Success Message */}
            {success && (
              <div className="p-2.5 bg-green-500/20 border border-green-500/30 rounded-xl">
                <p className="text-white text-xs text-center">{success}</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-2.5 bg-red-500/20 border border-red-500/30 rounded-xl">
                <p className="text-white text-xs text-center">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {/* Name Field (Sign Up Only) */}
              {viewMode === 'signup' && (
                <div className="space-y-2">
                  <label className="text-white/90 text-sm font-medium">Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 text-white/60" size={20} />
                    <Input
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-11 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-2xl h-12"
                      disabled={loading}
                      autoComplete="name"
                    />
                  </div>
                </div>
              )}

              {/* Email Field - Hidden in verify-otp and reset-password views */}
              {viewMode !== 'verify-otp' && viewMode !== 'reset-password' && (
                <div className="space-y-2">
                  <label className="text-white/90 text-sm font-medium">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 text-white/60" size={20} />
                    <Input
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                      className="pl-11 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-2xl h-12"
                      disabled={loading}
                      autoComplete={viewMode === 'login' ? 'email' : 'off'}
                    />
                  </div>
                </div>
              )}

              {/* OTP Field - Only shown in verify-otp view */}
              {viewMode === 'verify-otp' && (
                <div className="space-y-2">
                  <label className="text-white/90 text-sm font-medium">Verification Code</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 text-white/60" size={20} />
                    <Input
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={otp}
                      onChange={(e) => {
                        // Only allow numbers and limit to 6 digits
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setOtp(value);
                      }}
                      onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                      className="pl-11 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-2xl h-12 text-center text-xl tracking-widest"
                      disabled={loading}
                      maxLength={6}
                      autoComplete="off"
                    />
                  </div>
                  <p className="text-white/50 text-xs text-center">
                    Check your email for the 6-digit verification code
                  </p>
                </div>
              )}
              
              {/* Password Field - Shown in login and signup views */}
              {(viewMode === 'login' || viewMode === 'signup') && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-white/90 text-sm font-medium">Password</label>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 text-white/60" size={20} />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                      className="pl-11 pr-11 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-2xl h-12"
                      disabled={loading}
                      autoComplete={viewMode === 'login' ? 'current-password' : 'new-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-white/60 hover:text-white/80"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {viewMode === 'signup' && (
                    <p className="text-white/50 text-xs">
                      Must be at least 6 characters
                    </p>
                  )}
                  {viewMode === 'login' && (
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => switchView('forgot-password')}
                        className="text-white/60 hover:text-white text-xs transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* New Password Field - Only shown in reset-password view */}
              {viewMode === 'reset-password' && (
                <div className="space-y-2">
                  <label className="text-white/90 text-sm font-medium">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 text-white/60" size={20} />
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
                      className="pl-11 pr-11 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-2xl h-12"
                      disabled={loading}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-white/60 hover:text-white/80"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <p className="text-white/50 text-xs">
                    Must be at least 6 characters
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-[#667eea] hover:bg-white/90 rounded-2xl h-12 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="animate-spin" size={20} />
                    {viewMode === 'login' && 'Logging in...'}
                    {viewMode === 'signup' && 'Creating account...'}
                    {viewMode === 'forgot-password' && 'Sending OTP...'}
                    {viewMode === 'verify-otp' && 'Verifying...'}
                    {viewMode === 'reset-password' && 'Resetting password...'}
                  </span>
                ) : (
                  <>
                    {viewMode === 'login' && 'Begin Your Journey'}
                    {viewMode === 'signup' && 'Create Account'}
                    {viewMode === 'forgot-password' && 'Send OTP'}
                    {viewMode === 'verify-otp' && 'Verify Code'}
                    {viewMode === 'reset-password' && 'Reset Password'}
                  </>
                )}
              </Button>

              {/* Toggle between login and signup - Hidden during password reset flow */}
              {(viewMode === 'login' || viewMode === 'signup') && (
                <div className="text-center pt-1">
                  <p className="text-white/70 text-xs">
                    {viewMode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                    <button
                      type="button"
                      onClick={() => switchView(viewMode === 'login' ? 'signup' : 'login')}
                      className="text-white font-semibold hover:underline"
                      disabled={loading}
                    >
                      {viewMode === 'login' ? 'Sign Up' : 'Login'}
                    </button>
                  </p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-white/50 text-xs">
            Your safe space for mental wellness and growth
          </p>
        </div>
      </div>
    </div>
  );
};
