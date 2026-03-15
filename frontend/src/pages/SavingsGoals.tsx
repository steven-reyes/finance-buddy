import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X, Target, Trash2 } from 'lucide-react';
import {
  useSavingsGoals,
  useCreateGoal,
  useDeleteGoal,
  useAddContribution,
  useContributions,
  useDeleteContribution,
} from '../hooks/useSavingsGoals';
import { formatCents, formatDate, toCents } from '../lib/format';

const goalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  target_amount: z.number().positive('Target must be positive'),
  icon: z.string().optional(),
  color: z.string().optional(),
  deadline: z.string().optional(),
});

const contribSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  date: z.string().min(1, 'Date is required'),
  note: z.string().optional(),
});

type GoalFormValues = z.infer<typeof goalSchema>;
type ContribFormValues = z.infer<typeof contribSchema>;

export default function SavingsGoals() {
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [contribGoalId, setContribGoalId] = useState<number | null>(null);

  const { data: goals, isLoading, error } = useSavingsGoals();
  const createGoal = useCreateGoal();
  const deleteGoal = useDeleteGoal();
  const addContribution = useAddContribution();
  const deleteContribution = useDeleteContribution();

  const goalForm = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
  });

  const contribForm = useForm<ContribFormValues>({
    resolver: zodResolver(contribSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
    },
  });

  const onCreateGoal = async (values: GoalFormValues) => {
    await createGoal.mutateAsync({
      ...values,
      target_amount: toCents(values.target_amount),
      deadline: values.deadline || undefined,
    });
    goalForm.reset();
    setShowGoalForm(false);
  };

  const onAddContribution = async (values: ContribFormValues) => {
    if (!contribGoalId) return;
    await addContribution.mutateAsync({
      goalId: contribGoalId,
      amount: toCents(values.amount),
      date: values.date,
      note: values.note || undefined,
    });
    contribForm.reset({ date: new Date().toISOString().split('T')[0] });
    setContribGoalId(null);
  };

  const handleDeleteGoal = (id: number) => {
    if (window.confirm('Delete this savings goal?')) {
      deleteGoal.mutate(id);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Savings Goals</h1>
        <button
          onClick={() => setShowGoalForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Add Goal
        </button>
      </div>

      {/* Add Goal Form */}
      {showGoalForm && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">New Savings Goal</h2>
            <button onClick={() => setShowGoalForm(false)} className="text-gray-400 hover:text-gray-200">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={goalForm.handleSubmit(onCreateGoal)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <input
                {...goalForm.register('name')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Emergency Fund"
              />
              {goalForm.formState.errors.name && (
                <p className="text-red-400 text-xs mt-1">{goalForm.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Target Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                {...goalForm.register('target_amount', { valueAsNumber: true })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
              {goalForm.formState.errors.target_amount && (
                <p className="text-red-400 text-xs mt-1">{goalForm.formState.errors.target_amount.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Icon (optional)</label>
              <input
                {...goalForm.register('icon')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., house, car"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Deadline (optional)</label>
              <input
                type="date"
                {...goalForm.register('deadline')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Color (optional)</label>
              <input
                type="color"
                {...goalForm.register('color')}
                className="w-16 h-9 bg-gray-800 border border-gray-700 rounded-lg cursor-pointer"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={goalForm.formState.isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {goalForm.formState.isSubmitting ? 'Creating...' : 'Create Goal'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contribution Form */}
      {contribGoalId && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Add Contribution</h2>
            <button onClick={() => setContribGoalId(null)} className="text-gray-400 hover:text-gray-200">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={contribForm.handleSubmit(onAddContribution)} className="flex flex-wrap gap-4 items-end">
            <div className="w-40">
              <label className="block text-sm text-gray-400 mb-1">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                {...contribForm.register('amount', { valueAsNumber: true })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
              {contribForm.formState.errors.amount && (
                <p className="text-red-400 text-xs mt-1">{contribForm.formState.errors.amount.message}</p>
              )}
            </div>
            <div className="w-44">
              <label className="block text-sm text-gray-400 mb-1">Date</label>
              <input
                type="date"
                {...contribForm.register('date')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-gray-400 mb-1">Note (optional)</label>
              <input
                {...contribForm.register('note')}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional note"
              />
            </div>
            <button
              type="submit"
              disabled={contribForm.formState.isSubmitting}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {contribForm.formState.isSubmitting ? 'Adding...' : 'Add'}
            </button>
          </form>

          {/* Contribution History */}
          <ContributionHistory
            goalId={contribGoalId}
            onDelete={(contributionId) =>
              deleteContribution.mutate({ goalId: contribGoalId, contributionId })
            }
          />
        </div>
      )}

      {/* Goals Grid */}
      {isLoading ? (
        <div className="text-gray-400">Loading savings goals...</div>
      ) : error ? (
        <div className="text-red-400">Error loading savings goals.</div>
      ) : goals && goals.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((g) => {
            const pct = g.target_amount > 0 ? (g.current_amount / g.target_amount) * 100 : 0;
            const barColor = pct >= 100 ? 'bg-green-500' : 'bg-blue-500';

            return (
              <div key={g.id} className="bg-gray-900 rounded-xl border border-gray-800 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{
                        backgroundColor: (g.color || '#3b82f6') + '20',
                        color: g.color || '#3b82f6',
                      }}
                    >
                      {g.icon ? <span className="text-sm">{g.icon}</span> : <Target size={16} />}
                    </div>
                    <h3 className="font-semibold text-gray-200">{g.name}</h3>
                  </div>
                  <button
                    onClick={() => handleDeleteGoal(g.id)}
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

                <div className="flex items-center justify-between text-sm mb-3">
                  <span className="text-gray-400">
                    {formatCents(g.current_amount)} of {formatCents(g.target_amount)}
                  </span>
                  <span className={`font-medium ${pct >= 100 ? 'text-green-400' : 'text-blue-400'}`}>
                    {pct.toFixed(0)}%
                  </span>
                </div>

                {g.deadline && (
                  <p className="text-xs text-gray-500 mb-3">
                    Deadline: {formatDate(g.deadline)}
                  </p>
                )}

                <button
                  onClick={() => {
                    setContribGoalId(g.id);
                    contribForm.reset({ date: new Date().toISOString().split('T')[0] });
                  }}
                  className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors w-full text-center"
                >
                  Add Contribution
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
          <p className="text-gray-400 mb-4">No savings goals yet.</p>
          <button
            onClick={() => setShowGoalForm(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Create your first goal
          </button>
        </div>
      )}
    </div>
  );
}

function ContributionHistory({ goalId, onDelete }: { goalId: number; onDelete: (id: number) => void }) {
  const { data: contributions, isLoading } = useContributions(goalId);

  if (isLoading) {
    return <div className="mt-4 text-gray-400 text-sm">Loading contributions...</div>;
  }

  if (!contributions || contributions.length === 0) {
    return <div className="mt-4 text-gray-500 text-sm">No contributions yet.</div>;
  }

  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-gray-300 mb-2">Contribution History</h3>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {contributions.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2"
          >
            <div className="flex items-center gap-4 text-sm">
              <span className="text-gray-400">{formatDate(c.date)}</span>
              <span className="text-green-400 font-medium">{formatCents(c.amount)}</span>
              {c.note && <span className="text-gray-500">{c.note}</span>}
            </div>
            <button
              onClick={() => {
                if (window.confirm('Delete this contribution?')) {
                  onDelete(c.id);
                }
              }}
              className="p-1 text-gray-500 hover:text-red-400 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
