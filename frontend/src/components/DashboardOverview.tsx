import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import api from '../services/api';
import { 
  Bot, 
  Sparkles, 
  ArrowRight, 
  Activity, 
  Calendar, 
  Send,
  Zap
} from 'lucide-react';

export const DashboardOverview: React.FC = () => {
  const { 
    user, 
    insights, 
    transactions, 
    addChatMessage, 
    setTelemetry, 
    setActivePanel 
  } = useStore();

  const [homeInput, setHomeInput] = useState('');
  const [loading, setLoading] = useState(false);

  const income = user?.monthly_income || 120000;
  const expenses = insights?.total_expenses || 48000;
  const surplus = insights?.surplus || (income - expenses);
  const savingsRatio = insights?.savings_ratio || Math.round((surplus/income) * 100);

  // Health score calculation
  const healthScore = Math.min(100, Math.max(30, Math.round(
    (savingsRatio > 35 ? 40 : 20) +
    (expenses < (income * 0.6) ? 30 : 15) +
    (user?.risk_profile === 'Moderate' || user?.risk_profile === 'Conservative' ? 20 : 15) +
    (transactions.length > 0 ? 10 : 5)
  )));

  const handleQuickChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeInput.trim() || loading) return;

    const query = homeInput;
    setHomeInput('');
    setLoading(true);

    // Add user message
    addChatMessage({ sender: 'user', text: query });
    
    // Redirect user to the full AI advisor workspace to watch the agent execution trace
    setActivePanel('chat');

    try {
      const res = await api.post('/chat', { message: query });
      const { response: cfoResponse, telemetry: adkTelemetry } = res.data;
      
      setTelemetry(adkTelemetry);
      addChatMessage({
        sender: 'cfo',
        text: cfoResponse.text_recommendation,
        data_payload: cfoResponse.data_payload,
        telemetry: adkTelemetry
      });
    } catch (err) {
      console.error("Home chat error:", err);
      addChatMessage({
        sender: 'cfo',
        text: 'Sorry, I encountered an issue analyzing your request. Verify that the server is online.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePromptClick = (promptText: string) => {
    setHomeInput(promptText);
  };

  const suggestedPrompts = [
    "What if I buy a house?",
    "Can I retire at 55?",
    "Can I afford an EV?",
    "Increase my SIP by ₹5000",
    "How much should I save monthly?"
  ];

  return (
    <div className="space-y-8 pb-10">
      
      {/* 1. Personalized AI Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-3xl font-black text-[#0F172A] dark:text-white tracking-tight">
            Good Evening, {user?.full_name?.split(' ')[0] || 'Saran'} 👋
          </h1>
          <p className="text-sm font-semibold text-[#7C3AED] dark:text-blue-400 mt-1 tracking-wide uppercase">
            Your AI Personal CFO Operating System
          </p>
        </div>
        <div className="flex items-center gap-2.5 bg-white dark:bg-[#0a0f1d] border border-[#E2E8F0] dark:border-[#1f293d] px-4 py-2 rounded-2xl shadow-sm shadow-blue-500/5">
          <Zap className="h-4.5 w-4.5 text-[#2563EB] dark:text-blue-450 animate-pulse" />
          <span className="text-xs font-bold text-[#64748B] dark:text-slate-450">Google ADK Orchestrator Online</span>
        </div>
      </div>

      {/* 2. Chat Workspace Hero Segment */}
      <div className="bg-white dark:bg-[#0a0f1d] border border-[#E2E8F0] dark:border-[#1f293d] rounded-[24px] p-6 shadow-sm shadow-blue-500/5 glow-card relative overflow-hidden">
        <div className="absolute right-0 top-0 h-48 w-48 bg-gradient-to-br from-[#2563EB]/5 to-[#7C3AED]/5 blur-3xl rounded-full" />
        
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] flex items-center justify-center">
              <Bot className="h-4.5 w-4.5 text-white" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider text-[#0F172A] dark:text-white">Ask Sophium</span>
          </div>

          <form onSubmit={handleQuickChatSubmit} className="flex gap-3 bg-[#F5F7FB] dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-850 p-1.5 rounded-2xl">
            <input 
              type="text" 
              placeholder="Query your CFO... (e.g. 'simulate buying a house for ₹25 Lakhs next year')"
              value={homeInput}
              onChange={(e) => setHomeInput(e.target.value)}
              className="flex-1 bg-transparent px-4 py-2.5 text-xs text-[#0F172A] dark:text-slate-200 focus:outline-none placeholder-[#64748B]/60 dark:placeholder-slate-500"
            />
            <button
              type="submit"
              className="px-5 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white rounded-xl transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Send className="h-4 w-4" />
              <span className="text-xs font-bold hidden sm:inline">Ask Advisor</span>
            </button>
          </form>

          {/* Prompt Chips */}
          <div className="flex flex-wrap gap-2 pt-1.5 items-center">
            <span className="text-[10px] font-bold text-[#64748B] dark:text-slate-450 mr-1">Suggestions:</span>
            {suggestedPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handlePromptClick(p)}
                className="text-[10px] bg-white dark:bg-[#0a0f1d] border border-[#E2E8F0] dark:border-[#1f293d] text-[#64748B] dark:text-slate-400 hover:text-[#2563EB] dark:hover:text-blue-400 hover:border-[#2563EB]/40 dark:hover:border-blue-500/40 px-3 py-1 rounded-xl transition-all font-semibold cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* 3. Core Insights & Health Score Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up">
        
        {/* Radial Health score card */}
        <div className="bg-white dark:bg-[#0a0f1d] border border-[#E2E8F0] dark:border-[#1f293d] rounded-[24px] p-6 flex flex-col items-center text-center justify-between shadow-sm shadow-blue-500/5 glow-card">
          <div className="self-start">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#64748B] dark:text-slate-450">Financial Health Score</h4>
          </div>

          <div className="my-6 relative flex items-center justify-center">
            {/* outer dial */}
            <div className="h-32 w-32 rounded-full border-4 border-[#F1F5F9] dark:border-slate-800 flex items-center justify-center">
              <div className="h-28 w-28 rounded-full border-4 border-t-[#2563EB] border-r-[#7C3AED] border-b-[#22C55E] border-l-[#EF4444]/20 dark:border-l-[#EF4444]/5 animate-spin-slow" />
            </div>
            {/* center score */}
            <div className="absolute flex flex-col justify-center items-center">
              <span className="text-3xl font-black text-[#0F172A] dark:text-white">{healthScore}</span>
              <span className="text-[9px] text-[#64748B] dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">out of 100</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-black text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/20 px-3 py-0.5 rounded-full uppercase tracking-wider">
              {healthScore >= 80 ? 'Excellent' : healthScore >= 60 ? 'Healthy' : 'Needs Review'}
            </span>
          </div>
        </div>

        {/* Today's Recommendation Panel */}
        <div className="bg-white dark:bg-[#0a0f1d] border border-[#E2E8F0] dark:border-[#1f293d] rounded-[24px] p-6 lg:col-span-2 flex flex-col justify-between shadow-sm shadow-blue-500/5 glow-card">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#64748B] dark:text-slate-450 mb-3 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-[#7C3AED] dark:text-blue-400" />
              Today's Key Recommendation
            </h4>
            <div className="space-y-3">
              <div className="p-3 bg-[#F5F7FB] dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-850 rounded-xl flex items-start gap-3">
                <span className="h-2 w-2 rounded-full bg-[#2563EB] mt-1.5 shrink-0" />
                <p className="text-xs text-slate-800 dark:text-slate-100 leading-relaxed">
                  Compounding projections suggest allocating an additional <strong className="text-[#2563EB] dark:text-blue-400">₹5,000</strong> to your Retirement Goal this month will shorten your milestone target timeline by <strong className="text-[#7C3AED] dark:text-purple-400">14 months</strong>.
                </p>
              </div>

              <div className="p-3 bg-[#F5F7FB] dark:bg-slate-950 border border-[#E2E8F0] dark:border-slate-850 rounded-xl flex items-start gap-3">
                <span className="h-2 w-2 rounded-full bg-[#EF4444] mt-1.5 shrink-0" />
                <p className="text-xs text-slate-800 dark:text-slate-100 leading-relaxed">
                  Budget warning: Shopping and discretionary expenses have increased by <strong className="text-[#EF4444] dark:text-red-400">12%</strong> over your historical baseline.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E2E8F0] dark:border-[#1f293d] flex justify-end">
            <button
              onClick={() => setActivePanel('analytics')}
              className="text-[10px] font-bold text-[#2563EB] dark:text-blue-400 hover:text-[#2563EB]/80 flex items-center gap-1 cursor-pointer transition-colors"
            >
              Analyze Financial Patterns <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

      </div>

      {/* 4. Events & Telemetry Split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Upcoming events list */}
        <div className="bg-white dark:bg-[#0a0f1d] border border-[#E2E8F0] dark:border-[#1f293d] rounded-[24px] p-6 lg:col-span-2 shadow-sm shadow-blue-500/5 glow-card">
          <h4 className="text-xs font-black uppercase tracking-wider text-[#64748B] dark:text-slate-450 mb-4 flex items-center gap-1.5">
            <Calendar className="h-4.5 w-4.5 text-[#2563EB] dark:text-blue-400" />
            Upcoming Financial Events
          </h4>
          <div className="space-y-3.5">
            
            <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-50 dark:border-slate-850/30">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[#EF4444]" />
                <span className="font-bold text-[#0F172A] dark:text-slate-205">Credit Card Bill Payment</span>
              </div>
              <span className="text-[10px] text-[#64748B] dark:text-slate-450 font-mono">July 3</span>
            </div>

            <div className="flex items-center justify-between text-xs pb-1.5 border-b border-slate-50 dark:border-slate-850/30">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[#2563EB] dark:bg-blue-500" />
                <span className="font-bold text-[#0F172A] dark:text-slate-205">Mutual Fund SIP Debit</span>
              </div>
              <span className="text-[10px] text-[#64748B] dark:text-slate-450 font-mono">July 10</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-[#22C55E]" />
                <span className="font-bold text-[#0F172A] dark:text-slate-205">Projected Salary Credit</span>
              </div>
              <span className="text-[10px] text-[#64748B] dark:text-slate-450 font-mono">July 30</span>
            </div>

          </div>
        </div>

        {/* Recent Agent Activity timeline preview */}
        <div className="bg-white dark:bg-[#0a0f1d] border border-[#E2E8F0] dark:border-[#1f293d] rounded-[24px] p-6 lg:col-span-3 shadow-sm shadow-blue-500/5 glow-card">
          <h4 className="text-xs font-black uppercase tracking-wider text-[#64748B] dark:text-slate-450 mb-4 flex items-center gap-1.5">
            <Activity className="h-4.5 w-4.5 text-[#7C3AED] dark:text-blue-400" />
            Recent Agent Activity Logs
          </h4>
          
          <div className="space-y-3.5 text-xs text-[#0F172A]">
            
            <div className="flex items-start gap-2.5 pb-2.5 border-b border-[#F1F5F9] dark:border-slate-850">
              <div className="h-5 w-5 rounded bg-[#2563EB]/10 flex items-center justify-center font-bold text-[#2563EB] text-[10px] shrink-0">
                CO
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="font-extrabold text-[#0F172A] dark:text-white">Coordinator Agent</span>
                  <span className="text-[9px] text-[#64748B] dark:text-slate-500 font-mono">24 ms</span>
                </div>
                <p className="text-[10px] text-[#64748B] dark:text-slate-450 leading-relaxed">Orchestrated downstream memory lookups for discretionary spending analysis.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 pb-2.5 border-b border-[#F1F5F9] dark:border-slate-850">
              <div className="h-5 w-5 rounded bg-[#8B5CF6]/10 flex items-center justify-center font-bold text-[#8B5CF6] text-[10px] shrink-0">
                ME
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="font-extrabold text-[#0F172A] dark:text-white">Memory Agent</span>
                  <span className="text-[9px] text-[#64748B] dark:text-slate-500 font-mono">48 ms</span>
                </div>
                <p className="text-[10px] text-[#64748B] dark:text-slate-450 leading-relaxed">Retrieved Pune housing milestone coordinates from Qdrant vector-space.</p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <div className="h-5 w-5 rounded bg-[#22C55E]/10 flex items-center justify-center font-bold text-[#22C55E] text-[10px] shrink-0">
                SI
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-0.5">
                  <span className="font-extrabold text-[#0F172A] dark:text-white">Simulation Agent</span>
                  <span className="text-[9px] text-[#64748B] dark:text-slate-500 font-mono">112 ms</span>
                </div>
                <p className="text-[10px] text-[#64748B] dark:text-slate-450 leading-relaxed">Projected 15-year compound yields relative to 6% expected inflation indices.</p>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
};
