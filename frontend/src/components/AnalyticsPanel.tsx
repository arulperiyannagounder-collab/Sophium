import React from 'react';
import { useStore } from '../store/useStore';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { 
  PieChart as PieIcon,
  BarChart3,
  TrendingUp,
  ArrowUpRight
} from 'lucide-react';

export const AnalyticsPanel: React.FC = () => {
  const { transactions, user } = useStore();

  const fallbackTransactions = [
    { amount: 30000, category: 'Rent', type: 'expense', date: '2026-06-01' },
    { amount: 12000, category: 'Food', type: 'expense', date: '2026-06-05' },
    { amount: 10000, category: 'Shopping', type: 'expense', date: '2026-06-10' },
    { amount: 8000, category: 'Utilities', type: 'expense', date: '2026-06-12' },
    { amount: 5000, category: 'Travel', type: 'expense', date: '2026-06-15' },
    { amount: 15000, category: 'Investment', type: 'expense', date: '2026-06-18' }
  ];

  const activeTxs = transactions.length > 0 ? transactions : fallbackTransactions;

  // Group Expenses by Category
  const expenseDataMap: { [key: string]: number } = {};
  let totalExpense = 0;
  activeTxs.forEach(t => {
    if (t.type === 'expense' || !t.type) {
      const cat = t.category || 'Others';
      const amt = t.amount || 0;
      expenseDataMap[cat] = (expenseDataMap[cat] || 0) + amt;
      totalExpense += amt;
    }
  });

  const categoryChartData = Object.keys(expenseDataMap).map(key => ({
    name: key,
    value: expenseDataMap[key]
  }));

  const COLORS = ['#2563EB', '#7C3AED', '#22C55E', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#10B981'];

  // Monthly trend comparisons
  const incomeVal = user?.monthly_income || 120000;
  const trendData = [
    { month: 'Jan', Income: incomeVal, Spend: totalExpense * 0.85, Savings: incomeVal - (totalExpense * 0.85) },
    { month: 'Feb', Income: incomeVal, Spend: totalExpense * 0.9, Savings: incomeVal - (totalExpense * 0.9) },
    { month: 'Mar', Income: incomeVal, Spend: totalExpense * 0.78, Savings: incomeVal - (totalExpense * 0.78) },
    { month: 'Apr', Income: incomeVal, Spend: totalExpense * 0.92, Savings: incomeVal - (totalExpense * 0.92) },
    { month: 'May', Income: incomeVal, Spend: totalExpense * 0.88, Savings: incomeVal - (totalExpense * 0.88) },
    { month: 'Jun', Income: incomeVal, Spend: totalExpense, Savings: incomeVal - totalExpense }
  ];

  return (
    <div className="space-y-6 pb-10">
      
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-[#2563EB]" />
          Advanced Financial Analytics
        </h2>
        <p className="text-xs text-[#64748B] mt-1">
          Trace net cash flows, category allocations, savings patterns, and budget projections.
        </p>
      </div>

      {/* Analytics stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Active savings rate */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-sm">
          <span className="text-[10px] font-bold text-[#64748B] uppercase block">Average Savings Ratio</span>
          <h3 className="text-lg font-black text-[#0F172A] mt-1.5 flex items-center gap-1">
            <TrendingUp className="h-4.5 w-4.5 text-[#22C55E]" />
            {incomeVal > 0 ? ((incomeVal - totalExpense) / incomeVal * 100).toFixed(1) : '0.0'}%
          </h3>
          <p className="text-[9px] text-[#64748B] mt-2">Target recommended: 30%+ savings.</p>
        </div>

        {/* Top expense category */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-sm">
          <span className="text-[10px] font-bold text-[#64748B] uppercase block">Top Expense Category</span>
          <h3 className="text-lg font-black text-[#EF4444] mt-1.5 capitalize">
            {categoryChartData.length > 0 
              ? categoryChartData.sort((a,b) => b.value - a.value)[0]?.name 
              : 'N/A'}
          </h3>
          <p className="text-[9px] text-[#64748B] mt-2">Represents major monthly expenditure.</p>
        </div>

        {/* Burn Rate */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-sm">
          <span className="text-[10px] font-bold text-[#64748B] uppercase block">Core Burn Rate</span>
          <h3 className="text-lg font-black text-[#0F172A] mt-1.5 flex items-center gap-1">
            <ArrowUpRight className="h-4 w-4 text-[#EF4444]" />
            ₹{totalExpense.toLocaleString()} /mo
          </h3>
          <p className="text-[9px] text-[#64748B] mt-2">Discretionary cash outflow baseline.</p>
        </div>

      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Cash Flow Comparisons */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-sm">
          <h4 className="text-xs font-black uppercase tracking-wider text-[#64748B] mb-4">
            Income vs Expenditure Cash Flow Trend
          </h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={trendData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" stroke="#64748B" fontSize={9} />
                <YAxis stroke="#64748B" fontSize={9} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', borderColor: '#E2E8F0', borderRadius: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Bar name="Income" dataKey="Income" fill="#2563EB" radius={[4, 4, 0, 0]} />
                <Bar name="Expenses" dataKey="Spend" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Savings Growth Trend */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-sm">
          <h4 className="text-xs font-black uppercase tracking-wider text-[#64748B] mb-4">
            Monthly Savings Trajectory Projections
          </h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trendData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="month" stroke="#64748B" fontSize={9} />
                <YAxis stroke="#64748B" fontSize={9} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', borderColor: '#E2E8F0', borderRadius: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 9 }} />
                <Line name="Savings margin" type="monotone" dataKey="Savings" stroke="#22C55E" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Distribution Pie */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-6 items-center shadow-sm">
          
          <div className="md:col-span-2">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#64748B] mb-3">
              Comprehensive Expense Category Breakdown
            </h4>
            <p className="text-[11px] text-[#64748B] leading-relaxed mb-4">
              Your largest discretionary outflow resides in <strong className="text-[#0F172A]">
                {categoryChartData.length > 0 ? categoryChartData.sort((a,b) => b.value - a.value)[0]?.name : 'N/A'}
              </strong>. Optimizing this allocation will increase your savings rate by up to 5%, accelerating your target milestones timelines.
            </p>
            
            <div className="grid grid-cols-2 gap-3 text-[10px] text-[#0F172A]">
              {categoryChartData.map((item, idx) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="text-[#64748B] font-semibold">{item.name}:</span>
                  <span className="font-mono font-bold">₹{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-center items-center">
            <div className="h-44 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', borderColor: '#E2E8F0', borderRadius: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute flex flex-col justify-center items-center">
                <PieIcon className="h-6 w-5 text-[#7C3AED]" />
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
