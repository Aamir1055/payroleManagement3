import React, { useState } from 'react';
import { Layout } from '../Layout/Layout';
import { API_BASE_URL } from '../../config/constants';

interface ImportSampleProps {
  onDataUpdate?: () => void;
}

const ImportSample: React.FC<ImportSampleProps> = ({ onDataUpdate }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsUploading(true);
    setMessage(null);
    setUploadProgress(0);

    const formData = new FormData(event.currentTarget);
    const file = formData.get('file') as File;

    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file to upload' });
      setIsUploading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/import/employees`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `Successfully imported ${result.imported} employees. ${result.errors.length} errors occurred.` 
        });
        if (onDataUpdate) {
          onDataUpdate();
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to import employees' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred during import' });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleGenerateSample = async () => {
    setIsGenerating(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-sample-data`, {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `Sample data generated successfully! Created ${result.employeesCount} employees and ${result.payrollsCount} payroll records.` 
        });
        if (onDataUpdate) {
          onDataUpdate();
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to generate sample data' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred during sample generation' });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearData = async () => {
    if (!confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/clear-data`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'All data cleared successfully' });
        if (onDataUpdate) {
          onDataUpdate();
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to clear data' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred during data clearing' });
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/export/template/employees`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'employee_import_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setMessage({ type: 'success', text: 'Template downloaded successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to download template' });
    }
  };

  const handleExportEmployees = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/export/employees`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'employees_export.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setMessage({ type: 'success', text: 'Employees exported successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export employees' });
    }
  };

  const handleExportPayroll = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/export/payrolls`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'payrolls_export.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setMessage({ type: 'success', text: 'Payroll data exported successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export payroll data' });
    }
  };

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = event.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
          file.type === 'application/vnd.ms-excel' || 
          file.type === 'text/csv') {
        const form = document.getElementById('import-form') as HTMLFormElement;
        const fileInput = form.querySelector('input[type=\"file\"]') as HTMLInputElement;
        fileInput.files = files;
      } else {
        setMessage({ type: 'error', text: 'Please drop a valid Excel or CSV file' });
      }
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  return (\n    <Layout>\n      <div className=\"max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8\">\n        <div className=\"mb-8\">\n          <h1 className=\"text-3xl font-bold text-gray-900\">Import & Sample Data</h1>\n          <p className=\"text-gray-600 mt-2\">Manage employee data imports and generate sample data for testing</p>\n        </div>\n\n        {message && (\n          <div className={`mb-6 p-4 rounded-md ${\n            message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' :\n            message.type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' :\n            'bg-blue-50 text-blue-800 border border-blue-200'\n          }`}>\n            <div className=\"flex items-center\">\n              <div className=\"flex-shrink-0\">\n                {message.type === 'success' ? '✅' : message.type === 'error' ? '❌' : 'ℹ️'}\n              </div>\n              <div className=\"ml-3\">\n                <p className=\"text-sm font-medium\">{message.text}</p>\n              </div>\n            </div>\n          </div>\n        )}\n\n        <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-8\">\n          {/* Import Section */}\n          <div className=\"bg-white rounded-lg shadow-sm border border-gray-200 p-6\">\n            <h2 className=\"text-xl font-semibold text-gray-900 mb-4\">Import Data</h2>\n            \n            <form id=\"import-form\" onSubmit={handleFileUpload} className=\"space-y-4\">\n              <div \n                className=\"border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors\"\n                onDrop={handleFileDrop}\n                onDragOver={handleDragOver}\n              >\n                <div className=\"text-gray-500 mb-2\">\n                  <svg className=\"mx-auto h-12 w-12\" stroke=\"currentColor\" fill=\"none\" viewBox=\"0 0 48 48\">\n                    <path d=\"M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02\" strokeWidth=\"2\" strokeLinecap=\"round\" strokeLinejoin=\"round\" />\n                  </svg>\n                </div>\n                <input\n                  type=\"file\"\n                  name=\"file\"\n                  accept=\".xlsx,.xls,.csv\"\n                  className=\"hidden\"\n                  id=\"file-upload\"\n                  disabled={isUploading}\n                />\n                <label htmlFor=\"file-upload\" className=\"cursor-pointer\">\n                  <span className=\"text-blue-600 hover:text-blue-500 font-medium\">\n                    Click to upload\n                  </span>\n                  <span className=\"text-gray-500\"> or drag and drop</span>\n                </label>\n                <p className=\"text-xs text-gray-500 mt-1\">\n                  Excel (.xlsx, .xls) or CSV files only\n                </p>\n              </div>\n              \n              {uploadProgress > 0 && (\n                <div className=\"w-full bg-gray-200 rounded-full h-2\">\n                  <div \n                    className=\"bg-blue-600 h-2 rounded-full transition-all duration-300\" \n                    style={{ width: `${uploadProgress}%` }}\n                  ></div>\n                </div>\n              )}\n              \n              <button \n                type=\"submit\" \n                disabled={isUploading}\n                className=\"w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors\"\n              >\n                {isUploading ? 'Uploading...' : 'Import Employees'}\n              </button>\n            </form>\n            \n            <div className=\"mt-4 pt-4 border-t border-gray-200\">\n              <button \n                onClick={handleDownloadTemplate}\n                className=\"w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors\"\n              >\n                📥 Download Import Template\n              </button>\n            </div>\n          </div>\n\n          {/* Export & Sample Section */}\n          <div className=\"bg-white rounded-lg shadow-sm border border-gray-200 p-6\">\n            <h2 className=\"text-xl font-semibold text-gray-900 mb-4\">Export & Sample Data</h2>\n            \n            <div className=\"space-y-3\">\n              <button \n                onClick={handleGenerateSample} \n                disabled={isGenerating}\n                className=\"w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors\"\n              >\n                {isGenerating ? 'Generating...' : '🎲 Generate Sample Data'}\n              </button>\n              \n              <button \n                onClick={handleExportEmployees}\n                className=\"w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors\"\n              >\n                📤 Export Employees\n              </button>\n              \n              <button \n                onClick={handleExportPayroll}\n                className=\"w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-200 transition-colors\"\n              >\n                📊 Export Payroll Data\n              </button>\n              \n              <button \n                onClick={handleClearData}\n                className=\"w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors\"\n              >\n                🗑️ Clear All Data\n              </button>\n            </div>\n          </div>\n        </div>\n\n        {/* Instructions */}\n        <div className=\"mt-8 bg-blue-50 rounded-lg p-6\">\n          <h3 className=\"text-lg font-semibold text-blue-900 mb-3\">Instructions</h3>\n          <div className=\"grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800\">\n            <div>\n              <h4 className=\"font-medium mb-2\">Import Data:</h4>\n              <ul className=\"list-disc list-inside space-y-1\">\n                <li>Download the template first</li>\n                <li>Fill in employee data</li>\n                <li>Upload the completed file</li>\n                <li>Review any import errors</li>\n              </ul>\n            </div>\n            <div>\n              <h4 className=\"font-medium mb-2\">Sample Data:</h4>\n              <ul className=\"list-disc list-inside space-y-1\">\n                <li>Generate sample employees for testing</li>\n                <li>Includes departments and positions</li>\n                <li>Creates payroll records</li>\n                <li>Use clear data to reset</li>\n              </ul>\n            </div>\n          </div>\n        </div>\n      </div>\n    </Layout>\n  );\n};\n\nexport default ImportSample;
