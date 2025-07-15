import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { CheckCircle, AlertCircle, Loader2, FileDown, Upload, FileText } from 'lucide-react';

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
  { 'Employee ID': 'EMP001', 'Date': '2025-07-01', 'Punch In': '09:00', 'Punch Out': '17:00' },
  { 'Employee ID': 'EMP002', 'Date': '2025-07-01', 'Punch In': '09:15', 'Punch Out': '16:45' }
];

interface AttendanceUploadProps {
  onReportNavigate: () => void;
}

const AttendanceUpload: React.FC<AttendanceUploadProps> = ({ onReportNavigate }) => {
  const [previewRows, setPreviewRows] = useState<Array<any>>([]);
  const [headers, setHeaders] = useState<Array<string>>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMsg, setUploadMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1: Downloadable sample/template
  const downloadSample = () => {
    const ws = XLSX.utils.json_to_sheet(SAMPLE_DATA);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sample');
    XLSX.writeFile(wb, 'attendance_template.xlsx');
  };

  // Step 2: File selection & preview with conversion
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    setUploadMsg('');
    setError('');
    setHeaders([]);
    setPreviewRows([]);
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

        const dataRows = rows.slice(1, 6).map((arr) => {
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
        setPreviewRows(dataRows.filter(row => Object.values(row).some(Boolean)));
      } catch {
        setError('⚠️ Could not parse file. Please ensure your Excel or CSV matches the required format.');
        setPreviewRows([]);
        setHeaders([]);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Step 3: Upload
  const handleUpload = async () => {
    setError('');
    setUploadMsg('');
    if (!selectedFile) {
      setError('Please select a file to upload.');
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
        setUploadMsg(`${data.recordsProcessed} records uploaded successfully.`);
      } else {
        setError(data.message || 'Upload failed.');
      }
    } catch {
      setError('Failed to upload. Try again.');
    } finally {
      setLoading(false);
    }
  };

  // --- UI ---
  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8 mt-12 space-y-8 border border-gray-100">
      {/* Stepper/Heading */}
      <div className="flex gap-6 items-center mb-3">
        <FileText className="w-8 h-8 text-blue-600" />
        <span className="font-bold text-2xl tracking-tight text-gray-800">
          Step 1: Download or Review Template
        </span>
      </div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="block text-md font-semibold text-gray-800">Required columns:</span>
          <ul className="text-gray-700 list-disc pl-6 mt-1 text-sm">
            <li>
              <code>Employee ID</code>, <code>Date</code> (<span className="font-mono">YYYY-MM-DD</span>), 
              <code>Punch In</code> (<span className="font-mono">HH:MM</span>), 
              <code>Punch Out</code> (<span className="font-mono">HH:MM</span>)
            </li>
            <li>
              <span className="italic text-gray-500">Example: </span>
              <span className="font-mono bg-gray-50 p-1 rounded border border-gray-200 text-xs">
                EMP001, 2025-07-01, 09:00, 17:00
              </span>
            </li>
          </ul>
        </div>
        <button
          onClick={downloadSample}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg transition font-semibold"
        >
          <FileDown className="w-5 h-5" />
          Download Sample File
        </button>
      </div>

      {/* Step 2: File select & preview */}
      <div className="flex gap-6 items-center mb-2">
        <Upload className="w-8 h-8 text-green-600" />
        <span className="font-bold text-2xl tracking-tight text-gray-800">Step 2: Upload & Preview</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="border-2 border-dashed border-gray-300 px-3 py-2 focus:border-blue-600 rounded-lg transition"
        />
        <button
          disabled={loading}
          className={`flex items-center gap-2 bg-blue-600 text-white px-5 py-2 rounded-lg shadow-sm hover:bg-blue-700 transition font-semibold ${loading ? 'opacity-60' : ''}`}
          onClick={handleUpload}
        >
          {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Upload className="w-5 h-5" />}
          Upload
        </button>
      </div>
      <div className="text-xs text-gray-500 mb-1">
        Supported formats: <span className="font-mono">.xlsx</span>, <span className="font-mono">.xls</span>, <span className="font-mono">.csv</span>
      </div>

      {/* Preview Table */}
      {previewRows.length > 0 && (
        <div className="border rounded-xl bg-gray-50 p-4 mt-2 overflow-x-auto shadow-sm">
          <div className="font-semibold mb-2 text-gray-800 text-base flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            File Preview (first 5 rows):
          </div>
          <table className="table-auto w-full text-sm border border-gray-200 rounded">
            <thead>
              <tr>
                {headers.map(h => (
                  <th key={h} className="text-left bg-blue-50 border-b px-2 py-1 text-blue-700 border-r last:border-r-0">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, idx) => (
                <tr key={idx} className={idx % 2 ? 'bg-white' : 'bg-gray-50'}>
                  {headers.map(k => (
                    <td
                      key={k}
                      className={`border-b px-2 py-1 border-r last:border-r-0 last:rounded-ee-xl ${k === 'Date' ? 'font-mono text-blue-700' : ''}`}
                    >
                      {row[k] === '' || row[k] === undefined
                        ? <span className="text-gray-400 italic">empty</span>
                        : row[k]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Alerts and status */}
      {(error || uploadMsg) && (
        <div className={`flex items-center gap-2 mt-3 p-3 rounded-xl font-medium transition-all ${
          error
            ? 'bg-red-100 border-l-4 border-red-500 text-red-900'
            : 'bg-green-100 border-l-4 border-green-500 text-green-900'
        }`}>
          {error ? <AlertCircle className="w-5 h-5 text-red-500" /> : <CheckCircle className="w-5 h-5 text-green-600" />}
          <span>{error || uploadMsg}</span>
        </div>
      )}

      {/* Step 3: Generate Report button */}
      <div className="flex justify-end pt-2">
        <button
          className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-xl text-base font-semibold hover:bg-green-700 shadow transition"
          onClick={onReportNavigate}
        >
          <FileText className="w-5 h-5" />
          Generate Report
        </button>
      </div>
    </div>
  );
};

export default AttendanceUpload;
