import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react';
import { useInvestment, useInvestmentSnapshots, useUpdateInvestmentValue } from '../hooks/useInvestments';
import { formatCents, formatDate, toCents } from '../lib/format';

export default function InvestmentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const investmentId = Number(id);

  const { data: investment, isLoading } = useInvestment(investmentId);
  const { data: snapshots } = useInvestmentSnapshots(investmentId);
  const updateValue = useUpdateInvestmentValue();

  const [newValue, setNewValue] = useState('');
  const [valueDate, setValueDate] = useState(new Date().toISOString().split('T')[0]);

  const handleUpdateValue = async () => {
    const val = parseFloat(newValue);
    if (isNaN(val) || val < 0) return;
    await updateValue.mutateAsync({ id: investmentId, value: toCents(val), date: valueDate });
    setNewValue('');
  };

  if (isLoading) {
    return <div className="p-6 text-gray-400">Loading investment...</div>;
  }

  if (!investment) {
    return <div className="p-6 text-red-400">Investment not found.</div>;
  }

  const gainLoss = investment.current_value - investment.total_contributions;
  const gainPct = investment.total_contributions > 0
    ? ((gainLoss / investment.total_contributions) * 100).toFixed(1)
    : '0.0';
  const isPositive = gainLoss >= 0;

  const chartData = (snapshots || []).map((s) => ({
    date: formatDate(s.date),
    value: s.value / 100,
  }));

  return (
    <div className="p-6 space-y-6">
      <button
        onClick={() => navigate('/investments')}
        className="flex items-center gap-2 text-gray-400 hover:text-gray-200 text-sm transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Investments
      </button>

      {/* Header */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1">{investment.name}</h1>
            <div className="flex items-center gap-3 text-sm text-gray-400">
              <span className="bg-gray-800 px-2 py-0.5 rounded capitalize">{investment.type.replace('_', ' ')}</span>
              {investment.institution && <span>{investment.institution}</span>}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-400 mb-1">Current Value</p>
            <p className="text-2xl font-bold text-blue-400">{formatCents(investment.current_value)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Total Contributions</p>
            <p className="text-2xl font-bold text-gray-200">{formatCents(investment.total_contributions)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-400 mb-1">Gain / Loss</p>
            <div className={`flex items-center gap-2 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
              {isPositive ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
              <p className="text-2xl font-bold">
                {formatCents(Math.abs(gainLoss))}
                <span className="text-sm font-normal ml-1">({isPositive ? '+' : ''}{gainPct}%)</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Value History Chart */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h2 className="text-lg font-semibold mb-4">Value History</h2>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                labelStyle={{ color: '#e5e7eb' }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, 'Value']}
              />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="text-gray-500 text-center py-12">No snapshot history available yet.</div>
        )}
      </div>

      {/* Update Value Form */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
        <h2 className="text-lg font-semibold mb-4">Update Value</h2>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-sm text-gray-400 mb-1">New Value ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Date</label>
            <input
              type="date"
              value={valueDate}
              onChange={(e) => setValueDate(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleUpdateValue}
            disabled={updateValue.isPending || !newValue}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {updateValue.isPending ? 'Updating...' : 'Update'}
          </button>
        </div>
      </div>

      {investment.notes && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5">
          <h2 className="text-lg font-semibold mb-2">Notes</h2>
          <p className="text-gray-400 text-sm">{investment.notes}</p>
        </div>
      )}
    </div>
  );
}
