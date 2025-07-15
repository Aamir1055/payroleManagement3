import React, { useState } from 'react';
import { MainLayout } from '../components/Layout/MainLayout';
import * as XLSX from 'xlsx';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  FileDown, 
  Upload, 
  FileText, 
  Calendar,
  Clock,
  Users,
  TrendingUp,
  Info
} from 'lucide-react';

// Helper: Convert Excel serial date to YYYY-MM-DD string
function excelSerialToISODate(serial: number | string): string {
  if (typeof serial === 'number') {
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400 * 1000;
    const date = new Date(utcValue);
    if (serial >= 60) date.setUTCDate(date.getUTCDate() + 1);
    return date.toISOString().split('T')[0];
  }
  if (typeof serial === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(serial)) return serial;
  return String(serial);
}

const SAMPLE_DATA = [
  { 'Employee ID': 'EMP001', 'Name': 'John Doe', 'Date': '2025-01-01', 'Punch In': '09:00', 'Punch Out': '17:00' },
  { 'Employee ID': 'EMP002', 'Name': 'Jane Smith', 'Date': '2025-01-01', 'Punch In': '09:15', 'Punch Out': '16:45' },
  { 'Employee ID': 'EMP001', 'Name': 'John Doe', 'Date': '2025-01-02', 'Punch In': '08:45', 'Punch Out': '17:30' }
];

const AttendanceUpload: React.FC = () => {
  const navigate = useNavigate();
  const [previewRows, setPreviewRows] = useState<Array<any>>([]);
  const [headers, setHeaders] = useState<Array<string>>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMsg, setUploadMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadStats, setUploadStats] = useState<any>(null);

  // Download sample/template
  const downloadSample = () => {
    const ws = XLSX.utils.json_to_sheet(SAMPLE_DATA);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance Template');
    XLSX.writeFile(wb, 'attendance_template.xlsx');
  };

  // File selection & preview with conversion
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setUploadMsg('');
    setError('');
    setHeaders([]);
    setPreviewRows([]);
    setUploadStats(null);
    
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        if (rows.length < 2) throw new Error('No data found, or missing header row.');

        const headerRow = rows[0];
        setHeaders(headerRow);

        // Validate required columns
        const requiredColumns = ['Employee ID', 'Name', 'Date', 'Punch In', 'Punch Out'];
        const missingColumns = requiredColumns.filter(col => !headerRow.includes(col));
        
        if (missingColumns.length > 0) {
          throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
        }

        const dataRows = rows.slice(1, 11).map((arr) => {
          const obj: any = {};
          headerRow.forEach((k, i) => {
            if (k === 'Date' && arr[i] !== undefined && arr[i] !== null && arr[i] !== '') {
              obj[k] = excelSerialToISODate(arr[i]);
            } else {
              obj[k] = arr[i] ?? '';
            }
          });
          return obj;
        });
        
        const validRows = dataRows.filter(row => Object.values(row).some(Boolean));
        setPreviewRows(validRows);
        
        // Calculate preview stats
        const totalRows = rows.length - 1;
        const uniqueEmployees = new Set(validRows.map(row => row['Employee ID'])).size;
        const dateRange = validRows.length > 0 ? {
          start: Math.min(...validRows.map(row => new Date(row.Date).getTime())),
          end: Math.max(...validRows.map(row => new Date(row.Date).getTime()))
        } : null;
        
        setUploadStats({
          totalRecords: totalRows,
          validRecords: validRows.length,
          uniqueEmployees,
          dateRange: dateRange ? {
            start: new Date(dateRange.start).toLocaleDateString(),
            end: new Date(dateRange.end).toLocaleDateString()
          } : null
        });
        
      } catch (err: any) {
        setError(`⚠️ Could not parse file: ${err.message}`);
        setPreviewRows([]);
        setHeaders([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Upload attendance data
  const handleUpload = async () => {
    setError('');
    setUploadMsg('');
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }
    
    setLoading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('/api/attendance/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token') || ''}` },
        body: formData,
      });
      
      const data = await res.json();
      if (res.ok && data.success) {
        setUploadMsg(`✅ ${data.recordsProcessed} records uploaded successfully!`);
        // Clear form after successful upload
        setTimeout(() => {
          setSelectedFile(null);
          setPreviewRows([]);
          setHeaders([]);
          setUploadStats(null);
        }, 2000);
      } else {
        setError(data.message || 'Upload failed');
      }
    } catch (err) {
      setError('Failed to upload. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Navigate to reports
  const handleGenerateReport = () => {
    navigate('/reports');
  };

  return (
    <MainLayout title="Attendance Management" subtitle="Upload and manage employee attendance data">
      <div className="space-y-8">
        
        {/* Header Stats */}
        {uploadStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Records</p>
                  <p className="text-3xl font-bold">{uploadStats.totalRecords}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-200" />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Valid Records</p>
                  <p className="text-3xl font-bold">{uploadStats.validRecords}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-200" />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Employees</p>
                  <p className="text-3xl font-bold">{uploadStats.uniqueEmployees}</p>
                </div>
                <Users className="w-8 h-8 text-purple-200" />
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-100 text-sm font-medium">Date Range</p>
                  <p className="text-sm font-semibold">
                    {uploadStats.dateRange ? `${uploadStats.dateRange.start} - ${uploadStats.dateRange.end}` : 'N/A'}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-orange-200" />
              </div>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-6">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 p-3 rounded-full">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Upload Attendance Data</h2>
                <p className="text-indigo-100 mt-1">Upload daily or monthly punch-in sheets</p>
              </div>
            </div>
          </div>

          <div className="p-8">
            {/* Required Format Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
              <div className="flex items-start space-x-4">
                <Info className="w-6 h-6 text-blue-600 mt-1 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">Required Format</h3>
                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <div className="font-mono text-sm text-gray-800 grid grid-cols-5 gap-4 font-semibold border-b border-gray-200 pb-2 mb-2">
                      <span>Employee ID</span>
                      <span>Name</span>
                      <span>Date</span>
                      <span>Punch In</span>
                      <span>Punch Out</span>
                    </div>
                    <div className="font-mono text-sm text-gray-600 grid grid-cols-5 gap-4">
                      <span>EMP001</span>
                      <span>John Doe</span>
                      <span>2025-01-01</span>
                      <span>09:00</span>
                      <span>17:00</span>
                    </div>
                  </div>
                  <div className="mt-4 text-sm text-blue-700">
                    <p><strong>Data Processing Rules:</strong></p>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Daily hours worked = Punch Out - Punch In</li>
                      <li>Late flag = Punch In > Reporting Time</li>
                      <li>Missing data = Absent</li>
                      <li>Supports Excel (.xlsx, .xls) and CSV formats</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* File Upload Area */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <label className="block text-lg font-semibold text-gray-900 mb-4">
                    Select Attendance File
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Upload className="w-12 h-12 text-gray-400 mb-4" />
                        <p className="mb-2 text-lg font-medium text-gray-700">
                          Click to upload attendance file
                        </p>
                        <p className="text-sm text-gray-500">Excel (.xlsx, .xls) or CSV files</p>
                        <p className="text-xs text-gray-400 mt-2">Maximum file size: 10MB</p>
                      </div>
                    </label>
                  </div>
                  
                  {selectedFile && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-900">{selectedFile.name}</p>
                          <p className="text-sm text-green-700">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex space-x-4">
                  <button
                    onClick={handleUpload}
                    disabled={loading || !selectedFile}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        <span>Upload Data</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={downloadSample}
                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors flex items-center space-x-2"
                  >
                    <FileDown className="w-5 h-5" />
                    <span>Download Template</span>
                  </button>
                </div>
              </div>

              {/* Attendance Rules */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-indigo-600" />
                  Attendance Rules
                </h3>
                <div className="space-y-4 text-sm">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-green-700 mb-2">✅ Full Day</h4>
                    <p className="text-gray-600">Worked hours ≥ Duty Hours</p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-yellow-700 mb-2">⚠️ Half Day</h4>
                    <p className="text-gray-600">Worked hours &lt; (Duty Hours ÷ 2) → 0.5 day deduction</p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-red-700 mb-2">❌ Absent</h4>
                    <p className="text-gray-600">No Punch In/Out → 1 leave</p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-blue-700 mb-2">🕐 Late Arrival</h4>
                    <p className="text-gray-600">Punch In &gt; Reporting Time → count as Late</p>
                    <p className="text-xs text-gray-500 mt-1">3 allowed per month, excess = 0.5 day deduction</p>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-purple-700 mb-2">🏖️ Leave Policy</h4>
                    <p className="text-gray-600">2 unpaid allowed per month</p>
                    <p className="text-xs text-gray-500 mt-1">Each excess leave = 2 full days salary deduction</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Table */}
        {previewRows.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="bg-white/20 p-3 rounded-full">
                    <CheckCircle className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">File Preview</h2>
                    <p className="text-green-100 mt-1">Showing first 10 rows • {previewRows.length} valid records found</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {headers.map((header, index) => (
                        <th key={index} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewRows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50">
                        {headers.map((header, cellIndex) => (
                          <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {row[header] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {(error || uploadMsg) && (
          <div className={`rounded-xl p-6 flex items-center space-x-4 ${
            error
              ? 'bg-red-50 border border-red-200 text-red-800'
              : 'bg-green-50 border border-green-200 text-green-800'
          }`}>
            {error ? (
              <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
            ) : (
              <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
            )}
            <span className="font-medium">{error || uploadMsg}</span>
          </div>
        )}

        {/* Generate Report Button */}
        <div className="flex justify-center">
          <button
            onClick={handleGenerateReport}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-xl text-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all flex items-center space-x-3 shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            <TrendingUp className="w-6 h-6" />
            <span>Generate Payroll Report</span>
          </button>
        </div>
      </div>
    </MainLayout>
  );
};

export default AttendanceUpload;