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
  logout: () => void;
  loading: boolean;
  error: string | null;
  hasPermission: (permission: string) => boolean;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
  twoFactorCode?: string;
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
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
        return false;
      }

      // Store token and user data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      setUser(data.user);
      setError(null);
      return true;

    } catch (error) {
      console.error('Login error:', error);
      setError('Network error. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setError(null);
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
    logout,
    loading,
    error,
    hasPermission,
    isAuthenticated: !!user,
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