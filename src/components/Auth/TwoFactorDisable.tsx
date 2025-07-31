import React, { useState } from 'react';
import { Shield, Eye, EyeOff, AlertTriangle, Lock, Smartphone } from 'lucide-react';

interface TwoFactorDisableProps {
  onComplete: () => void;
  onCancel: () => void;
}

export const TwoFactorDisable: React.FC<TwoFactorDisableProps> = ({ onComplete, onCancel }) => {
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDisable2FA = async () => {
    if (!password.trim()) {
      setError('Password is required');
      return;
    }

    if (!twoFactorCode || twoFactorCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password, token: twoFactorCode })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to disable 2FA');
      }

      onComplete();
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      setError(error instanceof Error ? error.message : 'Failed to disable 2FA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Shield className="w-6 h-6 text-red-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">
              Disable Two-Factor Authentication
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="mb-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
                <p className="text-amber-700 text-sm">
                  <strong>Warning:</strong> Disabling 2FA will make your account less secure.
                </p>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setError('');
                    setPassword(e.target.value);
                  }}
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your current password"
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

            {/* 2FA Code Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Authentication Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => {
                    setError('');
                    setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  }}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest"
                  placeholder="000000"
                  maxLength={6}
                  disabled={loading}
                />
                <Smartphone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={onCancel}
              className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={handleDisable2FA}
              disabled={loading || !password.trim() || twoFactorCode.length !== 6}
              className="flex-1 bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
            >
              {loading ? 'Disabling...' : 'Disable 2FA'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
