import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Copy, X } from 'lucide-react';
import { useBudgets, useCreateBudget, useDeleteBudget, useCopyForward } from '../hooks/useBudgets';
import { useCategories } from '../hooks/useCategories';
import { formatCents, getCurrentMonth, toCents } from '../lib/format';

const budgetSchema = z.object({
  category_id: z.number({ required_error: 'Category is required' }),
  amount: z.number().positive('Amount must be positive'),
  warn_threshold: z.number().min(0).max(100).optional(),
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

export default function Budgets() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [showForm, setShowForm] = useState(false);

  const { data: budgets, isLoading, error } = useBudgets(month);
  const { data: categories } = useCategories('expense');
  const createBudget = useCreateBudget();
  const deleteBudget = useDeleteBudget();
  const copyForward = useCopyForward();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetSchema),
    defaultValues: { warn_threshold: 80 },
  });

  const onSubmit = async (values: BudgetFormValues) => {
    await createBudget.mutateAsync({
      category_id: values.category_id,
      month,
      amount: toCents(values.amount),
      warn_threshold: values.warn_threshold,
    });
    reset();
    setShowForm(false);
  };

  const handleCopyForward = () => {
    const [year, m] = month.split('-').map(Number);
    const prevDate = new Date(year, m - 2, 1);
    const from = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    copyForward.mutate({ from, to: month });
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Delete this budget?')) {
      deleteBudget.mutate(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Budgets</h1>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleCopyForward}
            disabled={copyForward.isPending}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Copy size={16} />
            Copy from Last Month
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Add Budget
          </button>
        </div>
      </div>

      {/* Add Budget Form */}
      {showForm && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">New Budget</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-200">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-gray-400 mb-1">Category</label>
              <select
                {...register('category_id', { valueAsNumber: true })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.category_id && (
                <p className="text-red-400 text-xs mt-1">{errors.category_id.message}</p>
              )}
            </div>
            <div className="w-40">
              <label className="block text-sm text-gray-400 mb-1">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                {...register('amount', { valueAsNumber: true })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="text-red-400 text-xs mt-1">{errors.amount.message}</p>
              )}
            </div>
            <div className="w-32">
              <label className="block text-sm text-gray-400 mb-1">Warn at %</label>
              <input
                type="number"
                min="0"
                max="100"
                {...register('warn_threshold', { valueAsNumber: true })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </form>
        </div>
      )}

      {/* Budget Grid */}
      {isLoading ? (
        <div className="text-gray-400">Loading budgets...</div>
      ) : error ? (
        <div className="text-red-400">Error loading budgets.</div>
      ) : budgets && budgets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((b) => {
            const pct = b.percentage;
            const barColor =
              pct >= 100 ? 'bg-red-500' : pct >= b.warn_threshold ? 'bg-yellow-500' : 'bg-green-500';
            return (
              <div key={b.id} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    {b.category_icon && <span className="text-lg">{b.category_icon}</span>}
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: b.category_color || '#6b7280' }}
                    />
                    <h3 className="font-medium text-gray-200">{b.category_name}</h3>
                  </div>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    {formatCents(b.spent)} of {formatCents(b.amount)} spent
                  </span>
                  <span className={`font-medium ${
                    pct >= 100 ? 'text-red-400' : pct >= b.warn_threshold ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <p className="text-gray-400 mb-4">No budgets for {month}.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Create your first budget
          </button>
        </div>
      )}
    </div>
  );
}
