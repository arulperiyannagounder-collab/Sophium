import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { CustomSelect } from './CustomSelect';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Search, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Loader,
  X,
  IndianRupee,
  Landmark,
  PieChart as PieIcon
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

type TabType = 'transactions' | 'income' | 'investments' | 'assets' | 'liabilities';

export const FinancialsPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('transactions');
  const [loading, setLoading] = useState(false);
  
  // Data lists
  const [transactions, setTransactions] = useState<any[]>([]);
  const [incomes, setIncomes] = useState<any[]>([]);
  const [investments, setInvestments] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [liabilities, setLiabilities] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    monthly_income: 0,
    monthly_expense: 0,
    savings: 0,
    net_worth: 0,
    asset_value: 0,
    liability_value: 0
  });

  // Query state
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const limit = 8;

  // Modals / forms state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form fields
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');

  const fetchSummary = async () => {
    try {
      const res = await api.get('/financials/summary');
      setSummary(res.data);
    } catch (err) {
      console.error("Failed to fetch summary:", err);
    }
  };

  const fetchTabDetails = async () => {
    setLoading(true);
    try {
      const offset = (page - 1) * limit;
      let url = '';
      let params: any = { limit, offset, search, sort_by: sortBy, order };

      if (categoryFilter) {
        params.category = categoryFilter;
      }

      if (activeTab === 'transactions') {
        url = '/transactions';
      } else if (activeTab === 'income') {
        url = '/financials/income';
      } else if (activeTab === 'investments') {
        url = '/financials/investments';
        params.sort_by = sortBy === 'date' ? 'date' : sortBy;
      } else if (activeTab === 'assets') {
        url = '/financials/assets';
        params.sort_by = sortBy === 'date' ? 'updated_at' : sortBy;
      } else if (activeTab === 'liabilities') {
        url = '/financials/liabilities';
        params.sort_by = sortBy === 'date' ? 'updated_at' : sortBy;
      }

      const res = await api.get(url, { params });
      
      if (activeTab === 'transactions') setTransactions(res.data);
      else if (activeTab === 'income') setIncomes(res.data);
      else if (activeTab === 'investments') setInvestments(res.data);
      else if (activeTab === 'assets') setAssets(res.data);
      else if (activeTab === 'liabilities') setLiabilities(res.data);

    } catch (err) {
      console.error(`Failed to load ${activeTab} data:`, err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchTabDetails();
  }, [activeTab, page, search, categoryFilter, sortBy, order]);

  // Reset page and filters on tab change
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearch('');
    setCategoryFilter('');
    setPage(1);
    setEditingId(null);
    
    // Set default sorts
    if (tab === 'assets' || tab === 'liabilities') {
      setSortBy('value');
    } else {
      setSortBy('date');
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setAmount('');
    setDescription('');
    setName('');
    setPaymentMethod('');
    setTags('');
    setNotes('');
    
    // Set default categories
    if (activeTab === 'transactions') {
      setCategory('Food');
      setType('expense');
    } else if (activeTab === 'income') {
      setCategory('salary');
    } else if (activeTab === 'investments') {
      setCategory('Mutual Funds');
    } else if (activeTab === 'assets') {
      setCategory('Cash');
    } else if (activeTab === 'liabilities') {
      setCategory('Credit Card');
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: any) => {
    setEditingId(item.id);
    setAmount(String(item.amount || item.value || ''));
    setCategory(item.category || '');
    setDescription(item.description || '');
    setName(item.name || '');
    setType(item.type || 'expense');
    setPaymentMethod(item.payment_method || '');
    setTags(item.tags || '');
    setNotes(item.notes || '');
    setIsModalOpen(true);
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      let url = '';
      if (activeTab === 'transactions') url = `/transactions/${id}`;
      else if (activeTab === 'income') url = `/financials/income/${id}`;
      else if (activeTab === 'investments') url = `/financials/investments/${id}`;
      else if (activeTab === 'assets') url = `/financials/assets/${id}`;
      else if (activeTab === 'liabilities') url = `/financials/liabilities/${id}`;

      await api.delete(url);
      fetchSummary();
      fetchTabDetails();
    } catch (err) {
      console.error("Failed to delete item:", err);
      alert("Failed to delete record.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let url = '';
      let method: 'post' | 'put' = editingId ? 'put' : 'post';
      let payload: any = {};

      const numVal = parseFloat(amount);
      if (isNaN(numVal) || numVal <= 0) {
        alert("Amount must be a positive number.");
        return;
      }

      if (activeTab === 'transactions') {
        url = editingId ? `/transactions/${editingId}` : '/transactions';
        payload = { amount: numVal, category, type, description, payment_method: paymentMethod, tags, notes };
      } else if (activeTab === 'income') {
        url = editingId ? `/financials/income/${editingId}` : '/financials/income';
        payload = { amount: numVal, category, description };
      } else if (activeTab === 'investments') {
        url = editingId ? `/financials/investments/${editingId}` : '/financials/investments';
        payload = { name, amount: numVal, category, description };
      } else if (activeTab === 'assets') {
        url = editingId ? `/financials/assets/${editingId}` : '/financials/assets';
        payload = { name, value: numVal, category, description };
      } else if (activeTab === 'liabilities') {
        url = editingId ? `/financials/liabilities/${editingId}` : '/financials/liabilities';
        payload = { name, amount: numVal, category, description };
      }

      if (method === 'post') {
        await api.post(url, payload);
      } else {
        await api.put(url, payload);
      }

      setIsModalOpen(false);
      fetchSummary();
      fetchTabDetails();
    } catch (err) {
      console.error("Failed to save item:", err);
      alert("Failed to save details. Check inputs.");
    }
  };

  const getCurrentList = () => {
    if (activeTab === 'transactions') return transactions;
    if (activeTab === 'income') return incomes;
    if (activeTab === 'investments') return investments;
    if (activeTab === 'assets') return assets;
    return liabilities;
  };

  const currentList = getCurrentList();

  const getCategories = () => {
    if (activeTab === 'transactions') return ['Food', 'Rent', 'Travel', 'Shopping', 'Entertainment', 'Healthcare', 'Education', 'Utilities', 'Investment', 'Others'];
    if (activeTab === 'income') return ['salary', 'business', 'freelance', 'interest', 'rental', 'other'];
    if (activeTab === 'investments') return ['Mutual Funds', 'Stocks', 'FD', 'Gold', 'Crypto', 'Bonds', 'PPF', 'EPF'];
    if (activeTab === 'assets') return ['House', 'Car', 'Cash', 'Bank', 'Land', 'Gold', 'Digital Assets'];
    return ['Home Loan', 'Car Loan', 'Personal Loan', 'Education Loan', 'Credit Card'];
  };

  const renderChart = () => {
    const list = getCurrentList();
    if (!list || list.length === 0) return null;

    const dataMap: { [key: string]: number } = {};
    list.forEach(item => {
      const cat = item.category || 'Other';
      const val = item.amount || item.value || 0;
      dataMap[cat] = (dataMap[cat] || 0) + val;
    });

    const chartData = Object.keys(dataMap).map(key => ({
      name: key,
      value: dataMap[key]
    }));

    const COLORS = ['#2563EB', '#7C3AED', '#22C55E', '#F59E0B', '#EF4444', '#EC4899', '#06B6D4', '#10B981'];

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-sm">
        
        <div className="md:col-span-2">
          <h4 className="text-xs font-black uppercase tracking-wider text-[#64748B] mb-4">Historical Activity Projections</h4>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={list.slice().reverse().map((item, idx) => ({
                  name: item.date ? new Date(item.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}) : `Item ${idx+1}`,
                  value: item.amount || item.value || 0
                }))}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorAmtLight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" stroke="#64748B" fontSize={9} />
                <YAxis stroke="#64748B" fontSize={9} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', borderColor: '#E2E8F0', borderRadius: 12 }} 
                />
                <Area type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorAmtLight)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex flex-col justify-center items-center border-t md:border-t-0 md:border-l border-[#E2E8F0] pt-6 md:pt-0 md:pl-6">
          <h4 className="text-xs font-black uppercase tracking-wider text-[#64748B] mb-2 self-start">Allocation Distribution</h4>
          <div className="h-40 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'white', borderColor: '#E2E8F0', borderRadius: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col justify-center items-center">
              <PieIcon className="h-5 w-5 text-[#7C3AED]/80" />
            </div>
          </div>
        </div>
        
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-10">
      
      {/* 1. Header Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#0F172A] tracking-tight">Financial Hub</h2>
          <p className="text-xs text-[#64748B] mt-1">Manage balances, income sources, investments, and active liabilities.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#2563EB] to-[#7C3AED] hover:from-[#2563EB]/90 hover:to-[#7C3AED]/90 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/10 cursor-pointer transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Log Entry
        </button>
      </div>

      {/* 2. Unified Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Net Worth */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 relative overflow-hidden flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">Estimated Net Worth</span>
            <h3 className="text-xl font-black text-[#0F172A] mt-1.5 flex items-center">
              <IndianRupee className="h-4 w-4 text-[#22C55E]" />
              {summary.net_worth?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="text-[9px] text-[#64748B] mt-3 flex items-center gap-1">
            <TrendingUp className="h-3 w-3 text-[#22C55E]" />
            <span className="font-bold text-[#22C55E]">Assets - Debts</span>
          </div>
        </div>

        {/* Liquid Assets */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 relative overflow-hidden flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">Total Financial Assets</span>
            <h3 className="text-xl font-black text-[#22C55E] mt-1.5 flex items-center">
              <IndianRupee className="h-4 w-4" />
              {summary.asset_value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="text-[9px] text-[#64748B] mt-3">
            Includes liquid holdings & investments
          </div>
        </div>

        {/* Monthly Income */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 relative overflow-hidden flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">Active Monthly Income</span>
            <h3 className="text-xl font-black text-[#2563EB] mt-1.5 flex items-center">
              <IndianRupee className="h-4 w-4" />
              {summary.monthly_income?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="text-[9px] text-[#64748B] mt-3 flex items-center gap-1">
            <ArrowDownLeft className="h-3 w-3 text-[#22C55E]" />
            <span>Refreshes monthly</span>
          </div>
        </div>

        {/* Monthly Expenses */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 relative overflow-hidden flex flex-col justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">Monthly Expenses</span>
            <h3 className="text-xl font-black text-[#EF4444] mt-1.5 flex items-center">
              <IndianRupee className="h-4 w-4" />
              {summary.monthly_expense?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="text-[9px] text-[#64748B] mt-3 flex items-center gap-1">
            <ArrowUpRight className="h-3 w-3 text-[#EF4444]" />
            <span>Savings: <span className="font-bold text-[#0F172A]">₹{summary.savings?.toLocaleString()}</span></span>
          </div>
        </div>

      </div>

      {/* 3. Sub-Navigation Tabs */}
      <div className="flex bg-white p-1 rounded-2xl border border-[#E2E8F0] overflow-x-auto shrink-0 scrollbar-none shadow-sm">
        {(['transactions', 'income', 'investments', 'assets', 'liabilities'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
              activeTab === tab 
                ? 'bg-[#2563EB]/10 text-[#2563EB] shadow-inner' 
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 4. Charts Block */}
      {renderChart()}

      {/* 5. Database CRUD Ledger Panel */}
      <div className="bg-white border border-[#E2E8F0] rounded-[24px] overflow-hidden shadow-sm">
        
        {/* Toolbar & Filters */}
        <div className="p-4 border-b border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-3 bg-[#F8FAFC]">
          
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#64748B]/60" />
            <input 
              type="text" 
              placeholder={`Search ${activeTab}...`}
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-1.5 bg-[#F1F5F9] border border-transparent rounded-xl text-xs text-[#0F172A] placeholder-[#64748B]/60 focus:outline-none focus:bg-white focus:border-[#2563EB]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-[#64748B]/60" />
              <CustomSelect
                value={categoryFilter}
                onChange={(val) => { setCategoryFilter(val); setPage(1); }}
                options={[
                  { value: '', label: 'All Categories' },
                  ...getCategories().map(cat => ({ value: cat, label: cat }))
                ]}
                className="w-44"
              />
            </div>

            <button
              onClick={() => setOrder(order === 'desc' ? 'asc' : 'desc')}
              className="px-3 py-1.5 bg-[#F1F5F9] border border-transparent text-xs text-[#64748B] rounded-xl hover:text-[#0F172A] transition-colors cursor-pointer"
            >
              Order: {order.toUpperCase()}
            </button>
          </div>

        </div>

        {/* Data List Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader className="h-8 w-8 text-[#2563EB] animate-spin" />
            </div>
          ) : !currentList || currentList.length === 0 ? (
            <div className="h-48 flex flex-col justify-center items-center text-center p-6 text-gray-500">
              <Landmark className="h-10 w-10 text-[#64748B]/20 mb-3" />
              <h5 className="font-bold text-[#0F172A] text-xs">No records found</h5>
              <p className="text-[10px] text-[#64748B]/60 max-w-xs mt-1.5">No entries match your search query. Click 'Add Log Entry' to create one.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#64748B] bg-[#F8FAFC]">
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px]">Details</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px]">Category</th>
                  {activeTab === 'transactions' && <th className="p-4 font-semibold uppercase tracking-wider text-[10px]">Type</th>}
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px]">Date</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-right">Amount</th>
                  <th className="p-4 font-semibold uppercase tracking-wider text-[10px] text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentList.map((item) => (
                  <tr key={item.id} className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors text-[#0F172A]">
                    <td className="p-4">
                      <p className="font-bold">{item.name || item.description}</p>
                      {item.notes && <p className="text-[10px] text-[#64748B] mt-0.5">{item.notes}</p>}
                      {item.payment_method && <span className="inline-block text-[9px] bg-[#F1F5F9] border border-[#E2E8F0] text-[#64748B] rounded px-1.5 py-0.25 mt-1 font-mono">{item.payment_method}</span>}
                    </td>
                    <td className="p-4 text-[#64748B] font-mono">{item.category}</td>
                    {activeTab === 'transactions' && (
                      <td className="p-4">
                        <span className={`inline-block text-[9px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                          item.type === 'income' ? 'bg-[#22C55E]/10 text-[#22C55E]' : 'bg-[#EF4444]/10 text-[#EF4444]'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                    )}
                    <td className="p-4 text-[#64748B]">
                      {item.date ? new Date(item.date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="p-4 text-right font-extrabold font-mono">
                      ₹{(item.amount || item.value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
                          title="Edit Entry"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-[#64748B] hover:text-[#EF4444] transition-colors cursor-pointer"
                          title="Delete Entry"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC] text-xs">
          <span className="text-[#64748B]">Showing Page {page}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] text-[#64748B] disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                if (currentList.length === limit) setPage(page + 1);
              }}
              disabled={currentList.length < limit}
              className="p-1.5 rounded-lg border border-[#E2E8F0] bg-white hover:bg-[#F1F5F9] text-[#64748B] disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

      </div>

      {/* 6. Form Submission Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-[#0F172A]/30 backdrop-blur-md">
          <div className="bg-white border border-[#E2E8F0] rounded-[24px] w-full max-w-md p-6 relative shadow-2xl animate-scale-up text-[#0F172A]">
            
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] mb-4">
              <h4 className="font-extrabold text-sm capitalize">
                {editingId ? 'Edit' : 'Add'} {activeTab.replace('s', '')} Entry
              </h4>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>             <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              {(activeTab === 'investments' || activeTab === 'assets' || activeTab === 'liabilities') ? (
                <div>
                  <label className="text-[#64748B] block mb-1 font-semibold">Asset / Account Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. HDFC Index Fund"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              ) : null}

              <div>
                <label className="text-[#64748B] block mb-1 font-semibold">Value / Amount (INR)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-[#64748B] font-bold">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-7 pr-3 bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl py-2 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono font-bold"
                  />
                </div>
              </div>

              {activeTab === 'transactions' && (
                <div>
                  <label className="text-[#64748B] block mb-1 font-semibold">Transaction Type</label>
                  <div className="flex bg-slate-50 dark:bg-slate-900 p-1 rounded-xl border border-slate-205 dark:border-slate-800 transition-all">
                    <button
                      type="button"
                      onClick={() => setType('expense')}
                      className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        type === 'expense' ? 'bg-[#EF4444]/15 text-[#EF4444]' : 'text-[#64748B] dark:text-slate-450'
                      }`}
                    >
                      Expense
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('income')}
                      className={`flex-1 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                        type === 'income' ? 'bg-[#22C55E]/15 text-[#22C55E]' : 'text-[#64748B] dark:text-slate-450'
                      }`}
                    >
                      Income
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="text-[#64748B] block mb-1 font-semibold">Category Selection</label>
                <CustomSelect
                  value={category}
                  onChange={(val) => setCategory(val)}
                  options={getCategories().map(cat => ({ value: cat, label: cat }))}
                />
              </div>

              <div>
                <label className="text-[#64748B] block mb-1 font-semibold">Description / Notes</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Monthly rent or mutual fund purchase details"
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
              </div>

              {activeTab === 'transactions' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[#64748B] block mb-1 font-semibold">Payment Method</label>
                    <input
                      type="text"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      placeholder="e.g. UPI, Credit Card"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[#64748B] block mb-1 font-semibold">Tags</label>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="e.g. grocery, personal"
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                    />
                  </div>
                </div>
              )}

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-205 dark:border-slate-800 text-[#64748B] dark:text-slate-400 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-bold rounded-xl shadow-md shadow-blue-500/10 cursor-pointer"
                >
                  Save Entry
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
