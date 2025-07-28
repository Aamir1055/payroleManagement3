import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { User } from '../pages/RoleManagement';

interface UseUsersReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  refreshUsers: () => Promise<void>;
  createUser: (userData: any) => Promise<void>;
  updateUser: (id: number, userData: any) => Promise<void>;
  deleteUser: (id: number) => Promise<void>;
}

export const useUsers = (): UseUsersReturn => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch users from API
  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/roles');
      
      // Transform backend response to match frontend expectations
      const transformedUsers = (response.data || []).map((user: any) => ({
        ...user,
        // Convert assigned_offices to offices for frontend compatibility
        offices: user.assigned_offices || []
      }));
      
      setUsers(transformedUsers);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Create new user
  const createUser = async (userData: any) => {
    try {
      // Transform the data to match backend expectations
      const transformedData = {
        username: userData.username,
        password: userData.password,
        role: userData.role,
        two_factor_enabled: userData.two_factor_enabled || false,
        office_ids: userData.offices ? userData.offices.map((office: any) => parseInt(office.id)) : []
      };

      console.log('Sending user data:', transformedData); // Debug log
      
      const response = await api.post('/roles', transformedData);
      
      // The backend doesn't return a success field, it returns the user directly
      if (response.data) {
        await fetchUsers();
      } else {
        throw new Error('Failed to create user');
      }
    } catch (err: any) {
      console.error('Error creating user:', err);
      throw new Error(err.response?.data?.error || err.response?.data?.message || 'Failed to create user');
    }
  };

  // Update existing user
  const updateUser = async (id: number, userData: any) => {
    try {
      // Transform the data to match backend expectations
      const transformedData: any = {
        username: userData.username,
        role: userData.role,
        two_factor_enabled: userData.two_factor_enabled || false,
        office_ids: userData.offices ? userData.offices.map((office: any) => parseInt(office.id)) : []
      };

      // Only include password if it's provided (not empty)
      if (userData.password && userData.password.trim()) {
        transformedData.password = userData.password;
      }

      console.log('Sending update data:', transformedData); // Debug log
      
      const response = await api.put(`/roles/${id}`, transformedData);
      
      // Backend returns the updated user directly, not wrapped in success field
      if (response.data && response.data.id) {
        // Just refresh the users list to get the latest data
        await fetchUsers();
      } else {
        throw new Error('Failed to update user');
      }
    } catch (err: any) {
      console.error('Error updating user:', err);
      throw new Error(err.response?.data?.error || err.response?.data?.message || 'Failed to update user');
    }
  };

  // Delete user
  const deleteUser = async (id: number) => {
    try {
      const response = await api.delete(`/roles/${id}`);
      
      // Backend returns { message: 'User deleted successfully' }, not success field
      if (response.data && response.data.message) {
        // Remove from local state
        setUsers(prev => prev.filter(user => user.id !== id));
      } else {
        throw new Error('Failed to delete user');
      }
    } catch (err: any) {
      console.error('Error deleting user:', err);
      throw new Error(err.response?.data?.error || err.response?.data?.message || 'Failed to delete user');
    }
  };

  // Refresh users (public method)
  const refreshUsers = async () => {
    await fetchUsers();
  };

  // Load users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    error,
    refreshUsers,
    createUser,
    updateUser,
    deleteUser
  };
};
