import { useState, useCallback, useRef } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { useCategories } from '../hooks/useCategories';
import { useCreateTransaction } from '../hooks/useTransactions';
import { toCents } from '../lib/format';

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
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: '',
    amount: '',
    description: '',
    category: '',
  });
  const [defaultType, setDefaultType] = useState<'income' | 'expense'>('expense');
  const [importResults, setImportResults] = useState({ success: 0, errors: 0 });
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: categories } = useCategories();
  const createTransaction = useCreateTransaction();

  const parseCSV = (text: string): { headers: string[]; rows: ParsedRow[] } => {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return { headers: [], rows: [] };

    const csvHeaders = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    const csvRows: ParsedRow[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      const row: ParsedRow = {};
      csvHeaders.forEach((h, idx) => {
        row[h] = values[idx] || '';
      });
      csvRows.push(row);
    }

    return { headers: csvHeaders, rows: csvRows };
  };

  const handleFileSelect = useCallback((file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: h, rows: r } = parseCSV(text);
      setHeaders(h);
      setRows(r);
      setStep('map');

      // Auto-map common column names
      const autoMap: ColumnMapping = { date: '', amount: '', description: '', category: '' };
      h.forEach((col) => {
        const lower = col.toLowerCase();
        if (lower.includes('date')) autoMap.date = col;
        if (lower.includes('amount')) autoMap.amount = col;
        if (lower.includes('desc') || lower.includes('memo') || lower.includes('name')) autoMap.description = col;
        if (lower.includes('categ')) autoMap.category = col;
      });
      setMapping(autoMap);
    };
    reader.readAsText(file);
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
    let success = 0;
    let errors = 0;

    const previewRows = rows.slice(0, 500);

    for (const row of previewRows) {
      try {
        const amountStr = row[mapping.amount] || '0';
        const amountNum = parseFloat(amountStr.replace(/[^0-9.-]/g, ''));
        if (isNaN(amountNum)) {
          errors++;
          continue;
        }

        const type = amountNum < 0 ? 'expense' : defaultType;
        const amount = toCents(Math.abs(amountNum));

        const catName = row[mapping.category] || '';
        const matchedCat = categories?.find(
          (c) => c.name.toLowerCase() === catName.toLowerCase()
        );

        await createTransaction.mutateAsync({
          type,
          amount,
          description: row[mapping.description] || 'Imported transaction',
          date: row[mapping.date] || new Date().toISOString().split('T')[0],
          category_id: matchedCat?.id || null,
        });
        success++;
      } catch {
        errors++;
      }
    }

    setImportResults({ success, errors });
    setImporting(false);
    setStep('done');
  };

  const previewData = rows.slice(0, 20);

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
      )}

      {/* Step 2: Map Columns */}
      {step === 'map' && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Map Columns</h2>
              <p className="text-sm text-gray-400 mt-1">
                File: {fileName} ({rows.length} rows found)
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
              onClick={() => { setStep('upload'); setHeaders([]); setRows([]); }}
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
          <h2 className="text-lg font-semibold">Preview (first 20 rows)</h2>

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
                {previewData.map((row, i) => {
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
            {rows.length} total rows will be imported.
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleImport}
              disabled={importing}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {importing ? 'Importing...' : `Import ${rows.length} Transactions`}
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
              {importResults.success} transactions imported successfully
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
                setRows([]);
                setFileName('');
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
