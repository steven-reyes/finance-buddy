import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText, Camera, Trash2, Plus, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { useCategories } from '../hooks/useCategories';
import { toCents, toDollars } from '../lib/format';

type Step = 'upload' | 'map' | 'preview' | 'done';
type OcrStep = 'upload' | 'review' | 'done';
type Tab = 'csv' | 'screenshot';

interface ColumnMapping {
  date: string;
  amount: string;
  description: string;
  category: string;
}

interface ParsedRow {
  [key: string]: string;
}

interface OcrTransaction {
  type: 'income' | 'expense';
  amount: number; // cents
  date: string;
  description: string;
  category_id?: number;
}

interface OcrUploadResponse {
  upload_id: number;
  filename: string;
  raw_text: string;
  transactions: { amount: number; date: string; description: string; type: 'income' | 'expense' }[];
  count: number;
}

// ─── CSV Import (original functionality) ────────────────────────────

function CsvImport() {
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
    <div className="space-y-6">
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
            <p className="text-gray-500 text-sm mb-2">or click to browse</p>
            <p className="text-gray-600 text-xs">Supports bank statement exports, credit card CSVs, and any CSV with transaction data</p>
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

// ─── Screenshot / OCR Import ────────────────────────────────────────

function ScreenshotImport() {
  const [ocrStep, setOcrStep] = useState<OcrStep>('upload');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadId, setUploadId] = useState<number | null>(null);
  const [rawText, setRawText] = useState('');
  const [transactions, setTransactions] = useState<OcrTransaction[]>([]);
  const [showRawText, setShowRawText] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [createdCount, setCreatedCount] = useState(0);
  const [ocrAvailable, setOcrAvailable] = useState<boolean | null>(null);
  const [ocrMessage, setOcrMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categories } = useCategories();

  // Check OCR availability on mount
  useEffect(() => {
    api.get('/ocr/status')
      .then(({ data }) => {
        setOcrAvailable(data.available);
        setOcrMessage(data.message || '');
      })
      .catch(() => {
        setOcrAvailable(false);
        setOcrMessage('Could not check OCR availability.');
      });
  }, []);

  const handleImageUpload = useCallback(async (file: File) => {
    setUploadError('');
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await api.post<OcrUploadResponse>('/ocr/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setUploadId(data.upload_id);
      setRawText(data.raw_text);
      setTransactions(
        data.transactions.map((t) => ({
          type: t.type,
          amount: t.amount, // already in cents from API
          date: t.date,
          description: t.description,
          category_id: undefined,
        }))
      );
      setOcrStep('review');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      setUploadError(error.response?.data?.error?.message || 'Failed to process image.');
    }
    setUploading(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && /\.(jpg|jpeg|png)$/i.test(file.name)) {
        handleImageUpload(file);
      }
    },
    [handleImageUpload]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const updateTransaction = (index: number, field: keyof OcrTransaction, value: string | number) => {
    setTransactions((prev) =>
      prev.map((t, i) => (i === index ? { ...t, [field]: value } : t))
    );
  };

  const deleteTransaction = (index: number) => {
    setTransactions((prev) => prev.filter((_, i) => i !== index));
  };

  const addTransaction = () => {
    const today = new Date().toISOString().slice(0, 10);
    setTransactions((prev) => [
      ...prev,
      { type: 'expense', amount: 0, date: today, description: '', category_id: undefined },
    ]);
  };

  const handleConfirm = async () => {
    if (!uploadId) return;
    setConfirming(true);
    try {
      const { data } = await api.post('/ocr/confirm', {
        upload_id: uploadId,
        transactions: transactions.map((t) => ({
          type: t.type,
          amount: t.amount,
          date: t.date,
          description: t.description,
          category_id: t.category_id,
        })),
      });
      setCreatedCount(data.created);
      setOcrStep('done');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      alert(error.response?.data?.error?.message || 'Failed to confirm transactions.');
    }
    setConfirming(false);
  };

  const resetOcr = () => {
    setOcrStep('upload');
    setUploadId(null);
    setRawText('');
    setTransactions([]);
    setUploadError('');
    setShowRawText(false);
    setCreatedCount(0);
  };

  const ocrSteps: { key: OcrStep; label: string; num: number }[] = [
    { key: 'upload', label: 'Upload Image', num: 1 },
    { key: 'review', label: 'Review & Edit', num: 2 },
    { key: 'done', label: 'Done', num: 3 },
  ];
  const ocrStepOrder: OcrStep[] = ['upload', 'review', 'done'];
  const currentIdx = ocrStepOrder.indexOf(ocrStep);

  // OCR not available banner
  if (ocrAvailable === false) {
    return (
      <div className="space-y-6">
        <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-5 flex items-start gap-3">
          <AlertCircle size={20} className="text-yellow-400 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-yellow-300 font-medium mb-1">OCR Not Available</h3>
            <p className="text-yellow-400/80 text-sm">
              {ocrMessage || 'Tesseract OCR is not installed on the server.'}
            </p>
            <p className="text-yellow-400/60 text-sm mt-2">
              To enable screenshot import, install Tesseract OCR on the server:
            </p>
            <ul className="text-yellow-400/60 text-sm mt-1 list-disc list-inside space-y-1">
              <li>Ubuntu/Debian: <code className="bg-yellow-900/50 px-1 rounded">sudo apt install tesseract-ocr</code></li>
              <li>macOS: <code className="bg-yellow-900/50 px-1 rounded">brew install tesseract</code></li>
              <li>Windows: Download from <code className="bg-yellow-900/50 px-1 rounded">github.com/UB-Mannheim/tesseract/wiki</code></li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Still loading status
  if (ocrAvailable === null) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
        <Loader2 size={20} className="animate-spin" />
        Checking OCR availability...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {ocrSteps.map((s, i) => (
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
            {i < ocrSteps.length - 1 && (
              <div className={`w-12 h-0.5 mx-3 ${i < currentIdx ? 'bg-blue-600' : 'bg-gray-700'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Upload Image */}
      {ocrStep === 'upload' && (
        <div>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="bg-gray-900 rounded-xl border-2 border-dashed border-gray-700 hover:border-blue-500 p-16 text-center transition-colors cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 size={48} className="text-blue-400 animate-spin" />
                <p className="text-gray-300">Processing image with OCR...</p>
                <p className="text-gray-500 text-sm">This may take a few seconds</p>
              </div>
            ) : (
              <>
                <Camera size={48} className="mx-auto text-gray-500 mb-4" />
                <p className="text-gray-300 mb-2">Drag and drop a screenshot or receipt image</p>
                <p className="text-gray-500 text-sm mb-4">Supports JPG and PNG files</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
                <div className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                  <Camera size={16} />
                  Choose Image
                </div>
              </>
            )}
          </div>
          {uploadError && (
            <div className="mt-3 flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              {uploadError}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Review & Edit */}
      {ocrStep === 'review' && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Review Extracted Transactions</h2>
              <p className="text-sm text-gray-400 mt-1">
                {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} found. Edit, add, or remove as needed.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-left text-gray-400">
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium">Amount ($)</th>
                  <th className="px-3 py-2 font-medium">Date</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium w-12"></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn, i) => (
                  <tr key={i} className="border-b border-gray-800/50">
                    <td className="px-3 py-2">
                      <button
                        onClick={() => updateTransaction(i, 'type', txn.type === 'expense' ? 'income' : 'expense')}
                        className={`text-xs px-2.5 py-1 rounded capitalize transition-colors ${
                          txn.type === 'expense'
                            ? 'bg-red-400/10 text-red-400 hover:bg-red-400/20'
                            : 'bg-green-400/10 text-green-400 hover:bg-green-400/20'
                        }`}
                      >
                        {txn.type}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={toDollars(txn.amount).toFixed(2)}
                        onChange={(e) => {
                          const dollars = parseFloat(e.target.value) || 0;
                          updateTransaction(i, 'amount', toCents(dollars));
                        }}
                        className="w-24 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        value={txn.date}
                        onChange={(e) => updateTransaction(i, 'date', e.target.value)}
                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={txn.description}
                        onChange={(e) => updateTransaction(i, 'description', e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Description"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={txn.category_id ?? ''}
                        onChange={(e) =>
                          updateTransaction(i, 'category_id', e.target.value ? Number(e.target.value) : (undefined as unknown as number))
                        }
                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- None --</option>
                        {categories
                          ?.filter((c) => c.type === txn.type)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => deleteTransaction(i)}
                        className="text-gray-500 hover:text-red-400 transition-colors p-1"
                        title="Remove row"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {transactions.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">
              No transactions. Add one manually below.
            </p>
          )}

          <button
            onClick={addTransaction}
            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Plus size={16} />
            Add Row
          </button>

          {/* Raw OCR Text collapsible */}
          <div className="border-t border-gray-800 pt-4">
            <button
              onClick={() => setShowRawText(!showRawText)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
            >
              {showRawText ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              {showRawText ? 'Hide' : 'Show'} Raw OCR Text
            </button>
            {showRawText && (
              <pre className="mt-3 bg-gray-800 border border-gray-700 rounded-lg p-4 text-xs text-gray-400 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                {rawText || '(No text extracted)'}
              </pre>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleConfirm}
              disabled={confirming || transactions.length === 0}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {confirming ? 'Importing...' : `Import ${transactions.length} Transaction${transactions.length !== 1 ? 's' : ''}`}
            </button>
            <button
              onClick={resetOcr}
              disabled={confirming}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-5 py-2 rounded-lg text-sm transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Done */}
      {ocrStep === 'done' && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <CheckCircle size={48} className="mx-auto text-green-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Import Complete</h2>
          <div className="space-y-2 mb-6">
            <p className="text-green-400 flex items-center justify-center gap-2">
              <CheckCircle size={16} />
              {createdCount} transaction{createdCount !== 1 ? 's' : ''} imported successfully
            </p>
          </div>
          <div className="flex justify-center gap-3">
            <button
              onClick={resetOcr}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-5 py-2 rounded-lg text-sm transition-colors"
            >
              Import Another Image
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Import Page with Tabs ─────────────────────────────────────

export default function Import() {
  const [activeTab, setActiveTab] = useState<Tab>('csv');

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Import Transactions</h1>

      {/* Tab Buttons */}
      <div className="flex gap-1 bg-gray-900 rounded-lg p-1 w-fit border border-gray-800">
        <button
          onClick={() => setActiveTab('csv')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'csv'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
          }`}
        >
          <FileText size={16} />
          CSV Import
        </button>
        <button
          onClick={() => setActiveTab('screenshot')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'screenshot'
              ? 'bg-blue-600 text-white'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
          }`}
        >
          <Camera size={16} />
          Screenshot Import
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'csv' && <CsvImport />}
      {activeTab === 'screenshot' && <ScreenshotImport />}
    </div>
  );
}
