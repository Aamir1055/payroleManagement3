import React, { useState, useEffect } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import { Upload, Download, FileSpreadsheet, Users, Calendar, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
// Using fetch instead of axios

interface AttendanceRecord {
  employeeId: string;
  punchInTime: string;
  punchOutTime: string;
  date: string;
}

interface PreviewData {
  headers: string[];
  rows: any[][];
  fileName: string;
}

export const Payroll: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  // Generate payroll report
  const generatePayrollReport = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/payroll/report?month=${selectedMonth}&year=${selectedYear}`);
      const data = await response.json();
      setPayrollData(data);
    } catch (error) {
      console.error('Error generating payroll:', error);
      alert('Failed to generate payroll report');
    } finally {
      setLoading(false);
    }
  };

  // Download sample Excel template
  const downloadSampleExcel = () => {
    const sampleData = [
      {
        'EmployeeID': 'EMP001',
        'PunchInTime': '09:00',
        'PunchOutTime': '17:30',
        'Date': '2023-11-01'
      },
      {
        'EmployeeID': 'EMP002',
        'PunchInTime': '08:45',
        'PunchOutTime': '17:15',
        'Date': '2023-11-01'
      },
      {
        'EmployeeID': 'EMP001',
        'PunchInTime': '09:15',
        'PunchOutTime': '17:45',
        'Date': '2023-11-02'
      },
      {
        'EmployeeID': 'EMP002',
        'PunchInTime': '08:30',
        'PunchOutTime': '17:00',
        'Date': '2023-11-02'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, 'attendance_template.xlsx');
  };

  // Upload attendance Excel file with preview
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus('Reading file...');
    
    try {
      // Read Excel file
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      if (jsonData.length < 2) {
        throw new Error('File must contain headers and at least one data row');
      }

      // Extract headers and data rows
      const headers = jsonData[0];
      const rows = jsonData.slice(1).filter(row => row.some(cell => cell !== undefined && cell !== ''));

      // Generate preview
      setPreviewData({
        headers,
        rows: rows.slice(0, 10), // Show first 10 rows
        fileName: file.name
      });

      setUploadStatus('File loaded. Review the preview below and click "Upload Data" to process.');
      
    } catch (error: any) {
      console.error('File reading error:', error);
      setUploadStatus(`Error: ${error.message || 'Failed to read file'}`);
      setTimeout(() => setUploadStatus(''), 5000);
    }
  };

  // Process and upload the previewed data
  const processUpload = async () => {
    if (!previewData) return;

    setUploadStatus('Processing...');
    
    try {
      // Convert preview data to attendance records
      const attendanceRecords: AttendanceRecord[] = [];
      
      for (const row of previewData.rows) {
        if (row[0] && row[1] && row[2] && row[3]) { // EmployeeID, PunchInTime, PunchOutTime, Date
          attendanceRecords.push({
            employeeId: row[0],
            punchInTime: row[1],
            punchOutTime: row[2],
            date: row[3]
          });
        }
      }

      if (attendanceRecords.length === 0) {
        throw new Error('No valid attendance records found in the file');
      }

      // Upload to backend
      const response = await fetch('http://localhost:5000/api/attendance/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceData: attendanceRecords
        })
      });

      setUploadStatus(`Success! Uploaded ${attendanceRecords.length} attendance records.`);
      setPreviewData(null);
      setTimeout(() => setUploadStatus(''), 3000);
      
    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadStatus(`Error: ${error.message || 'Failed to upload attendance data'}`);
      setTimeout(() => setUploadStatus(''), 5000);
    }
  };

  // Export payroll to Excel
  const exportPayrollToExcel = () => {
    if (payrollData.length === 0) {
      alert('No payroll data to export. Generate a report first.');
      return;
    }

    const exportData = payrollData.map(emp => ({
      'Employee ID': emp.employeeId,
      'Name': emp.name,
      'Office': emp.office,
      'Position': emp.position,
      'Monthly Salary (AED)': emp.monthlySalary,
      'Present Days': emp.presentDays,
      'Absent Days': emp.absentDays,
      'Late Days': emp.lateDays,
      'Half Days': emp.halfDays,
      'Leaves': emp.leaves,
      'Deductions (AED)': emp.deductions,
      'Net Salary (AED)': emp.netSalary
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll');
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    saveAs(blob, `payroll_${selectedYear}_${selectedMonth.toString().padStart(2, '0')}.xlsx`);
  };

  return (
    <MainLayout title="Payroll Management" subtitle="Upload attendance and generate payroll reports">
      <div className="space-y-6">
        
        {/* Month/Year Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Calendar className="w-5 h-5 mr-2 text-blue-600" />
            Select Period
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Month</label>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - 2 + i;
                  return (
                    <option key={year} value={year}>{year}</option>
                  );
                })}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={generatePayrollReport}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Attendance Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <Upload className="w-5 h-5 mr-2 text-green-600" />
            Upload Attendance Data
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upload Section */}
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Upload Excel file with attendance data. Required columns: EmployeeID, PunchInTime, PunchOutTime, Date
              </p>
              
              <div className="space-y-4">
                <label
                  htmlFor="attendanceUpload"
                  className="cursor-pointer flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
                >
                  <Upload className="w-5 h-5 mr-2 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    Choose Excel File
                  </span>
                </label>
                <input
                  id="attendanceUpload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                
                {uploadStatus && (
                  <div className={`p-3 rounded-lg flex items-center ${
                    uploadStatus.includes('Success') 
                      ? 'bg-green-50 text-green-700' 
                      : uploadStatus.includes('File loaded')
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-red-50 text-red-700'
                  }`}>
                    <AlertCircle className="w-4 h-4 mr-2" />
                    {uploadStatus}
                  </div>
                )}
                
                {previewData && (
                  <button
                    onClick={processUpload}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    Upload Data ({previewData.rows.length} records)
                  </button>
                )}
              </div>
            </div>
            
            {/* Sample Download */}
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Download the sample Excel template to see the required format
              </p>
              
              <button
                onClick={downloadSampleExcel}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center justify-center border border-gray-300"
              >
                <Download className="w-5 h-5 mr-2" />
                Download Sample Excel
              </button>
              
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-700 font-medium">Sample Format:</p>
                <div className="text-xs text-blue-600 mt-1 font-mono">
                  EmployeeID | PunchInTime | PunchOutTime | Date<br />
                  EMP001 | 09:00 | 17:30 | 2023-11-01
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* File Preview */}
        {previewData && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <FileSpreadsheet className="w-5 h-5 mr-2 text-green-600" />
                File Preview: {previewData.fileName}
              </h2>
              <div className="text-sm text-gray-500">
                Showing {previewData.rows.length} of {previewData.rows.length} rows
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {previewData.headers.map((header, index) => (
                      <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {previewData.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-50">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {cell || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {previewData.rows.length >= 10 && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  📋 Preview shows first 10 rows. All {previewData.rows.length} rows will be processed when you upload.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Payroll Results */}
        {payrollData.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="w-5 h-5 mr-2 text-purple-600" />
                Payroll Report - {new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' })} {selectedYear}
              </h2>
              <button
                onClick={exportPayrollToExcel}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Excel
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Office</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Present Days</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Late Days</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deductions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Salary</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payrollData.map((employee, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{employee.name}</div>
                          <div className="text-sm text-gray-500">{employee.employeeId}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.office}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.presentDays}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm ${employee.lateDays > 3 ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                          {employee.lateDays}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">AED {employee.deductions}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        AED {employee.netSalary}
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