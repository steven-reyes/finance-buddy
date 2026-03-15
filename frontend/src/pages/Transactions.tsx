import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { useTransactions, useDeleteTransaction } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { formatCents, formatDate } from '../lib/format';
import type { TransactionFilters } from '../types';

export default function Transactions() {
  const [filters, setFilters] = useState<TransactionFilters>({
    page: 1,
    per_page: 20,
  });
  const [searchInput, setSearchInput] = useState('');

  const { data, isLoading, error } = useTransactions(filters);
  const { data: categories } = useCategories();
  const deleteTransaction = useDeleteTransaction();

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
        <Link
          to="/transactions/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Transaction
        </Link>
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
            onChange={(e) =>
              setFilters((f) => ({ ...f, start_date: e.target.value || undefined, page: 1 }))
            }
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Start date"
          />
          <input
            type="date"
            value={filters.end_date || ''}
            onChange={(e) =>
              setFilters((f) => ({ ...f, end_date: e.target.value || undefined, page: 1 }))
            }
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
      </div>

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
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Description</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium text-right">Amount</th>
                  <th className="px-5 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((t) => (
                  <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-3 text-sm text-gray-300">{formatDate(t.date)}</td>
                    <td className="px-5 py-3 text-sm text-gray-200">{t.description}</td>
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
