import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, Key, UserCog, Building2 } from 'lucide-react';
import { User, Office } from '../../types';
import { api } from '../../services/api';

interface UserFormProps {
  user?: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: Partial<User>) => void;
  mode: 'add' | 'edit' | 'view';
}

export default function UserForm({ user, isOpen, onClose, onSubmit, mode }: UserFormProps) {
  const [formData, setFormData] = useState<Partial<User>>({
    username: '',
    password: '',
    role: 'hr',
    two_factor_enabled: false,
    offices: []
  });

  const [offices, setOffices] = useState<Office[]>([]);
  const [selectedOfficeIds, setSelectedOfficeIds] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const roles = [
    { value: 'admin', label: 'Admin', description: 'Full system access' },
    { value: 'floor_manager', label: 'Floor Manager', description: 'Department management' },
    { value: 'hr', label: 'HR', description: 'Human resources access' }
  ];

  useEffect(() => {
    if (isOpen) {
      fetchOffices().then(() => {
        if (user && mode !== 'add') {
          setFormData({
            username: user.username || '',
            role: user.role || 'hr',
            two_factor_enabled: user.two_factor_enabled || false,
            password: '' // Never populate password field
          });
          
          // Set selected offices (handle both formats)
          const userOffices = user.offices || user.assigned_offices || [];
          if (userOffices.length > 0) {
            console.log('Setting selected offices:', userOffices);
            setSelectedOfficeIds(userOffices.map(office => office.id.toString()));
          }
        } else {
          // Reset form for add mode
          setFormData({
            username: '',
            password: '',
            role: 'hr',
            two_factor_enabled: false
          });
          setSelectedOfficeIds([]);
        }
      })
      .catch(error => console.error('Error setting form data:', error));
      
      setErrors({});
    }
  }, [user, isOpen, mode]);

  const fetchOffices = async () => {
    try {
      const response = await api.get('/masters/offices');
      // Transform the response to match expected format
      const transformedOffices = response.data.map((office: any) => ({
        id: office.office_id ? office.office_id.toString() : office.id.toString(),
        name: office.office_name || office.name,
        location: office.location || ''
      }));
      setOffices(transformedOffices);
    } catch (error) {
      console.error('Error fetching offices:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleOfficeToggle = (officeId: string) => {
    if (mode === 'view') return;
    
    setSelectedOfficeIds(prev => {
      if (prev.includes(officeId)) {
        return prev.filter(id => id !== officeId);
      } else {
        return [...prev, officeId];
      }
    });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username?.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (mode === 'add' && !formData.password?.trim()) {
      newErrors.password = 'Password is required for new users';
    }

    if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.role) {
      newErrors.role = 'Role is required';
    }

    if (selectedOfficeIds.length === 0) {
      newErrors.offices = 'At least one office must be selected';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'view') {
      onClose();
      return;
    }

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const userData: Partial<User> = {
        ...formData,
        offices: offices.filter(office => selectedOfficeIds.includes(office.id))
      };

      // Don't include password if it's empty (for edit mode)
      if (!userData.password?.trim() && mode === 'edit') {
        delete userData.password;
      }

      await onSubmit(userData);
      onClose();
    } catch (error) {
      console.error('Error submitting user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isReadOnly = mode === 'view';
  const isEdit = mode === 'edit';
  const isAdd = mode === 'add';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserCog className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {isAdd ? 'Add New User' : isEdit ? 'Edit User' : 'View User'}
              </h2>
              <p className="text-sm text-gray-500">
                {isAdd ? 'Create a new user account' : isEdit ? 'Update user information' : 'User details'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username || ''}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.username ? 'border-red-300' : 'border-gray-300'
                  } ${isReadOnly ? 'bg-gray-50' : ''}`}
                  placeholder="Enter username"
                  disabled={isReadOnly}
                />
                {errors.username && (
                  <p className="mt-1 text-xs text-red-600">{errors.username}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>
                <select
                  name="role"
                  value={formData.role || ''}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.role ? 'border-red-300' : 'border-gray-300'
                  } ${isReadOnly ? 'bg-gray-50' : ''}`}
                  disabled={isReadOnly}
                >
                  {roles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label} - {role.description}
                    </option>
                  ))}
                </select>
                {errors.role && (
                  <p className="mt-1 text-xs text-red-600">{errors.role}</p>
                )}
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password {isAdd ? '*' : '(leave blank to keep current)'}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password || ''}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  } ${isReadOnly ? 'bg-gray-50' : ''}`}
                  placeholder={isAdd ? "Enter password" : "Enter new password (optional)"}
                  disabled={isReadOnly}
                />
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}
            </div>


            {/* Office Assignments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Building2 className="inline h-4 w-4 mr-1" />
                Office Access *
              </label>
              <div className="border border-gray-300 rounded-lg p-4 max-h-48 overflow-y-auto">
                {offices.length === 0 ? (
                  <p className="text-sm text-gray-500">No offices available</p>
                ) : (
                  <div className="space-y-2">
                    {offices.map((office) => (
                      <label
                        key={office.id}
                        className={`flex items-center space-x-3 p-2 rounded-lg border transition-colors ${
                          selectedOfficeIds.includes(office.id)
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-white border-gray-200 hover:bg-gray-50'
                        } ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedOfficeIds.includes(office.id)}
                          onChange={() => handleOfficeToggle(office.id)}
                          disabled={isReadOnly}
                          className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{office.name}</div>
                          <div className="text-xs text-gray-500">{office.location}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {errors.offices && (
                <p className="mt-1 text-xs text-red-600">{errors.offices}</p>
              )}
            </div>

            {/* User Info (for edit/view mode) */}
            {user && !isAdd && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">User Information</h4>
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                  <div>
                    <span className="font-medium">Created:</span> {new Date(user.created_at).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Last Updated:</span> {new Date(user.updated_at).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">2FA Status:</span> {user.two_factor_enabled ? 'Enabled' : 'Disabled'}
                  </div>
                  <div>
                    <span className="font-medium">User ID:</span> {user.id}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {isReadOnly ? 'Close' : 'Cancel'}
            </button>
            
            {!isReadOnly && (
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4" />
                    <span>{isAdd ? 'Create User' : 'Update User'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
