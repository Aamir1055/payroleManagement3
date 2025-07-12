import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { TwoFactorSetup } from '../components/Auth/TwoFactorSetup';
import { User, Shield, Key, Check, X, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UserProfile {
  id: number;
  username: string;
  role: string;
  employee_id?: string;
  two_factor_enabled: boolean;
  created_at: string;
}

export const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [show2FASetup, setShow2FASetup] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch profile');
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handle2FAComplete = () => {
    setShow2FASetup(false);
    fetchProfile(); // Refresh profile to show updated 2FA status
  };

  const getRoleBadge = (role: string) => {
    const styles = {
      admin: 'bg-purple-100 text-purple-800',
      hr: 'bg-blue-100 text-blue-800',
      floor_manager: 'bg-green-100 text-green-800',
      employee: 'bg-gray-100 text-gray-800'
    };

    const labels = {
      admin: 'Administrator',
      hr: 'Human Resources',
      floor_manager: 'Floor Manager',
      employee: 'Employee'
    };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${styles[role as keyof typeof styles] || styles.employee}`}>
        {labels[role as keyof typeof labels] || role}
      </span>
    );
  };

  if (loading) {
    return (
      <MainLayout title="User Profile" subtitle="Manage your account settings">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="User Profile" subtitle="Manage your account settings">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Profile Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Profile Information</h3>
          </div>
          
          <div className="p-6">
            <div className="flex items-center space-x-6">
              {/* Avatar */}
              <div className="h-20 w-20 bg-blue-500 text-white rounded-full flex items-center justify-center text-2xl font-bold">
                {profile?.username.charAt(0).toUpperCase()}
              </div>
              
              {/* User Info */}
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-gray-900">{profile?.username}</h2>
                <div className="mt-2 flex items-center space-x-4">
                  {getRoleBadge(profile?.role || '')}
                  {profile?.employee_id && (
                    <span className="text-sm text-gray-600">
                      Employee ID: <code className="bg-gray-100 px-2 py-1 rounded">{profile.employee_id}</code>
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Member since {new Date(profile?.created_at || '').toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Shield className="w-5 h-5 mr-2 text-blue-600" />
              Security Settings
            </h3>
          </div>
          
          <div className="p-6 space-y-6">
            
            {/* Two-Factor Authentication */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Key className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-600">
                    Add an extra layer of security to your account
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                {profile?.two_factor_enabled ? (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center text-green-600">
                      <Check className="w-4 h-4 mr-1" />
                      <span className="text-sm font-medium">Enabled</span>
                    </div>
                    <button
                      onClick={() => {/* TODO: Implement disable 2FA */}}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Disable
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center text-red-600">
                      <X className="w-4 h-4 mr-1" />
                      <span className="text-sm font-medium">Disabled</span>
                    </div>
                    <button
                      onClick={() => setShow2FASetup(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Enable 2FA
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Account Actions */}
            <div className="border-t pt-6">
              <h4 className="font-medium text-gray-900 mb-4">Account Actions</h4>
              <div className="space-y-3">
                <button className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-900">Change Password</span>
                    <span className="text-gray-400">→</span>
                  </div>
                </button>
                
                <button 
                  onClick={logout}
                  className="w-full text-left p-3 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-red-600"
                >
                  <div className="flex items-center justify-between">
                    <span>Sign Out</span>
                    <span className="text-red-400">→</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Account Permissions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Account Permissions</h3>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user?.role === 'admin' && (
                <>
                  <div className="flex items-center text-green-600">
                    <Check className="w-4 h-4 mr-2" />
                    <span className="text-sm">Full System Access</span>
                  </div>
                  <div className="flex items-center text-green-600">
                    <Check className="w-4 h-4 mr-2" />
                    <span className="text-sm">User Management</span>
                  </div>
                  <div className="flex items-center text-green-600">
                    <Check className="w-4 h-4 mr-2" />
                    <span className="text-sm">Master Data Management</span>
                  </div>
                  <div className="flex items-center text-green-600">
                    <Check className="w-4 h-4 mr-2" />
                    <span className="text-sm">Holiday Management</span>
                  </div>
                </>
              )}
              
              {user?.role === 'hr' && (
                <>
                  <div className="flex items-center text-green-600">
                    <Check className="w-4 h-4 mr-2" />
                    <span className="text-sm">Employee Management</span>
                  </div>
                  <div className="flex items-center text-green-600">
                    <Check className="w-4 h-4 mr-2" />
                    <span className="text-sm">Payroll Management</span>
                  </div>
                  <div className="flex items-center text-green-600">
                    <Check className="w-4 h-4 mr-2" />
                    <span className="text-sm">Reports Access</span>
                  </div>
                  <div className="flex items-center text-green-600">
                    <Check className="w-4 h-4 mr-2" />
                    <span className="text-sm">Holiday Management</span>
                  </div>
                  <div className="flex items-center text-gray-400">
                    <X className="w-4 h-4 mr-2" />
                    <span className="text-sm">Master Data Management</span>
                  </div>
                  <div className="flex items-center text-gray-400">
                    <X className="w-4 h-4 mr-2" />
                    <span className="text-sm">User Management</span>
                  </div>
                </>
              )}
              
              {user?.role === 'floor_manager' && (
                <>
                  <div className="flex items-center text-green-600">
                    <Check className="w-4 h-4 mr-2" />
                    <span className="text-sm">Employee Management</span>
                  </div>
                  <div className="flex items-center text-green-600">
                    <Check className="w-4 h-4 mr-2" />
                    <span className="text-sm">Payroll Management</span>
                  </div>
                  <div className="flex items-center text-green-600">
                    <Check className="w-4 h-4 mr-2" />
                    <span className="text-sm">Reports Access</span>
                  </div>
                  <div className="flex items-center text-gray-400">
                    <X className="w-4 h-4 mr-2" />
                    <span className="text-sm">Master Data Management</span>
                  </div>
                </>
              )}
              
              {user?.role === 'employee' && (
                <>
                  <div className="flex items-center text-green-600">
                    <Check className="w-4 h-4 mr-2" />
                    <span className="text-sm">View Own Data</span>
                  </div>
                  <div className="flex items-center text-gray-400">
                    <X className="w-4 h-4 mr-2" />
                    <span className="text-sm">Employee Management</span>
                  </div>
                  <div className="flex items-center text-gray-400">
                    <X className="w-4 h-4 mr-2" />
                    <span className="text-sm">Payroll Management</span>
                  </div>
                  <div className="flex items-center text-gray-400">
                    <X className="w-4 h-4 mr-2" />
                    <span className="text-sm">Administrative Access</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2FA Setup Modal */}
      {show2FASetup && (
        <TwoFactorSetup 
          onComplete={handle2FAComplete}
          onCancel={() => setShow2FASetup(false)}
        />
      )}
    </MainLayout>
  );
};