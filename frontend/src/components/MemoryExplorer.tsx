import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Search, 
  Brain, 
  Trash2, 
  Plus, 
  X, 
  Calendar, 
  Sparkles, 
  Loader, 
  AlertCircle,
  MessageSquare,
  Landmark,
  Goal,
  Sliders
} from 'lucide-react';

type MemoryCategory = 'all' | 'semantic' | 'financial_profile' | 'goal' | 'conversation' | 'preference';

export const MemoryExplorer: React.FC = () => {
  const [query, setQuery] = useState('user profile'); 
  const [selectedCategory, setSelectedCategory] = useState<MemoryCategory>('all');
  const [limit] = useState(10);
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New Memory Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newType, setNewType] = useState('semantic');
  const [newCategory, setNewCategory] = useState('investment');
  const [newContent, setNewContent] = useState('');
  const [importance, setImportance] = useState(3);
  const [injectLoading, setInjectLoading] = useState(false);

  const fetchMemories = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { query, limit };
      if (selectedCategory !== 'all') {
        params.memory_type = selectedCategory;
      }

      const res = await api.get('/memory/search', { params });
      setMemories(res.data || []);
    } catch (err: any) {
      console.error("Memory search failed:", err);
      setError("Failed to query vector database. The memory engine is running in memory fallback mode.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemories();
  }, [selectedCategory, limit]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMemories();
  };

  const handleDeleteMemory = async (pointId: string) => {
    if (!confirm("Are you sure you want to delete this memory point from Qdrant?")) return;
    try {
      await api.delete(`/memory/${pointId}`);
      fetchMemories();
    } catch (err) {
      console.error("Failed to delete memory:", err);
      alert("Failed to delete memory vector.");
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    setInjectLoading(true);
    try {
      await api.post('/memory', {
        memory_type: newType,
        category: newCategory,
        content: newContent,
        importance,
        metadata: { source: "manual_explorer" }
      });
      
      setIsModalOpen(false);
      setNewContent('');
      setQuery('manual_explorer');
      fetchMemories();
    } catch (err) {
      console.error("Failed to inject memory:", err);
      alert("Failed to inject memory point.");
    } finally {
      setInjectLoading(false);
    }
  };

  const categoryCards = [
    { id: 'semantic', label: 'Semantic Memory', icon: <Brain className="h-5 w-5 text-[#2563EB]" />, desc: 'Long-term core conceptual associations.' },
    { id: 'financial_profile', label: 'Financial Profile', icon: <Landmark className="h-5 w-5 text-[#7C3AED]" />, desc: 'Income worksheets, ratios & risk parameters.' },
    { id: 'conversation', label: 'Conversation Memory', icon: <MessageSquare className="h-5 w-5 text-[#22C55E]" />, desc: 'Dialogue transcripts & session history.' },
    { id: 'goal', label: 'Goal Memory', icon: <Goal className="h-5 w-5 text-[#F59E0B]" />, desc: 'Savings milestones & deadline dates.' },
    { id: 'preference', label: 'Preference Memory', icon: <Sliders className="h-5 w-5 text-[#EC4899]" />, desc: 'Currencies, themes and notification triggers.' },
  ];

  return (
    <div className="space-y-6 pb-10">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#0F172A] tracking-tight">Qdrant Memory Explorer</h2>
          <p className="text-xs text-[#64748B] mt-1">
            Query, manage, and inspect vector-space memory indices used by CFO agents.
          </p>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/10 cursor-pointer transition-all"
        >
          <Plus className="h-4 w-4" />
          Inject Vector Point
        </button>
      </div>

      {/* Five Intelligent Category Selection Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {categoryCards.map((card) => {
          const isSelected = selectedCategory === card.id;
          return (
            <button
              key={card.id}
              onClick={() => setSelectedCategory(isSelected ? 'all' : (card.id as any))}
              className={`text-left p-5 bg-white border rounded-[24px] shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between h-36 relative overflow-hidden cursor-pointer ${
                isSelected ? 'border-[#2563EB] ring-2 ring-[#2563EB]/15' : 'border-[#E2E8F0]'
              }`}
            >
              <div className="flex justify-between w-full items-start">
                <div className="p-2.5 bg-[#F5F7FB] rounded-xl border border-[#E2E8F0] shrink-0">
                  {card.icon}
                </div>
                {isSelected && (
                  <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
                )}
              </div>

              <div>
                <span className="font-extrabold text-[#0F172A] text-xs block leading-none">{card.label}</span>
                <span className="text-[10px] text-[#64748B] mt-1.5 block leading-normal line-clamp-2">{card.desc}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Vector search bar */}
      <form onSubmit={handleSearchSubmit} className="bg-white border border-[#E2E8F0] rounded-[24px] p-4 flex gap-3 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#64748B]/60" />
          <input 
            type="text"
            placeholder="Search Qdrant vector-space (e.g. Pune flat budget or Rohan salary profile)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-[#F5F7FB] border border-[#E2E8F0] rounded-xl text-xs text-[#0F172A] placeholder-[#64748B]/60 focus:outline-none focus:bg-white focus:border-[#2563EB]"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-1.5 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white text-xs font-bold rounded-xl shadow cursor-pointer transition-all"
        >
          Query similarity
        </button>
      </form>

      {/* Vector results layout */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader className="h-8 w-8 text-[#2563EB] animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-2xl p-5 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-[#EF4444] shrink-0 mt-0.5" />
          <div>
            <h5 className="font-bold text-[#0F172A] text-xs">Vector Connection Warning</h5>
            <p className="text-[10px] text-[#64748B] mt-1 leading-relaxed">{error}</p>
          </div>
        </div>
      ) : !memories || memories.length === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-10 text-center text-gray-500 shadow-sm">
          <Brain className="h-10 w-10 text-[#64748B]/20 mb-3 mx-auto" />
          <h5 className="font-bold text-[#0F172A] text-xs">No matching memory vectors</h5>
          <p className="text-[10px] text-[#64748B]/60 max-w-xs mt-1.5 mx-auto">
            Try adjusting your search query, or select another category card above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {memories.map((mem) => {
            const importanceColors = ['text-slate-400', 'text-yellow-600', 'text-yellow-500', 'text-yellow-400', 'text-[#F59E0B]', 'text-[#F59E0B]'];
            const scorePercent = mem.score ? Math.round(mem.score * 100) : null;
            
            return (
              <div 
                key={mem.id} 
                className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 hover:border-[#2563EB]/40 hover:shadow-md transition-all duration-300 flex flex-col justify-between group relative overflow-hidden shadow-sm"
              >
                
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-block text-[9px] font-extrabold uppercase bg-[#F5F7FB] border border-[#E2E8F0] text-[#2563EB] rounded-xl px-2.5 py-0.5 font-mono">
                        {mem.memory_type || mem.type || 'Semantic'}
                      </span>
                      <span className="inline-block text-[9px] font-extrabold uppercase bg-[#F5F7FB] text-[#64748B] rounded-xl px-2.5 py-0.5 font-mono">
                        {mem.category}
                      </span>
                    </div>
                    {scorePercent !== null && (
                      <span className="text-[9px] font-mono text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/20 px-2 py-0.5 rounded-full font-bold">
                        {scorePercent}% Match
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-[#0F172A] leading-relaxed font-semibold">
                    {mem.content}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-[#F1F5F9] flex items-center justify-between text-[10px] text-[#64748B]/70">
                  <div className="flex items-center gap-1.5 font-mono">
                    <Calendar className="h-3.5 w-3.5 text-[#64748B]/50" />
                    <span>{mem.timestamp ? new Date(mem.timestamp).toLocaleDateString() : 'N/A'}</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5">
                      <Sparkles className={`h-3 w-3 ${importanceColors[mem.importance || 3]}`} />
                      <span className="text-[9px] font-bold">Weight Lvl {mem.importance || 3}</span>
                    </div>

                    <button
                      onClick={() => handleDeleteMemory(mem.id)}
                      className="p-1 rounded-lg hover:bg-red-50 text-[#64748B] hover:text-[#EF4444] transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                      title="Delete Point"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Form modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-[#0F172A]/30 backdrop-blur-md">
          <div className="bg-white border border-[#E2E8F0] rounded-[24px] w-full max-w-md p-6 relative shadow-2xl animate-scale-up">
            
            <div className="flex items-center justify-between pb-4 border-b border-[#E2E8F0] mb-4">
              <h4 className="font-extrabold text-[#0F172A] text-sm">Inject Vector Memory Point</h4>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] cursor-pointer"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <form onSubmit={handleAddMemory} className="space-y-4 text-xs text-[#0F172A]">
              
              <div>
                <label className="text-[#64748B] block mb-1 font-semibold">Memory Type</label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value)}
                  className="w-full bg-[#F5F7FB] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#64748B] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="semantic">Semantic Memory</option>
                  <option value="financial_profile">Financial Profile</option>
                  <option value="goal">Goal Memory</option>
                  <option value="conversation">Conversation</option>
                  <option value="preference">UI Preference</option>
                </select>
              </div>

              <div>
                <label className="text-[#64748B] block mb-1 font-semibold">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-[#F5F7FB] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#64748B] focus:outline-none focus:border-[#2563EB]"
                >
                  <option value="income">Income / Job Profile</option>
                  <option value="expense">Expense Habits</option>
                  <option value="goal">Goal Details</option>
                  <option value="investment">Investments preferences</option>
                  <option value="preference">User UI Settings</option>
                  <option value="general">General Facts</option>
                </select>
              </div>

              <div>
                <label className="text-[#64748B] block mb-1 font-semibold">Importance Weight (1-5)</label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={importance}
                  onChange={(e) => setImportance(Number(e.target.value))}
                  className="w-full accent-[#2563EB]"
                />
                <div className="flex justify-between text-[10px] text-gray-500 font-bold mt-1">
                  <span>1 (Low)</span>
                  <span className="text-[#7C3AED]">Level {importance}</span>
                  <span>5 (High)</span>
                </div>
              </div>

              <div>
                <label className="text-[#64748B] block mb-1 font-semibold">Memory Content (Natural Text)</label>
                <textarea
                  required
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="e.g. Rohan Sharma prefers investing in low-cost index funds and has moderate risk tolerance."
                  rows={3}
                  className="w-full bg-[#F5F7FB] border border-[#E2E8F0] rounded-xl px-3 py-2 text-[#0F172A] placeholder-gray-400 focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#E2E8F0] text-[#64748B] rounded-xl hover:bg-[#F1F5F9] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={injectLoading}
                  className="px-5 py-2 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-bold rounded-xl shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-50"
                >
                  {injectLoading ? <Loader className="h-3.5 w-3.5 animate-spin" /> : 'Inject Point'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
