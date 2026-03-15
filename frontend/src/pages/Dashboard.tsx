import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, BarChart3, Plus } from 'lucide-react';
import { useDashboardSummary, useSpendingByCategory, useMonthlyTrends, useBudgetHealth } from '../hooks/useDashboard';
import { useTransactions } from '../hooks/useTransactions';
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
  const [month, setMonth] = useState(getCurrentMonth());

  const { data: summary, isLoading: loadingSummary } = useDashboardSummary(month);
  const { data: spending, isLoading: loadingSpending } = useSpendingByCategory(month);
  const { data: trends, isLoading: loadingTrends } = useMonthlyTrends(6);
  const { data: budgetHealth, isLoading: loadingBudgets } = useBudgetHealth(month);
  const { data: recentTxns } = useTransactions({ page: 1, per_page: 5 });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Summary Cards */}
      {loadingSummary ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-28 bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-72 bg-gray-800 rounded-xl animate-pulse" />
            <div className="h-72 bg-gray-800 rounded-xl animate-pulse" />
          </div>
        </div>
      ) : summary && summary.income === 0 && summary.expenses === 0 && summary.investment_value === 0 ? (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trends */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="text-lg font-semibold mb-4">Monthly Trends</h2>
          {loadingTrends ? (
            <div className="h-[280px] bg-gray-800 rounded-lg animate-pulse" />
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
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#e5e7eb' }}
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
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="text-lg font-semibold mb-4">Spending by Category</h2>
          {loadingSpending ? (
            <div className="h-[240px] bg-gray-800 rounded-lg animate-pulse" />
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
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Budget Health */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="text-lg font-semibold mb-4">Budget Health</h2>
          {loadingBudgets ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-10 bg-gray-800 rounded-lg animate-pulse" />
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
                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
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
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Transactions</h2>
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
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-gray-400">{title}</span>
        <div className={`w-9 h-9 rounded-lg ${bgColor} ${color} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className={`text-xs mt-1 ${positive ? 'text-green-400' : 'text-red-400'}`}>
        {delta} vs last month
      </p>
    </div>
  );
}
