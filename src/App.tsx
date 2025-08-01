import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth, LoginCredentials } from './context/AuthContext';
import { ToastProvider } from './components/UI/ToastContainer';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoginForm } from './components/Auth/LoginForm';
import AddEmployeePage from './pages/AddEmployee';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import PayrollReports from './pages/PayrollReports';
import { DashboardByPlatform } from './pages/DashboardByPlatform';
import EmployeePayrollDetails from './pages/EmployeePayrollDetails';
import { Holidays } from './pages/holidays';
import { Profile } from './pages/Profile';
import { RoleManagement } from './pages/RoleManagement';
import AttendanceUpload from './pages/AttendanceUpload';
import FlushDB from './pages/FlushDB';
import MasterData from './pages/MasterData';

import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  permission?: string;
  adminOnly?: boolean; // ADD THIS PROP
}> = ({ children, permission, adminOnly }) => {
  const { isAuthenticated, hasPermission, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check for admin-only access
  if (adminOnly && user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Access Required</h1>
          <p className="text-gray-600 mb-6">
            This page is restricted to administrators only.
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

const AuthenticatedLoginForm: React.FC = () => {
  const { login, loading, error } = useAuth();

  const handleLogin = async (credentials: LoginCredentials) => {
    const success = await login(credentials);
    if (success) {
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

const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Routes>
        <Route path="/login" element={<AuthenticatedLoginForm />} />
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
        path="/dashboard-by-platform"
        element={
          <ProtectedRoute>
            <DashboardByPlatform />
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
        path="/employees/add"
        element={
          <ProtectedRoute permission="manage_employees">
            <AddEmployeePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/edit/:employeeId"
        element={
          <ProtectedRoute permission="manage_employees">
            <AddEmployeePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employees/view/:employeeId"
        element={
          <ProtectedRoute permission="manage_employees">
            <AddEmployeePage />
          </ProtectedRoute>
        }
      />
      {/* === ATTENDANCE UPLOAD ROUTE === */}
      <Route
        path="/attendance"
        element={<AttendanceUpload />}
      />
      {/* === END ATTENDANCE UPLOAD ROUTE === */}
      
      {/* === FLUSH DB ROUTE - ADMIN ONLY WITH PROTECTION === */}
      <Route
        path="/flush-db"
        element={
          <ProtectedRoute adminOnly={true}>
            <FlushDB />
          </ProtectedRoute>
        }
      />
      {/* === END FLUSH DB ROUTE === */}

      <Route
        path="/payroll"
        element={
          <ProtectedRoute permission="manage_payroll">
            <PayrollReports />
          </ProtectedRoute>
        }
      />
      <Route
        path="/employee/:employeeId"
        element={
          <ProtectedRoute permission="manage_payroll">
            <EmployeePayrollDetails />
          </ProtectedRoute>
        }
      />
      <Route
        path="/api/holidays"
        element={
          <ProtectedRoute permission="manage_holidays">
            <Holidays />
          </ProtectedRoute>
        }
      />
      <Route
        path="/roles"
        element={
          <ProtectedRoute permission="manage_users">
            <RoleManagement />
          </ProtectedRoute>
        }
      />
      <Route
        path="/master-data"
        element={
          <ProtectedRoute permission="manage_offices">
            <MasterData />
          </ProtectedRoute>
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
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <div className="min-h-screen bg-gray-50">
              <AppRoutes />
              <ToastContainer />
            </div>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
