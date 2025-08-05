import React, { useState } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import UserTable from '../components/Users/UserTable';
import UserForm from '../components/forms/UserForm';
import { UserStats } from '../components/Users/UserStats';
import { useUsers } from '../hooks/useUsers';
import { Plus, Search, X } from 'lucide-react';
import { toast } from 'react-toastify';

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'hr' | 'floor_manager';
  two_factor_enabled: boolean;
  created_at: string;
  updated_at: string;
  assigned_offices?: Array<{
    id: number;
    name: string;
    location: string;
  }>;
  offices?: Array<{
    id: string;
    name: string;
    location: string;
  }>;
}

// Error interface for better type safety
interface ApiError {
  error: string;
  details: string;
}

export const RoleManagement: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | undefined>();
  const [viewingUser, setViewingUser] = useState<User | undefined>();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const {
    users,
    loading,
    error,
    refreshUsers,
    createUser,
    updateUser,
    deleteUser
  } = useUsers();

  // Enhanced error message parser
  const parseErrorMessage = (error: any): string => {
    console.log('Error object:', error); // Debug log
    
    // Check if it's an API error response
    if (error?.response?.data) {
      const errorData = error.response.data as ApiError;
      
      // Use detailed message if available, otherwise use main error
      if (errorData.details) {
        return errorData.details;
      } else if (errorData.error) {
        return errorData.error;
      }
    }
    
    // Check if it's a direct error object
    if (error?.details) {
      return error.details;
    } else if (error?.error) {
      return error.error;
    }
    
    // Check for message property
    if (error?.message) {
      return error.message;
    }
    
    // Fallback to string representation
    if (typeof error === 'string') {
      return error;
    }
    
    // Default fallback
    return 'An unexpected error occurred. Please try again.';
  };

  // Enhanced form submission handler
  const handleSubmit = async (userData: any) => {
    try {
      // Clear previous errors
      setFormErrors([]);
      
      let result;
      if (editingUser) {
        result = await updateUser(editingUser.id, userData);
        toast.success('User updated successfully');
      } else {
        result = await createUser(userData);
        toast.success('User created successfully');
      }
      
      handleCloseForm();
      await refreshUsers();
      
    } catch (error) {
      console.error('Error saving user:', error);
      
      const errorMessage = parseErrorMessage(error);
      
      // Set form-specific errors for display in the form
      setFormErrors([errorMessage]);
      
      // Show toast with specific error message
      toast.error(errorMessage, {
        autoClose: 5000, // Keep error visible longer
        closeOnClick: true,
        pauseOnHover: true,
      });
    }
  };

  // Enhanced delete handler
  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(id);
        toast.success('User deleted successfully');
        await refreshUsers();
      } catch (error) {
        console.error('Error deleting user:', error);
        
        const errorMessage = parseErrorMessage(error);
        toast.error(errorMessage, {
          autoClose: 5000,
          closeOnClick: true,
          pauseOnHover: true,
        });
      }
    }
  };

  // Handle form close
  const handleCloseForm = () => {
    setShowForm(false);
    setEditingUser(undefined);
    setViewingUser(undefined);
    setFormErrors([]); // Clear errors when closing form
  };

  // Handle edit
  const handleEdit = (user: User) => {
    setFormErrors([]); // Clear previous errors
    setEditingUser(user);
    setViewingUser(undefined);
    setShowForm(true);
  };

  // Handle view
  const handleView = (user: User) => {
    setFormErrors([]); // Clear previous errors
    setViewingUser(user);
    setEditingUser(undefined);
    setShowForm(true);
  };

  // Handle add new
  const handleAddNew = () => {
    console.log('handleAddNew clicked - before state changes');
    console.log('Current showForm state:', showForm);
    setFormErrors([]); // Clear previous errors
    setEditingUser(undefined);
    setViewingUser(undefined);
    setShowForm(true);
    console.log('handleAddNew clicked - after setShowForm(true)');
  };

  // Filter users based on search term and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  if (error) {
    return (
      <MainLayout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <div className="text-red-500 text-xl mb-4">⚠️ Error Loading Users</div>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={refreshUsers}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Role Management</h1>
              <p className="mt-2 text-gray-600">
                Manage user accounts, roles, and office assignments
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={handleAddNew}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add New User
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <UserStats users={users} loading={loading} />

        {/* Filters */}
        <div className="mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search users by username or role..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>

            {/* Role Filter */}
            <div className="sm:w-48">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Roles</option>
                <option value="admin">Administrator</option>
                <option value="hr">HR</option>
                <option value="floor_manager">Floor Manager</option>
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {(searchTerm || selectedRole !== 'all') && (
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-gray-500">Active filters:</span>
              {searchTerm && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Search: {searchTerm}
                  <button
                    onClick={() => setSearchTerm('')}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedRole !== 'all' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Role: {selectedRole}
                  <button
                    onClick={() => setSelectedRole('all')}
                    className="ml-1 text-green-600 hover:text-green-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedRole('all');
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Users Table */}
        <UserTable
          users={filteredUsers}
          loading={loading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
        />

        {/* User Form Modal */}
        {showForm && (
          <div>
            {console.log('UserForm being rendered with showForm:', showForm)}
            <UserForm
              isOpen={showForm}
              mode={editingUser ? 'edit' : viewingUser ? 'view' : 'add'}
              user={editingUser || viewingUser}
              onSubmit={handleSubmit}
              onClose={handleCloseForm}
              viewOnly={!!viewingUser}
              errors={formErrors} // Pass errors to form
            />
          </div>
        )}
      </div>
    </MainLayout>
  );
};
