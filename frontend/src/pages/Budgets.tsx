import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Copy, X, Wand2, ChevronRight, ChevronLeft, Check, Info, AlertTriangle, RefreshCw } from 'lucide-react';
import { useBudgets, useCreateBudget, useDeleteBudget, useCopyForward, useDetectIncome, useBulkCreateBudgets } from '../hooks/useBudgets';
import { useCategories } from '../hooks/useCategories';
import { formatCents, getCurrentMonth, toCents, toDollars } from '../lib/format';
import type { Category } from '../types';

const budgetSchema = z.object({
  category_id: z.number({ required_error: 'Category is required' }),
  amount: z.number().positive('Amount must be positive'),
  warn_threshold: z.number().min(0).max(100).optional(),
});

type BudgetFormValues = z.infer<typeof budgetSchema>;

// --- Framework definitions ---
const FRAMEWORKS = [
  { id: '50-30-20', label: '50/30/20', desc: 'Popular balanced approach', needs: 50, wants: 30, savings: 20 },
  { id: '70-20-10', label: '70/20/10', desc: 'Conservative, prioritizes essentials', needs: 70, wants: 20, savings: 10 },
  { id: '60-20-20', label: '60/20/20', desc: 'Balanced with higher savings', needs: 60, wants: 20, savings: 20 },
  { id: 'custom', label: 'Custom', desc: 'Set your own percentages', needs: 50, wants: 30, savings: 20 },
] as const;

// Category-to-tier mapping by name (case-insensitive)
const NEEDS_CATEGORIES: Record<string, number> = {
  'rent/mortgage': 60, 'rent': 60, 'mortgage': 60, 'housing': 60,
  'groceries': 20, 'grocery': 20,
  'utilities': 10, 'utility': 10,
  'transportation': 10, 'transport': 10,
};

const WANTS_CATEGORIES: Record<string, number> = {
  'dining out': 33, 'dining': 33, 'restaurants': 33,
  'entertainment': 20,
  'subscriptions': 17, 'subscription': 17,
  'clothing': 15, 'clothes': 15,
  'personal care': 15, 'personal': 15,
};

function matchCategoryTier(name: string): { tier: 'needs' | 'wants' | null; pct: number } {
  const lower = name.toLowerCase().trim();
  if (NEEDS_CATEGORIES[lower] !== undefined) return { tier: 'needs', pct: NEEDS_CATEGORIES[lower] };
  if (WANTS_CATEGORIES[lower] !== undefined) return { tier: 'wants', pct: WANTS_CATEGORIES[lower] };
  return { tier: null, pct: 0 };
}

// --- Budget Summary Bar ---
function BudgetSummaryBar({ month, budgets }: { month: string; budgets: any[] | undefined }) {
  const storedIncome = localStorage.getItem('fb_monthly_income');
  const storedSavings = localStorage.getItem('fb_savings_target');
  const income = storedIncome ? parseInt(storedIncome, 10) : 0;
  const savingsTarget = storedSavings ? parseInt(storedSavings, 10) : 0;

  const totalBudgeted = budgets?.reduce((sum, b) => sum + (b.limit_amount || b.amount || 0), 0) || 0;
  const remaining = income - totalBudgeted;

  if (!income) return null;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Monthly Income</p>
        <p className="text-lg font-semibold text-gray-200">{formatCents(income)}</p>
      </div>
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Budgeted</p>
        <p className="text-lg font-semibold text-gray-200">{formatCents(totalBudgeted)}</p>
      </div>
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Remaining</p>
        <p className={`text-lg font-semibold ${remaining >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {formatCents(remaining)}
        </p>
      </div>
      {savingsTarget > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Savings Target</p>
          <p className="text-lg font-semibold text-blue-400">{formatCents(savingsTarget)}</p>
        </div>
      )}
    </div>
  );
}

// --- Budget Wizard ---
interface WizardAllocation {
  category_id: number;
  category_name: string;
  category_icon: string | null;
  tier: 'needs' | 'wants';
  amount: number; // in dollars
}

function BudgetWizard({ month, categories, onClose }: {
  month: string;
  categories: Category[];
  onClose: () => void;
}) {
  const [step, setStep] = useState(1);
  const [income, setIncome] = useState(0); // in dollars
  const [frameworkId, setFrameworkId] = useState('50-30-20');
  const [customNeeds, setCustomNeeds] = useState(50);
  const [customWants, setCustomWants] = useState(30);
  const [customSavings, setCustomSavings] = useState(20);
  const [allocations, setAllocations] = useState<WizardAllocation[]>([]);
  const [savingsAmount, setSavingsAmount] = useState(0);

  const { data: incomeData, isLoading: incomeLoading } = useDetectIncome();
  const bulkCreate = useBulkCreateBudgets();

  // Set detected income on load
  useEffect(() => {
    if (incomeData && incomeData.detected_income > 0 && income === 0) {
      setIncome(toDollars(incomeData.detected_income));
    }
  }, [incomeData]);

  // Get current framework percentages
  const framework = useMemo(() => {
    if (frameworkId === 'custom') {
      return { needs: customNeeds, wants: customWants, savings: customSavings };
    }
    const fw = FRAMEWORKS.find(f => f.id === frameworkId)!;
    return { needs: fw.needs, wants: fw.wants, savings: fw.savings };
  }, [frameworkId, customNeeds, customWants, customSavings]);

  // Build allocations when moving to step 3
  useEffect(() => {
    if (step === 3 && income > 0) {
      const needsPool = Math.round(income * framework.needs / 100);
      const wantsPool = Math.round(income * framework.wants / 100);
      const savingsPool = Math.round(income * framework.savings / 100);
      setSavingsAmount(savingsPool);

      const newAllocations: WizardAllocation[] = [];

      // Map expense categories to tiers
      const expenseCategories = categories.filter(c => c.type === 'expense');

      // Assigned needs categories
      const needsMatched: { cat: Category; pct: number }[] = [];
      const wantsMatched: { cat: Category; pct: number }[] = [];
      const unmatched: Category[] = [];

      for (const cat of expenseCategories) {
        const match = matchCategoryTier(cat.name);
        if (match.tier === 'needs') {
          needsMatched.push({ cat, pct: match.pct });
        } else if (match.tier === 'wants') {
          wantsMatched.push({ cat, pct: match.pct });
        } else {
          unmatched.push(cat);
        }
      }

      // Build needs allocations
      const needsTotalPct = needsMatched.reduce((s, m) => s + m.pct, 0) || 1;
      for (const m of needsMatched) {
        newAllocations.push({
          category_id: m.cat.id,
          category_name: m.cat.name,
          category_icon: m.cat.icon,
          tier: 'needs',
          amount: Math.round(needsPool * m.pct / needsTotalPct),
        });
      }

      // Build wants allocations
      const wantsTotalPct = wantsMatched.reduce((s, m) => s + m.pct, 0) || 1;
      for (const m of wantsMatched) {
        newAllocations.push({
          category_id: m.cat.id,
          category_name: m.cat.name,
          category_icon: m.cat.icon,
          tier: 'wants',
          amount: Math.round(wantsPool * m.pct / wantsTotalPct),
        });
      }

      // Distribute unmatched categories evenly in wants
      if (unmatched.length > 0) {
        const remainingWants = wantsPool - newAllocations.filter(a => a.tier === 'wants').reduce((s, a) => s + a.amount, 0);
        const perCat = Math.max(Math.round(remainingWants / unmatched.length), 0);
        for (const cat of unmatched) {
          newAllocations.push({
            category_id: cat.id,
            category_name: cat.name,
            category_icon: cat.icon,
            tier: 'wants',
            amount: perCat,
          });
        }
      }

      setAllocations(newAllocations);
    }
  }, [step, income, framework, categories]);

  const updateAllocation = (idx: number, newAmount: number) => {
    setAllocations(prev => prev.map((a, i) => i === idx ? { ...a, amount: newAmount } : a));
  };

  const totalAllocated = allocations.reduce((s, a) => s + a.amount, 0);
  const unallocated = income - totalAllocated - savingsAmount;

  const handleCreate = async () => {
    const budgetItems = allocations
      .filter(a => a.amount > 0)
      .map(a => ({
        category_id: a.category_id,
        limit_amount: toCents(a.amount),
        warn_threshold: 80,
      }));

    if (budgetItems.length === 0) return;

    await bulkCreate.mutateAsync({ month, budgets: budgetItems });

    // Store income, savings, and framework in localStorage for rebalancing
    localStorage.setItem('fb_monthly_income', String(toCents(income)));
    localStorage.setItem('fb_budget_framework', frameworkId);
    localStorage.setItem('fb_budget_needs_pct', String(framework.needs));
    localStorage.setItem('fb_budget_wants_pct', String(framework.wants));
    localStorage.setItem('fb_budget_savings_pct', String(framework.savings));
    if (savingsAmount > 0) {
      localStorage.setItem('fb_savings_target', String(toCents(savingsAmount)));
    }

    onClose();
  };

  const stepIndicator = (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3].map(s => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
            s === step ? 'bg-blue-600 text-white' : s < step ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'
          }`}>
            {s < step ? <Check size={14} /> : s}
          </div>
          {s < 3 && <div className={`w-12 h-0.5 ${s < step ? 'bg-green-600' : 'bg-gray-700'}`} />}
        </div>
      ))}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-100">Smart Budget Setup</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-200 transition-colors">
              <X size={20} />
            </button>
          </div>

          {stepIndicator}

          {/* Step 1: Income */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-lg font-semibold text-gray-200 mb-1">What's your monthly income?</h3>
                <p className="text-sm text-gray-400">We'll use this to calculate your budget allocations.</p>
              </div>

              {incomeLoading ? (
                <div className="h-16 bg-gray-800 rounded-lg animate-pulse" />
              ) : incomeData && incomeData.source !== 'none' ? (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Info size={16} className="text-blue-400" />
                    <span className="text-sm text-blue-400">
                      {incomeData.source === 'recurring'
                        ? `Detected from recurring templates: ${formatCents(incomeData.detected_income)}/month`
                        : `Estimated from recent transactions: ${formatCents(incomeData.detected_income)}/month`}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">You can adjust this amount below.</p>
                </div>
              ) : (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <p className="text-sm text-gray-400">No income detected. Enter your monthly income manually.</p>
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-400 mb-1">Monthly Income ($)</label>
                <input
                  type="number"
                  value={income || ''}
                  onChange={e => setIncome(parseFloat(e.target.value) || 0)}
                  placeholder="5000"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-lg text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={income <= 0}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Framework */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-lg font-semibold text-gray-200 mb-1">Choose a budgeting framework</h3>
                <p className="text-sm text-gray-400">Select how to split your ${income.toLocaleString()} monthly income.</p>
              </div>

              <div className="space-y-3">
                {FRAMEWORKS.map(fw => {
                  const isSelected = frameworkId === fw.id;
                  const n = fw.id === 'custom' ? customNeeds : fw.needs;
                  const w = fw.id === 'custom' ? customWants : fw.wants;
                  const s = fw.id === 'custom' ? customSavings : fw.savings;
                  return (
                    <button
                      key={fw.id}
                      onClick={() => setFrameworkId(fw.id)}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-gray-200">{fw.label}</span>
                          {fw.id === '50-30-20' && (
                            <span className="ml-2 text-xs bg-blue-600/30 text-blue-300 px-2 py-0.5 rounded-full">Recommended</span>
                          )}
                          <p className="text-sm text-gray-400 mt-0.5">{fw.desc}</p>
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-blue-500' : 'border-gray-600'
                        }`}>
                          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                        </div>
                      </div>
                      <div className="flex gap-4 mt-3 text-xs text-gray-400">
                        <span>Needs: <span className="text-gray-300 font-medium">${Math.round(income * n / 100).toLocaleString()}</span></span>
                        <span>Wants: <span className="text-gray-300 font-medium">${Math.round(income * w / 100).toLocaleString()}</span></span>
                        <span>Savings: <span className="text-gray-300 font-medium">${Math.round(income * s / 100).toLocaleString()}</span></span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {frameworkId === 'custom' && (
                <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-3">
                  <h4 className="text-sm font-medium text-gray-300">Custom Percentages</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Needs %</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={customNeeds}
                        onChange={e => setCustomNeeds(parseInt(e.target.value) || 0)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Wants %</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={customWants}
                        onChange={e => setCustomWants(parseInt(e.target.value) || 0)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Savings %</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={customSavings}
                        onChange={e => setCustomSavings(parseInt(e.target.value) || 0)}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  {customNeeds + customWants + customSavings !== 100 && (
                    <p className="text-xs text-yellow-400">Percentages should add up to 100% (currently {customNeeds + customWants + customSavings}%)</p>
                  )}
                </div>
              )}

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 text-gray-400 hover:text-gray-200 px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  <ChevronLeft size={16} /> Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Review & Adjust */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h3 className="text-lg font-semibold text-gray-200 mb-1">Review & Adjust</h3>
                <p className="text-sm text-gray-400">Fine-tune your budget amounts before creating them.</p>
              </div>

              {/* Needs section */}
              {allocations.filter(a => a.tier === 'needs').length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Needs</h4>
                  <div className="space-y-2">
                    {allocations.map((a, idx) => {
                      if (a.tier !== 'needs') return null;
                      return (
                        <div key={a.category_id} className="flex items-center gap-3 bg-gray-800 rounded-lg p-3 border border-gray-700">
                          <span className="text-lg w-8 text-center">{a.category_icon || '📦'}</span>
                          <span className="flex-1 text-sm text-gray-200">{a.category_name}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-gray-500">$</span>
                            <input
                              type="number"
                              value={a.amount}
                              onChange={e => updateAllocation(idx, parseInt(e.target.value) || 0)}
                              className="w-24 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Wants section */}
              {allocations.filter(a => a.tier === 'wants').length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Wants</h4>
                  <div className="space-y-2">
                    {allocations.map((a, idx) => {
                      if (a.tier !== 'wants') return null;
                      return (
                        <div key={a.category_id} className="flex items-center gap-3 bg-gray-800 rounded-lg p-3 border border-gray-700">
                          <span className="text-lg w-8 text-center">{a.category_icon || '📦'}</span>
                          <span className="flex-1 text-sm text-gray-200">{a.category_name}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-sm text-gray-500">$</span>
                            <input
                              type="number"
                              value={a.amount}
                              onChange={e => updateAllocation(idx, parseInt(e.target.value) || 0)}
                              className="w-24 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Savings section */}
              <div>
                <h4 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2">Savings</h4>
                <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 flex items-center gap-3">
                  <span className="text-lg w-8 text-center">🏦</span>
                  <span className="flex-1 text-sm text-gray-200">Savings Target</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-500">$</span>
                    <input
                      type="number"
                      value={savingsAmount}
                      onChange={e => setSavingsAmount(parseInt(e.target.value) || 0)}
                      className="w-24 bg-gray-900 border border-gray-700 rounded px-2 py-1.5 text-sm text-gray-200 text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Savings target is tracked separately and won't create a budget category.</p>
              </div>

              {/* Running total */}
              <div className={`rounded-lg p-4 border ${
                totalAllocated + savingsAmount <= income
                  ? 'bg-green-500/5 border-green-500/20'
                  : 'bg-red-500/5 border-red-500/20'
              }`}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Total Allocated</span>
                  <span className={`font-semibold ${
                    totalAllocated + savingsAmount <= income ? 'text-green-400' : 'text-red-400'
                  }`}>
                    ${(totalAllocated + savingsAmount).toLocaleString()} / ${income.toLocaleString()} income
                  </span>
                </div>
                {unallocated !== 0 && (
                  <div className="flex items-center justify-between text-xs mt-1">
                    <span className="text-gray-500">{unallocated > 0 ? 'Unallocated' : 'Over budget'}</span>
                    <span className={unallocated > 0 ? 'text-gray-400' : 'text-red-400'}>
                      ${Math.abs(unallocated).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 text-gray-400 hover:text-gray-200 px-4 py-2.5 rounded-lg text-sm transition-colors"
                >
                  <ChevronLeft size={16} /> Back
                </button>
                <button
                  onClick={handleCreate}
                  disabled={bulkCreate.isPending || allocations.filter(a => a.amount > 0).length === 0}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
                >
                  {bulkCreate.isPending ? 'Creating...' : 'Create All Budgets'}
                  {!bulkCreate.isPending && <Check size={16} />}
                </button>
              </div>

              {bulkCreate.isError && (
                <p className="text-red-400 text-sm">Failed to create budgets. Please try again.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Main Budgets Page ---
export default function Budgets() {
  const [month, setMonth] = useState(getCurrentMonth());
  const [showForm, setShowForm] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [rebalanceDismissed, setRebalanceDismissed] = useState(false);
  const [autoCreating, setAutoCreating] = useState(false);

  const { data: budgets, isLoading, error } = useBudgets(month);
  const { data: categories } = useCategories('expense');
  const { data: detectedIncome } = useDetectIncome();
  const createBudget = useCreateBudget();
  const deleteBudget = useDeleteBudget();
  const copyForward = useCopyForward();
  const bulkCreate = useBulkCreateBudgets();

  // --- Income change detection ---
  const storedIncome = parseInt(localStorage.getItem('fb_monthly_income') || '0', 10);
  const currentIncome = detectedIncome?.detected_income || 0;
  const incomeChanged = storedIncome > 0 && currentIncome > 0 &&
    Math.abs(currentIncome - storedIncome) / storedIncome > 0.05; // >5% change
  const incomeIncreased = currentIncome > storedIncome;

  // --- Rebalance: scale all budgets proportionally to new income ---
  const handleRebalance = async () => {
    if (!budgets || budgets.length === 0 || !categories) return;
    const ratio = currentIncome / storedIncome;

    const rebalanced = budgets.map((b: any) => ({
      category_id: b.category_id,
      limit_amount: Math.round((b.limit_amount || b.amount) * ratio),
      warn_threshold: b.warn_threshold || 80,
    }));

    await bulkCreate.mutateAsync({ month, budgets: rebalanced });
    localStorage.setItem('fb_monthly_income', String(currentIncome));
    setRebalanceDismissed(true);
  };

  // --- Auto-create budgets for new months using stored framework ---
  useEffect(() => {
    if (isLoading || autoCreating) return;
    if (budgets && budgets.length > 0) return; // already has budgets
    if (!categories || categories.length === 0) return;

    const storedFramework = localStorage.getItem('fb_budget_framework');
    const savedIncome = parseInt(localStorage.getItem('fb_monthly_income') || '0', 10);
    if (!storedFramework || !savedIncome) return; // no prior setup

    const needsPct = parseInt(localStorage.getItem('fb_budget_needs_pct') || '50', 10);
    const wantsPct = parseInt(localStorage.getItem('fb_budget_wants_pct') || '30', 10);

    // Rebuild allocations from stored framework
    const needsPool = Math.round(savedIncome * needsPct / 100);
    const wantsPool = Math.round(savedIncome * wantsPct / 100);

    const budgetItems: { category_id: number; limit_amount: number; warn_threshold: number }[] = [];

    for (const cat of categories) {
      const match = matchCategoryTier(cat.name);
      if (match.tier === 'needs') {
        budgetItems.push({
          category_id: cat.id,
          limit_amount: Math.round(needsPool * match.pct / 100),
          warn_threshold: 80,
        });
      } else if (match.tier === 'wants') {
        budgetItems.push({
          category_id: cat.id,
          limit_amount: Math.round(wantsPool * match.pct / 100),
          warn_threshold: 80,
        });
      }
    }

    // Add unmatched expense categories to wants with even split
    const matchedIds = new Set(budgetItems.map(b => b.category_id));
    const unmatched = categories.filter(c => !matchedIds.has(c.id));
    if (unmatched.length > 0) {
      const remaining = wantsPool - budgetItems.filter(b => {
        const cat = categories.find(c => c.id === b.category_id);
        return cat && matchCategoryTier(cat.name).tier === 'wants';
      }).reduce((s, b) => s + b.limit_amount, 0);
      const perCat = Math.max(0, Math.round(remaining / unmatched.length));
      for (const cat of unmatched) {
        if (perCat > 0) {
          budgetItems.push({ category_id: cat.id, limit_amount: perCat, warn_threshold: 80 });
        }
      }
    }

    if (budgetItems.length > 0) {
      setAutoCreating(true);
      bulkCreate.mutateAsync({ month, budgets: budgetItems }).finally(() => setAutoCreating(false));
    }
  }, [budgets, isLoading, categories, month]); // eslint-disable-line react-hooks/exhaustive-deps

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
    copyForward.mutate({ target_month: month });
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Delete this budget?')) {
      deleteBudget.mutate(id);
    }
  };

  // Check for savings target info banner
  const savingsTarget = localStorage.getItem('fb_savings_target');
  const savingsTargetAmount = savingsTarget ? parseInt(savingsTarget, 10) : 0;

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
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Wand2 size={16} />
            Smart Setup
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

      {/* Budget Summary Bar */}
      <BudgetSummaryBar month={month} budgets={budgets} />

      {/* Savings Target Banner */}
      {savingsTargetAmount > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-center gap-2 text-sm text-blue-300">
          <Info size={16} />
          <span>Savings target: <span className="font-medium">{formatCents(savingsTargetAmount)}</span>/month. Track this separately in your savings goals.</span>
        </div>
      )}

      {/* Income Change Alert */}
      {incomeChanged && !rebalanceDismissed && budgets && budgets.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle size={20} className="text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-yellow-200 font-medium text-sm">
              Your income has {incomeIncreased ? 'increased' : 'decreased'}: {formatCents(storedIncome)} → {formatCents(currentIncome)}
            </p>
            <p className="text-yellow-300/70 text-xs mt-1">
              Your budgets were set based on {formatCents(storedIncome)}/month. Rebalancing will scale all budget amounts proportionally to your new income.
            </p>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleRebalance}
                disabled={bulkCreate.isPending}
                className="flex items-center gap-1.5 bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                <RefreshCw size={14} className={bulkCreate.isPending ? 'animate-spin' : ''} />
                {bulkCreate.isPending ? 'Rebalancing...' : 'Rebalance Budgets'}
              </button>
              <button
                onClick={() => setRebalanceDismissed(true)}
                className="text-xs text-gray-400 hover:text-gray-200 px-3 py-1.5 transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-creating indicator */}
      {autoCreating && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-center gap-2 text-sm text-blue-300">
          <RefreshCw size={16} className="animate-spin" />
          Auto-creating budgets for {month} based on your saved framework...
        </div>
      )}

      {/* Wizard Modal */}
      {showWizard && categories && (
        <BudgetWizard
          month={month}
          categories={categories}
          onClose={() => setShowWizard(false)}
        />
      )}

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

      {/* Mutation error display */}
      {createBudget.isError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
          {(createBudget.error as any)?.response?.data?.error?.message || 'Failed to create budget. Please try again.'}
        </div>
      )}
      {deleteBudget.isError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
          {(deleteBudget.error as any)?.response?.data?.error?.message || 'Failed to delete budget. Please try again.'}
        </div>
      )}

      {/* Budget Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-32 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
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
                    {formatCents(b.spent)} of {formatCents(b.limit_amount || b.amount)} spent
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
          <p className="text-gray-400 mb-2">No budgets set for {month}.</p>
          <p className="text-gray-500 text-sm mb-4">Set up budgets to track your spending.</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => setShowWizard(true)}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Wand2 size={16} />
              Smart Setup
            </button>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus size={16} />
              Add Budget
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
