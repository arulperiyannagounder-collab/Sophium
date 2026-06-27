import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import api from '../services/api';
import { 
  Home, 
  Compass, 
  GraduationCap, 
  Car, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  AlertCircle,
  Calendar,
  IndianRupee,
  Activity,
  Loader
} from 'lucide-react';

export const GoalTimeline: React.FC = () => {
  const { goals, setGoals } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('general');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [loading, setLoading] = useState(false);

  // States for inline balance editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBalance, setEditBalance] = useState('');

  const getGoalIcon = (cat: string) => {
    const classStr = "h-4.5 w-4.5 shrink-0";
    switch (cat) {
      case 'house':
        return <Home className={`${classStr} text-[#2563EB]`} />;
      case 'retirement':
        return <Compass className={`${classStr} text-[#22C55E]`} />;
      case 'education':
        return <GraduationCap className={`${classStr} text-[#7C3AED]`} />;
      case 'vehicle':
        return <Car className={`${classStr} text-[#F59E0B]`} />;
      default:
        return <Compass className={`${classStr} text-[#64748B]`} />;
    }
  };

  const handleAddGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !targetAmount || !targetDate) return;

    setLoading(true);
    try {
      await api.post('/goals', {
        name,
        category,
        target_amount: parseFloat(targetAmount),
        current_amount: parseFloat(currentAmount || '0'),
        target_date: targetDate,
        priority: priority
      });

      // Reload
      const res = await api.get('/goals');
      setGoals(res.data);

      // Reset
      setName('');
      setCategory('general');
      setTargetAmount('');
      setCurrentAmount('');
      setTargetDate('');
      setPriority('Medium');
      setShowAddForm(false);
    } catch (err) {
      console.error("Failed to add goal:", err);
      alert("Failed to add milestone. Ensure date format is YYYY-MM.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this milestone?")) return;

    try {
      await api.delete(`/goals/${id}`);
      const res = await api.get('/goals');
      setGoals(res.data);
    } catch (err) {
      console.error("Failed to delete goal:", err);
    }
  };

  const startEdit = (id: string, currentVal: number) => {
    setEditingId(id);
    setEditBalance(currentVal.toString());
  };

  const handleSaveBalance = async (goal: any) => {
    try {
      const numVal = parseFloat(editBalance);
      if (isNaN(numVal) || numVal < 0) {
        alert("Amount must be a non-negative number.");
        return;
      }
      
      await api.put(`/goals/${goal.id}`, {
        ...goal,
        current_amount: numVal
      });
      
      const res = await api.get('/goals');
      setGoals(res.data);
      setEditingId(null);
    } catch (err) {
      console.error("Failed to update goal balance:", err);
    }
  };

  const calculateSavingsRate = (targetDateStr: string, shortfall: number) => {
    if (shortfall <= 0) return 0;
    try {
      const [year, month] = targetDateStr.split('-').map(Number);
      if (!year || !month) return 0;
      
      const today = new Date();
      const target = new Date(year, month - 1);
      
      const diffTime = target.getTime() - today.getTime();
      const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30.4));
      
      if (diffMonths <= 0) return shortfall;
      return Math.round(shortfall / diffMonths);
    } catch {
      return 0;
    }
  };

  const getCountdown = (targetDateStr: string) => {
    try {
      const [year, month] = targetDateStr.split('-').map(Number);
      if (!year || !month) return '';
      
      const today = new Date();
      const target = new Date(year, month - 1);
      const diffTime = target.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 0) return 'Deadline reached';
      if (diffDays > 365) {
        const yrs = (diffDays / 365).toFixed(1);
        return `${yrs} years remaining`;
      }
      const mos = Math.ceil(diffDays / 30);
      return `${mos} months remaining`;
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-6 pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#0F172A] tracking-tight">Milestones Planner</h2>
          <p className="text-xs text-[#64748B] mt-1">
            Configure, prioritize and schedule long-term investment and target savings milestones.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-500/10 cursor-pointer transition-all"
        >
          <Plus className="h-4 w-4" />
          Add Milestone
        </button>
      </div>

      {/* Add Milestone Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-[#0F172A]/30 backdrop-blur-md">
          <div className="bg-white border border-[#E2E8F0] rounded-[24px] w-full max-w-md p-6 relative shadow-2xl animate-scale-up text-[#0F172A]">
            
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] mb-4">
              <h4 className="font-extrabold text-sm">Create Target Milestone</h4>
              <button 
                onClick={() => setShowAddForm(false)}
                className="p-1 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleAddGoal} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#64748B] block mb-1 font-semibold">Goal Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Buy 2BHK Flat"
                    className="w-full bg-[#F5F7FB] border border-[#E2E8F0] rounded-xl px-3 py-2 focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
                
                <div>
                  <label className="text-[#64748B] block mb-1 font-semibold">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#F5F7FB] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#64748B] focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="general">General</option>
                    <option value="house">Housing</option>
                    <option value="retirement">Retirement</option>
                    <option value="education">Education</option>
                    <option value="vehicle">Vehicle</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                
                <div>
                  <label className="text-[#64748B] block mb-1 font-semibold">Target Corpus (INR)</label>
                  <input
                    type="number"
                    required
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    placeholder="e.g. 2500000"
                    className="w-full bg-[#F5F7FB] border border-[#E2E8F0] rounded-xl px-3 py-2 focus:outline-none focus:border-[#2563EB] font-mono"
                  />
                </div>

                <div>
                  <label className="text-[#64748B] block mb-1 font-semibold">Initial Balance (INR)</label>
                  <input
                    type="number"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    placeholder="e.g. 500000"
                    className="w-full bg-[#F5F7FB] border border-[#E2E8F0] rounded-xl px-3 py-2 focus:outline-none focus:border-[#2563EB] font-mono"
                  />
                </div>

                <div>
                  <label className="text-[#64748B] block mb-1 font-semibold">Target (YYYY-MM)</label>
                  <input
                    type="text"
                    required
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    placeholder="e.g. 2031-12"
                    className="w-full bg-[#F5F7FB] border border-[#E2E8F0] rounded-xl px-3 py-2 focus:outline-none focus:border-[#2563EB] font-mono"
                  />
                </div>

              </div>

              <div>
                <label className="text-[#64748B] block mb-1 font-semibold">Priority Level</label>
                <div className="flex bg-[#F5F7FB] p-1 rounded-xl border border-[#E2E8F0]">
                  {['Low', 'Medium', 'High'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
                        priority === p ? 'bg-[#2563EB]/15 text-[#2563EB]' : 'text-[#64748B]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-[#E2E8F0] text-[#64748B] rounded-xl hover:bg-[#F1F5F9] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-bold rounded-xl shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader className="h-3.5 w-3.5 animate-spin" /> : 'Create Milestone'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.length === 0 ? (
          <div className="md:col-span-2 text-center p-12 bg-white border border-[#E2E8F0] rounded-[24px] text-gray-500 text-xs shadow-sm">
            <Activity className="h-10 w-10 text-[#64748B]/20 mb-3 mx-auto" />
            <h5 className="font-bold text-[#0F172A] text-xs">No active milestones registered</h5>
            <p className="text-[10px] text-[#64748B]/60 max-w-xs mt-1.5 mx-auto">
              Please click 'Add Milestone' above or populate mock workspace from Settings panel.
            </p>
          </div>
        ) : (
          goals.map((goal) => {
            const percentage = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
            const shortfall = Math.max(0, goal.target_amount - goal.current_amount);
            const isEditing = editingId === goal.id;
            
            const monthlySavingNeeded = calculateSavingsRate(goal.target_date, shortfall);
            const countdownStr = getCountdown(goal.target_date);
            const priorityLevel = goal.priority || 'Medium';

            return (
              <div 
                key={goal.id} 
                className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 relative overflow-hidden group hover:border-[#2563EB]/40 hover:shadow-md transition-all duration-300 flex flex-col justify-between shadow-sm"
              >
                
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-[#F5F7FB] rounded-xl border border-[#E2E8F0]">
                        {getGoalIcon(goal.category)}
                      </div>
                      <div>
                        <h4 className="font-bold text-[#0F172A] text-sm">{goal.name}</h4>
                        <div className="flex gap-2 items-center mt-1">
                          <span className="text-[9px] text-[#64748B] font-bold uppercase tracking-wider">
                            {goal.category}
                          </span>
                          <span className={`text-[8px] font-extrabold px-2 py-0.5 rounded-full ${
                            priorityLevel === 'High' ? 'bg-[#EF4444]/10 text-[#EF4444]' :
                            priorityLevel === 'Medium' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' :
                            'bg-[#22C55E]/10 text-[#22C55E]'
                          }`}>
                            {priorityLevel} Priority
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-[#64748B] font-bold bg-[#F5F7FB] px-2.5 py-0.5 rounded-xl border border-[#E2E8F0] flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Target: {goal.target_date}
                      </span>
                      <button
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="p-1 rounded-lg hover:bg-red-50 text-[#64748B] hover:text-[#EF4444] opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        title="Delete Milestone"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                    <div>
                      <span className="text-[#64748B] block mb-1">Target Corpus</span>
                      <p className="font-black text-[#0F172A] flex items-center">
                        <IndianRupee className="h-3.5 w-3.5" />
                        {goal.target_amount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#64748B] block mb-1">Saved Balance</span>
                      {isEditing ? (
                        <div className="flex items-center gap-1 mt-0.5">
                          <input
                            type="number"
                            value={editBalance}
                            onChange={(e) => setEditBalance(e.target.value)}
                            className="w-20 bg-[#F5F7FB] border border-[#E2E8F0] rounded-lg px-2 py-0.5 text-xs text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                          />
                          <button 
                            onClick={() => handleSaveBalance(goal)}
                            className="p-1 bg-[#22C55E]/20 text-[#22C55E] rounded hover:bg-[#22C55E]/30 cursor-pointer"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            onClick={() => setEditingId(null)}
                            className="p-1 bg-[#F1F5F9] text-[#64748B] rounded cursor-pointer hover:text-[#0F172A]"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <p className="font-black text-[#22C55E] flex items-center gap-1.5">
                          <IndianRupee className="h-3.5 w-3.5" />
                          {goal.current_amount.toLocaleString()}
                          <button
                            onClick={() => startEdit(goal.id, goal.current_amount)}
                            className="p-0.5 text-[#64748B] hover:text-[#2563EB] transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Edit Saved Balance"
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="space-y-1.5 mb-3.5">
                    <div className="flex justify-between text-[9px] text-[#64748B]">
                      <span>Completion Metrics</span>
                      <span className="font-bold text-[#0F172A]">{percentage}%</span>
                    </div>
                    <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden border border-[#E2E8F0]">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                          goal.category === 'retirement' 
                            ? 'from-[#22C55E] to-[#10B981]' 
                            : 'from-[#2563EB] to-[#7C3AED]'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-[9px] text-[#64748B]">
                    <span>Deficit: <strong>₹{shortfall.toLocaleString()}</strong></span>
                    {monthlySavingNeeded > 0 ? (
                      <span className="text-[#2563EB] font-bold">
                        Requires ₹{monthlySavingNeeded.toLocaleString()}/mo
                      </span>
                    ) : (
                      <span className="text-[#22C55E] font-bold">Completed</span>
                    )}
                  </div>
                  
                  {countdownStr && (
                    <div className="mt-2 text-[8px] text-[#F59E0B] font-bold flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" /> {countdownStr}
                    </div>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
