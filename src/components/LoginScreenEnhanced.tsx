import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Brain, Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { validateEmail, validatePassword } from '../utils/validation';

interface LoginScreenEnhancedProps {
  onLoginSuccess: () => void;
}

export const LoginScreenEnhanced: React.FC<LoginScreenEnhancedProps> = ({ onLoginSuccess }) => {
  const { login, isLoading, error, setError } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    setEmailError('');
    setError(null);
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setPasswordError('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setPasswordError('');
    setError(null);

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.isValid) {
      setEmailError(emailValidation.error || '');
      return;
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      setPasswordError(passwordValidation.error || '');
      return;
    }

    // Attempt login
    const success = await login(email, password);
    if (success) {
      onLoginSuccess();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#667eea] via-[#764ba2] to-[#f093fb] flex flex-col items-center justify-center p-6 max-w-md mx-auto">
      <div className="w-full max-w-sm space-y-8">
        {/* Logo and Brand */}
        <div className="text-center space-y-6">
          <div className="relative">
            <div className="w-24 h-24 mx-auto bg-white/20 backdrop-blur-lg rounded-3xl flex items-center justify-center shadow-lg">
              <div className="text-4xl font-bold text-white flex items-center">
                <Brain className="mr-2" size={32} />
                ε
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-white">Eunoia</h1>
            <p className="text-white/80 text-lg">Your mindful companion</p>
            <p className="text-white/60 text-sm">Beautiful thinking, beautiful mind</p>
          </div>
        </div>

        {/* Login Form */}
        <Card className="p-6 bg-white/10 backdrop-blur-lg border-white/20 shadow-xl">
          <CardContent className="p-0 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div className="space-y-2">
                  <label className="text-white/90 text-sm font-medium">Name</label>
                  <div className="relative">
                    <Input
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-4 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-2xl h-12"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-white/90 text-sm font-medium">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-white/60" size={20} />
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={handleEmailChange}
                    disabled={isLoading}
                    className={`pl-11 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-2xl h-12 ${
                      emailError ? 'border-red-400' : ''
                    }`}
                  />
                </div>
                {emailError && (
                  <div className="flex items-center gap-2 text-red-200 text-sm">
                    <AlertCircle size={14} />
                    <span>{emailError}</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-white/90 text-sm font-medium">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-white/60" size={20} />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={handlePasswordChange}
                    disabled={isLoading}
                    className={`pl-11 pr-11 bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-2xl h-12 ${
                      passwordError ? 'border-red-400' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-white/60 hover:text-white/80"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {passwordError && (
                  <div className="flex items-center gap-2 text-red-200 text-sm">
                    <AlertCircle size={14} />
                    <span>{passwordError}</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-400/30 rounded-xl text-red-100 text-sm">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-white text-[#667eea] hover:bg-white/90 rounded-2xl h-12 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 animate-spin" size={20} />
                    {isSignUp ? 'Creating Account...' : 'Signing In...'}
                  </>
                ) : (
                  <>{isSignUp ? 'Create Account' : 'Begin Your Journey'}</>
                )}
              </Button>
            </form>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-white/70 text-sm hover:text-white/90"
                disabled={isLoading}
              >
                {isSignUp ? (
                  <>
                    Already have an account? <span className="font-semibold">Sign in</span>
                  </>
                ) : (
                  <>
                    Don't have an account? <span className="font-semibold">Sign up</span>
                  </>
                )}
              </button>
            </div>

            <div className="text-center">
              <p className="text-white/50 text-xs">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Demo credentials hint */}
        <div className="text-center">
          <p className="text-white/60 text-xs">
            💡 Demo: Use any valid email and password (min 6 characters)
          </p>
        </div>
      </div>
    </div>
  );
};
