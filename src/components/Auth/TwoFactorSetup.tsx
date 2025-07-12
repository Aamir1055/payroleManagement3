import React, { useState, useEffect } from 'react';
import { Shield, Smartphone, Check, Copy, Download, AlertTriangle } from 'lucide-react';

interface TwoFactorSetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

export const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<'loading' | 'setup' | 'verify' | 'complete'>('loading');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    generateQRCode();
  }, []);

  const generateQRCode = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/2fa/setup', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate QR code');
      }

      setQrCode(data.qrCode);
      setSecret(data.secret);
      setBackupCodes(data.backupCodes || []);
      setStep('setup');
    } catch (error) {
      console.error('Error generating QR code:', error);
      setError(error instanceof Error ? error.message : 'Failed to setup 2FA');
    }
  };

  const verifyAndEnable2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token: verificationCode })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Verification failed');
      }

      setStep('complete');
    } catch (error) {
      console.error('Error verifying 2FA:', error);
      setError(error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    alert('Secret copied to clipboard!');
  };

  const downloadBackupCodes = () => {
    const content = `Payroll System - 2FA Backup Codes\n\nGenerated: ${new Date().toLocaleString()}\n\n${backupCodes.join('\n')}\n\nKeep these codes safe! You can use them to access your account if you lose your authenticator device.`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'payroll-2fa-backup-codes.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (step === 'loading') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Generating QR code...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Shield className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">
              Setup Two-Factor Authentication
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
          
          {/* Setup Step */}
          {step === 'setup' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Step 1: Scan QR Code
                </h3>
                <p className="text-gray-600 mb-6">
                  Use Google Authenticator or similar app to scan this QR code
                </p>
                
                {/* QR Code */}
                <div className="bg-white p-4 rounded-lg border-2 border-gray-200 inline-block mb-6">
                  <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                </div>
              </div>

              {/* Manual Entry */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Can't scan? Enter manually:</h4>
                <div className="flex items-center justify-between bg-white rounded border p-3">
                  <code className="text-sm font-mono text-gray-800 break-all">{secret}</code>
                  <button
                    onClick={copySecret}
                    className="ml-2 p-1 text-blue-600 hover:text-blue-800"
                    title="Copy secret"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">📱 Instructions:</h4>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Download Google Authenticator from your app store</li>
                  <li>Open the app and tap "+" to add an account</li>
                  <li>Choose "Scan QR code" and scan the code above</li>
                  <li>Or choose "Enter setup key" and paste the secret</li>
                  <li>Your app will generate a 6-digit code</li>
                </ol>
              </div>

              {/* Backup Codes */}
              {backupCodes.length > 0 && (
                <div className="bg-amber-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-amber-900">🔑 Backup Codes</h4>
                    <button
                      onClick={downloadBackupCodes}
                      className="text-amber-700 hover:text-amber-900 text-sm flex items-center"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </button>
                  </div>
                  <p className="text-sm text-amber-800 mb-3">
                    Save these codes! Use them if you lose your phone.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {backupCodes.map((code, index) => (
                      <code key={index} className="text-xs bg-white p-2 rounded text-center">
                        {code}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setStep('verify')}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                I've Added the Account - Next Step
              </button>
            </div>
          )}

          {/* Verify Step */}
          {step === 'verify' && (
            <div className="space-y-6">
              <div className="text-center">
                <Smartphone className="w-16 h-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Step 2: Verify Setup
                </h3>
                <p className="text-gray-600">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
                    <p className="text-red-700 text-sm">{error}</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => {
                    setError('');
                    setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                  }}
                  className="w-full text-center text-2xl tracking-widest border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500"
                  placeholder="000000"
                  maxLength={6}
                  disabled={loading}
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep('setup')}
                  className="flex-1 border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  onClick={verifyAndEnable2FA}
                  disabled={loading || verificationCode.length !== 6}
                  className="flex-1 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
                >
                  {loading ? 'Verifying...' : 'Enable 2FA'}
                </button>
              </div>
            </div>
          )}

          {/* Complete Step */}
          {step === 'complete' && (
            <div className="space-y-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  🎉 Two-Factor Authentication Enabled!
                </h3>
                <p className="text-gray-600">
                  Your account is now protected with 2FA. You'll need your authenticator app to log in.
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">✅ What's Next:</h4>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Keep your authenticator app safe</li>
                  <li>• Save your backup codes in a secure location</li>
                  <li>• Test logging in with 2FA before closing this window</li>
                </ul>
              </div>

              <button
                onClick={onComplete}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Complete Setup
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};