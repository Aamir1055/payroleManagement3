import { useState, useEffect } from 'react';
import { Employee } from '../types';

export const useEmployees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    };
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/employees', {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('Authentication failed. Please log in again.');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      // Ensure all employees have office_name and position_title
      const processedData = data.map((emp: Employee) => ({
        ...emp,
        office_name: emp.office_name || 'Not assigned',
        position_title: emp.position_title || 'Not assigned'
      }));
      setEmployees(processedData);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
      setError('Failed to load employees. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const addEmployee = async (employee: Omit<Employee, 'id'>) => {
    try {
      // Ensure required fields are present
      if (!employee.office_id || !employee.position_id) {
        throw new Error('Office and Position are required');
      }

      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...employee,
          office_name: employee.office_name || 'Not assigned',
          position_title: employee.position_title || 'Not assigned'
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      await fetchEmployees();
      return data;
    } catch (err) {
      console.error('Failed to add employee:', err);
      throw err;
    }
  };

  const updateEmployee = async (employeeId: string, updates: Partial<Employee>) => {
    try {
      // Ensure required fields are present
      if (updates.office_id !== undefined && !updates.office_id) {
        throw new Error('Office is required');
      }
      if (updates.position_id !== undefined && !updates.position_id) {
        throw new Error('Position is required');
      }

      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...updates,
          office_name: updates.office_name || 'Not assigned',
          position_title: updates.position_title || 'Not assigned'
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      await fetchEmployees();
      return data;
    } catch (err) {
      console.error('Failed to update employee:', err);
      throw err;
    }
  };

  const deleteEmployee = async (employeeId: string) => {
    try {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await fetchEmployees();
    } catch (err) {
      console.error('Failed to delete employee:', err);
      throw err;
    }
  };

  return {
    employees,
    loading,
    error,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    refreshEmployees: fetchEmployees,
  };
};