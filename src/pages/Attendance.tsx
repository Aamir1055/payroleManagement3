

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { MainLayout } from '../components/Layout/MainLayout';
import { Upload, FileText, AlertCircle } from 'lucide-react';

export const Attendance: React.FC = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [previewData, setPreviewData] = useState<any[][]>([]);

  const formatDate = (excelDate: any): string => {
    const jsDate = typeof excelDate === 'number'
      ? new Date((excelDate - 25569) * 86400 * 1000)
      : new Date(excelDate);
    return jsDate.toLocaleDateString('en-GB'); // DD/MM/YYYY
  };

  const formatTime = (excelTime: any): string => {
    if (typeof excelTime === 'number') {
      const totalSeconds = Math.round((excelTime - Math.floor(excelTime)) * 86400);
      const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    return excelTime;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      setUploadedFiles(prev => [...prev, ...files]);
      previewFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setUploadedFiles(prev => [...prev, ...filesArray]);
      previewFile(filesArray[0]);
    }
  };

  const previewFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const headers = jsonData[0];
      const rows = jsonData.slice(1, 6).map(row => {
        const rowObj: any[] = [];
        headers.forEach((header, i) => {
          if (header === 'Date') {
            rowObj.push(formatDate(row[i]));
          } else if (header === 'Punch In' || header === 'Punch Out') {
            rowObj.push(formatTime(row[i]));
          } else {
            rowObj.push(row[i]);
          }
        });
        return rowObj;
      });

      setPreviewData([headers, ...rows]);
    };
    reader.readAsBinaryString(file);
  };

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    if (index === 0 && newFiles.length > 0) {
      previewFile(newFiles[0]);
    } else if (newFiles.length === 0) {
      setPreviewData([]);
    }
  };

  const processFiles = async () => {
    if (uploadedFiles.length === 0) {
      alert('Please upload a file first');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadedFiles[0]);

    try {
      const response = await fetch('http://localhost:5000/api/attendance/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        if (result.affectedRows > 0) {
          alert(`✅ ${result.affectedRows} attendance record(s) saved or updated.`);
        } else {
          alert('ℹ️ No new attendance records were added or updated.');
        }
        setUploadedFiles([]);
        setPreviewData([]);
      } else {
        alert(result.error || '❌ Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('❌ Something went wrong uploading attendance');
    }
  };

  // Download Template Function (without Name column)
  const downloadTemplate = () => {
    const headers = ["Employee ID", "Date", "Punch In", "Punch Out"];
    const dummyRows = [
      ["E001", "2025-07-01", "09:00", "17:00"],
      ["E002", "2025-07-01", "09:15", "17:30"],
      ["E003", "2025-07-01", "08:45", "16:45"],
    ];
    
    const worksheetData = [headers, ...dummyRows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Template");
    
    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbout], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = "attendance_template.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <MainLayout title="Upload Attendance" subtitle="Upload daily attendance sheets and process payroll data">
      <div className="space-y-6">
        {/* Upload Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="text-sm font-medium text-blue-900">Upload Requirements</h3>
              <ul className="mt-2 text-sm text-blue-800 list-disc list-inside space-y-1">
                <li>Supported formats: Excel (.xlsx, .xls) or CSV (.csv)</li>
                <li>Required columns: Employee ID, Date, Punch In, Punch Out</li>
                <li>Date format: YYYY-MM-DD or MM/DD/YYYY</li>
                <li>Time format: HH:MM (24-hour format preferred)</li>
              </ul>
              {/* Download Template Link */}
              <div className="mt-4">
                <button
                  onClick={downloadTemplate}
                  className="text-blue-600 underline text-sm hover:text-blue-800"
                  type="button"
                >
                  Download Attendance Template Excel
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* File Upload Area */}
        <div
          className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${
            dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300 hover:border-gray-400"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Attendance Files</h3>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer`}
            onClick={() => document.getElementById('file-upload')?.click()}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">Drop files here or click to upload</h4>
            <p className="text-sm text-gray-500 mb-4">Support for Excel and CSV files up to 10MB each</p>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".xlsx,.xls,.csv"
              multiple
              onChange={handleFileSelect}
            />
          </div>

          {/* Uploaded Files List */}
          {uploadedFiles.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Uploaded Files</h4>
              <div className="space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-900">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={processFiles}
                  className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  Process Files
                </button>
              </div>
            </div>
          )}

          {/* File Preview Section */}
          {previewData.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-2">File Preview (First 5 Rows)</h4>
              <div className="overflow-auto border rounded">
                <table className="min-w-full text-sm text-left">
                  <tbody>
                    {previewData.map((row, i) => (
                      <tr key={i} className="border-b">
                        {row.map((cell: any, j: number) => (
                          <td key={j} className="px-4 py-2 whitespace-nowrap">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
};
