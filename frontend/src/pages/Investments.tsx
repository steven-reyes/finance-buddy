import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X, TrendingUp, TrendingDown } from 'lucide-react';
import {
  useInvestments,
  useCreateInvestment,
  useUpdateInvestmentValue,
  useDeleteInvestment,
  useInvestmentSummary,
} from '../hooks/useInvestments';
import { formatCents, toCents } from '../lib/format';

const investmentSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  institution: z.string().optional(),
  current_value: z.number().min(0),
  contributions: z.number().min(0),
  notes: z.string().optional(),
});

type InvestmentFormValues = z.infer<typeof investmentSchema>;

export default function Investments() {
  const [showForm, setShowForm] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [newValue, setNewValue] = useState('');

  const { data: investments, isLoading, error } = useInvestments();
  const { data: summary } = useInvestmentSummary();
  const createInvestment = useCreateInvestment();
  const updateValue = useUpdateInvestmentValue();
  const deleteInvestment = useDeleteInvestment();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InvestmentFormValues>({
    resolver: zodResolver(investmentSchema),
    defaultValues: {
      current_value: 0,
      contributions: 0,
    },
  });

  const onSubmit = async (values: InvestmentFormValues) => {
    await createInvestment.mutateAsync({
      ...values,
      current_value: toCents(values.current_value),
      contributions: toCents(values.contributions),
    });
    reset();
    setShowForm(false);
  };

  const handleUpdateValue = async (id: number) => {
    const val = parseFloat(newValue);
    if (isNaN(val) || val < 0) return;
    await updateValue.mutateAsync({ id, current_value: toCents(val) });
    setUpdatingId(null);
    setNewValue('');
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Delete this investment?')) {
      deleteInvestment.mutate(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Investments</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Investment
        </button>
      </div>

      {/* Summary Banner */}
      {summary && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-gray-400 mb-1">Total Value</p>
              <p className="text-2xl font-bold text-blue-400">{formatCents(summary.total_value)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Total Contributions</p>
              <p className="text-2xl font-bold text-gray-200">{formatCents(summary.total_contributions)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400 mb-1">Total Return</p>
              <p className={`text-2xl font-bold ${summary.total_gain >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCents(summary.total_gain)}{' '}
                <span className="text-sm font-normal">
                  ({(summary.gain_percentage ?? 0) >= 0 ? '+' : ''}{(summary.gain_percentage ?? 0).toFixed(1)}%)
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Form */}
      {showForm && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">New Investment</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-200">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <input
                {...register('name')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Vanguard S&P 500"
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Type</label>
              <select
                {...register('type')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select type</option>
                <option value="401k">401k</option>
                <option value="ira">IRA</option>
                <option value="brokerage">Brokerage</option>
                <option value="hsa">HSA</option>
                <option value="crypto">Crypto</option>
                <option value="other">Other</option>
              </select>
              {errors.type && <p className="text-red-400 text-xs mt-1">{errors.type.message}</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Institution</label>
              <input
                {...register('institution')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Fidelity"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Current Value ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('current_value', { valueAsNumber: true })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Contributions ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('contributions', { valueAsNumber: true })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Notes</label>
              <input
                {...register('notes')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional notes"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {isSubmitting ? 'Creating...' : 'Create Investment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mutation error display */}
      {createInvestment.isError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
          {(createInvestment.error as any)?.response?.data?.error?.message || 'Failed to create investment. Please try again.'}
        </div>
      )}
      {deleteInvestment.isError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
          {(deleteInvestment.error as any)?.response?.data?.error?.message || 'Failed to delete investment. Please try again.'}
        </div>
      )}
      {updateValue.isError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
          {(updateValue.error as any)?.response?.data?.error?.message || 'Failed to update value. Please try again.'}
        </div>
      )}

      {/* Investment Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-40 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-red-400">Error loading investments.</div>
      ) : investments && investments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {investments.map((inv) => {
            const gainLoss = inv.current_value - inv.contributions;
            const gainPct = inv.contributions > 0
              ? ((gainLoss / inv.contributions) * 100).toFixed(1)
              : '0.0';
            const isPositive = gainLoss >= 0;

            return (
              <div key={inv.id} className="bg-gray-900 rounded-xl border border-gray-800 p-5 hover:border-gray-700 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <Link to={`/investments/${inv.id}`} className="hover:text-blue-400 transition-colors">
                    <h3 className="font-semibold text-gray-200">{inv.name}</h3>
                  </Link>
                  <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded capitalize">
                    {inv.type.replace('_', ' ')}
                  </span>
                </div>
                {inv.institution && (
                  <p className="text-xs text-gray-500 mb-3">{inv.institution}</p>
                )}
                <p className="text-xl font-bold text-gray-100 mb-1">
                  {formatCents(inv.current_value)}
                </p>
                <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                  {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span>{formatCents(Math.abs(gainLoss))} ({isPositive ? '+' : ''}{gainPct}%)</span>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  {updatingId === inv.id ? (
                    <>
                      <input
                        type="number"
                        step="0.01"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="New value"
                        autoFocus
                      />
                      <button
                        onClick={() => handleUpdateValue(inv.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setUpdatingId(null); setNewValue(''); }}
                        className="text-gray-400 hover:text-gray-200 text-xs"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setUpdatingId(inv.id)}
                        className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-1 rounded-lg transition-colors"
                      >
                        Update Value
                      </button>
                      <button
                        onClick={() => handleDelete(inv.id)}
                        className="text-xs text-gray-500 hover:text-red-400 px-2 py-1 transition-colors"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <p className="text-gray-400 mb-2">No investment accounts yet.</p>
          <p className="text-gray-500 text-sm mb-4">Start tracking your portfolio.</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Add Investment
          </button>
        </div>
      )}
    </div>
  );
}
