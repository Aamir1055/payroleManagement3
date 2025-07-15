import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Users, 
  TrendingDown, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  Download,
  Eye,
  X,
  FileText,
  Calculator,
  DollarSign
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface PayrollRecord {
  employeeId: string;
  name: string;
  office: string;
  position: string;
  monthlySalary: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  leaves: number;
  excessLeaves: number;
  deductionDays: number;
  perDaySalary: number;
  lateDeduction: number;
  halfDayDeduction: number;
  leaveDeduction: number;
  totalDeductions: number;
  netSalary: number;
  workingDays: number;
  dutyHours: number;
  reportingTime: string;
  allowedLateDays: number;
}

interface DetailModalProps {
  employee: PayrollRecord | null;
  onClose: () => void;
}

const DetailModal: React.FC<DetailModalProps> = ({ employee, onClose }) => {
  if (!employee) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{employee.name}</h2>
              <p className="text-blue-100 mt-1">{employee.employeeId} • {employee.office} • {employee.position}</p>
            </div>
            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Monthly Salary</p>
                  <p className="text-2xl font-bold">AED {employee.monthlySalary.toLocaleString()}</p>
                </div>
                <DollarSign className="w-8 h-8 text-green-200" />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Present Days</p>
                  <p className="text-2xl font-bold">{employee.presentDays}</p>
                </div>
                <Calendar className="w-8 h-8 text-blue-200" />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium">Total Deductions</p>
                  <p className="text-2xl font-bold">AED {employee.totalDeductions.toFixed(2)}</p>
                </div>
                <TrendingDown className="w-8 h-8 text-red-200" />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Net Salary</p>
                  <p className="text-2xl font-bold">AED {employee.netSalary.toFixed(2)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-200" />
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Attendance Details */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-blue-600" />
                Attendance Breakdown
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">Working Days</span>
                  <span className="font-semibold">{employee.workingDays}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">Present Days</span>
                  <span className="font-semibold text-green-600">{employee.presentDays}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">Absent Days</span>
                  <span className="font-semibold text-red-600">{employee.absentDays}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">Half Days</span>
                  <span className="font-semibold text-yellow-600">{employee.halfDays}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">Late Days</span>
                  <span className={`font-semibold ${employee.lateDays > employee.allowedLateDays ? 'text-red-600' : 'text-orange-600'}`}>
                    {employee.lateDays} / {employee.allowedLateDays} allowed
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">Total Leaves</span>
                  <span className="font-semibold text-purple-600">{employee.leaves}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Attendance %</span>
                  <span className="font-semibold text-blue-600">
                    {((employee.presentDays / employee.workingDays) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Salary Calculations */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calculator className="w-5 h-5 mr-2 text-green-600" />
                Salary Calculations
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">Per Day Salary</span>
                  <span className="font-semibold">AED {employee.perDaySalary.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">Late Deduction</span>
                  <span className="font-semibold text-red-600">-AED {employee.lateDeduction.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">Half Day Deduction</span>
                  <span className="font-semibold text-red-600">-AED {employee.halfDayDeduction.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">Leave Deduction</span>
                  <span className="font-semibold text-red-600">-AED {employee.leaveDeduction.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b-2 border-gray-300">
                  <span className="text-gray-600 font-medium">Total Deductions</span>
                  <span className="font-bold text-red-600">-AED {employee.totalDeductions.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-900 font-bold text-lg">Net Salary</span>
                  <span className="font-bold text-green-600 text-lg">AED {employee.netSalary.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Formula Explanation */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Calculation Formula</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p><strong>Per Day Salary:</strong> Monthly Salary ÷ Working Days</p>
              <p><strong>Late Deduction:</strong> Excess Late Days × 0.5 × Per Day Salary</p>
              <p><strong>Half Day Deduction:</strong> Half Days × 0.5 × Per Day Salary</p>
              <p><strong>Leave Deduction:</strong> If Leaves ≤ 2: Unpaid Leave Days × Per Day Salary</p>
              <p className="ml-16">If Leaves > 2: 2 × Per Day Salary + (Excess × 2 × Per Day Salary)</p>
              <p><strong>Net Salary:</strong> Monthly Salary - Total Deductions</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const getDefaultMonth = () => {
  const now = new Date();
  return { month: String(now.getMonth() + 1).padStart(2, '0'), year: String(now.getFullYear()) };
};

export const Reports: React.FC = () => {
  const [{ month, year }, setDate] = useState(getDefaultMonth());
  const [report, setReport] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<PayrollRecord | null>(null);
  const navigate = useNavigate();

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/reports/report?month=${month}&year=${year}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error(data.message || 'No data found');
      
      // Process data with advanced calculations
      const processedData = data.map((emp: any) => {
        const workingDays = 26; // This should come from holidays calculation
        const perDaySalary = emp.monthlySalary / workingDays;
        const allowedLateDays = 3;
        const allowedLeaves = 2;
        
        // Calculate excess late days
        const excessLateDays = Math.max(0, emp.lateDays - allowedLateDays);
        const lateDeduction = excessLateDays * 0.5 * perDaySalary;
        
        // Calculate half day deduction
        const halfDayDeduction = emp.halfDays * 0.5 * perDaySalary;
        
        // Calculate leave deduction
        let leaveDeduction = 0;
        if (emp.leaves <= allowedLeaves) {
          leaveDeduction = emp.leaves * perDaySalary;
        } else {
          const excessLeaves = emp.leaves - allowedLeaves;
          leaveDeduction = (allowedLeaves * perDaySalary) + (excessLeaves * 2 * perDaySalary);
        }
        
        const totalDeductions = lateDeduction + halfDayDeduction + leaveDeduction;
        const netSalary = emp.monthlySalary - totalDeductions;
        
        return {
          ...emp,
          workingDays,
          perDaySalary,
          allowedLateDays,
          excessLeaves: Math.max(0, emp.leaves - allowedLeaves),
          deductionDays: excessLateDays + emp.halfDays + emp.leaves,
          lateDeduction,
          halfDayDeduction,
          leaveDeduction,
          totalDeductions,
          netSalary,
          dutyHours: emp.dutyHours || 8,
          reportingTime: emp.reportingTime || '09:00'
        };
      });
      
      setReport(processedData);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [month, year]);

  const openEmployeeDetail = (employee: PayrollRecord) => {
    setSelectedEmployee(employee);
  };

  const exportToExcel = () => {
    if (report.length === 0) {
      alert('No data to export');
      return;
    }

    const exportData = report.map(emp => ({
      'Employee ID': emp.employeeId,
      'Name': emp.name,
      'Office': emp.office,
      'Position': emp.position,
      'Monthly Salary': emp.monthlySalary,
      'Present Days': emp.presentDays,
      'Half Days': emp.halfDays,
      'Late Days': emp.lateDays,
      'Leaves': emp.leaves,
      'Excess Leaves': emp.excessLeaves,
      'Deduction Days': emp.deductionDays,
      'Per Day Salary': emp.perDaySalary.toFixed(2),
      'Late Deduction': emp.lateDeduction.toFixed(2),
      'Half Day Deduction': emp.halfDayDeduction.toFixed(2),
      'Leave Deduction': emp.leaveDeduction.toFixed(2),
      'Total Deductions': emp.totalDeductions.toFixed(2),
      'Net Salary': emp.netSalary.toFixed(2)
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll Report');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `payroll_report_${year}_${month}.xlsx`);
  };

  // Calculate summary statistics
  const totalEmployees = report.length;
  const totalDeductions = report.reduce((sum, r) => sum + r.totalDeductions, 0);
  const totalNetSalary = report.reduce((sum, r) => sum + r.netSalary, 0);
  const totalGrossSalary = report.reduce((sum, r) => sum + r.monthlySalary, 0);
  const averageAttendance = report.length > 0
    ? report.reduce((sum, r) => sum + r.presentDays, 0) / report.length
    : 0;

  return (
    <MainLayout title="Payroll Reports" subtitle="Comprehensive salary calculations and attendance analysis">
      <div className="space-y-8">
        
        {/* Header Controls */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Payroll Report Generator</h2>
              <p className="text-gray-600">Advanced salary calculations with attendance analysis</p>
            </div>
            
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
                <select
                  value={month}
                  onChange={e => setDate(d => ({ ...d, month: e.target.value }))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                      {new Date(0, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                <select
                  value={year}
                  onChange={e => setDate(d => ({ ...d, year: e.target.value }))}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Array.from({ length: 5 }).map((_, i) => {
                    const y = new Date().getFullYear() - 2 + i;
                    return <option key={y} value={y}>{y}</option>;
                  })}
                </select>
              </div>
              
              <button
                onClick={exportToExcel}
                disabled={report.length === 0}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>Export Excel</span>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-center space-x-4">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <span className="text-red-800 font-medium">{error}</span>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Total Employees</p>
                <p className="text-3xl font-bold">{totalEmployees}</p>
              </div>
              <Users className="w-8 h-8 text-blue-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Gross Salary</p>
                <p className="text-2xl font-bold">AED {totalGrossSalary.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm font-medium">Total Deductions</p>
                <p className="text-2xl font-bold">AED {totalDeductions.toFixed(0)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-200" />
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Net Payroll</p>
                <p className="text-2xl font-bold">AED {totalNetSalary.toFixed(0)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-200" />
            </div>
          </div>
        </div>

        {/* Payroll Table */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-white">
                  Payroll Report - {new Date(0, parseInt(month) - 1).toLocaleString('default', { month: 'long' })} {year}
                </h3>
                <p className="text-indigo-100 mt-1">Click on any employee row to view detailed breakdown</p>
              </div>
              <FileText className="w-8 h-8 text-indigo-200" />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading payroll data...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Office</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Present Days</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Half Days</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Late Days</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Leaves</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Excess Leaves</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deduction Days</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Salary</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {report.map((emp, index) => (
                    <tr 
                      key={emp.employeeId}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                        emp.lateDays > emp.allowedLateDays ? 'bg-red-50' : ''
                      }`}
                      onClick={() => openEmployeeDetail(emp)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-semibold">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                            <div className="text-sm text-gray-500">{emp.employeeId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.office}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.presentDays}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm ${emp.halfDays > 0 ? 'text-yellow-600 font-medium' : 'text-gray-900'}`}>
                          {emp.halfDays}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm ${emp.lateDays > emp.allowedLateDays ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                          {emp.lateDays}
                          {emp.lateDays > emp.allowedLateDays && (
                            <AlertTriangle className="w-4 h-4 inline ml-1 text-red-500" />
                          )}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.leaves}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm ${emp.excessLeaves > 0 ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                          {emp.excessLeaves}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{emp.deductionDays}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        AED {emp.netSalary.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEmployeeDetail(emp);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 flex items-center space-x-1"
                        >
                          <Eye className="w-4 h-4" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!loading && report.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No payroll data found</p>
                        <p className="text-sm">Upload attendance data first to generate reports</p>
                        <button
                          onClick={() => navigate('/attendance')}
                          className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        >
                          Upload Attendance
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Detail Modal */}
        <DetailModal 
          employee={selectedEmployee} 
          onClose={() => setSelectedEmployee(null)} 
        />
      </div>
    </MainLayout>
  );
};