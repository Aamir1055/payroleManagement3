import { Employee } from '../types';
import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { EmployeeTable } from '../components/Employees/EmployeeTable';
import EmployeeForm from '../components/Employees/EmployeeForm';
import { useEmployees } from '../hooks/useEmployees';
import { Plus, Download, Users, Upload, XCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Helper to safely extract a string from possible object/string
const getDisplayName = (item: any, nameKey: string = 'name', fallbackKey?: string): string => {
  if (typeof item === 'object' && item?.[nameKey]) return item[nameKey];
  if (typeof item === 'object' && fallbackKey && item?.[fallbackKey]) return item[fallbackKey];
  return String(item);
};

export const Employees: React.FC = () => {
  const {
    employees,
    loading,
    error,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    refreshEmployees,
  } = useEmployees();

  const [showForm, setShowForm] = useState(false);
  const [viewOnly, setViewOnly] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // NORMALIZE employee data: ensure office_name is always a string
  const normalizedEmployees = employees.map((emp) => ({
    ...emp,
    office_name: emp.office_name || '',
  }));

  // FILTER LOGIC: Search by name, ID, office, email, salary, status
  // POSITION and JOINING DATE REMOVED FROM SEARCH
  const filteredEmployees = normalizedEmployees.filter((employee) => {
    const search = searchTerm.trim().toLowerCase();
    const fieldsToSearch = [
      employee.name || '',
      employee.employeeId || '',
      getDisplayName(employee.office_name, 'name', 'office_name'),
      employee.email || '',
      String(employee.monthlySalary || ''),
      employee.status ? 'Active' : 'Inactive',
    ].map(f => String(f).trim().toLowerCase());

    return fieldsToSearch.some(field => field.includes(search));
  });

  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const paginatedEmployees = filteredEmployees.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleItemsPerPageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleExportToExcel = () => {
    if (filteredEmployees.length === 0) {
      alert('No employee data to export.');
      return;
    }

    const exportData = filteredEmployees.map((emp) => ({
      'Employee ID': emp.employeeId,
      'Name': emp.name,
      'Email': emp.email,
      'Office': getDisplayName(emp.office_name, 'name', 'office_name'),
      'Monthly Salary (AED)': Number(emp.monthlySalary).toFixed(2),
      'Status': emp.status ? 'Active' : 'Inactive',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `employees_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        'Employee ID': 'EMP0021',
        'Name': 'John Doe',
        'Email': 'john@example.com',
        'Office Name': 'Taqniya',
        'Salary': 2000,
        'Status': 'active',
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SampleEmployees');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'sample_employee_import.xlsx');
  };

  const handleAddEmployee = () => {
    setEditingEmployee({
      id: 0,
      employeeId: '',
      name: '',
      email: '',
      office_id: 0,
      office_name: '',
      position_id: 0,
      position_name: '',
      monthlySalary: 0,
      joiningDate: new Date().toISOString().split('T')[0],
      status: true
    });
    setViewOnly(false);
    setShowForm(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee({
      ...employee,
      office_name: employee.office_name || '',
    });
    setViewOnly(false);
    setShowForm(true);
  };

  const handleViewEmployee = (employee: Employee) => {
    setEditingEmployee({
      ...employee,
      office_name: employee.office_name || '',
    });
    setViewOnly(true);
    setShowForm(true);
  };

  const handleSubmitEmployee = async (data: any) => {
    if (!data.office_name || !data.position_name) {
      alert('Office and Position are required fields');
      return;
    }
    if (!data.employeeId || data.employeeId.trim() === '') {
      alert('Employee ID is required');
      return;
    }

    try {
      if (editingEmployee && editingEmployee.id !== 0) {
        await updateEmployee(editingEmployee.employeeId, data);
      } else {
        await addEmployee(data);
      }
      setShowForm(false);
      setEditingEmployee(null);
    } catch (err) {
      let message = 'Failed to save employee';
      if (err instanceof Error) message += ': ' + err.message;
      else message += ': ' + String(err);
      alert(message);
    }
  };

  const handleDeleteEmployee = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await deleteEmployee(id);
      } catch (error) {
        console.error('Error deleting employee:', error);
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/employees/import', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
      });

      if (response.ok) {
        alert('Employees imported successfully');
        refreshEmployees();
      } else {
        throw new Error('Failed to import employees');
      }
    } catch (err) {
      let message = 'Import error';
      if (err instanceof Error) message += ': ' + err.message;
      else message += ': ' + String(err);
      alert(message);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Manage Employees" subtitle="Loading...">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout title="Manage Employees" subtitle="Error">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={refreshEmployees}
                className="mt-2 text-sm text-red-600 hover:text-red-500"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Employee Management" subtitle="Manage your organization's employees">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Search by name, ID, office, email, salary, or status..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-96"
            />
          </div>

          <div className="flex items-center space-x-3">
            <label
              htmlFor="importExcel"
              className="cursor-pointer flex items-center px-4 py-2 text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Excel
            </label>
            <input
              id="importExcel"
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              className="hidden"
            />

            <button
              onClick={handleDownloadSampleExcel}
              className="flex items-center px-4 py-2 text-blue-700 border border-blue-300 bg-blue-50 hover:bg-blue-100 rounded-lg"
            >
              <Download className="w-4 h-4 mr-2" />
              Sample Excel
            </button>

            <button
              onClick={handleExportToExcel}
              className="flex items-center px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>

            <button
              onClick={handleAddEmployee}
              className="flex items-center px-4 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Employee
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <label htmlFor="itemsPerPage" className="mr-2 text-gray-700 font-medium">
            Records per page:
          </label>
          <select
            id="itemsPerPage"
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
            className="border border-gray-300 rounded px-2 py-1"
          >
            {[10, 20, 50, 100, 200, 500].map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                Total Employees: {filteredEmployees.length}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Showing {paginatedEmployees.length} of {filteredEmployees.length}
            </div>
          </div>
        </div>

        {filteredEmployees.length > 0 ? (
          <>
            <EmployeeTable
              employees={paginatedEmployees}
              onEdit={handleEditEmployee}
              onDelete={handleDeleteEmployee}
              onView={handleViewEmployee}
            />
            <div className="flex justify-between items-center px-4 py-4 border-t border-gray-200 bg-white rounded-b-lg">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No employees found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm
                ? 'No employees match your search.'
                : 'Get started by adding a new employee.'}
            </p>
            {!searchTerm && (
              <button
                onClick={handleAddEmployee}
                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Add Your First Employee
              </button>
            )}
          </div>
        )}

        {showForm && (
          <EmployeeForm
            employee={editingEmployee || undefined}
            viewOnly={viewOnly}
            onSubmit={handleSubmitEmployee}
            onClose={() => {
              setShowForm(false);
              setEditingEmployee(null);
            }}
          />
        )}
      </div>
    </MainLayout>
  );
};
