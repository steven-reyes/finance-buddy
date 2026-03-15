import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, Trash2, Pencil, DollarSign, AlertTriangle, CreditCard,
  TrendingDown, Calendar, ChevronDown, ChevronUp, X, Loader2, Zap,
  Download, Printer,
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCents, toCents, formatDate } from '../lib/format';
import {
  useDebts, useDebtSummary, usePayoffPlan, useCreateDebt, useUpdateDebt,
  useDeleteDebt, useAddDebtPayment, useDebtPayments, useAllocatePaycheck,
  useSimulatePayoff, useDebtBalanceHistory, useDebtProgress, useDebtReport,
} from '../hooks/useDebts';
import { useRecurring } from '../hooks/useRecurring';
import { useDetectIncome } from '../hooks/useBudgets';
import type { Debt, PaycheckAllocation } from '../types/debt';

const DEBT_TYPE_LABELS: Record<Debt['type'], string> = {
  advance: 'Cash Advance (Chime, Dave, etc.)',
  personal: 'Personal Loan (friends, family)',
  credit_card: 'Credit Card',
  loan: 'Loan (auto, student, etc.)',
  bill_arrears: 'Overdue Bill (rent, utilities)',
  medical: 'Medical Debt',
  other: 'Other',
};

const DEBT_TYPE_SHORT: Record<Debt['type'], string> = {
  advance: 'Advance',
  personal: 'Personal',
  credit_card: 'Credit Card',
  loan: 'Loan',
  bill_arrears: 'Bill Arrears',
  medical: 'Medical',
  other: 'Other',
};

const ALLOCATION_COLORS: Record<string, string> = {
  auto_deduct: 'bg-gray-500',
  housing: 'bg-red-500',
  utility: 'bg-orange-500',
  minimum_payment: 'bg-yellow-500',
  essentials: 'bg-green-500',
  extra_payment: 'bg-blue-500',
  buffer: 'bg-emerald-500',
};

const ALLOCATION_LABELS: Record<string, string> = {
  auto_deduct: 'Auto-deductions',
  housing: 'Housing',
  utility: 'Utilities',
  minimum_payment: 'Minimum Payments',
  essentials: 'Essentials',
  extra_payment: 'Extra Debt Payment',
  buffer: 'Buffer / Remaining',
};

function priorityBadge(priority: number) {
  if (priority <= 3) return { label: 'Critical', cls: 'bg-red-500/20 text-red-400 border-red-500/30' };
  if (priority <= 6) return { label: 'Important', cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
  return { label: 'Normal', cls: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
}

// ─── Add/Edit Debt Form ──────────────────────────────────────────────
function DebtForm({
  initial,
  onSubmit,
  onCancel,
  isLoading,
}: {
  initial?: Debt;
  onSubmit: (values: Record<string, unknown>) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<Debt['type']>(initial?.type ?? 'other');
  const [creditor, setCreditor] = useState(initial?.creditor ?? '');
  const [originalAmount, setOriginalAmount] = useState(initial ? (initial.original_amount / 100).toString() : '');
  const [currentBalance, setCurrentBalance] = useState(initial ? (initial.current_balance / 100).toString() : '');
  const [minimumPayment, setMinimumPayment] = useState(initial ? (initial.minimum_payment / 100).toString() : '');
  const [interestRate, setInterestRate] = useState(initial ? initial.interest_rate.toString() : '0');
  const [dueDay, setDueDay] = useState(initial?.due_day?.toString() ?? '');
  const [priority, setPriority] = useState(initial?.priority?.toString() ?? '5');
  const [isAutoDeduct, setIsAutoDeduct] = useState(initial?.is_auto_deduct === 1);
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [status, setStatus] = useState<Debt['status']>(initial?.status ?? 'active');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      type,
      creditor,
      original_amount: toCents(parseFloat(originalAmount) || 0),
      current_balance: toCents(parseFloat(currentBalance) || 0),
      minimum_payment: toCents(parseFloat(minimumPayment) || 0),
      interest_rate: parseFloat(interestRate) || 0,
      due_day: dueDay ? parseInt(dueDay) : null,
      priority: parseInt(priority) || 5,
      is_auto_deduct: isAutoDeduct ? 1 : 0,
      notes: notes || null,
      status,
    });
  };

  const inputCls = 'w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-blue-500 text-sm';
  const labelCls = 'block text-xs text-gray-400 mb-1';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Name</label>
          <input className={inputCls} value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Chime Advance" />
        </div>
        <div>
          <label className={labelCls}>Type</label>
          <select className={inputCls} value={type} onChange={e => setType(e.target.value as Debt['type'])}>
            {Object.entries(DEBT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Creditor</label>
          <input className={inputCls} value={creditor} onChange={e => setCreditor(e.target.value)} required placeholder="Who you owe" />
        </div>
        <div>
          <label className={labelCls}>Original Amount ($)</label>
          <input className={inputCls} type="number" step="0.01" min="0" value={originalAmount} onChange={e => setOriginalAmount(e.target.value)} required />
        </div>
        <div>
          <label className={labelCls}>Current Balance ($)</label>
          <input className={inputCls} type="number" step="0.01" min="0" value={currentBalance} onChange={e => setCurrentBalance(e.target.value)} required />
        </div>
        <div>
          <label className={labelCls}>Minimum Payment ($)</label>
          <input className={inputCls} type="number" step="0.01" min="0" value={minimumPayment} onChange={e => setMinimumPayment(e.target.value)} required />
        </div>
        <div>
          <label className={labelCls}>Interest Rate (%)</label>
          <input className={inputCls} type="number" step="0.01" min="0" value={interestRate} onChange={e => setInterestRate(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Due Day of Month</label>
          <input className={inputCls} type="number" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} placeholder="e.g. 15" />
        </div>
        <div>
          <label className={labelCls}>Priority (1=highest, 10=lowest)</label>
          <input className={inputCls} type="number" min="1" max="10" value={priority} onChange={e => setPriority(e.target.value)} />
        </div>
        {initial && (
          <div>
            <label className={labelCls}>Status</label>
            <select className={inputCls} value={status} onChange={e => setStatus(e.target.value as Debt['status'])}>
              <option value="active">Active</option>
              <option value="paid_off">Paid Off</option>
              <option value="paused">Paused</option>
            </select>
          </div>
        )}
        <div className="flex items-center gap-2 pt-5">
          <input type="checkbox" id="autoDeduct" checked={isAutoDeduct} onChange={e => setIsAutoDeduct(e.target.checked)} className="rounded bg-gray-800 border-gray-600" />
          <label htmlFor="autoDeduct" className="text-sm text-gray-300">Auto-deducted from paycheck</label>
        </div>
      </div>
      <div>
        <label className={labelCls}>Notes</label>
        <textarea className={inputCls} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." />
      </div>
      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">Cancel</button>
        <button type="submit" disabled={isLoading} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2">
          {isLoading && <Loader2 size={14} className="animate-spin" />}
          {initial ? 'Update Debt' : 'Add Debt'}
        </button>
      </div>
    </form>
  );
}

// ─── Payment Form ────────────────────────────────────────────────────
function PaymentForm({
  debtId,
  debtName,
  onClose,
}: {
  debtId: number;
  debtName: string;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const addPayment = useAddDebtPayment();
  const payments = useDebtPayments(debtId);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    addPayment.mutate(
      { debtId, amount: toCents(parseFloat(amount) || 0), date, note: note || undefined },
      {
        onSuccess: () => { setAmount(''); setNote(''); },
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to add payment';
          setError(msg);
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-gray-100">Payment for {debtName}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-200"><X size={20} /></button>
        </div>
        <div className="p-4 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Amount ($)</label>
              <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-blue-500 text-sm" type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Date</label>
              <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-blue-500 text-sm" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Note</label>
              <input className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-100 focus:outline-none focus:border-blue-500 text-sm" value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" />
            </div>
            <button type="submit" disabled={addPayment.isPending} className="w-full px-4 py-2 text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {addPayment.isPending && <Loader2 size={14} className="animate-spin" />}
              Record Payment
            </button>
          </form>

          {/* Payment History */}
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">Payment History</h4>
            {payments.isLoading ? (
              <div className="text-center py-4 text-gray-500"><Loader2 size={18} className="animate-spin mx-auto" /></div>
            ) : !payments.data?.length ? (
              <p className="text-sm text-gray-500">No payments recorded yet.</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {payments.data.map(p => (
                  <div key={p.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2 text-sm">
                    <div>
                      <span className="text-green-400 font-medium">{formatCents(p.amount)}</span>
                      <span className="text-gray-500 ml-2">{formatDate(p.date)}</span>
                    </div>
                    {p.note && <span className="text-gray-500 text-xs truncate ml-2 max-w-[120px]">{p.note}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Paycheck Planner ────────────────────────────────────────────────
function PaycheckPlanner() {
  const [paycheckInput, setPaycheckInput] = useState('');
  const allocateMut = useAllocatePaycheck();
  const [allocation, setAllocation] = useState<PaycheckAllocation | null>(null);
  const [error, setError] = useState('');

  const handleAllocate = () => {
    const dollars = parseFloat(paycheckInput);
    if (!dollars || dollars <= 0) return;
    setError('');
    allocateMut.mutate(
      { paycheck_amount: toCents(dollars) },
      {
        onSuccess: (data) => setAllocation(data),
        onError: (err: unknown) => {
          const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to allocate paycheck';
          setError(msg);
        },
      }
    );
  };

  const maxAmount = allocation ? Math.max(...allocation.allocations.map(a => a.amount), 1) : 1;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
        <DollarSign size={20} className="text-green-400" />
        Paycheck Planner
      </h2>
      <div className="flex gap-3 mb-4">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="My next paycheck is..."
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-7 pr-3 py-2.5 text-gray-100 focus:outline-none focus:border-blue-500 text-sm"
            value={paycheckInput}
            onChange={e => setPaycheckInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAllocate()}
          />
        </div>
        <button
          onClick={handleAllocate}
          disabled={allocateMut.isPending || !paycheckInput}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {allocateMut.isPending && <Loader2 size={14} className="animate-spin" />}
          Plan It
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400 mb-4">{error}</div>}

      {allocation && (
        <div className="space-y-4">
          {/* Warnings */}
          {allocation.warnings.length > 0 && (
            <div className="space-y-2">
              {allocation.warnings.map((w, i) => (
                <div key={i} className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400 flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  {w}
                </div>
              ))}
            </div>
          )}

          {allocation.shortfall > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400">
              <div className="flex items-center gap-2 font-semibold mb-1">
                <AlertTriangle size={18} />
                Your paycheck doesn't cover all obligations
              </div>
              <p className="text-sm">You're {formatCents(allocation.shortfall)} short. Prioritize housing and food first.</p>
            </div>
          )}

          {/* Waterfall */}
          <div className="space-y-2">
            {allocation.allocations.map((a, i) => {
              const pct = maxAmount > 0 ? (a.amount / maxAmount) * 100 : 0;
              const colorCls = ALLOCATION_COLORS[a.type] || 'bg-gray-500';
              return (
                <div key={i}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-300">{a.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-100 font-medium">{formatCents(a.amount)}</span>
                      <span className="text-gray-500 text-xs w-24 text-right">left: {formatCents(a.running_remaining)}</span>
                    </div>
                  </div>
                  <div className="h-5 bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${colorCls} transition-all duration-300`} style={{ width: `${Math.max(pct, 1)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Total Allocated</div>
              <div className="text-sm font-semibold text-gray-100">{formatCents(allocation.total_allocated)}</div>
            </div>
            <div className={`rounded-lg p-3 text-center ${allocation.remaining >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              <div className="text-xs text-gray-500 mb-1">Remaining</div>
              <div className={`text-sm font-semibold ${allocation.remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>{formatCents(allocation.remaining)}</div>
            </div>
            <div className={`rounded-lg p-3 text-center ${allocation.essentials_covered ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              <div className="text-xs text-gray-500 mb-1">Essentials</div>
              <div className={`text-sm font-semibold ${allocation.essentials_covered ? 'text-green-400' : 'text-red-400'}`}>
                {allocation.essentials_covered ? 'Covered' : 'Not Covered'}
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 pt-2">
            {Object.entries(ALLOCATION_COLORS).map(([key, cls]) => (
              <div key={key} className="flex items-center gap-1.5 text-xs text-gray-400">
                <div className={`w-3 h-3 rounded-sm ${cls}`} />
                {ALLOCATION_LABELS[key]}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Payoff Strategy ─────────────────────────────────────────────────
function PayoffStrategy() {
  const [strategy, setStrategy] = useState<'avalanche' | 'snowball'>('avalanche');
  const { data: plan, isLoading, isError } = usePayoffPlan(strategy);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
        <TrendingDown size={20} className="text-blue-400" />
        Payoff Strategy
      </h2>
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setStrategy('avalanche')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${strategy === 'avalanche' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
        >
          Avalanche (highest interest)
        </button>
        <button
          onClick={() => setStrategy('snowball')}
          className={`px-4 py-2 text-sm rounded-lg transition-colors ${strategy === 'snowball' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}
        >
          Snowball (smallest balance)
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-8"><Loader2 size={24} className="animate-spin mx-auto text-gray-500" /></div>
      ) : isError || !plan ? (
        <p className="text-sm text-gray-500">Unable to load payoff plan. Add some debts first.</p>
      ) : (
        <div className="space-y-4">
          {/* Debt-free date */}
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 text-center">
            <div className="text-sm text-blue-300 mb-1">Debt-free by</div>
            <div className="text-2xl font-bold text-blue-400">{plan.debt_free_date ? formatDate(plan.debt_free_date) : 'N/A'}</div>
            <div className="text-xs text-gray-400 mt-1">{plan.total_months} months | {formatCents(plan.total_interest)} total interest</div>
          </div>

          {/* Debt table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-400 text-xs">
                  <th className="text-left py-2 px-2">Debt</th>
                  <th className="text-right py-2 px-2">Balance</th>
                  <th className="text-right py-2 px-2">Rate</th>
                  <th className="text-right py-2 px-2">Payoff Date</th>
                  <th className="text-right py-2 px-2">Months</th>
                  <th className="text-right py-2 px-2">Interest</th>
                </tr>
              </thead>
              <tbody>
                {plan.debts.map(d => (
                  <tr key={d.id} className="border-b border-gray-800/50">
                    <td className="py-2 px-2 text-gray-200">{d.name}</td>
                    <td className="py-2 px-2 text-right text-red-400">{formatCents(d.current_balance)}</td>
                    <td className="py-2 px-2 text-right text-gray-300">{d.interest_rate}%</td>
                    <td className="py-2 px-2 text-right text-gray-300">{d.estimated_payoff_date ? formatDate(d.estimated_payoff_date) : 'N/A'}</td>
                    <td className="py-2 px-2 text-right text-gray-300">{d.months_to_payoff}</td>
                    <td className="py-2 px-2 text-right text-yellow-400">{formatCents(d.total_interest_paid ?? d.total_interest ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── What If Simulator ────────────────────────────────────────────────
function WhatIfSimulator() {
  const [extraMonthly, setExtraMonthly] = useState(0);
  const [debouncedExtra, setDebouncedExtra] = useState(0);
  const [strategy] = useState<'avalanche' | 'snowball'>('avalanche');
  const { data: recurring } = useRecurring();

  // Debounce slider value
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedExtra(extraMonthly), 300);
    return () => clearTimeout(timer);
  }, [extraMonthly]);

  const { data: baseline } = useSimulatePayoff(0, strategy);
  const { data: simulated } = useSimulatePayoff(debouncedExtra, strategy);

  const monthsSaved = baseline && simulated ? baseline.total_months - simulated.total_months : 0;
  const interestSaved = baseline && simulated ? baseline.total_interest - simulated.total_interest : 0;

  // Suggest recurring expenses to cut
  const expenseTemplates = recurring?.filter(r => r.type === 'expense' && r.is_active) || [];
  const cuttableSubs = expenseTemplates.filter(r =>
    r.amount <= 5000 && r.amount >= 500 // $5-$50 range - subscription-like
  ).slice(0, 3);
  const cuttableTotal = cuttableSubs.reduce((s, r) => s + r.amount, 0);

  const quickAmounts = [2500, 5000, 10000, 20000]; // $25, $50, $100, $200 in cents

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
        <Zap size={20} className="text-yellow-400" />
        What If? Simulator
      </h2>

      {/* Slider */}
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Extra monthly payment</span>
          <span className="text-lg font-bold text-yellow-400">{formatCents(extraMonthly)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={50000}
          step={2500}
          value={extraMonthly}
          onChange={e => setExtraMonthly(Number(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-full appearance-none cursor-pointer accent-yellow-500"
        />
        <div className="flex justify-between text-xs text-gray-600">
          <span>$0</span>
          <span>$500</span>
        </div>
      </div>

      {/* Quick buttons */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {quickAmounts.map(amt => (
          <button
            key={amt}
            onClick={() => setExtraMonthly(amt)}
            className={`px-3 py-1.5 text-xs rounded-lg transition-colors border ${
              extraMonthly === amt
                ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300'
                : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200'
            }`}
          >
            +{formatCents(amt)}
          </button>
        ))}
      </div>

      {/* Results */}
      {simulated && baseline && debouncedExtra > 0 && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Debt-free by</div>
              <div className="text-sm font-bold text-blue-400">
                {simulated.debt_free_date ? formatDate(simulated.debt_free_date) : `${simulated.total_months} mo`}
              </div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Months Saved</div>
              <div className="text-sm font-bold text-green-400">{monthsSaved > 0 ? monthsSaved : 0}</div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-3 text-center">
              <div className="text-xs text-gray-500 mb-1">Interest Saved</div>
              <div className="text-sm font-bold text-green-400">{interestSaved > 0 ? formatCents(interestSaved) : '$0'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Subscription cut suggestion */}
      {cuttableSubs.length > 0 && cuttableTotal > 0 && (
        <div className="mt-4 bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
          <p className="text-sm text-purple-300">
            Cutting {cuttableSubs.map(s => `${s.description} (${formatCents(s.amount)})`).join(' + ')} = {formatCents(cuttableTotal)}/month extra
          </p>
          <button
            onClick={() => setExtraMonthly(cuttableTotal)}
            className="mt-2 text-xs text-purple-400 hover:text-purple-300 underline"
          >
            Try this amount
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Progress Banner & Countdown (Features 2 & 3) ───────────────────
function ProgressBanner() {
  const { data: progress, isLoading } = useDebtProgress();

  if (isLoading || !progress) return null;
  if (progress.total_debts === 0) return null;

  const isDebtFree = progress.active_count === 0 && progress.paid_off_count > 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      {/* Celebration banner */}
      {progress.recently_paid_off && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
          <div className="text-2xl mb-1">&#127881;</div>
          <div className="text-lg font-bold text-green-400">
            {progress.recently_paid_off.name} is PAID OFF!
          </div>
          <div className="text-sm text-green-300/70">
            Keep up the momentum!
          </div>
        </div>
      )}

      {/* Debt-free celebration or countdown (Feature 3) */}
      {isDebtFree ? (
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-6 text-center">
          <div className="text-3xl mb-2">&#127881;</div>
          <div className="text-2xl font-bold text-green-400">You're debt-free!</div>
          <div className="text-sm text-green-300/70 mt-1">Congratulations on paying off all your debts!</div>
        </div>
      ) : progress.months_remaining > 0 && progress.debt_free_date ? (
        <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-lg p-5 text-center">
          <div className="text-2xl mb-1">&#127919;</div>
          <div className="text-2xl font-bold text-blue-400">
            {progress.months_remaining} month{progress.months_remaining !== 1 ? 's' : ''} until debt-free
          </div>
          <div className="text-sm text-gray-400 mt-1">
            Estimated: {formatDate(progress.debt_free_date)}
          </div>
        </div>
      ) : null}

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-300">
            {progress.paid_percentage}% paid off
          </span>
          <span className="text-sm text-gray-500">
            {formatCents(progress.total_paid)} of {formatCents(progress.total_original)}
          </span>
        </div>
        <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, progress.paid_percentage)}%` }}
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="text-gray-400">
          <span className="text-gray-100 font-semibold">{progress.paid_off_count}</span> of{' '}
          <span className="text-gray-100 font-semibold">{progress.total_debts}</span> debts paid off
        </div>
        <div className="text-gray-400">
          <span className="text-green-400 font-semibold">{formatCents(progress.total_paid)}</span> paid so far
        </div>
      </div>
    </div>
  );
}

// ─── Debt Balance Over Time Chart (Feature 1) ───────────────────────
function DebtBalanceChart() {
  const { data: history, isLoading } = useDebtBalanceHistory();

  if (isLoading) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="text-center py-8"><Loader2 size={24} className="animate-spin mx-auto text-gray-500" /></div>
      </div>
    );
  }

  if (!history || history.length < 2) return null;

  const chartData = history.map(h => ({
    date: h.date,
    balance: h.total_balance / 100,
  }));

  const startAmount = chartData[0]?.balance ?? 0;
  const currentAmount = chartData[chartData.length - 1]?.balance ?? 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-lg font-semibold text-gray-100 mb-1 flex items-center gap-2">
        <TrendingDown size={20} className="text-red-400" />
        Debt Progress
      </h2>
      <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
        <span>Start: <span className="text-red-400 font-medium">${startAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></span>
        <span>Now: <span className="text-green-400 font-medium">${currentAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span></span>
        {startAmount > currentAmount && (
          <span className="text-green-400">
            (-${(startAmount - currentAmount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })})
          </span>
        )}
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="debtGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#374151' }}
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 11 }}
              tickLine={false}
              axisLine={{ stroke: '#374151' }}
              tickFormatter={(v: number) => `$${v.toLocaleString()}`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }}
              labelStyle={{ color: '#9ca3af' }}
              formatter={(value: number) => [`$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 'Balance']}
            />
            <Area
              type="monotone"
              dataKey="balance"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#debtGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Debt Card ───────────────────────────────────────────────────────
function DebtCard({
  debt,
  onEdit,
  onDelete,
  onPayment,
}: {
  debt: Debt;
  onEdit: () => void;
  onDelete: () => void;
  onPayment: () => void;
}) {
  const badge = priorityBadge(debt.priority);
  const progressPct = debt.original_amount > 0
    ? Math.min(100, (debt.total_paid / debt.original_amount) * 100)
    : 0;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="text-base font-semibold text-gray-100 truncate">{debt.name}</h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
              {DEBT_TYPE_SHORT[debt.type]}
            </span>
            {debt.is_auto_deduct === 1 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-700 text-gray-300">Auto-deducted</span>
            )}
            {debt.status === 'paid_off' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Paid Off</span>
            )}
            {debt.status === 'paused' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Paused</span>
            )}
          </div>
          <p className="text-sm text-gray-500">{debt.creditor}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full border shrink-0 ${badge.cls}`}>
          P{debt.priority} {badge.label}
        </span>
      </div>

      {/* Balance */}
      <div className="flex items-baseline gap-3">
        <span className="text-2xl font-bold text-red-400">{formatCents(debt.current_balance)}</span>
        <span className="text-sm text-gray-500">of {formatCents(debt.original_amount)}</span>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Paid: {formatCents(debt.total_paid)}</span>
          <span>{progressPct.toFixed(0)}%</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
        <div>
          <span className="text-gray-500 text-xs">Min Payment</span>
          <div className="text-yellow-400 font-medium">{formatCents(debt.minimum_payment)}</div>
        </div>
        <div>
          <span className="text-gray-500 text-xs">Interest Rate</span>
          <div className="text-gray-300">{debt.interest_rate}%</div>
        </div>
        {debt.due_day && (
          <div>
            <span className="text-gray-500 text-xs">Due Day</span>
            <div className="text-gray-300 flex items-center gap-1"><Calendar size={12} />{debt.due_day}th</div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button onClick={onPayment} className="flex-1 px-3 py-2 text-sm bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5">
          <DollarSign size={14} /> Make Payment
        </button>
        <button onClick={onEdit} className="px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors">
          <Pencil size={14} />
        </button>
        <button onClick={onDelete} className="px-3 py-2 text-sm bg-gray-800 hover:bg-red-600/20 text-gray-400 hover:text-red-400 rounded-lg transition-colors">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Debts Page ─────────────────────────────────────────────────
export default function Debts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: debts, isLoading } = useDebts();
  const { data: summary } = useDebtSummary();
  const { data: incomeData } = useDetectIncome();
  const createDebt = useCreateDebt();
  const updateDebt = useUpdateDebt();
  const deleteDebt = useDeleteDebt();
  const allocateFromUrl = useAllocatePaycheck();

  const reportMut = useDebtReport();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [paymentDebt, setPaymentDebt] = useState<{ id: number; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Debt | null>(null);
  const [mutationError, setMutationError] = useState('');
  const [expandedSections, setExpandedSections] = useState({ planner: true, strategy: true, whatif: true });
  const [urlAllocation, setUrlAllocation] = useState<PaycheckAllocation | null>(null);

  // Feature 3: Read ?allocate= URL param and auto-trigger allocation
  useEffect(() => {
    const allocateParam = searchParams.get('allocate');
    if (allocateParam) {
      const cents = parseInt(allocateParam);
      if (cents > 0) {
        allocateFromUrl.mutate(
          { paycheck_amount: cents },
          {
            onSuccess: (data) => setUrlAllocation(data),
          }
        );
        // Clear the URL param
        searchParams.delete('allocate');
        setSearchParams(searchParams, { replace: true });
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSection = (key: 'planner' | 'strategy' | 'whatif') => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const sortedDebts = debts ? [...debts].sort((a, b) => a.priority - b.priority) : [];

  const debtToIncomeRatio = incomeData?.detected_income && summary
    ? ((summary.total_minimum_monthly / incomeData.detected_income) * 100).toFixed(1)
    : null;

  const handleCreate = (values: Record<string, unknown>) => {
    setMutationError('');
    createDebt.mutate(values as Parameters<typeof createDebt.mutate>[0], {
      onSuccess: () => setShowAddForm(false),
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to create debt';
        setMutationError(msg);
      },
    });
  };

  const handleUpdate = (values: Record<string, unknown>) => {
    if (!editingDebt) return;
    setMutationError('');
    updateDebt.mutate({ id: editingDebt.id, ...values } as Parameters<typeof updateDebt.mutate>[0], {
      onSuccess: () => setEditingDebt(null),
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to update debt';
        setMutationError(msg);
      },
    });
  };

  const handleDelete = (debt: Debt) => {
    setMutationError('');
    deleteDebt.mutate(debt.id, {
      onSuccess: () => setConfirmDelete(null),
      onError: (err: unknown) => {
        const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Failed to delete debt';
        setMutationError(msg);
        setConfirmDelete(null);
      },
    });
  };

  const handleExportPrint = useCallback(() => {
    reportMut.mutate(undefined, {
      onSuccess: (report: Record<string, unknown>) => {
        const r = report as {
          generated_at: string;
          summary: { total_owed: number; total_minimum_monthly: number; monthly_interest_cost: number; total_debts: number };
          progress: { total_original: number; total_paid: number; paid_percentage: number; months_remaining: number; debt_free_date: string | null; paid_off_count: number; active_count: number; total_debts: number };
          payoff_plan: { strategy: string; total_months: number; total_interest: number; debt_free_date: string | null; debts: Array<{ name: string; current_balance: number; interest_rate: number; estimated_payoff_date: string; months_to_payoff: number; total_interest: number; total_interest_paid: number }> };
          debts: Array<{ name: string; creditor: string; type: string; original_amount: number; current_balance: number; minimum_payment: number; interest_rate: number; priority: number; status: string; total_paid: number; payments: Array<{ amount: number; date: string; note: string | null }> }>;
        };
        const fc = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        const debtRows = r.debts.map(d => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${d.name}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${d.creditor}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${d.status}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${fc(d.original_amount)}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${fc(d.current_balance)}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${fc(d.total_paid)}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${d.interest_rate}%</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${d.priority}</td>
          </tr>`).join('');
        const planRows = r.payoff_plan.debts.map(d => `
          <tr>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${d.name}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${fc(d.current_balance)}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${d.interest_rate}%</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:center;">${d.months_to_payoff} mo</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${d.estimated_payoff_date}</td>
            <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right;">${fc(d.total_interest_paid ?? d.total_interest ?? 0)}</td>
          </tr>`).join('');

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Finance Buddy - Debt Report</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px 20px; color: #111827; background: #fff; }
  h1 { font-size: 24px; margin-bottom: 4px; }
  h2 { font-size: 18px; margin-top: 32px; margin-bottom: 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
  .subtitle { color: #6b7280; font-size: 14px; margin-bottom: 24px; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 24px; }
  .stat { border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; }
  .stat-label { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
  .stat-value { font-size: 20px; font-weight: 700; }
  .stat-value.red { color: #ef4444; }
  .stat-value.green { color: #16a34a; }
  .stat-value.blue { color: #2563eb; }
  .progress-bar { height: 20px; background: #e5e7eb; border-radius: 10px; overflow: hidden; margin-bottom: 8px; }
  .progress-fill { height: 100%; background: linear-gradient(to right, #22c55e, #10b981); border-radius: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { background: #f9fafb; text-align: left; padding: 10px 8px; border-bottom: 2px solid #e5e7eb; font-weight: 600; font-size: 12px; color: #374151; }
  @media print { body { padding: 20px; } }
</style></head><body>
<h1>Finance Buddy &mdash; Debt Report</h1>
<div class="subtitle">Generated: ${r.generated_at}</div>

<h2>Summary</h2>
<div class="stats">
  <div class="stat"><div class="stat-label">Total Owed</div><div class="stat-value red">${fc(r.summary.total_owed)}</div></div>
  <div class="stat"><div class="stat-label">Total Paid</div><div class="stat-value green">${fc(r.progress.total_paid)}</div></div>
  <div class="stat"><div class="stat-label">Progress</div><div class="stat-value blue">${r.progress.paid_percentage}%</div></div>
  <div class="stat"><div class="stat-label">Debts Paid Off</div><div class="stat-value">${r.progress.paid_off_count} of ${r.progress.total_debts}</div></div>
</div>
<div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100, r.progress.paid_percentage)}%"></div></div>
<div style="text-align:center;font-size:13px;color:#6b7280;margin-bottom:24px;">${fc(r.progress.total_paid)} paid of ${fc(r.progress.total_original)} total</div>

${r.progress.months_remaining > 0 && r.progress.debt_free_date ? `
<div style="text-align:center;padding:20px;border:2px solid #2563eb;border-radius:12px;margin-bottom:24px;">
  <div style="font-size:14px;color:#6b7280;">Estimated Debt-Free Date</div>
  <div style="font-size:28px;font-weight:700;color:#2563eb;">${r.progress.debt_free_date}</div>
  <div style="font-size:13px;color:#6b7280;">${r.progress.months_remaining} months remaining</div>
</div>` : r.progress.active_count === 0 ? `
<div style="text-align:center;padding:20px;border:2px solid #16a34a;border-radius:12px;margin-bottom:24px;">
  <div style="font-size:28px;font-weight:700;color:#16a34a;">You're Debt-Free!</div>
</div>` : ''}

<h2>All Debts</h2>
<table>
  <thead><tr><th>Name</th><th>Creditor</th><th>Status</th><th style="text-align:right;">Original</th><th style="text-align:right;">Balance</th><th style="text-align:right;">Paid</th><th style="text-align:right;">Rate</th><th style="text-align:center;">Priority</th></tr></thead>
  <tbody>${debtRows}</tbody>
</table>

<h2>Payoff Plan (${r.payoff_plan.strategy})</h2>
<div style="font-size:13px;color:#6b7280;margin-bottom:12px;">Total: ${r.payoff_plan.total_months} months | ${fc(r.payoff_plan.total_interest)} total interest</div>
<table>
  <thead><tr><th>Debt</th><th style="text-align:right;">Balance</th><th style="text-align:right;">Rate</th><th style="text-align:center;">Payoff In</th><th>Payoff Date</th><th style="text-align:right;">Interest</th></tr></thead>
  <tbody>${planRows}</tbody>
</table>

<script>window.onload = function() { window.print(); }</script>
</body></html>`;

        const win = window.open('', '_blank');
        if (win) {
          win.document.write(html);
          win.document.close();
        }
      },
    });
  }, [reportMut]);

  const handleDownloadJson = useCallback(() => {
    reportMut.mutate(undefined, {
      onSuccess: (report: Record<string, unknown>) => {
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `debt-report-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      },
    });
  }, [reportMut]);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <CreditCard size={24} className="text-red-400" />
          Debt Tracker
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPrint}
            disabled={reportMut.isPending}
            className="px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors flex items-center gap-1.5"
            title="Print Report"
          >
            {reportMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
            Export Report
          </button>
          <button
            onClick={handleDownloadJson}
            disabled={reportMut.isPending}
            className="px-3 py-2 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors flex items-center gap-1.5"
            title="Download JSON"
          >
            <Download size={14} />
            JSON
          </button>
          <button
            onClick={() => { setShowAddForm(true); setEditingDebt(null); }}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus size={16} /> Add Debt
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {mutationError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400 flex items-center justify-between">
          <span>{mutationError}</span>
          <button onClick={() => setMutationError('')} className="text-red-400 hover:text-red-300"><X size={16} /></button>
        </div>
      )}

      {/* Progress Banner (Feature 2 & 3) */}
      <ProgressBanner />

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Total Owed</div>
            <div className="text-xl font-bold text-red-400">{formatCents(summary.total_owed)}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Monthly Minimums</div>
            <div className="text-xl font-bold text-yellow-400">{formatCents(summary.total_minimum_monthly)}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">Active Debts</div>
            <div className="text-xl font-bold text-gray-100">{summary.total_debts}</div>
          </div>
          {debtToIncomeRatio !== null ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Debt-to-Income Ratio</div>
              <div className={`text-xl font-bold ${parseFloat(debtToIncomeRatio) > 50 ? 'text-red-400' : parseFloat(debtToIncomeRatio) > 30 ? 'text-yellow-400' : 'text-green-400'}`}>
                {debtToIncomeRatio}%
              </div>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">Monthly Interest Cost</div>
              <div className="text-xl font-bold text-orange-400">{formatCents(summary.monthly_interest_cost)}</div>
            </div>
          )}
        </div>
      )}

      {/* Debt Balance Over Time Chart (Feature 1) */}
      <DebtBalanceChart />

      {/* Add Debt Form */}
      {showAddForm && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">Add New Debt</h2>
          <DebtForm
            onSubmit={handleCreate}
            onCancel={() => setShowAddForm(false)}
            isLoading={createDebt.isPending}
          />
        </div>
      )}

      {/* Edit Debt Form */}
      {editingDebt && (
        <div className="bg-gray-900 border border-blue-500/30 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-gray-100 mb-4">Edit: {editingDebt.name}</h2>
          <DebtForm
            initial={editingDebt}
            onSubmit={handleUpdate}
            onCancel={() => setEditingDebt(null)}
            isLoading={updateDebt.isPending}
          />
        </div>
      )}

      {/* Paycheck Planner */}
      <div>
        <button onClick={() => toggleSection('planner')} className="flex items-center gap-2 text-gray-300 hover:text-gray-100 mb-2 transition-colors">
          {expandedSections.planner ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          <span className="font-medium">Paycheck Planner</span>
        </button>
        {expandedSections.planner && <PaycheckPlanner />}
      </div>

      {/* Debt List */}
      <div>
        <h2 className="text-lg font-semibold text-gray-100 mb-3">Your Debts</h2>
        {isLoading ? (
          <div className="text-center py-12"><Loader2 size={28} className="animate-spin mx-auto text-gray-500" /></div>
        ) : !sortedDebts.length ? (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
            <CreditCard size={40} className="mx-auto text-gray-700 mb-3" />
            <p className="text-gray-400 mb-1">No debts tracked yet</p>
            <p className="text-sm text-gray-600">Click "Add Debt" to start tracking what you owe.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {sortedDebts.map(debt => (
              <DebtCard
                key={debt.id}
                debt={debt}
                onEdit={() => { setEditingDebt(debt); setShowAddForm(false); }}
                onDelete={() => setConfirmDelete(debt)}
                onPayment={() => setPaymentDebt({ id: debt.id, name: debt.name })}
              />
            ))}
          </div>
        )}
      </div>

      {/* URL Allocation Result (Feature 3) */}
      {urlAllocation && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-400">
              <DollarSign size={18} />
              <span className="font-semibold">Paycheck Allocation: {formatCents(urlAllocation.paycheck_amount)}</span>
            </div>
            <button onClick={() => setUrlAllocation(null)} className="text-gray-400 hover:text-gray-200"><X size={16} /></button>
          </div>
          <div className="space-y-2">
            {urlAllocation.allocations.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{a.name}</span>
                <span className="text-gray-100 font-medium">{formatCents(a.amount)}</span>
              </div>
            ))}
          </div>
          {urlAllocation.shortfall > 0 && (
            <div className="text-sm text-red-400 flex items-center gap-2">
              <AlertTriangle size={14} />
              Shortfall: {formatCents(urlAllocation.shortfall)}
            </div>
          )}
        </div>
      )}

      {/* Payoff Strategy */}
      <div>
        <button onClick={() => toggleSection('strategy')} className="flex items-center gap-2 text-gray-300 hover:text-gray-100 mb-2 transition-colors">
          {expandedSections.strategy ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          <span className="font-medium">Payoff Strategy</span>
        </button>
        {expandedSections.strategy && <PayoffStrategy />}
      </div>

      {/* What If Simulator (Feature 2) */}
      <div>
        <button onClick={() => toggleSection('whatif')} className="flex items-center gap-2 text-gray-300 hover:text-gray-100 mb-2 transition-colors">
          {expandedSections.whatif ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          <span className="font-medium">What If? Simulator</span>
        </button>
        {expandedSections.whatif && <WhatIfSimulator />}
      </div>

      {/* Payment Modal */}
      {paymentDebt && (
        <PaymentForm
          debtId={paymentDebt.id}
          debtName={paymentDebt.name}
          onClose={() => setPaymentDebt(null)}
        />
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-100 mb-2">Delete Debt</h3>
            <p className="text-sm text-gray-400 mb-4">
              Are you sure you want to delete <span className="text-gray-200 font-medium">{confirmDelete.name}</span>? This will also remove all payment history for this debt. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleteDebt.isPending}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-500 text-white rounded-lg disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {deleteDebt.isPending && <Loader2 size={14} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
