import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, BarChart3, Plus, X,
  CheckCircle, AlertTriangle, XCircle, Info, Lightbulb, Calendar,
  ArrowLeftRight, ArrowUp, ArrowDown, CreditCard, ChevronDown,
} from 'lucide-react';
import { useDashboardSummary, useSpendingByCategory, useMonthlyTrends, useBudgetHealth, useMonthlyInsights, useMonthComparison } from '../hooks/useDashboard';
import { useTransactions } from '../hooks/useTransactions';
import { useCategories } from '../hooks/useCategories';
import { useUpcomingBills } from '../hooks/useRecurring';
import { useDebtSummary, useUpcomingDebtDue } from '../hooks/useDebts';
import { formatCents, formatDate, getCurrentMonth } from '../lib/format';

const CHART_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
];

function deltaPercent(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? '+100%' : '0%';
  const pct = ((current - previous) / Math.abs(previous)) * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(getCurrentMonth());
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [paycheckDismissed, setPaycheckDismissed] = useState(() => sessionStorage.getItem('paycheck-prompt-dismissed') === 'true');

  const { data: summary, isLoading: loadingSummary } = useDashboardSummary(month);
  const { data: spending, isLoading: loadingSpending } = useSpendingByCategory(month);
  const { data: trends, isLoading: loadingTrends } = useMonthlyTrends(6);
  const { data: budgetHealth, isLoading: loadingBudgets } = useBudgetHealth(month);
  const { data: recentTxns } = useTransactions({ page: 1, per_page: 5 });
  const { data: insights } = useMonthlyInsights(month);
  const { data: upcomingBills } = useUpcomingBills(7);
  const { data: monthComparison } = useMonthComparison(month);
  const { data: debtSummary } = useDebtSummary();
  const { data: upcomingDebtDue } = useUpcomingDebtDue(7);

  // Feature 3: Detect recent income (last 3 days)
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const recentIncomeFilter = {
    type: 'income' as const,
    start_date: threeDaysAgo.toISOString().split('T')[0],
    page: 1,
    per_page: 3,
  };
  const { data: recentIncome } = useTransactions(recentIncomeFilter);
  const latestIncome = recentIncome?.data?.[0];
  const showPaycheckPrompt = !paycheckDismissed && latestIncome && debtSummary && debtSummary.total_debts > 0;

  const handleDismissPaycheck = () => {
    setPaycheckDismissed(true);
    sessionStorage.setItem('paycheck-prompt-dismissed', 'true');
  };


  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-display font-bold">Dashboard</h1>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="bg-card border border-white/[0.06] rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Summary Cards */}
      {loadingSummary ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-28 bg-card rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-72 bg-card rounded-2xl animate-pulse" />
            <div className="h-72 bg-card rounded-2xl animate-pulse" />
          </div>
        </div>
      ) : summary && summary.income === 0 && summary.expenses === 0 && summary.investment_value === 0 ? (
        <div className="bg-card rounded-2xl border border-white/[0.06] p-12 text-center">
          <p className="text-gray-400 mb-2">Welcome to Finance Buddy!</p>
          <p className="text-gray-500 text-sm mb-4">Add some transactions to see your financial overview.</p>
          <Link
            to="/transactions/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Add Transaction
          </Link>
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            title="Income"
            value={formatCents(summary.income)}
            delta={deltaPercent(summary.income, summary.prev_income)}
            positive={summary.income >= summary.prev_income}
            icon={<DollarSign size={20} />}
            color="text-green-400"
            bgColor="bg-green-400/10"
          />
          <SummaryCard
            title="Expenses"
            value={formatCents(summary.expenses)}
            delta={deltaPercent(summary.expenses, summary.prev_expenses)}
            positive={summary.expenses <= summary.prev_expenses}
            icon={<TrendingDown size={20} />}
            color="text-red-400"
            bgColor="bg-red-400/10"
          />
          <SummaryCard
            title="Net"
            value={formatCents(summary.net)}
            delta={deltaPercent(summary.net, summary.prev_net)}
            positive={summary.net >= 0}
            icon={<TrendingUp size={20} />}
            color={summary.net >= 0 ? 'text-green-400' : 'text-red-400'}
            bgColor={summary.net >= 0 ? 'bg-green-400/10' : 'bg-red-400/10'}
          />
          <SummaryCard
            title="Investments"
            value={formatCents(summary.investment_value)}
            delta={deltaPercent(summary.investment_value, summary.prev_investment_value)}
            positive={summary.investment_value >= summary.prev_investment_value}
            icon={<BarChart3 size={20} />}
            color="text-blue-400"
            bgColor="bg-blue-400/10"
          />
        </div>
      ) : null}

      {/* Feature 1: Monthly Insights — Collapsible Accordion */}
      {insights && insights.insights && insights.insights.length > 0 && (
        <div className="bg-card rounded-2xl border border-white/[0.06]">
          <button
            onClick={() => setInsightsOpen(!insightsOpen)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-elevated/50 transition-colors rounded-2xl"
          >
            <div className="flex items-center gap-2">
              <Lightbulb size={18} className="text-yellow-400" />
              <span className="text-sm font-display font-semibold text-gray-200">Monthly Insights</span>
              <span className="text-xs bg-elevated text-gray-400 px-2 py-0.5 rounded-full">{insights.insights.length}</span>
            </div>
            <ChevronDown size={16} className={`text-gray-400 transition-transform ${insightsOpen ? 'rotate-180' : ''}`} />
          </button>
          {insightsOpen && (
            <div className="px-5 pb-4 space-y-2">
              {insights.insights.slice(0, 5).map((insight, i) => {
                const config = {
                  positive: { bg: 'bg-green-500/10', text: 'text-green-400', Icon: CheckCircle },
                  warning: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', Icon: AlertTriangle },
                  negative: { bg: 'bg-red-500/10', text: 'text-red-400', Icon: XCircle },
                  info: { bg: 'bg-blue-500/10', text: 'text-blue-400', Icon: Info },
                }[insight.type];
                return (
                  <div key={i} className={`flex items-center gap-3 rounded-lg px-4 py-2.5 ${config.bg}`}>
                    <config.Icon size={16} className={config.text} />
                    <span className={`text-sm ${config.text}`}>{insight.message}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <div className="bg-card rounded-2xl border border-white/[0.06] p-5">
          <h2 className="text-lg font-display font-semibold mb-4">Monthly Trends</h2>
          {loadingTrends ? (
            <div className="h-[280px] bg-elevated rounded-lg animate-pulse" />
          ) : trends && trends.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trends.map(t => ({
                month: t.month,
                Income: t.income / 100,
                Expenses: t.expenses / 100,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#e5e7eb' }}
                  labelStyle={{ color: '#e5e7eb' }}
                  itemStyle={{ color: '#e5e7eb' }}
                  cursor={{ fill: 'rgba(55, 65, 81, 0.5)' }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, undefined]}
                />
                <Legend />
                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-gray-500 text-center py-12">No trend data available</div>
          )}
        </div>

        {/* Spending by Category */}
        <div className="bg-card rounded-2xl border border-white/[0.06] p-5">
          <h2 className="text-lg font-display font-semibold mb-4">Spending by Category</h2>
          {loadingSpending ? (
            <div className="h-[240px] bg-elevated rounded-lg animate-pulse" />
          ) : spending && spending.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={240}>
                <PieChart>
                  <Pie
                    data={spending.map((s, i) => ({
                      name: s.category_name,
                      value: s.amount / 100,
                      fill: s.category_color || CHART_COLORS[i % CHART_COLORS.length],
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    dataKey="value"
                    stroke="none"
                  >
                    {spending.map((s, i) => (
                      <Cell key={i} fill={s.category_color || CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', color: '#e5e7eb' }}
                    itemStyle={{ color: '#e5e7eb' }}
                    formatter={(value: number) => [`$${value.toFixed(2)}`, undefined]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {spending.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full inline-block"
                        style={{ backgroundColor: s.category_color || CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                      <span className="text-gray-300">{s.category_name}</span>
                    </div>
                    <span className="text-gray-400">{formatCents(s.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-12">No spending data this month</div>
          )}
        </div>
      </div>

      {/* Month-over-Month Category Comparison */}
      {monthComparison && monthComparison.length > 0 && (
        <div className="bg-card rounded-2xl border border-white/[0.06] p-5">
          <div className="flex items-center gap-2 mb-4">
            <ArrowLeftRight size={20} className="text-purple-400" />
            <h2 className="text-lg font-display font-semibold">vs Last Month</h2>
          </div>
          <div className="space-y-2">
            <div className="grid grid-cols-5 text-[11px] text-gray-500 uppercase tracking-wider font-mono pb-2 border-b border-white/[0.06]">
              <span className="col-span-1">Category</span>
              <span className="text-right">This Month</span>
              <span className="text-right">Last Month</span>
              <span className="text-right">Change</span>
              <span className="text-right">%</span>
            </div>
            {monthComparison.map((item) => (
              <div key={item.category_id} className="grid grid-cols-5 items-center text-sm py-1.5">
                <div className="col-span-1 flex items-center gap-2 truncate">
                  <span className="text-base">{item.category_icon || ''}</span>
                  <span className="text-gray-300 truncate">{item.category_name}</span>
                </div>
                <span className="text-right text-gray-200">{formatCents(item.current_amount)}</span>
                <span className="text-right text-gray-400">{formatCents(item.previous_amount)}</span>
                <div className="flex items-center justify-end gap-1">
                  {item.change_amount !== 0 && (
                    item.change_amount > 0
                      ? <ArrowUp size={12} className="text-red-400" />
                      : <ArrowDown size={12} className="text-green-400" />
                  )}
                  <span className={item.change_amount > 0 ? 'text-red-400' : item.change_amount < 0 ? 'text-green-400' : 'text-gray-400'}>
                    {item.change_amount > 0 ? '+' : ''}{formatCents(item.change_amount)}
                  </span>
                </div>
                <span className={`text-right text-xs ${item.change_percent > 0 ? 'text-red-400' : item.change_percent < 0 ? 'text-green-400' : 'text-gray-400'}`}>
                  {item.change_percent > 0 ? '+' : ''}{item.change_percent}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Health */}
        <div className="bg-card rounded-2xl border border-white/[0.06] p-5">
          <h2 className="text-lg font-display font-semibold mb-4">Budget Health</h2>
          {loadingBudgets ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-10 bg-elevated rounded-lg animate-pulse" />
              ))}
            </div>
          ) : budgetHealth && budgetHealth.length > 0 ? (
            <div className="space-y-3">
              {budgetHealth.map((b) => {
                const pct = b.percentage;
                const barColor =
                  pct >= 100 ? 'bg-red-500' : pct >= b.warn_threshold ? 'bg-yellow-500' : 'bg-green-500';
                return (
                  <div key={b.id}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-300">{b.category_name}</span>
                      <span className="text-gray-400">
                        {formatCents(b.spent)} / {formatCents(b.amount)} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${barColor}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-12">
              No budgets set for this month.{' '}
              <Link to="/budgets" className="text-blue-400 hover:underline">Create one</Link>
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-card rounded-2xl border border-white/[0.06] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-display font-semibold">Recent Transactions</h2>
            <Link to="/transactions" className="text-sm text-blue-400 hover:underline">View all</Link>
          </div>
          {recentTxns && recentTxns.data.length > 0 ? (
            <div className="space-y-3">
              {recentTxns.data.map((t) => (
                <div key={t.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs"
                      style={{ backgroundColor: (t.category_color || '#6b7280') + '20', color: t.category_color || '#9ca3af' }}
                    >
                      {t.category_icon || t.category_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm text-gray-200">{t.description}</p>
                      <p className="text-xs text-gray-500">{formatDate(t.date)}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {t.type === 'income' ? '+' : '-'}{formatCents(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-500 text-center py-12">
              No transactions yet.{' '}
              <Link to="/transactions/new" className="text-blue-400 hover:underline">Add one</Link>
            </div>
          )}
        </div>
      </div>

      {/* Feature 4: Upcoming Bills Widget */}
      <div className="bg-card rounded-2xl border border-white/[0.06] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={20} className="text-blue-400" />
          <h2 className="text-lg font-display font-semibold">Upcoming Bills (Next 7 Days)</h2>
        </div>
        {upcomingBills && upcomingBills.length > 0 ? (
          <div className="space-y-3">
            {upcomingBills.map((bill) => {
              const dueColor =
                bill.days_until === 0 ? 'text-red-400' : bill.days_until === 1 ? 'text-yellow-400' : 'text-gray-400';
              const dueLabel =
                bill.days_until === 0 ? 'Today' : bill.days_until === 1 ? 'Tomorrow' : `in ${bill.days_until} days`;
              return (
                <div key={bill.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-elevated flex items-center justify-center text-xs">
                      {bill.category_icon || bill.category_name?.charAt(0) || '?'}
                    </div>
                    <div>
                      <p className="text-sm text-gray-200">{bill.description}</p>
                      <p className={`text-xs ${dueColor}`}>{dueLabel}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${bill.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                    {bill.type === 'income' ? '+' : '-'}{formatCents(bill.amount)}
                  </span>
                </div>
              );
            })}
            <div className="border-t border-white/[0.06] pt-3 flex justify-between text-sm">
              <span className="text-gray-400">Total due</span>
              <span className="text-gray-200 font-medium">
                {formatCents(upcomingBills.filter(b => b.type === 'expense').reduce((sum, b) => sum + b.amount, 0))}
              </span>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-center py-8">No bills due in the next 7 days</div>
        )}

        {/* Feature 4: Debt Payments Due */}
        {upcomingDebtDue && upcomingDebtDue.length > 0 && (
          <div className="border-t border-white/[0.06] pt-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <CreditCard size={16} className="text-red-400" />
              <h3 className="text-sm font-semibold text-gray-300">Debt Payments Due</h3>
            </div>
            <div className="space-y-2">
              {upcomingDebtDue.map((debt) => {
                const dueColor =
                  debt.days_until <= 1 ? 'text-red-400' : debt.days_until <= 3 ? 'text-yellow-400' : 'text-gray-400';
                const dueLabel =
                  debt.days_until === 0 ? 'Today' : debt.days_until === 1 ? 'Tomorrow' : `in ${debt.days_until} days`;
                const isCritical = debt.current_balance > 50000 && debt.priority === 1;
                return (
                  <div key={debt.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard size={14} className={dueColor} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-200">{debt.name}</span>
                          {isCritical && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 font-bold">CRITICAL</span>
                          )}
                        </div>
                        <p className={`text-xs ${dueColor}`}>due {dueLabel}</p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-red-400">{formatCents(debt.current_balance)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Feature 3: Paycheck Arrival Prompt */}
      {showPaycheckPrompt && latestIncome && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <DollarSign size={20} className="text-green-400" />
              </div>
              <div>
                <p className="text-sm text-blue-300">
                  You received {latestIncome.description} ({formatCents(latestIncome.amount)}) on {formatDate(latestIncome.date)}. Allocate this paycheck to your debts?
                </p>
              </div>
            </div>
            <button onClick={handleDismissPaycheck} className="text-gray-400 hover:text-gray-200 ml-3 shrink-0">
              <X size={16} />
            </button>
          </div>
          <div className="flex gap-3 mt-3 ml-13">
            <button
              onClick={() => navigate(`/debts?allocate=${latestIncome.amount}`)}
              className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              Allocate Now
            </button>
            <button
              onClick={handleDismissPaycheck}
              className="px-4 py-2 text-sm bg-card hover:bg-elevated text-gray-400 rounded-lg transition-colors border border-white/[0.06]"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title, value, delta, positive, icon, color, bgColor,
}: {
  title: string;
  value: string;
  delta: string;
  positive: boolean;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}) {
  const accentBorder = color.includes('green') ? 'border-l-green-500' : color.includes('red') ? 'border-l-red-500' : color.includes('blue') ? 'border-l-blue-500' : 'border-l-yellow-500';
  return (
    <div className={`bg-card rounded-2xl border border-white/[0.06] border-l-2 ${accentBorder} p-5 card-hover`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">{title}</span>
        <div className={`w-9 h-9 rounded-lg ${bgColor} ${color} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-display font-bold ${color}`}>{value}</p>
      <p className={`font-mono text-xs mt-1 ${positive ? 'text-green-400' : 'text-red-400'}`}>
        {delta} vs last month
      </p>
    </div>
  );
}
