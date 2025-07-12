import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { Calendar, Users, User, ArrowLeft, AlertTriangle, Download } from 'lucide-react';
// Using fetch instead of axios
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface EmployeeSummary {
  employeeId: string;
  name: string;
  office: string;
  position: string;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalDays: number;
  attendancePercentage: number;
}

interface AttendanceDetail {
  date: string;
  punchIn: string;
  punchOut: string;
  status: 'present' | 'absent' | 'late' | 'half_day';
  isLate: boolean;
  lateMinutes?: number;
}

interface EmployeeDetail {
  employeeId: string;
  name: string;
  office: string;
  position: string;
  reportingTime: string;
  attendance: AttendanceDetail[];
  summary: {
    presentDays: number;
    absentDays: number;
    lateDays: number;
    totalDays: number;
    attendancePercentage: number;
  };
}

export const Reports: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [employeeSummaries, setEmployeeSummaries] = useState<EmployeeSummary[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'summary' | 'detail'>('summary');

  // Late days threshold - fixed to 3
  const LATE_DAYS_THRESHOLD = 3;

  // Fetch all employees summary for selected month/year
  const fetchEmployeeSummary = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/reports/employee-summary?month=${selectedMonth}&year=${selectedYear}`);
      const data = await response.json();
      setEmployeeSummaries(data);
    } catch (error) {
      console.error('Error fetching employee summary:', error);
      alert('Failed to fetch attendance reports');
    } finally {
      setLoading(false);
    }
  };

  // Fetch individual employee details
  // Fetch individual employee details
const fetchEmployeeDetail = async (employeeId: string) => {
  setLoading(true);
  try {
    const response = await fetch(
      `http://localhost:5000/api/reports/employee-detail/${employeeId}?month=${selectedMonth}&year=${selectedYear}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    setSelectedEmployee(data);
    setView('detail');
  } catch (error) {
    console.error('Error fetching employee detail:', error);
    alert('Failed to fetch employee attendance details');
  } finally {
    setLoading(false);
  }
};
  // Export summary to Excel
  const exportSummaryToExcel = () => {
    if (employeeSummaries.length === 0) {
      alert('No data to export. Generate a report first.');
      return;
    }

    const exportData = employeeSummaries.map(emp => ({
      'Employee ID': emp.employeeId,
      'Name': emp.name,
      'Office': emp.office,
      'Position': emp.position,
      'Present Days': emp.presentDays,
      'Absent Days': emp.absentDays,
      'Late Days': emp.lateDays,
      'Total Days': emp.totalDays,
      'Attendance %': `${emp.attendancePercentage}%`,
      'Late Alert': emp.lateDays > LATE_DAYS_THRESHOLD ? 'YES' : 'NO'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Summary');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `attendance_summary_${selectedYear}_${selectedMonth.toString().padStart(2, '0')}.xlsx`);
  };

  // Export individual employee detail to Excel
  const exportEmployeeDetailToExcel = () => {
    if (!selectedEmployee) return;

    const exportData = selectedEmployee.attendance.map(att => ({
      'Date': att.date,
      'Punch In': att.punchIn || 'Not recorded',
      'Punch Out': att.punchOut || 'Not recorded',
      'Status': att.status,
      'Late': att.isLate ? 'YES' : 'NO',
      'Late Minutes': att.lateMinutes || 0
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Detail');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `${selectedEmployee.employeeId}_attendance_${selectedYear}_${selectedMonth.toString().padStart(2, '0')}.xlsx`);
  };

  // Reset to summary view
  const backToSummary = () => {
    setView('summary');
    setSelectedEmployee(null);
  };

  useEffect(() => {
    if (view === 'summary') {
      fetchEmployeeSummary();
    }
  }, [selectedMonth, selectedYear, view]);

  return (
    <MainLayout title="Attendance Reports" subtitle="View comprehensive attendance reports and analytics">
      <div className="space-y-6">
        
        {/* Header Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            
            {/* Period Selection */}
            <div className="flex items-center space-x-4">
              {view === 'detail' && (
                <button
                  onClick={backToSummary}
                  className="flex items-center px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back to Summary
                </button>
              )}
              
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-blue-600" />
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
                
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return (
                      <option key={year} value={year}>{year}</option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Export Button */}
            <button
              onClick={view === 'summary' ? exportSummaryToExcel : exportEmployeeDetailToExcel}
              disabled={loading || (view === 'summary' && employeeSummaries.length === 0) || (view === 'detail' && !selectedEmployee)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Excel
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading attendance data...</p>
          </div>
        )}

        {/* Summary View - All Employees */}
        {view === 'summary' && !loading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600" />
                All Employees - {new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' })} {selectedYear}
              </h2>
              <div className="text-sm text-gray-500">
                {employeeSummaries.length} employees
              </div>
            </div>

            {employeeSummaries.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Office</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Present</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Absent</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Late Days</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attendance %</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {employeeSummaries.map((employee, index) => (
                      <tr 
                        key={index} 
                        className={`hover:bg-gray-50 ${employee.lateDays > LATE_DAYS_THRESHOLD ? 'bg-red-50' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-medium">
                              {employee.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                              <div className="text-sm text-gray-500">{employee.employeeId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{employee.office}</div>
                          <div className="text-sm text-gray-500">{employee.position}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.presentDays}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.absentDays}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className={`text-sm ${employee.lateDays > LATE_DAYS_THRESHOLD ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                              {employee.lateDays}
                            </span>
                            {employee.lateDays > LATE_DAYS_THRESHOLD && (
                              <AlertTriangle className="w-4 h-4 ml-1 text-red-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`text-sm ${employee.attendancePercentage >= 90 ? 'text-green-600' : employee.attendancePercentage >= 75 ? 'text-yellow-600' : 'text-red-600'} font-medium`}>
                            {employee.attendancePercentage}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => fetchEmployeeDetail(employee.employeeId)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No attendance data found</h3>
                <p className="text-gray-500">No attendance records found for the selected period.</p>
              </div>
            )}
          </div>
        )}

        {/* Detail View - Individual Employee */}
        {view === 'detail' && selectedEmployee && !loading && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <User className="w-5 h-5 mr-2 text-green-600" />
                {selectedEmployee.name} - Detailed Attendance
              </h2>
              <div className="text-sm text-gray-500">
                {selectedEmployee.employeeId} | {selectedEmployee.office}
              </div>
            </div>

            {/* Employee Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">{selectedEmployee.summary.presentDays}</div>
                <div className="text-sm text-green-700">Present Days</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-red-600">{selectedEmployee.summary.absentDays}</div>
                <div className="text-sm text-red-700">Absent Days</div>
              </div>
              <div className={`rounded-lg p-4 ${selectedEmployee.summary.lateDays > LATE_DAYS_THRESHOLD ? 'bg-red-100' : 'bg-yellow-50'}`}>
                <div className={`text-2xl font-bold ${selectedEmployee.summary.lateDays > LATE_DAYS_THRESHOLD ? 'text-red-600' : 'text-yellow-600'}`}>
                  {selectedEmployee.summary.lateDays}
                </div>
                <div className={`text-sm ${selectedEmployee.summary.lateDays > LATE_DAYS_THRESHOLD ? 'text-red-700' : 'text-yellow-700'}`}>
                  Late Days {selectedEmployee.summary.lateDays > LATE_DAYS_THRESHOLD && '⚠️'}
                </div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{selectedEmployee.summary.attendancePercentage}%</div>
                <div className="text-sm text-blue-700">Attendance</div>
              </div>
            </div>

            {/* Daily Attendance Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Punch In</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Punch Out</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Late</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedEmployee.attendance.map((day, index) => (
                    <tr 
                      key={index} 
                      className={`${day.isLate ? 'bg-red-50' : ''} hover:bg-gray-50`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(day.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {day.punchIn || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {day.punchOut || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          day.status === 'present' ? 'bg-green-100 text-green-800' :
                          day.status === 'absent' ? 'bg-red-100 text-red-800' :
                          day.status === 'late' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {day.status.charAt(0).toUpperCase() + day.status.slice(1).replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {day.isLate ? (
                          <span className="text-red-600 font-medium">
                            Yes ({day.lateMinutes} min)
                          </span>
                        ) : (
                          <span className="text-gray-500">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};