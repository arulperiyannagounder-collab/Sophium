import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import api from '../services/api';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';
import { 
  Wallet, ArrowDownRight, TrendingUp, AlertCircle, Plus, 
  Trash2, CheckCircle, Percent
} from 'lucide-react';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export const DashboardOverview: React.FC = () => {
  const { insights, transactions, notifications, user, setTransactions, setInsights } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [txLoading, setTxLoading] = useState(false);

  const income = user?.monthly_income || 120000;
  const expenses = insights?.total_expenses || 0;
  const surplus = insights?.surplus || (income - expenses);
  const categories = insights?.categories || {};
  const savingsRatio = insights?.savings_ratio || 0;
  const monthlyTrends = insights?.monthly_trends || [];

  // Formulate data for Pie Chart
  const pieData = Object.entries(categories).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value: Number(value)
  })).filter(item => item.value > 0);

  // If no transactions, use standard fallback visual data
  const finalPieData = pieData.length > 0 ? pieData : [
    { name: 'Rent', value: 30000 },
    { name: 'Food', value: 12000 },
    { name: 'Shopping', value: 10000 },
    { name: 'Utilities', value: 8000 },
    { name: 'Travel', value: 5000 }
  ];

  const finalTrendsData = monthlyTrends.length > 0 ? monthlyTrends : [
    { month: 'Apr', income: income, spend: expenses ? expenses * 0.9 : 58000 },
    { month: 'May', income: income, spend: expenses ? expenses * 0.95 : 61000 },
    { month: 'Jun', income: income, spend: expenses || 65000 }
  ];

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;
    
    setTxLoading(true);
    try {
      // POST transaction
      await api.post('/transactions', {
        amount: parseFloat(amount),
        category,
        description,
        is_recurring: isRecurring
      });

      // Reload transactions and insights
      const [txsRes, insightsRes] = await Promise.all([
        api.get('/transactions'),
        api.get('/transactions/insights')
      ]);

      setTransactions(txsRes.data);
      setInsights(insightsRes.data);

      // Reset form
      setAmount('');
      setDescription('');
      setIsRecurring(false);
      setShowAddForm(false);
    } catch (err) {
      console.error("Failed to add transaction:", err);
      alert("Error adding transaction. Please try again.");
    } finally {
      setTxLoading(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) return;

    try {
      await api.delete(`/transactions/${id}`);
      
      // Reload
      const [txsRes, insightsRes] = await Promise.all([
        api.get('/transactions'),
        api.get('/transactions/insights')
      ]);

      setTransactions(txsRes.data);
      setInsights(insightsRes.data);
    } catch (err) {
      console.error("Failed to delete transaction:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Alert */}
      {notifications.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 items-start animate-pulse">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-red-200 text-xs">{notifications[0].title}</h4>
            <p className="text-red-300/80 text-[11px] mt-1 leading-relaxed">{notifications[0].message}</p>
          </div>
        </div>
      )}

      {/* Main Grid Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Income Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold">Income</p>
              <h3 className="text-xl font-bold mt-1 text-white">₹{income.toLocaleString('en-IN')}</h3>
            </div>
            <div className="p-2.5 bg-blue-500/10 rounded-lg">
              <Wallet className="h-4.5 w-4.5 text-blue-400" />
            </div>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold">Expenditure</p>
              <h3 className="text-xl font-bold mt-1 text-white">₹{expenses.toLocaleString('en-IN')}</h3>
            </div>
            <div className="p-2.5 bg-red-500/10 rounded-lg">
              <ArrowDownRight className="h-4.5 w-4.5 text-red-400" />
            </div>
          </div>
        </div>

        {/* Surplus Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold">Surplus</p>
              <h3 className="text-xl font-bold mt-1 text-emerald-400">₹{surplus.toLocaleString('en-IN')}</h3>
            </div>
            <div className="p-2.5 bg-emerald-500/10 rounded-lg">
              <TrendingUp className="h-4.5 w-4.5 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Savings Ratio Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-[10px] uppercase tracking-wider font-semibold">Savings Ratio</p>
              <h3 className="text-xl font-bold mt-1 text-blue-400">{savingsRatio}%</h3>
            </div>
            <div className="p-2.5 bg-blue-500/10 rounded-lg">
              <Percent className="h-4.5 w-4.5 text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Pie Chart Card (Category Distribution) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 lg:col-span-2 flex flex-col h-80">
          <h4 className="font-bold text-gray-200 text-xs mb-2">Expense Category Split</h4>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={finalPieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {finalPieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#151C2C', border: '1px solid #1F293D', borderRadius: '8px' }} 
                  itemStyle={{ color: '#F3F4F6', fontSize: '11px' }}
                  formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', bottom: 0 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart Card (Monthly Trends) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 lg:col-span-3 flex flex-col h-80">
          <h4 className="font-bold text-gray-200 text-xs mb-2">Income vs. Spending Trends</h4>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={finalTrendsData}
                margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1F293D" />
                <XAxis dataKey="month" stroke="#9CA3AF" style={{ fontSize: '10px' }} />
                <YAxis stroke="#9CA3AF" style={{ fontSize: '10px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#151C2C', border: '1px solid #1F293D', borderRadius: '8px' }}
                  itemStyle={{ fontSize: '11px' }}
                  formatter={(value) => `₹${Number(value).toLocaleString('en-IN')}`}
                />
                <Legend wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="income" name="Income" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="spend" name="Spend" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Transaction Manager & Form */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Ledger & Add Button */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 lg:col-span-3">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-gray-200 text-xs">Transaction Ledger</h4>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Entry
            </button>
          </div>

          {/* Add Transaction Form */}
          {showAddForm && (
            <form onSubmit={handleAddTransaction} className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="food">Food</option>
                    <option value="rent">Rent</option>
                    <option value="shopping">Shopping</option>
                    <option value="utilities">Utilities</option>
                    <option value="travel">Travel</option>
                    <option value="investment">Investment / SIP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 block mb-1">Description</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Weekly organic groceries"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_recurring"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-0"
                />
                <label htmlFor="is_recurring" className="text-[10px] text-gray-400 cursor-pointer">
                  Is recurring monthly expense
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-2.5 py-1 text-xs text-gray-400 hover:text-gray-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={txLoading}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded disabled:opacity-50 cursor-pointer"
                >
                  {txLoading ? 'Adding...' : 'Save Entry'}
                </button>
              </div>
            </form>
          )}

          {/* Transactions List */}
          <div className="space-y-2 overflow-y-auto max-h-56 pr-1">
            {transactions.length === 0 ? (
              <div className="text-gray-500 text-center py-12 text-xs">
                No transactions recorded. Click "Launch 2-Min Demo Mode" above.
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="flex justify-between items-center p-3 bg-slate-950 rounded-lg border border-slate-850 hover:border-slate-800 group transition-all">
                  <div>
                    <h5 className="font-semibold text-gray-200 text-xs">{tx.description}</h5>
                    <div className="flex gap-2 items-center mt-1">
                      <span className="text-[9px] text-gray-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        {tx.category.toUpperCase()}
                      </span>
                      {tx.is_recurring && (
                        <span className="text-[8px] text-blue-400 font-bold bg-blue-500/10 px-1 py-0.5 rounded">
                          RECURRING
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className={`font-semibold text-xs ${tx.category === 'investment' ? 'text-emerald-400' : 'text-gray-300'}`}>
                        {tx.category === 'investment' ? '+' : '-'} ₹{tx.amount.toLocaleString('en-IN')}
                      </span>
                      <p className="text-[9px] text-gray-600 mt-0.5">
                        {new Date(tx.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteTransaction(tx.id)}
                      className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Delete Entry"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Proactive Coaching Notification Feed */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 lg:col-span-2 flex flex-col h-[340px]">
          <h4 className="font-bold text-gray-200 text-xs mb-3">Proactive Coach Alerts</h4>
          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {notifications.length === 0 ? (
              <div className="text-gray-500 text-center py-16 text-xs flex flex-col items-center justify-center gap-2">
                <CheckCircle className="h-6 w-6 text-emerald-500/70" />
                No budget alerts. You are completely on track!
              </div>
            ) : (
              notifications.map((note) => (
                <div 
                  key={note.id} 
                  className={`p-3 rounded-lg border text-[11px] leading-relaxed ${
                    note.severity === 'warning' 
                      ? 'bg-red-500/5 border-red-500/20 text-red-300' 
                      : 'bg-blue-500/5 border-blue-500/20 text-blue-300'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-bold">{note.title}</span>
                    <span className="text-[9px] opacity-60">
                      {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="opacity-80">{note.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
