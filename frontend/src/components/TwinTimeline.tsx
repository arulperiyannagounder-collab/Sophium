import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { 
  Cpu, 
  Sparkles, 
  IndianRupee, 
  TrendingUp, 
  ShieldCheck
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

type StageYear = 'current' | '2030' | '2035' | '2040' | '2050';

export const TwinTimeline: React.FC = () => {
  const { user, insights } = useStore();
  const [selectedStage, setSelectedStage] = useState<StageYear>('2030');

  const income = user?.monthly_income || 120000;
  const expenses = insights?.total_expenses || 48000;
  const surplus = income - expenses;

  // Stages projected statistics calculator
  const getStageStats = (stage: StageYear) => {
    const startAge = 30;
    const baseSavings = surplus * 12;
    
    let multiplier = 1.0;
    let age = startAge;
    let retirementProb = 25;
    let lifestyleScore = 65;
    let risk = 'Low';

    if (stage === 'current') {
      multiplier = 0.1;
      age = startAge;
      retirementProb = 15;
      lifestyleScore = 60;
      risk = 'Low';
    } else if (stage === '2030') {
      multiplier = 4.8;
      age = startAge + 4;
      retirementProb = 35;
      lifestyleScore = 68;
      risk = 'Low';
    } else if (stage === '2035') {
      multiplier = 11.2;
      age = startAge + 9;
      retirementProb = 60;
      lifestyleScore = 75;
      risk = 'Moderate';
    } else if (stage === '2040') {
      multiplier = 21.5;
      age = startAge + 14;
      retirementProb = 82;
      lifestyleScore = 85;
      risk = 'Moderate';
    } else if (stage === '2050') {
      multiplier = 56.4;
      age = startAge + 24;
      retirementProb = 99;
      lifestyleScore = 92;
      risk = 'Conservative';
    }

    const netWorth = baseSavings * multiplier;
    const assets = netWorth * 1.15;
    const debt = netWorth * 0.15;
    const investments = netWorth * 0.7;
    const savings = netWorth * 0.3;

    return {
      age,
      netWorth: Math.round(netWorth),
      assets: Math.round(assets),
      debt: Math.round(debt),
      investments: Math.round(investments),
      savings: Math.round(savings),
      retirementProb,
      lifestyleScore,
      risk,
      goalStatus: age >= 38 ? 'House fully paid' : 'Housing goal in progress'
    };
  };

  const currentStats = getStageStats(selectedStage);

  const stages: { id: StageYear; label: string; year: string }[] = [
    { id: 'current', label: 'Current State', year: '2026' },
    { id: '2030', label: 'Near-Term', year: '2030' },
    { id: '2035', label: 'Compounding Phase', year: '2035' },
    { id: '2040', label: 'Wealth Phase', year: '2040' },
    { id: '2050', label: 'Retirement Horizon', year: '2050' },
  ];

  // Visual graph trajectory data
  const trajectoryData = stages.map(s => ({
    name: s.year,
    'Projected Net Worth': getStageStats(s.id).netWorth,
    'Assets': getStageStats(s.id).assets,
    'Liabilities': getStageStats(s.id).debt
  }));

  return (
    <div className="space-y-6 pb-10">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-2">
            <Cpu className="h-5 w-5 text-[#2563EB]" />
            Financial Digital Twin
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            Explore Saran's projected cash flow, milestone compliance, and retirement curves across decades.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#22C55E]/10 border border-[#22C55E]/20 px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#22C55E]">
          <ShieldCheck className="h-4 w-4" /> Twin Context Active
        </div>
      </div>

      {/* Horizontal Decades Timeline steps */}
      <div className="bg-white border border-[#E2E8F0] p-1.5 rounded-2xl flex flex-wrap gap-2 shadow-sm">
        {stages.map((stage) => {
          const isSelected = selectedStage === stage.id;
          return (
            <button
              key={stage.id}
              onClick={() => setSelectedStage(stage.id)}
              className={`flex-1 min-w-[130px] p-4 text-center rounded-xl transition-all duration-300 cursor-pointer ${
                isSelected 
                  ? 'bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white shadow-md' 
                  : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]'
              }`}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider block opacity-75">{stage.label}</span>
              <span className="text-lg font-black mt-1 block leading-none">{stage.year}</span>
            </button>
          );
        })}
      </div>

      {/* Stage detailed stats grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Net Worth Stage Details */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-sm flex flex-col justify-between lg:col-span-1">
          <div className="space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#64748B]">Decade Stage Profile</h4>
            
            <div className="space-y-1">
              <span className="text-[10px] text-[#64748B] font-bold block uppercase tracking-wider">Projected Net Worth</span>
              <h3 className="text-2xl font-black text-[#0F172A] flex items-center">
                <IndianRupee className="h-5 w-5 text-[#22C55E]" />
                {currentStats.netWorth.toLocaleString()}
              </h3>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-[#64748B] block mb-0.5">Asset Base</span>
                <p className="font-extrabold text-[#0F172A]">₹{currentStats.assets.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[#64748B] block mb-0.5">Active Debt</span>
                <p className="font-extrabold text-[#EF4444]">₹{currentStats.debt.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[#64748B] block mb-0.5">Investments</span>
                <p className="font-extrabold text-[#2563EB]">₹{currentStats.investments.toLocaleString()}</p>
              </div>
              <div>
                <span className="text-[#64748B] block mb-0.5">Savings</span>
                <p className="font-extrabold text-[#22C55E]">₹{currentStats.savings.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#F1F5F9] text-[10px] text-[#64748B] leading-relaxed">
            Projected Age: <strong className="text-[#0F172A]">{currentStats.age} Years Old</strong>
          </div>
        </div>

        {/* Digital Twin Graph Trajectory */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 lg:col-span-2 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-[#64748B] mb-4">
              Long-Term Wealth Accrual Trajectory
            </h4>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={trajectoryData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
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
                  <Area type="monotone" name="Net Worth" dataKey="Projected Net Worth" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorNetWorth)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>

      {/* Health metrics split dials */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Retirement success */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-sm">
          <span className="text-[10px] font-bold text-[#64748B] uppercase block">Retirement Success</span>
          <h3 className="text-lg font-black text-[#22C55E] mt-1 flex items-center gap-1.5">
            <TrendingUp className="h-4.5 w-4.5" />
            {currentStats.retirementProb}%
          </h3>
          <p className="text-[9px] text-[#64748B] mt-2">Probability of complete corpus safety.</p>
        </div>

        {/* Lifestyle Score */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-sm">
          <span className="text-[10px] font-bold text-[#64748B] uppercase block">Lifestyle Score</span>
          <h3 className="text-lg font-black text-[#7C3AED] mt-1">
            {currentStats.lifestyleScore} / 100
          </h3>
          <p className="text-[9px] text-[#64748B] mt-2">Discretionary spending index.</p>
        </div>

        {/* Risk profile stage */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-sm">
          <span className="text-[10px] font-bold text-[#64748B] uppercase block">Risk Profile Stage</span>
          <h3 className="text-lg font-black text-[#0F172A] mt-1">
            {currentStats.risk}
          </h3>
          <p className="text-[9px] text-[#64748B] mt-2">Portfolio asset allocation risk level.</p>
        </div>

        {/* Milestone status */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-sm">
          <span className="text-[10px] font-bold text-[#64748B] uppercase block">Milestones Status</span>
          <h3 className="text-lg font-black text-[#0F172A] mt-1 truncate">
            {currentStats.goalStatus.split(' ')[0]}...
          </h3>
          <p className="text-[9px] text-[#64748B] mt-2 truncate">{currentStats.goalStatus}</p>
        </div>

      </div>

      {/* AI digital twin warnings */}
      <div className="bg-[#2563EB]/5 border border-[#2563EB]/15 rounded-[24px] p-5 flex items-start gap-4 shadow-sm">
        <div className="h-10 w-10 bg-white border border-[#E2E8F0] rounded-xl flex items-center justify-center shrink-0 shadow-sm">
          <Sparkles className="h-5 w-5 text-[#2563EB]" />
        </div>
        <div>
          <h5 className="font-extrabold text-[#0F172A] text-xs">AI Twin Projections Insight</h5>
          <p className="text-[11px] text-[#64748B] mt-1.5 leading-relaxed">
            Saran's digital twin trajectory indicates that keeping the current compound yield rates of 12% secures an estimated net worth of <strong className="text-[#2563EB]">₹{getStageStats('2040').netWorth.toLocaleString()}</strong> by 2040, providing an 82% retirement corpus coverage threshold. Any increase in core savings ratios by 5% pushes this timeline forward by 18 months.
          </p>
        </div>
      </div>

    </div>
  );
};
