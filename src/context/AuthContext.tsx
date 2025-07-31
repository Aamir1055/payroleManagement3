import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'hr' | 'floor_manager' | 'employee';
  employeeId?: string;
  twoFactorEnabled: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  loginWith2FA: (twoFactorCode: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  error: string | null;
  hasPermission: (permission: string) => boolean;
  isAuthenticated: boolean;
  requiresTwoFactor: boolean;
  resetTwoFactor: () => void;
}

export interface LoginCredentials {
  username: string;
  password: string;
  twoFactorCode?: string;
}

interface LoginResponse {
  token?: string;
  user?: User;
  requiresTwoFactor?: boolean;
  message?: string;
  error?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [tempCredentials, setTempCredentials] = useState<{username: string, password: string} | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data: LoginResponse = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return false;
      }

      // Check if 2FA is required
      if (data.requiresTwoFactor) {
        setRequiresTwoFactor(true);
        setTempCredentials({ username: credentials.username, password: credentials.password });
        setError('Please enter your 2FA code to continue.');
        return false; // Don't complete login yet
      }

      // Complete login - store token and user data
      if (data.token && data.user) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setError(null);
        setRequiresTwoFactor(false);
        setTempCredentials(null);
        return true;
      }

      setError('Invalid login response');
      return false;

    } catch (error) {
      console.error('Login error:', error);
      setError('Network error. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loginWith2FA = async (twoFactorCode: string): Promise<boolean> => {
    if (!tempCredentials) {
      setError('No pending login session');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: tempCredentials.username,
          password: tempCredentials.password,
          twoFactorCode
        }),
      });

      const data: LoginResponse = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return false;
      }

      // Complete login - store token and user data
      if (data.token && data.user) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
        setError(null);
        setRequiresTwoFactor(false);
        setTempCredentials(null);
        return true;
      }

      setError('Invalid login response');
      return false;

    } catch (error) {
      console.error('2FA login error:', error);
      setError('Network error. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetTwoFactor = () => {
    setRequiresTwoFactor(false);
    setTempCredentials(null);
    setError(null);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setError(null);
    setRequiresTwoFactor(false);
    setTempCredentials(null);
  };

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    const permissions: Record<User['role'], string[]> = {
      admin: [
        'view_dashboard',
        'manage_employees', 
        'manage_payroll',
        'manage_offices',
        'manage_positions',
        'manage_holidays',
        'view_reports',
        'manage_users',
        'system_admin'
      ],
      hr: [
        'view_dashboard',
        'manage_employees',
        'manage_payroll', 
        'view_reports',
        'manage_holidays',
        'hr_operations'
      ],
      floor_manager: [
        'view_dashboard',
        'manage_employees',
        'manage_payroll', 
        'view_reports'
      ],
      employee: [
        'view_own_data'
      ]
    };

    const userRole = user.role as User['role'];
    return permissions[userRole]?.includes(permission) || false;
  };

  const value: AuthContextType = {
    user,
    login,
    loginWith2FA,
    logout,
    loading,
    error,
    hasPermission,
    isAuthenticated: !!user,
    requiresTwoFactor,
    resetTwoFactor,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Higher-order component for role-based route protection
export const withRoleProtection = <P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission: string
) => {
  return (props: P) => {
    const { hasPermission } = useAuth();

    if (!hasPermission(requiredPermission)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
            <p className="text-gray-600 mb-4">
              You don't have permission to access this page.
            </p>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
};
