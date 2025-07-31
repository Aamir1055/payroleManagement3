import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MainLayout } from '../components/Layout/MainLayout';
import EmployeeForm from '../components/Employees/EmployeeForm';
import { useEmployees } from '../hooks/useEmployees';
import { useToast } from '../components/UI/ToastContainer';
import { Employee } from '../types';

const EmployeePage: React.FC = () => {
  const { employeeId } = useParams<{ employeeId?: string }>();
  const {
    employees,
    addEmployee,
    updateEmployee,
    fetchEmployeeById // make sure this is implemented in useEmployees
  } = useEmployees();
  const [employee, setEmployee] = useState<Employee | undefined>();
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useToast();

  // Determine mode based on URL
  const pathname = location.pathname.toLowerCase();
  const isEditMode = Boolean(employeeId && pathname.includes('/edit/'));
  const isViewMode = Boolean(employeeId && pathname.includes('/view/'));
  const isAddMode = !employeeId;

  // Load employee if edit or view mode
  useEffect(() => {
    if (employeeId) {
      const found = employees.find((emp) => emp.employeeId === employeeId);
      if (found) setEmployee(found);
      // fallback: fetch by id for hard refreshes or deep links
      else if (fetchEmployeeById) fetchEmployeeById(employeeId).then(setEmployee);
    } else {
      setEmployee(undefined);
    }
  }, [employeeId, employees, fetchEmployeeById]);

  const handleSubmit = async (data: any) => {
    try {
      if (isEditMode && employeeId) {
        await updateEmployee(employeeId, data);
        showSuccess('Success', `Employee ${data.name || employeeId} has been updated successfully!`);
      } else if (isAddMode) {
        await addEmployee(data);
        showSuccess('Success', `Employee ${data.name || data.employeeId} has been added successfully!`);
      }
      navigate('/employees');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      showError('Error', `Failed to ${isEditMode ? 'update' : 'add'} employee: ${errorMessage}`);
    }
  };

  const pageTitle =
    isEditMode ? 'Edit Employee'
    : isViewMode ? 'View Employee'
    : 'Add New Employee';

  const pageSubtitle =
    isEditMode ? 'Update details for this employee'
    : isViewMode ? 'Employee details'
    : 'Fill the form to create a new employee';

  // Show loader if still fetching employee in edit or view mode
  if ((isEditMode || isViewMode) && !employee) {
    return (
      <MainLayout title={pageTitle} subtitle="">
        <div className="text-center p-12 text-gray-600">Loading employee details...</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={pageTitle} subtitle={pageSubtitle}>
      <EmployeeForm
        employee={employee}
        onSubmit={isViewMode ? undefined : handleSubmit}
        onClose={() => navigate('/employees')}
        viewOnly={isViewMode}
        fullPage={true}
      />
    </MainLayout>
  );
};

export default EmployeePage;

// (You can rename this file to EmployeePage.tsx for clarity!)
