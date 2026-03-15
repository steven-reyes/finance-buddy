import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search, ArrowUp, ArrowDown, ArrowUpDown, Download, Repeat } from 'lucide-react';
import { useTransactions, useDeleteTransaction, useBulkDeleteTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { formatCents, formatDate } from '../lib/format';
import { startOfWeek, startOfMonth, endOfMonth, subDays, subMonths, format } from 'date-fns';
import type { TransactionFilters } from '../types';

type DatePreset = 'today' | 'this_week' | 'this_month' | 'last_30' | 'last_month' | 'all';

function getDatePresetRange(preset: DatePreset): { start_date?: string; end_date?: string } {
  const today = new Date();
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd');
  switch (preset) {
    case 'today':
      return { start_date: fmt(today), end_date: fmt(today) };
    case 'this_week':
      return { start_date: fmt(startOfWeek(today)), end_date: fmt(today) };
    case 'this_month':
      return { start_date: fmt(startOfMonth(today)), end_date: fmt(today) };
    case 'last_30':
      return { start_date: fmt(subDays(today, 30)), end_date: fmt(today) };
    case 'last_month': {
      const prev = subMonths(today, 1);
      return { start_date: fmt(startOfMonth(prev)), end_date: fmt(endOfMonth(prev)) };
    }
    case 'all':
      return {};
  }
}

export default function Transactions() {
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    per_page: 20,
  });
  const [searchInput, setSearchInput] = useState('');
  const [activePreset, setActivePreset] = useState<DatePreset | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const { data, isLoading, error } = useTransactions(filters);
  const { data: categories } = useCategories();
  const deleteTransaction = useDeleteTransaction();
  const bulkDelete = useBulkDeleteTransactions();

  const handlePreset = (preset: DatePreset) => {
    const range = getDatePresetRange(preset);
    setActivePreset(preset);
    setFilters((f) => ({ ...f, start_date: range.start_date, end_date: range.end_date, page: 1 }));
  };

  const handleSort = (col: string) => {
    setFilters((f) => {
      if (f.sort_by === col) {
        return { ...f, sort_order: f.sort_order === 'asc' ? 'desc' : 'asc', page: 1 };
      }
      return { ...f, sort_by: col, sort_order: col === 'date' ? 'desc' : 'asc', page: 1 };
    });
  };

  const sortIcon = (col: string) => {
    if (filters.sort_by !== col) return <ArrowUpDown size={14} className="text-gray-600" />;
    return filters.sort_order === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />;
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!data) return;
    const allIds = data.data.map((t) => t.id);
    const allSelected = allIds.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected transaction(s)?`)) return;
    bulkDelete.mutate(Array.from(selectedIds), {
      onSuccess: () => setSelectedIds(new Set()),
    });
  };

  const exportUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('format', 'csv');
    if (filters.type) params.set('type', filters.type);
    if (filters.category_id) params.set('category_id', String(filters.category_id));
    if (filters.start_date) params.set('start_date', filters.start_date);
    if (filters.end_date) params.set('end_date', filters.end_date);
    if (filters.search) params.set('search', filters.search);
    return `/api/export/transactions?${params.toString()}`;
  }, [filters]);

  const handleSearch = () => {
    setFilters((f) => ({ ...f, search: searchInput || undefined, page: 1 }));
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Delete this transaction?')) {
      deleteTransaction.mutate(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <div className="flex items-center gap-2">
          <a
            href={exportUrl}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Download size={16} />
            Export CSV
          </a>
          <Link
            to="/transactions/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Add Transaction
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Type toggle */}
          <div className="flex rounded-lg overflow-hidden border border-gray-700">
            {(['all', 'income', 'expense'] as const).map((t) => (
              <button
                key={t}
                onClick={() =>
                  setFilters((f) => ({ ...f, type: t === 'all' ? undefined : t, page: 1 }))
                }
                className={`px-3 py-1.5 text-sm capitalize transition-colors ${
                  (t === 'all' && !filters.type) || filters.type === t
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Category dropdown */}
          <select
            value={filters.category_id || ''}
            onChange={(e) =>
              setFilters((f) => ({
                ...f,
                category_id: e.target.value ? Number(e.target.value) : undefined,
                page: 1,
              }))
            }
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Date range */}
          <input
            type="date"
            value={filters.start_date || ''}
            onChange={(e) => {
              setActivePreset(null);
              setFilters((f) => ({ ...f, start_date: e.target.value || undefined, page: 1 }));
            }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Start date"
          />
          <input
            type="date"
            value={filters.end_date || ''}
            onChange={(e) => {
              setActivePreset(null);
              setFilters((f) => ({ ...f, end_date: e.target.value || undefined, page: 1 }));
            }}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="End date"
          />

          {/* Search */}
          <div className="flex items-center gap-1 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search descriptions..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleSearch}
              className="bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg text-sm transition-colors"
            >
              Search
            </button>
          </div>
        </div>

        {/* Date Presets */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-800">
          {([
            ['today', 'Today'],
            ['this_week', 'This Week'],
            ['this_month', 'This Month'],
            ['last_30', 'Last 30 Days'],
            ['last_month', 'Last Month'],
            ['all', 'All Time'],
          ] as [DatePreset, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => handlePreset(key)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activePreset === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtered Summary Bar */}
      {data && data.total > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 px-4 py-3 flex flex-wrap items-center gap-4 text-sm">
          <span className="text-gray-400">Showing {data.total} transaction{data.total !== 1 ? 's' : ''}</span>
          <span className="text-gray-600">|</span>
          <span className="text-green-400">Income: {formatCents(data.filtered_income ?? 0)}</span>
          <span className="text-gray-600">|</span>
          <span className="text-red-400">Expenses: {formatCents(data.filtered_expenses ?? 0)}</span>
          <span className="text-gray-600">|</span>
          <span className={(data.filtered_net ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}>
            Net: {(data.filtered_net ?? 0) >= 0 ? '+' : ''}{formatCents(Math.abs(data.filtered_net ?? 0))}
          </span>
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl px-4 py-3 flex items-center gap-4">
          <span className="text-sm text-blue-300 font-medium">{selectedIds.size} selected</span>
          <button
            onClick={handleBulkDelete}
            disabled={bulkDelete.isPending}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Trash2 size={14} />
            Delete Selected
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-gray-400 hover:text-gray-200 transition-colors"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Mutation error display */}
      {deleteTransaction.isError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
          {(deleteTransaction.error as any)?.response?.data?.error?.message || 'Failed to delete transaction. Please try again.'}
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="h-8 bg-gray-800 rounded animate-pulse w-48" />
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-gray-800/50">
                <div className="h-4 bg-gray-800 rounded animate-pulse w-24" />
                <div className="h-4 bg-gray-800 rounded animate-pulse flex-1" />
                <div className="h-4 bg-gray-800 rounded animate-pulse w-20" />
                <div className="h-4 bg-gray-800 rounded animate-pulse w-16" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="text-red-400">Error loading transactions. Please try again.</div>
      ) : data && data.data.length > 0 ? (
        <>
          <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-left text-sm text-gray-400">
                  <th className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={data!.data.length > 0 && data!.data.every((t) => selectedIds.has(t.id))}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                    />
                  </th>
                  <th className="px-5 py-3 font-medium cursor-pointer select-none hover:text-gray-200 transition-colors" onClick={() => handleSort('date')}>
                    <span className="inline-flex items-center gap-1">Date {sortIcon('date')}</span>
                  </th>
                  <th className="px-5 py-3 font-medium cursor-pointer select-none hover:text-gray-200 transition-colors" onClick={() => handleSort('description')}>
                    <span className="inline-flex items-center gap-1">Description {sortIcon('description')}</span>
                  </th>
                  <th className="px-5 py-3 font-medium cursor-pointer select-none hover:text-gray-200 transition-colors" onClick={() => handleSort('category')}>
                    <span className="inline-flex items-center gap-1">Category {sortIcon('category')}</span>
                  </th>
                  <th className="px-5 py-3 font-medium text-right cursor-pointer select-none hover:text-gray-200 transition-colors" onClick={() => handleSort('amount')}>
                    <span className="inline-flex items-center gap-1 justify-end">Amount {sortIcon('amount')}</span>
                  </th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((t) => (
                  <tr key={t.id} className={`border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${selectedIds.has(t.id) ? 'bg-blue-900/20' : ''}`}>
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(t.id)}
                        onChange={() => toggleSelect(t.id)}
                        className="rounded border-gray-600 bg-gray-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
                      />
                    </td>
                    <td className="px-5 py-3 text-sm text-gray-300">{formatDate(t.date)}</td>
                    <td className="px-5 py-3 text-sm text-gray-200">
                      <span className="inline-flex items-center gap-1.5">
                        {t.description}
                        {t.recurring_template_id && (
                          <span title="Generated from recurring template"><Repeat size={12} className="text-blue-400 flex-shrink-0" /></span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm">
                      {t.category_name ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full inline-block"
                            style={{ backgroundColor: t.category_color || '#6b7280' }}
                          />
                          <span className="text-gray-300">
                            {t.category_icon ? `${t.category_icon} ` : ''}{t.category_name}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500">Uncategorized</span>
                      )}
                    </td>
                    <td className={`px-5 py-3 text-sm text-right font-medium ${
                      t.type === 'income' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {t.type === 'income' ? '+' : '-'}{formatCents(t.amount)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/transactions/${t.id}/edit`}
                          className="p-1.5 text-gray-400 hover:text-blue-400 transition-colors"
                        >
                          <Pencil size={15} />
                        </Link>
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              Page {data.page} of {data.total_pages} ({data.total} total)
            </p>
            <div className="flex gap-2">
              <button
                disabled={data.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))}
                className="px-4 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={data.page >= data.total_pages}
                onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))}
                className="px-4 py-2 text-sm bg-gray-800 border border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          {filters.type || filters.category_id || filters.search || filters.start_date || filters.end_date ? (
            <p className="text-gray-400">No transactions match your filters.</p>
          ) : (
            <>
              <p className="text-gray-400 mb-2">No transactions yet.</p>
              <p className="text-gray-500 text-sm mb-4">Add your first transaction to get started.</p>
              <Link
                to="/transactions/new"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <Plus size={16} />
                Add Transaction
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
