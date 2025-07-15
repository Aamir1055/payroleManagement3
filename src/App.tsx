import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, LoginCredentials } from './context/AuthContext';
import { LoginForm } from './components/Auth/LoginForm';

// Page imports
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { Payroll } from './pages/Payroll';
import { Reports } from './pages/Reports';
import { Holidays } from './pages/Holidays';
import { Profile } from './pages/Profile';
import AttendanceUpload from './pages/AttendanceUpload';

// Protected Route Component
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  permission?: string;
}> = ({ children, permission }) => {
  const { isAuthenticated, hasPermission } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (permission && !hasPermission(permission)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">
            You don't have permission to access this page.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

// Login Form with Authentication Integration
const AuthenticatedLoginForm: React.FC = () => {
  const { login, loading, error } = useAuth();

  const handleLogin = async (credentials: LoginCredentials) => {
    const success = await login(credentials);
    if (success) {
      // Navigation will be handled by the auth state change
      window.location.href = '/';
    }
  };

  return (
    <LoginForm 
      onLogin={handleLogin} 
      loading={loading} 
      error={error} 
    />
  );
};

// Main App Routes Component
const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<AuthenticatedLoginForm />} />
        {/* --- Attendance is public (no auth required) --- */}
        <Route
          path="/attendance"
          element={
            <AttendanceUpload onReportNavigate={() => window.location.href = '/reports'} />
          }
        />
        {/* Catch all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route 
        path="/" 
        element={
          <ProtectedRoute permission="view_dashboard">
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/employees" 
        element={
          <ProtectedRoute permission="manage_employees">
            <Employees />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/payroll" 
        element={
          <ProtectedRoute permission="manage_payroll">
            <Payroll />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/reports" 
        element={
          <ProtectedRoute permission="view_reports">
            <Reports />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/holidays" 
        element={
          <ProtectedRoute permission="manage_holidays">
            <Holidays />
          </ProtectedRoute>
        } 
      />
      {/* --- Attendance is public (no auth required) --- */}
      <Route
        path="/attendance"
        element={
          <AttendanceUpload onReportNavigate={() => window.location.href = '/reports'} />
        }
      />
      <Route 
        path="/profile" 
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } 
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <AppRoutes />
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
