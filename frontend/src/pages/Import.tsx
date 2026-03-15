import { useState, useCallback, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import api from '../lib/api';

type Step = 'upload' | 'map' | 'preview' | 'done';

interface ColumnMapping {
  date: string;
  amount: string;
  description: string;
  category: string;
}

interface ParsedRow {
  [key: string]: string;
}

export default function Import() {
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [fileHash, setFileHash] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: '',
    amount: '',
    description: '',
    category: '',
  });
  const [defaultType, setDefaultType] = useState<'income' | 'expense'>('expense');
  const [importResults, setImportResults] = useState({ imported: 0, errors: 0, total_rows: 0 });
  const [importing, setImporting] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    setUploadError('');
    setFileName(file.name);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post('/csv/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setFileHash(data.file_hash);
      setHeaders(data.headers);
      setPreviewRows(data.preview || []);
      setRowCount(data.row_count);

      // Use suggested mapping from backend
      const suggested = data.suggested_mapping || {};
      setMapping({
        date: suggested.date || '',
        amount: suggested.amount || '',
        description: suggested.description || '',
        category: suggested.category || '',
      });

      if (data.is_duplicate) {
        setUploadError('Warning: This file appears to have been imported before.');
      }

      setStep('map');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setUploadError(error.response?.data?.error?.message || 'Failed to upload file.');
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.csv')) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const columnMapping: Record<string, string> = {};
      if (mapping.date) columnMapping.date = mapping.date;
      if (mapping.amount) columnMapping.amount = mapping.amount;
      if (mapping.description) columnMapping.description = mapping.description;
      if (mapping.category) columnMapping.category = mapping.category;

      const { data } = await api.post('/csv/confirm', {
        filename: fileName,
        file_hash: fileHash,
        column_mapping: columnMapping,
        default_type: defaultType,
      });

      setImportResults({
        imported: data.imported || 0,
        errors: (data.errors || []).length,
        total_rows: data.total_rows || 0,
      });
      setStep('done');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      alert(error.response?.data?.error?.message || 'Import failed. Please try again.');
    }
    setImporting(false);
  };

  const steps: { key: Step; label: string; num: number }[] = [
    { key: 'upload', label: 'Upload', num: 1 },
    { key: 'map', label: 'Map Columns', num: 2 },
    { key: 'preview', label: 'Preview', num: 3 },
    { key: 'done', label: 'Done', num: 4 },
  ];

  const stepOrder: Step[] = ['upload', 'map', 'preview', 'done'];
  const currentIdx = stepOrder.indexOf(step);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Import Transactions</h1>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i <= currentIdx
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-500 border border-gray-700'
              }`}
            >
              {s.num}
            </div>
            <span
              className={`ml-2 text-sm ${i <= currentIdx ? 'text-gray-200' : 'text-gray-500'}`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div className={`w-12 h-0.5 mx-3 ${i < currentIdx ? 'bg-blue-600' : 'bg-gray-700'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="bg-gray-900 rounded-xl border-2 border-dashed border-gray-700 hover:border-blue-500 p-16 text-center transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload size={48} className="mx-auto text-gray-500 mb-4" />
            <p className="text-gray-300 mb-2">Drag and drop a CSV file here</p>
            <p className="text-gray-500 text-sm mb-4">or click to browse</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelect(file);
              }}
            />
            <div className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              <FileText size={16} />
              Choose CSV File
            </div>
          </div>
          {uploadError && (
            <div className="mt-3 flex items-center gap-2 text-yellow-400 text-sm">
              <AlertCircle size={16} />
              {uploadError}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Map Columns */}
      {step === 'map' && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Map Columns</h2>
              <p className="text-sm text-gray-400 mt-1">
                File: {fileName} ({rowCount} rows found)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['date', 'amount', 'description', 'category'] as const).map((field) => (
              <div key={field}>
                <label className="block text-sm text-gray-400 mb-1 capitalize">{field} Column</label>
                <select
                  value={mapping[field]}
                  onChange={(e) => setMapping((m) => ({ ...m, [field]: e.target.value }))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Select column --</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Default Transaction Type</label>
            <div className="flex gap-2">
              {(['income', 'expense'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setDefaultType(t)}
                  className={`px-4 py-1.5 rounded-lg text-sm capitalize transition-colors ${
                    defaultType === t
                      ? t === 'income'
                        ? 'bg-green-600 text-white'
                        : 'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-400 border border-gray-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Negative amounts will automatically be treated as expenses.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('preview')}
              disabled={!mapping.date || !mapping.amount || !mapping.description}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Next: Preview
            </button>
            <button
              onClick={() => { setStep('upload'); setHeaders([]); setPreviewRows([]); setFileName(''); setFileHash(''); }}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-5 py-2 rounded-lg text-sm transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
          <h2 className="text-lg font-semibold">Preview (first {previewRows.length} rows)</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-gray-400">
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => {
                  const amountStr = row[mapping.amount] || '0';
                  const amountNum = parseFloat(amountStr.replace(/[^0-9.-]/g, ''));
                  const type = amountNum < 0 ? 'expense' : defaultType;
                  return (
                    <tr key={i} className="border-b border-gray-800/50">
                      <td className="px-3 py-2 text-gray-300">{row[mapping.date]}</td>
                      <td className="px-3 py-2 text-gray-200">{row[mapping.description]}</td>
                      <td className={`px-3 py-2 font-medium ${type === 'expense' ? 'text-red-400' : 'text-green-400'}`}>
                        ${Math.abs(amountNum).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-gray-400">{mapping.category ? row[mapping.category] : '-'}</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                          type === 'expense' ? 'bg-red-400/10 text-red-400' : 'bg-green-400/10 text-green-400'
                        }`}>
                          {type}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="text-sm text-gray-400">
            {rowCount} total rows will be imported.
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={importing}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {importing ? 'Importing...' : `Import ${rowCount} Transactions`}
            </button>
            <button
              onClick={() => setStep('map')}
              disabled={importing}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-5 py-2 rounded-lg text-sm transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Done */}
      {step === 'done' && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <CheckCircle size={48} className="mx-auto text-green-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Import Complete</h2>
          <div className="space-y-2 mb-6">
            <p className="text-green-400 flex items-center justify-center gap-2">
              <CheckCircle size={16} />
              {importResults.imported} transactions imported successfully
            </p>
            {importResults.errors > 0 && (
              <p className="text-red-400 flex items-center justify-center gap-2">
                <AlertCircle size={16} />
                {importResults.errors} rows had errors and were skipped
              </p>
            )}
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => {
                setStep('upload');
                setHeaders([]);
                setPreviewRows([]);
                setFileName('');
                setFileHash('');
              }}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-5 py-2 rounded-lg text-sm transition-colors"
            >
              Import Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
