'use client';

import { useState } from 'react';

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [validation, setValidation] = useState<any>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const validateFile = async () => {
    if (!file) return;
    setIsValidating(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dataType', 'conversions');
    
    try {
      const response = await fetch('/api/imports/csv/validate', { method: 'POST', body: formData });
      const result = await response.json();
      setValidation(result);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const executeImport = async () => {
    if (!file || !validation?.success) return;
    setIsImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('mode', 'incremental');
    
    try {
      const response = await fetch('/api/imports/csv/execute', { method: 'POST', body: formData });
      const result = await response.json();
      setImportResult(result);
    } catch (error) {
      console.error('Import error:', error);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">CSV Data Import</h1>
      
      {/* File Upload */}
      <div className="mb-6 p-4 border rounded-lg">
        <h2 className="text-xl font-semibold mb-3">Select CSV File</h2>
        <input
          type="file"
          accept=".csv"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mb-3 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700"
        />
        {file && (
          <div className="text-sm text-gray-600">
            Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)
          </div>
        )}
        <button
          onClick={validateFile}
          disabled={!file || isValidating}
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300"
        >
          {isValidating ? 'Validating...' : 'Validate File'}
        </button>
      </div>

      {/* Validation Results */}
      {validation && (
        <div className="mb-6 p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Validation Results</h2>
          {validation.success ? (
            <div>
              <div className="text-green-600 mb-3">✅ File validation passed!</div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>Total Rows: {validation.file?.totalRows}</div>
                <div>Historical: {validation.analysis?.historical}</div>
                <div>Today: {validation.analysis?.today}</div>
                <div>Future: {validation.analysis?.future}</div>
              </div>
              {validation.errors?.length > 0 && (
                <div className="mt-3 text-red-600">
                  <div>Errors found:</div>
                  <ul className="list-disc pl-5">
                    {validation.errors.map((error: string, i: number) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
              <button
                onClick={executeImport}
                disabled={isImporting || validation.errors?.length > 0}
                className="mt-3 px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-300"
              >
                {isImporting ? 'Importing...' : 'Execute Import'}
              </button>
            </div>
          ) : (
            <div className="text-red-600">❌ Validation failed: {validation.error}</div>
          )}
        </div>
      )}

      {/* Import Results */}
      {importResult && (
        <div className="p-4 border rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Import Results</h2>
          {importResult.success ? (
            <div className="text-green-600">
              ✅ {importResult.message}
              <div className="mt-2 text-sm text-gray-600">
                Inserted: {importResult.stats?.inserted} | 
                Updated: {importResult.stats?.updated} | 
                Skipped: {importResult.stats?.skipped} | 
                Errors: {importResult.stats?.errors}
              </div>
            </div>
          ) : (
            <div className="text-red-600">❌ Import failed: {importResult.error}</div>
          )}
        </div>
      )}
    </div>
  );
}
