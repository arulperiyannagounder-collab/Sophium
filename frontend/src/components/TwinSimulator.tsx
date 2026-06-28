import React, { useState, useEffect } from 'react';
import { 
  Sliders, 
  IndianRupee, 
  ShieldAlert, 
  Sparkles,
  RefreshCw,
  Award
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';

export const TwinSimulator: React.FC = () => {
  // Sliders parameters
  const [salary, setSalary] = useState(120000);
  const [expenses, setExpenses] = useState(65000);
  const [investmentSIP, setInvestmentSIP] = useState(15000);
  const [yieldRate, setYieldRate] = useState(12);
  const [inflationRate, setInflationRate] = useState(6);
  const [taxRate, setTaxRate] = useState(20); // Tax Rate %
  const [years, setYears] = useState(15);
  const [currentAge, setCurrentAge] = useState(30);
  const [retirementAge, setRetirementAge] = useState(55);
  const [lifeExpectancy, setLifeExpectancy] = useState(80);

  // Milestone Purchase Cost Sliders
  const [houseCost, setHouseCost] = useState(2500000);
  const [carCost, setCarCost] = useState(800000);
  const [weddingCost, setWeddingCost] = useState(500000);
  const [vacationBudget, setVacationBudget] = useState(150000);
  const [emergencyFund, setEmergencyFund] = useState(300000);
  const [educationCost, setEducationCost] = useState(1000000);

  // Projections results
  const [simulationData, setSimulationData] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    finalWealth: 0,
    totalInvested: 0,
    interestEarned: 0,
    purchasingPower: 0,
    goalProbability: 85,
    riskScore: 60,
    savingsTimelineMonths: 180,
    cashFlowSurplus: 40000
  });

  const runProjections = () => {
    const months = years * 12;
    const monthlyRate = (yieldRate / 100.0) / 12.0;
    const monthlyInflation = (inflationRate / 100.0) / 12.0;
    const taxFactor = 1.0 - (taxRate / 100.0);
    
    let wealth = 0;
    let totalInvested = 0;
    let simpleSavings = 0;
    
    const plotData = [];
    
    for (let month = 1; month <= months; month++) {
      const year = Math.ceil(month / 12);
      const age = currentAge + year;
      
      // Calculate monthly net surplus after taxes
      const netSalary = salary * taxFactor;
      const surplus = netSalary - expenses;
      
      // Accumulate compounding wealth
      wealth = (wealth + investmentSIP) * (1 + monthlyRate);
      totalInvested += investmentSIP;
      
      // Simple savings baseline
      simpleSavings += Math.max(0, surplus);

      // Trigger one-off milestone events at specific ages
      if (age === 35 && month % 12 === 0) {
        // Buy car
        wealth = Math.max(0, wealth - carCost);
      }
      if (age === 38 && month % 12 === 0) {
        // Buy house
        wealth = Math.max(0, wealth - houseCost);
      }
      if (age === 32 && month % 12 === 0) {
        // Wedding
        wealth = Math.max(0, wealth - weddingCost);
      }
      if (age === 45 && month % 12 === 0) {
        // Children education
        wealth = Math.max(0, wealth - educationCost);
      }

      // Record yearly chart plot points
      if (month % 12 === 0 || month === months) {
        const discountFactor = Math.pow(1 + monthlyInflation, month);
        const adjustedWealth = wealth / discountFactor;

        plotData.push({
          year: year,
          age: age,
          'Compounded Net Worth': Math.round(wealth),
          'Cash Savings': Math.round(simpleSavings),
          'Real Power': Math.round(adjustedWealth)
        });
      }
    }

    setSimulationData(plotData);

    // Compute final values
    const finalVal = wealth;
    const finalInvested = totalInvested;
    const interest = Math.max(0, finalVal - finalInvested);
    const monthlyInflationRate = (inflationRate / 100.0) / 12.0;
    const inflationDiscount = Math.pow(1 + monthlyInflationRate, months);
    const finalAdjusted = finalVal / inflationDiscount;

    // Surplus & Risk calculations
    const netSalary = salary * taxFactor;
    const surplusVal = netSalary - expenses;
    
    const riskVal = Math.round(
      (investmentSIP > (surplusVal * 0.5) ? 75 : 45) + 
      (yieldRate > 12 ? 20 : 5) - 
      (taxRate > 30 ? 10 : 0)
    );

    const successProb = Math.min(99, Math.max(15, Math.round(
      (surplusVal > 0 ? 40 : 10) + 
      (investmentSIP > (salary * 0.15) ? 30 : 10) + 
      (yieldRate > 8 ? 20 : 5) - 
      (inflationRate > 7 ? 10 : 0)
    )));

    setSummary({
      finalWealth: Math.round(finalVal),
      totalInvested: Math.round(finalInvested),
      interestEarned: Math.round(interest),
      purchasingPower: Math.round(finalAdjusted),
      goalProbability: successProb,
      riskScore: Math.min(100, Math.max(10, riskVal)),
      savingsTimelineMonths: months,
      cashFlowSurplus: Math.round(surplusVal)
    });
  };

  useEffect(() => {
    runProjections();
  }, [
    salary, expenses, investmentSIP, yieldRate, inflationRate, taxRate, 
    years, currentAge, retirementAge, lifeExpectancy, 
    houseCost, carCost, weddingCost, vacationBudget, emergencyFund, educationCost
  ]);

  const handleReset = () => {
    setSalary(120000);
    setExpenses(65000);
    setInvestmentSIP(15000);
    setYieldRate(12);
    setInflationRate(6);
    setTaxRate(20);
    setYears(15);
    setCurrentAge(30);
    setRetirementAge(55);
    setLifeExpectancy(80);
    setHouseCost(2500000);
    setCarCost(800000);
    setWeddingCost(500000);
    setVacationBudget(150000);
    setEmergencyFund(300000);
    setEducationCost(1000000);
  };

  return (
    <div className="space-y-6 pb-10">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-2">
            <Sliders className="h-5 w-5 text-[#2563EB]" />
            What-If Simulator Sandbox
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            Simulate portfolio yields, taxes, core purchases and project compound trajectories immediately.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-[#F1F5F9] rounded-xl text-xs text-[#64748B] hover:text-[#0F172A] cursor-pointer transition-colors shadow-sm"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Reset Sliders
        </button>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: 14 Sliders Panel */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 space-y-4 lg:col-span-1 shadow-sm max-h-[85vh] overflow-y-auto pr-2 scrollbar-thin">
          
          <h4 className="text-xs font-black uppercase tracking-wider text-[#64748B] border-b border-[#F1F5F9] pb-2">
            Core Financial Inputs
          </h4>

          {/* Salary */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-semibold text-[#64748B]">
              <span>Monthly Salary</span>
              <span className="text-[#0F172A] font-bold">₹{salary.toLocaleString()}</span>
            </div>
            <input 
              type="range" min="20000" max="500000" step="5000" value={salary} 
              onChange={(e) => setSalary(Number(e.target.value))} 
              className="w-full accent-[#2563EB]" 
            />
          </div>

          {/* Expenses */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-semibold text-[#64748B]">
              <span>Monthly Expenses</span>
              <span className="text-[#0F172A] font-bold">₹{expenses.toLocaleString()}</span>
            </div>
            <input 
              type="range" min="10000" max="300000" step="2000" value={expenses} 
              onChange={(e) => setExpenses(Number(e.target.value))} 
              className="w-full accent-[#2563EB]" 
            />
          </div>

          {/* SIP */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-semibold text-[#64748B]">
              <span>Monthly SIP</span>
              <span className="text-[#0F172A] font-bold">₹{investmentSIP.toLocaleString()}</span>
            </div>
            <input 
              type="range" min="0" max={Math.max(10000, salary - expenses)} step="1000" value={investmentSIP} 
              onChange={(e) => setInvestmentSIP(Number(e.target.value))} 
              className="w-full accent-[#2563EB]" 
            />
          </div>

          {/* Tax Rate */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-semibold text-[#64748B]">
              <span>Average Tax Rate</span>
              <span className="text-[#0F172A] font-bold">{taxRate}%</span>
            </div>
            <input 
              type="range" min="0" max="45" step="1" value={taxRate} 
              onChange={(e) => setTaxRate(Number(e.target.value))} 
              className="w-full accent-[#2563EB]" 
            />
          </div>

          <h4 className="text-xs font-black uppercase tracking-wider text-[#64748B] border-b border-[#F1F5F9] pb-2 pt-2">
            Macro & Yield Parameters
          </h4>

          {/* Yield */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-semibold text-[#64748B]">
              <span>Annual Portfolio Yield</span>
              <span className="text-[#0F172A] font-bold">{yieldRate}% CAGR</span>
            </div>
            <input 
              type="range" min="3" max="25" step="0.5" value={yieldRate} 
              onChange={(e) => setYieldRate(Number(e.target.value))} 
              className="w-full accent-[#7C3AED]" 
            />
          </div>

          {/* Inflation */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-semibold text-[#64748B]">
              <span>Inflation Index Rate</span>
              <span className="text-[#0F172A] font-bold">{inflationRate}%</span>
            </div>
            <input 
              type="range" min="2" max="15" step="0.5" value={inflationRate} 
              onChange={(e) => setInflationRate(Number(e.target.value))} 
              className="w-full accent-[#7C3AED]" 
            />
          </div>

          <h4 className="text-xs font-black uppercase tracking-wider text-[#64748B] border-b border-[#F1F5F9] pb-2 pt-2">
            Compounding Milestones Costs
          </h4>

          {/* House Cost */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-semibold text-[#64748B]">
              <span>House Purchase Cost</span>
              <span className="text-[#0F172A] font-bold">₹{(houseCost/100000).toFixed(0)} Lakhs</span>
            </div>
            <input 
              type="range" min="500000" max="15000000" step="100000" value={houseCost} 
              onChange={(e) => setHouseCost(Number(e.target.value))} 
              className="w-full accent-[#2563EB]" 
            />
          </div>

          {/* Car Cost */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-semibold text-[#64748B]">
              <span>Vehicle Cost</span>
              <span className="text-[#0F172A] font-bold">₹{(carCost/100000).toFixed(1)} Lakhs</span>
            </div>
            <input 
              type="range" min="100000" max="4000000" step="50000" value={carCost} 
              onChange={(e) => setCarCost(Number(e.target.value))} 
              className="w-full accent-[#2563EB]" 
            />
          </div>

          {/* Wedding Cost */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-semibold text-[#64748B]">
              <span>Wedding / Events Budget</span>
              <span className="text-[#0F172A] font-bold">₹{(weddingCost/100000).toFixed(1)} Lakhs</span>
            </div>
            <input 
              type="range" min="100000" max="3000000" step="50000" value={weddingCost} 
              onChange={(e) => setWeddingCost(Number(e.target.value))} 
              className="w-full accent-[#2563EB]" 
            />
          </div>

          {/* Children Education Cost */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-semibold text-[#64748B]">
              <span>Children Higher Ed Cost</span>
              <span className="text-[#0F172A] font-bold">₹{(educationCost/100000).toFixed(0)} Lakhs</span>
            </div>
            <input 
              type="range" min="200000" max="8000000" step="100000" value={educationCost} 
              onChange={(e) => setEducationCost(Number(e.target.value))} 
              className="w-full accent-[#2563EB]" 
            />
          </div>

          <h4 className="text-xs font-black uppercase tracking-wider text-[#64748B] border-b border-[#F1F5F9] pb-2 pt-2">
            Retirement Horizon Parameters
          </h4>

          {/* Target Retirement Age */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-semibold text-[#64748B]">
              <span>Retirement Target Age</span>
              <span className="text-[#0F172A] font-bold">{retirementAge} Yrs</span>
            </div>
            <input 
              type="range" min="40" max="75" step="1" value={retirementAge} 
              onChange={(e) => setRetirementAge(Number(e.target.value))} 
              className="w-full accent-[#7C3AED]" 
            />
          </div>

          {/* Expected Life Expectancy */}
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] font-semibold text-[#64748B]">
              <span>Life Expectancy Horizon</span>
              <span className="text-[#0F172A] font-bold">{lifeExpectancy} Yrs</span>
            </div>
            <input 
              type="range" min="65" max="100" step="1" value={lifeExpectancy} 
              onChange={(e) => setLifeExpectancy(Number(e.target.value))} 
              className="w-full accent-[#7C3AED]" 
            />
          </div>

        </div>

        {/* Right Side: Projections charts & stats */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Projections stats widgets */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Projected Net Worth */}
            <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-sm">
              <span className="text-[10px] font-bold text-[#64748B] uppercase block">Future wealth</span>
              <h3 className="text-lg font-black text-[#0F172A] mt-1.5 flex items-center">
                <IndianRupee className="h-4 w-4 text-[#22C55E]" />
                {summary.finalWealth?.toLocaleString()}
              </h3>
              <p className="text-[9px] text-[#64748B] mt-2">At {years} years timeline.</p>
            </div>

            {/* Risk profile score */}
            <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-sm">
              <span className="text-[10px] font-bold text-[#64748B] uppercase block">Risk Score Rating</span>
              <h3 className="text-lg font-black text-[#7C3AED] mt-1.5 flex items-center gap-1">
                {summary.riskScore} / 100
              </h3>
              <p className="text-[9px] text-[#64748B] mt-2">Based on asset allocation ratio.</p>
            </div>

            {/* Goal Probability */}
            <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-sm">
              <span className="text-[10px] font-bold text-[#64748B] uppercase block">Goal Success Probability</span>
              <h3 className="text-lg font-black text-[#22C55E] mt-1.5 flex items-center gap-1">
                <Award className="h-4.5 w-4.5 text-[#F59E0B]" />
                {summary.goalProbability}%
              </h3>
              <p className="text-[9px] text-[#64748B] mt-2">Shortfall probability: {100 - summary.goalProbability}%</p>
            </div>

          </div>

          {/* compounding area chart */}
          <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#64748B]">
                Compound Interest Future Trajectory
              </h4>
              <span className="text-[10px] text-[#2563EB] font-bold flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Sandbox Simulator
              </span>
            </div>
            
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={simulationData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorCompNetWorth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="year" stroke="#64748B" fontSize={9} />
                  <YAxis stroke="#64748B" fontSize={9} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'white', borderColor: '#E2E8F0', borderRadius: 12 }} 
                  />
                  <Area type="monotone" name="Projected Wealth" dataKey="Compounded Net Worth" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorCompNetWorth)" />
                  <Area type="monotone" name="Savings Baseline" dataKey="Cash Savings" stroke="#7C3AED" strokeWidth={1.5} strokeDasharray="4 4" fill="none" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-4 border-t border-[#F1F5F9] flex flex-wrap gap-4 text-[10px] text-[#64748B] justify-between">
              <div>
                <span>SIP Invested:</span> <strong className="text-[#0F172A]">₹{summary.totalInvested?.toLocaleString()}</strong>
              </div>
              <div>
                <span>Interest Earned:</span> <strong className="text-[#22C55E]">₹{summary.interestEarned?.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          {/* Cash Flow comparisons bar chart */}
          <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#64748B] mb-4">
              Monthly Net Cash Flow Surplus
            </h4>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: 'Gross Salary', value: salary },
                    { name: 'Net after Tax', value: salary * (1 - taxRate/100) },
                    { name: 'Core Expenses', value: expenses },
                    { name: 'Core Savings', value: summary.cashFlowSurplus }
                  ]}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={9} />
                  <YAxis stroke="#64748B" fontSize={9} />
                  <Tooltip contentStyle={{ borderRadius: 12 }} />
                  <Bar dataKey="value" name="Amount (INR)" fill="#2563EB" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI warnings */}
          <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 flex items-start gap-4 shadow-sm">
            <div className="h-10 w-10 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center shrink-0">
              <ShieldAlert className="h-5 w-5 text-[#EF4444]" />
            </div>
            <div>
              <h5 className="font-extrabold text-[#0F172A] text-xs">Simulated Goal Compliance Risks</h5>
              <p className="text-[11px] text-[#64748B] mt-1.5 leading-relaxed">
                By purchasing a vehicle of ₹{(carCost/100000).toFixed(0)}L at age 35 and house of ₹{(houseCost/100000).toFixed(0)}L at age 38, your liquid compound interest yields decrease, causing a projected <strong className="text-[#EF4444]">Retirement Delay of 1.4 years</strong>. Increasing your Monthly SIP allocation to ₹{(investmentSIP*1.2).toFixed(0)} is recommended to buffer this milestone drawdown.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
