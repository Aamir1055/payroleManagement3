import { Employee } from '../types';
import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { EmployeeTable } from '../components/Employees/EmployeeTable';
import { useEmployees } from '../hooks/useEmployees';
import { useToast } from '../components/UI/ToastContainer';
import { Plus, Download, Users, Upload, XCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { useNavigate } from 'react-router-dom';

const getDisplayName = (
  item: any,
  nameKey: string = 'name',
  fallbackKey?: string
): string => {
  if (typeof item === 'object' && item?.[nameKey]) return item[nameKey];
  if (typeof item === 'object' && fallbackKey && item?.[fallbackKey])
    return item[fallbackKey];
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

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOffice, setSelectedOffice] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('');
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [offices, setOffices] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);

  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  // Fetch offices and positions for filters
  useEffect(() => {
    const fetchFilterData = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        };

        // Fetch offices
        const officesResponse = await fetch('/api/masters/offices', { headers });
        if (officesResponse.ok) {
          const officesData = await officesResponse.json();
          setOffices(officesData);
        }

        // Fetch positions
        const positionsResponse = await fetch('/api/masters/positions', { headers });
        if (positionsResponse.ok) {
          const positionsData = await positionsResponse.json();
          setPositions(positionsData);
        }
      } catch (error) {
        console.error('Error fetching filter data:', error);
      }
    };

    fetchFilterData();
  }, []);

  const normalizedEmployees = employees.map((emp) => ({
    ...emp,
    office_name: emp.office_name || '',
  }));

  const filteredEmployees = normalizedEmployees.filter((employee) => {
    // Search filter
    const search = searchTerm.trim().toLowerCase();
    const fieldsToSearch = [
      employee.name || '',
      employee.employeeId || '',
      getDisplayName(employee.office_name, 'name', 'office_name'),
      employee.email || '',
      String(employee.monthlySalary || ''),
      employee.status ? 'Active' : 'Inactive',
    ].map((f) => String(f).trim().toLowerCase());
    const searchMatch = !search || fieldsToSearch.some((field) => field.includes(search));

    // Office filter
    const officeMatch = !selectedOffice || 
      getDisplayName(employee.office_name, 'name', 'office_name') === selectedOffice;

    // Position filter
    const positionMatch = !selectedPosition || 
      (employee.position_title === selectedPosition || employee.position_name === selectedPosition);

    return searchMatch && officeMatch && positionMatch;
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

  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
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
      'Position': emp.position_title || emp.position_name || '',
      'Monthly Salary (AED)': Number(emp.monthlySalary).toFixed(2),
      'Joining Date': emp.joiningDate ? new Date(emp.joiningDate).toISOString().split('T')[0] : '',
      'Status': emp.status ? 'Active' : 'Inactive',
      'Date of Birth': emp.dob ? new Date(emp.dob).toISOString().split('T')[0] : '',
      'Passport Number': emp.passport_number || '',
      'Passport Expiry': emp.passport_expiry ? new Date(emp.passport_expiry).toISOString().split('T')[0] : '',
      'Visa Type': emp.visa_type_name || emp.visa_type || '',
      'Platform': emp.platform || '',
      'Address': emp.address || '',
      'Phone': emp.phone || '',
      'Gender': emp.gender || '',
      'Reporting Time': emp.reporting_time || '',
      'Duty Hours': emp.duty_hours ? `${emp.duty_hours} hours` : '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });
    const blob = new Blob([excelBuffer], {
      type: 'application/octet-stream',
    });
    saveAs(blob, `employees_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // --- SAMPLE DOWNLOAD: now includes all key secondary fields ---
  const handleDownloadSampleExcel = () => {
    const sampleData = [
      {
        'Employee ID': 'EMP-999',
        Name: 'John Smith',
        Email: 'john@example.com',
        'Office ID': 19,
        'Position ID': 57,
        Salary: 5000,
        'Joining Date': '2023-01-01',
        Status: 'active',
        DOB: '1990-02-10',
        'Passport Number': 'P1234567',
        'Passport Expiry': '2030-01-01',
        'Visa Type': '1',
        Platform: '1',
        Address: '123 Main St',
        Phone: '5551234567',
        Gender: 'Male',
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SampleEmployees');
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'sample_employee_import.xlsx');
  };
  // --------------------------------------------------------------

  const handleAddEmployee = () => {
    navigate('/employees/add');
  };

  const handleEditEmployee = (employee: Employee) => {
    navigate(`/employees/edit/${employee.employeeId}`);
  };

  const handleViewEmployee = (employee: Employee) => {
    navigate(`/employees/view/${employee.employeeId}`);
  };

  const handleDeleteEmployee = async (id: string) => {
    // Find the employee to get their name for the message
    const employeeToDelete = filteredEmployees.find(emp => emp.employeeId === id);
    const employeeName = employeeToDelete?.name || id;
    
    if (window.confirm(`Are you sure you want to delete employee ${employeeName}?`)) {
      try {
        await deleteEmployee(id);
        showSuccess('Success', `Employee ${employeeName} has been deleted successfully!`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
        showError('Error', `Failed to delete employee ${employeeName}: ${errorMessage}`);
      }
    }
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/employees/import', {
        method: 'POST',
        body: formData,
        headers: {
          Accept: 'application/json',
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

  const handleSecondaryFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch('/api/employees/import-secondary', {
        method: 'POST',
        body: formData,
        headers: { Accept: 'application/json' },
      });
      if (response.ok) {
        alert('Secondary employee data imported successfully');
        refreshEmployees();
      } else {
        const errorMsg = await response.text();
        throw new Error(errorMsg || 'Failed to import secondary data');
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
    <MainLayout
      title="Employee Management"
      subtitle="Manage your organization's employees"
    >
      {/* --- Fixed Sample Excel & Export buttons at top right corner --- */}
      <div className="fixed top-4 right-4 z-50 flex space-x-2">
        <button
          onClick={handleDownloadSampleExcel}
          className="flex items-center justify-center h-10 px-3 min-w-[120px] text-base font-medium rounded-md text-blue-700 border border-blue-300 bg-blue-50 hover:bg-blue-100 shadow-sm transition-colors duration-150"
        >
          <Download className="w-4 h-4 mr-2" />
          Sample Excel
        </button>

        <button
          onClick={handleExportToExcel}
          className="flex items-center justify-center h-10 px-3 min-w-[120px] text-base font-medium rounded-md text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 shadow-sm transition-colors duration-150"
        >
          <Download className="w-4 h-4 mr-2" />
          Export
        </button>
      </div>

      <div className="space-y-6 pt-14">
        {/* TOP BAR: Search and other buttons (excluding Sample Excel & Export) */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            {/* Search bar */}
            <input
              type="text"
              placeholder="Search by name, ID, office, email, salary, or status..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 min-w-[160px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            {/* Office Filter */}
            <select
              value={selectedOffice}
              onChange={(e) => {
                setSelectedOffice(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px]"
            >
              <option value="">All Offices</option>
              {offices.map((office) => (
                <option key={office.id || office.name} value={getDisplayName(office, 'name', 'office_name')}>
                  {getDisplayName(office, 'name', 'office_name')}
                </option>
              ))}
            </select>
            
            {/* Position Filter */}
            <select
              value={selectedPosition}
              onChange={(e) => {
                setSelectedPosition(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[140px]"
            >
              <option value="">All Positions</option>
              {Array.from(new Set(positions.map(position => getDisplayName(position, 'title', 'position_name'))))
                .filter(positionName => positionName.trim() !== '')
                .sort()
                .map((positionName, index) => (
                  <option key={`position-${index}`} value={positionName}>
                    {positionName}
                  </option>
                ))}
            </select>
          </div>

          {/* Other buttons */}
          <div className="flex flex-wrap gap-2 justify-start md:justify-end items-center w-full md:w-auto">

            {/* Import Excel */}
            <label
              htmlFor="importExcel"
              className="flex items-center justify-center h-10 px-3 min-w-[130px] text-base font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer transition-colors duration-150 shadow-sm"
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

            {/* Import Secondary Data */}
            <label
              htmlFor="importSecondaryExcel"
              className="flex items-center justify-center h-10 px-3 min-w-[150px] text-base font-medium rounded-md bg-purple-600 text-white hover:bg-purple-700 cursor-pointer transition-colors duration-150 shadow-sm"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Secondary Data
            </label>
            <input
              id="importSecondaryExcel"
              type="file"
              accept=".xlsx, .xls"
              onChange={handleSecondaryFileUpload}
              className="hidden"
            />

            {/* Add New Employee */}
            <button
              onClick={handleAddEmployee}
              className="flex items-center justify-center h-10 px-3 min-w-[140px] text-base font-medium rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors duration-150 shadow-sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Employee
            </button>
          </div>
        </div>

        {/* Items per page selector */}
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
          <div className="flex items-center justify-between mb-4">
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No employees found
              </h3>
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
        </div>
      </div>
    </MainLayout>
  );
};
