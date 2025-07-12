import React, { useState } from 'react';
import { Eye, EyeOff, Shield, User, Lock, Smartphone } from 'lucide-react';

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
  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: '',
    password: '',
    twoFactorCode: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showTwoFactor, setShowTwoFactor] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(credentials);
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
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-red-600 mr-2">⚠️</div>
              <div className="text-red-700 text-sm">{error}</div>
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
                  onChange={(e) => handleInputChange('twoFactorCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
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
            disabled={loading || !credentials.username || !credentials.password || (showTwoFactor && (!credentials.twoFactorCode || credentials.twoFactorCode.length !== 6))}
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

        {/* Help Text */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p className="font-medium text-gray-800 mb-3">Available User Accounts:</p>
          
          <div className="grid grid-cols-1 gap-3">
            {/* Admin Account */}
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <p className="font-semibold text-purple-800">👤 Administrator</p>
                  <p className="text-xs text-purple-600">Username: <strong>admin</strong> | Password: <strong>admin123</strong></p>
                </div>
                <button
                  onClick={() => {
                    setCredentials({
                      username: 'admin',
                      password: 'admin123',
                      twoFactorCode: ''
                    });
                  }}
                  className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700"
                >
                  Use
                </button>
              </div>
              <div className="mt-1 text-xs text-purple-600">
                ✅ Full system access • Manage all data • User management
              </div>
            </div>

            {/* HR Account */}
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <p className="font-semibold text-blue-800">👨‍💼 Human Resources</p>
                  <p className="text-xs text-blue-600">Username: <strong>hr</strong> | Password: <strong>hr123</strong></p>
                </div>
                <button
                  onClick={() => {
                    setCredentials({
                      username: 'hr',
                      password: 'hr123',
                      twoFactorCode: ''
                    });
                  }}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  Use
                </button>
              </div>
              <div className="mt-1 text-xs text-blue-600">
                ✅ Employee management • Payroll • Reports • Holiday management
              </div>
            </div>

            {/* Floor Manager Account */}
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <p className="font-semibold text-green-800">👨‍💼 Floor Manager</p>
                  <p className="text-xs text-green-600">Username: <strong>floormanager</strong> | Password: <strong>manager123</strong></p>
                </div>
                <button
                  onClick={() => {
                    setCredentials({
                      username: 'floormanager',
                      password: 'manager123',
                      twoFactorCode: ''
                    });
                  }}
                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                >
                  Use
                </button>
              </div>
              <div className="mt-1 text-xs text-green-600">
                ✅ Employee management • Payroll management • Reports access
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-amber-800 font-medium text-xs">🔐 Security Features Available:</p>
            <div className="text-xs mt-1 space-y-1 text-amber-700">
              <p>• Two-Factor Authentication (Google Authenticator)</p>
              <p>• Role-based access control</p>
              <p>• JWT token security with 24-hour expiration</p>
              <p>• Password encryption with bcrypt</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};