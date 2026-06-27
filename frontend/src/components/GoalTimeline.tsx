import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import api from '../services/api';
import { Home, Compass, GraduationCap, Car, Plus, Trash2, Edit2, Check, X } from 'lucide-react';

export const GoalTimeline: React.FC = () => {
  const { goals, setGoals } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('general');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [loading, setLoading] = useState(false);

  // States for inline saved balance editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBalance, setEditBalance] = useState('');

  const getGoalIcon = (cat: string) => {
    switch (cat) {
      case 'house':
        return <Home className="h-5 w-5 text-blue-400" />;
      case 'retirement':
        return <Compass className="h-5 w-5 text-emerald-400" />;
      case 'education':
        return <GraduationCap className="h-5 w-5 text-purple-400" />;
      case 'vehicle':
        return <Car className="h-5 w-5 text-yellow-400" />;
      default:
        return <Compass className="h-5 w-5 text-gray-400" />;
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
        target_date: targetDate
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
      setShowAddForm(false);
    } catch (err) {
      console.error("Failed to add goal:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this goal milestone?")) return;

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
      await api.put(`/goals/${goal.id}`, {
        ...goal,
        current_amount: parseFloat(editBalance)
      });
      
      const res = await api.get('/goals');
      setGoals(res.data);
      setEditingId(null);
    } catch (err) {
      console.error("Failed to update goal balance:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white">Target Milestones</h3>
          <p className="text-gray-400 text-xs mt-1">
            Tracking your long-term goals and deadline compliance.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-2.5 py-1.5 rounded transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Milestone
        </button>
      </div>

      {/* Add Goal Form */}
      {showAddForm && (
        <form onSubmit={handleAddGoal} className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-4 max-w-xl">
          <h4 className="font-bold text-gray-200 text-xs">New Target Milestone</h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Goal Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Buy 2BHK Flat"
                className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 text-gray-200"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 text-gray-300"
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
              <label className="text-[10px] text-gray-400 block mb-1">Target Corpus (₹)</label>
              <input
                type="number"
                required
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="e.g. 2500000"
                className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 text-gray-200"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Initial Saved (₹)</label>
              <input
                type="number"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="e.g. 500000"
                className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 text-gray-200"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Target Date</label>
              <input
                type="text"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                placeholder="e.g. 2031-12"
                className="w-full bg-slate-950 border border-slate-850 rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-blue-500 text-gray-200"
              />
            </div>
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
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1 rounded disabled:opacity-50 cursor-pointer"
            >
              {loading ? 'Creating...' : 'Create Target'}
            </button>
          </div>
        </form>
      )}

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.length === 0 ? (
          <div className="md:col-span-2 text-center py-20 bg-slate-900 border border-slate-800 rounded-xl text-gray-500 text-xs">
            No active targets registered. Please launch Demo Mode to seed templates.
          </div>
        ) : (
          goals.map((goal) => {
            const percentage = Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100));
            const shortfall = goal.target_amount - goal.current_amount;
            const isEditing = editingId === goal.id;
            
            return (
              <div key={goal.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden group hover:border-slate-700/80 transition-colors">
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                      {getGoalIcon(goal.category)}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-200 text-sm">{goal.name}</h4>
                      <p className="text-[9px] text-gray-500 uppercase tracking-wider mt-0.5">
                        Category: {goal.category}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-gray-500 font-semibold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      Target: {goal.target_date}
                    </span>
                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      className="p-1 rounded text-gray-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                      title="Delete Goal"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
                  <div>
                    <span className="text-gray-500">Target Corpus</span>
                    <p className="font-bold text-gray-300 mt-1">₹{goal.target_amount.toLocaleString('en-IN')}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Saved Balance</span>
                    
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 mt-1">
                        <input
                          type="number"
                          value={editBalance}
                          onChange={(e) => setEditBalance(e.target.value)}
                          className="w-20 bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
                        />
                        <button 
                          onClick={() => handleSaveBalance(goal)}
                          className="p-0.5 bg-emerald-600 text-white rounded cursor-pointer hover:bg-emerald-500"
                        >
                          <Check className="h-3 w-3" />
                        </button>
                        <button 
                          onClick={() => setEditingId(null)}
                          className="p-0.5 bg-slate-850 text-gray-400 rounded cursor-pointer hover:text-gray-200"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <p className="font-bold text-emerald-400 mt-1 flex items-center gap-1">
                        ₹{goal.current_amount.toLocaleString('en-IN')}
                        <button
                          onClick={() => startEdit(goal.id, goal.current_amount)}
                          className="p-0.5 text-gray-600 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                          title="Edit Saved Balance"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                      </p>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 mb-2">
                  <div className="flex justify-between text-[9px] text-gray-400">
                    <span>Timeline Completion</span>
                    <span>{percentage}%</span>
                  </div>
                  <div className="h-2 bg-slate-955 rounded-full overflow-hidden border border-slate-850/50">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        goal.category === 'retirement' ? 'bg-emerald-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                {/* Shortfall Details */}
                <div className="flex justify-between items-center text-[9px] text-gray-500 pt-2 border-t border-slate-800/40">
                  <span>Deficit: ₹{shortfall.toLocaleString('en-IN')}</span>
                  <span className="flex items-center gap-1 text-emerald-400 font-medium">
                    On Track
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
