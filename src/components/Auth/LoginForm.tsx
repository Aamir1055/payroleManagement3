import React, { useState } from 'react';
import { Eye, EyeOff, Shield, User, Lock, Smartphone } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface LoginFormProps {
  onLogin: (credentials: LoginCredentials) => void;
  loading?: boolean;
  error?: string;
}

interface LoginCredentials {
  username: string;
  password: string;
  twoFactorCode?: string;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onLogin, loading, error }) => {
  const { loginWith2FA, loading: authLoading, error: authError, requiresTwoFactor, resetTwoFactor } = useAuth();
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
    twoFactorCode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (requiresTwoFactor) {
      loginWith2FA(credentials.twoFactorCode || '');
    } else {
      onLogin(credentials);
    }
  };

  const handleInputChange = (field: keyof LoginCredentials, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">

        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome Back</h1>
          <p className="text-gray-600 mt-2">Sign in to your payroll account</p>
        </div>

        {/* Error Message */}
        {(authError || error) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-red-600 mr-2">⚠️</div>
              <div className="text-red-700 text-sm">{authError || error}</div>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Username Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <div className="relative">
              <input
                type="text"
                value={credentials.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your username"
                required
                disabled={loading}
              />
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={credentials.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="Enter your password"
                required
                disabled={loading}
              />
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Two Factor Authentication Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="twoFactor"
                checked={showTwoFactor}
                onChange={(e) => setShowTwoFactor(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                disabled={loading}
              />
              <label htmlFor="twoFactor" className="ml-2 text-sm text-gray-600">
                Use Two-Factor Authentication
              </label>
            </div>
          </div>

          {/* Two Factor Code Field */}
          {showTwoFactor && (
            <div className="animate-fadeIn">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Authentication Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={credentials.twoFactorCode}
                  onChange={(e) =>
                    handleInputChange('twoFactorCode', e.target.value.replace(/\D/g, '').slice(0, 6))
                  }
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors text-center text-lg tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  disabled={loading}
                />
                <Smartphone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>
          )}

          {/* Login Button */}
          <button
            type="submit"
            disabled={
              loading ||
              !credentials.username ||
              !credentials.password ||
              (showTwoFactor && (!credentials.twoFactorCode || credentials.twoFactorCode.length !== 6))
            }
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Signing in...
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
