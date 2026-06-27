import React, { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import api from './services/api';
import { Layout } from './components/Layout';
import { DemoControl } from './components/DemoControl';
import { DashboardOverview } from './components/DashboardOverview';
import { GoalTimeline } from './components/GoalTimeline';
import { ChatInterface } from './components/ChatInterface';
import { ObservabilityPanel } from './components/ObservabilityPanel';
import { Sparkles, Loader, User, Lock, Mail, ChevronRight, Eye, EyeOff, Wallet, ShieldCheck, Goal, TrendingUp } from 'lucide-react';

export default function App() {
  const { user, token, activePanel, setUser, setToken, setGoals, setTransactions, setInsights, setNotifications, addChatMessage } = useStore();
  
  // Auth screen states
  const [authMode, setAuthMode] = useState<'demo' | 'manual'>('demo');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  
  // Custom themed CFO auth form states
  const [showPassword, setShowPassword] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [riskTolerance, setRiskTolerance] = useState('Moderate');
  const [preferredGoal, setPreferredGoal] = useState('House');
  const [existingSavings, setExistingSavings] = useState('');

  // Restore session
  useEffect(() => {
    const restoreSession = async () => {
      if (token) {
        try {
          // Fetch current user details
          const profileRes = await api.get('/auth/profile');
          setUser(profileRes.data);
          
          // Fetch user metrics
          const [goalsRes, txsRes, insightsRes] = await Promise.all([
            api.get('/goals'),
            api.get('/transactions'),
            api.get('/transactions/insights')
          ]);
          
          setGoals(goalsRes.data);
          setTransactions(txsRes.data);
          setInsights(insightsRes.data);
        } catch (err) {
          console.error("Failed to restore session:", err);
          // Token expired or invalid
          setToken(null);
          setUser(null);
        }
      }
    };
    restoreSession();
  }, [token]);

  // Periodic notifications
  useEffect(() => {
    if (!user) return;
    
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/chat/notifications');
        setNotifications(res.data);
      } catch (err) {
        console.error("Failed to load notifications:", err);
      }
    };
    
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [user]);

  const handleManualAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setAuthLoading(true);
    try {
      if (isLogin) {
        // Build OAuth2 form data
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);

        const res = await api.post('/auth/login', formData);
        setToken(res.data.access_token);
        setUser(res.data.user);
        addChatMessage({
          sender: 'cfo',
          text: `Welcome back, ${res.data.user.full_name}! Active session restored. Ready to proceed with financial evaluations.`
        });
      } else {
        const incomeValue = Number(monthlyIncome) || 85000;
        const res = await api.post(
          `/auth/signup?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&full_name=${encodeURIComponent(fullName)}&monthly_income=${incomeValue}&financial_risk_tolerance=${encodeURIComponent(riskTolerance)}`
        );
        setToken(res.data.access_token);
        setUser(res.data.user);

        // Add user's first custom goal if selected
        if (preferredGoal) {
          const targetMap = {
            House: { name: "Buy 2BHK Flat", target: 2500000, date: "2031-12", cat: "house" },
            Retirement: { name: "Retire Early", target: 15000000, date: "2053-06", cat: "retirement" },
            General: { name: "General Savings Target", target: 500000, date: "2028-12", cat: "general" }
          };
          const selectedGoal = targetMap[preferredGoal as keyof typeof targetMap] || targetMap.General;
          
          try {
            await api.post('/goals', {
              name: selectedGoal.name,
              target_amount: selectedGoal.target,
              current_amount: Number(existingSavings) || 0,
              target_date: selectedGoal.date,
              category: selectedGoal.cat
            });
          } catch (goalErr) {
            console.error("Failed to seed initial goal:", goalErr);
          }
        }

        // Add a mock transaction to avoid blank dashboard on fresh registration
        try {
          await api.post('/transactions', {
            amount: Math.round(incomeValue * 0.25),
            category: 'rent',
            description: 'Basic apartment rent',
            is_recurring: true
          });
        } catch (txErr) {
          console.error("Failed to seed initial transaction:", txErr);
        }

        // Fetch metrics
        const [goalsRes, txsRes, insightsRes] = await Promise.all([
          api.get('/goals'),
          api.get('/transactions'),
          api.get('/transactions/insights')
        ]);
        
        setGoals(goalsRes.data);
        setTransactions(txsRes.data);
        setInsights(insightsRes.data);

        addChatMessage({
          sender: 'cfo',
          text: `Hello ${res.data.user.full_name}! Your personal CFO account has been registered successfully. I have created a sample rent expense. Ask me anything to populate more insights!`
        });
      }
    } catch (err: any) {
      console.error("Authentication failed:", err);
      alert(err.response?.data?.detail || "Authentication failed. Please verify credentials.");
    } finally {
      setAuthLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col">
      {/* Top Banner Control */}
      <DemoControl />

      {!user ? (
        // Landings / Auth State
        <div className="flex-1 flex flex-col justify-center items-center p-6 text-center max-w-xl mx-auto w-full">
          {/* Logo */}
          <div className="h-14 w-14 bg-gradient-to-tr from-blue-600 to-emerald-500 rounded-2xl flex items-center justify-center font-black text-white text-3xl shadow-xl shadow-blue-500/10 mb-5">
            S
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Sophium</h2>
          <p className="text-gray-400 text-[10px] tracking-widest font-semibold uppercase -mt-0.5">
            Your AI Personal CFO
          </p>
          <p className="text-gray-400 text-xs mt-3 leading-relaxed max-w-sm">
            Sophium orchestrates specialized financial agents to analyze budgets, forecast savings trajectories, and provide transparent advice.
          </p>

          {/* Auth Tab Selector */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 w-full mt-6 space-y-4">
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-850">
              <button
                onClick={() => setAuthMode('demo')}
                className={`flex-1 py-1.5 rounded text-xs font-semibold cursor-pointer transition-all ${
                  authMode === 'demo' ? 'bg-blue-600 text-white font-bold' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                One-Click Sandbox
              </button>
              <button
                onClick={() => setAuthMode('manual')}
                className={`flex-1 py-1.5 rounded text-xs font-semibold cursor-pointer transition-all ${
                  authMode === 'manual' ? 'bg-blue-600 text-white font-bold' : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                Manual Credentials
              </button>
            </div>

            {authMode === 'demo' ? (
              // Demo instruction block
              <div className="space-y-4 py-2">
                <div className="flex items-start gap-3 text-left bg-slate-950 p-4 rounded-lg border border-slate-850">
                  <Sparkles className="h-4.5 w-4.5 text-blue-400 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <h5 className="font-semibold text-gray-200 text-xs">Simulated Sandbox Environment</h5>
                    <p className="text-gray-500 text-[10px] mt-1 leading-relaxed">
                      Launches a mock profile (Rohan Sharma, monthly income ₹1.2L) preloaded with transaction ledgers, housing/retirement milestones, and semantic memories saved in Qdrant.
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-gray-500">
                  Click the **Launch 2-Min Demo Mode** button in the top banner to start immediately.
                </p>
              </div>
            ) : (
              // Manual Auth forms
              <form onSubmit={handleManualAuth} className="space-y-4 text-left">
                {!isLogin ? (
                  // Custom financial profile signup form matching the screenshot layout
                  <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                    {/* Account Details Section */}
                    <div>
                      <div className="text-[#0d9488] font-bold text-[10px] uppercase tracking-wider mb-2 border-b border-slate-800 pb-1">
                        Account Details
                      </div>
                      
                      <div className="space-y-3">
                        {/* Full Name */}
                        <div className="relative bg-[#f0fbf9] border border-[#dbf5f0] rounded-xl flex items-center px-4 py-2.5 transition-all focus-within:border-teal-400">
                          <User className="h-4.5 w-4.5 text-[#0d9488] shrink-0 mr-3" />
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Full Name"
                            className="w-full bg-transparent focus:outline-none text-[#0f766e] text-xs placeholder-[#0d9488]/40"
                          />
                        </div>

                        {/* Email Address */}
                        <div className="relative bg-[#f0fbf9] border border-[#dbf5f0] rounded-xl flex items-center px-4 py-2.5 transition-all focus-within:border-teal-400">
                          <Mail className="h-4.5 w-4.5 text-[#0d9488] shrink-0 mr-3" />
                          <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email Address"
                            className="w-full bg-transparent focus:outline-none text-[#0f766e] text-xs placeholder-[#0d9488]/40"
                          />
                        </div>

                        {/* Password */}
                        <div className="relative bg-[#f0fbf9] border border-[#dbf5f0] rounded-xl flex items-center px-4 py-2.5 transition-all focus-within:border-teal-400">
                          <Lock className="h-4.5 w-4.5 text-[#0d9488] shrink-0 mr-3" />
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="w-full bg-transparent focus:outline-none text-[#0f766e] text-xs placeholder-[#0d9488]/40 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-2.5 text-[#0d9488] hover:text-teal-700 cursor-pointer flex items-center"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Financial Profile Section */}
                    <div>
                      <div className="text-[#0d9488] font-bold text-[10px] uppercase tracking-wider mb-2 mt-2 border-b border-slate-800 pb-1">
                        Financial Profile
                      </div>

                      <div className="space-y-3">
                        {/* Monthly Income */}
                        <div className="bg-[#f0fbf9] border border-[#dbf5f0] rounded-xl flex items-center px-4 py-2.5 transition-all focus-within:border-teal-400">
                          <Wallet className="h-4.5 w-4.5 text-[#0d9488] shrink-0 mr-3" />
                          <input
                            type="number"
                            required
                            value={monthlyIncome}
                            onChange={(e) => setMonthlyIncome(e.target.value)}
                            placeholder="Monthly Income (INR)"
                            className="w-full bg-transparent focus:outline-none text-[#0f766e] text-xs placeholder-[#0d9488]/40"
                          />
                        </div>

                        {/* Risk Tolerance */}
                        <div className="relative bg-[#f0fbf9] border border-[#dbf5f0] rounded-xl px-4 py-1 transition-all focus-within:border-teal-400 flex flex-col justify-center">
                          <span className="text-[7px] text-[#0d9488] font-bold uppercase tracking-wider block leading-none mt-1">Financial Risk Tolerance</span>
                          <div className="flex items-center relative py-0.5">
                            <ShieldCheck className="h-4 w-4 text-[#0d9488] mr-2 shrink-0" />
                            <select
                              value={riskTolerance}
                              onChange={(e) => setRiskTolerance(e.target.value)}
                              className="w-full bg-transparent focus:outline-none text-[#0f766e] text-xs cursor-pointer border-none outline-none appearance-none pr-6"
                            >
                              <option value="Low">Low Risk</option>
                              <option value="Moderate">Moderate Risk</option>
                              <option value="High">High Risk</option>
                            </select>
                            <ChevronRight className="absolute right-1 top-1 h-3 w-3 text-[#0d9488] transform rotate-90 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Primary Focus Section */}
                    <div>
                      <div className="text-[#0d9488] font-bold text-[10px] uppercase tracking-wider mb-2 mt-2 border-b border-slate-800 pb-1">
                        Primary Focus
                      </div>

                      <div className="space-y-3">
                        {/* Preferred Goal */}
                        <div className="relative bg-[#f0fbf9] border border-[#dbf5f0] rounded-xl px-4 py-1 transition-all focus-within:border-teal-400 flex flex-col justify-center">
                          <span className="text-[7px] text-[#0d9488] font-bold uppercase tracking-wider block leading-none mt-1">Target Savings Goal</span>
                          <div className="flex items-center relative py-0.5">
                            <Goal className="h-4 w-4 text-[#0d9488] mr-2 shrink-0" />
                            <select
                              value={preferredGoal}
                              onChange={(e) => setPreferredGoal(e.target.value)}
                              className="w-full bg-transparent focus:outline-none text-[#0f766e] text-xs cursor-pointer border-none outline-none appearance-none pr-6"
                            >
                              <option value="House">Buy 2BHK Flat</option>
                              <option value="Retirement">Retire Early</option>
                              <option value="General">General Savings Target</option>
                            </select>
                            <ChevronRight className="absolute right-1 top-1 h-3 w-3 text-[#0d9488] transform rotate-90 pointer-events-none" />
                          </div>
                        </div>

                        {/* Existing Savings */}
                        <div className="relative bg-[#f0fbf9] border border-[#dbf5f0] rounded-xl flex items-center px-4 py-2.5 transition-all focus-within:border-teal-400">
                          <TrendingUp className="h-4.5 w-4.5 text-[#0d9488] shrink-0 mr-3" />
                          <input
                            type="number"
                            value={existingSavings}
                            onChange={(e) => setExistingSavings(e.target.value)}
                            placeholder="Pre-Existing Savings (INR)"
                            className="w-full bg-transparent focus:outline-none text-[#0f766e] text-xs placeholder-[#0d9488]/40"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Custom themed Login Form
                  <div className="space-y-3">
                    {/* Email Address */}
                    <div className="relative bg-[#f0fbf9] border border-[#dbf5f0] rounded-xl flex items-center px-4 py-2.5 transition-all focus-within:border-teal-400">
                      <Mail className="h-4.5 w-4.5 text-[#0d9488] shrink-0 mr-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email Address"
                        className="w-full bg-transparent focus:outline-none text-[#0f766e] text-xs placeholder-[#0d9488]/40"
                      />
                    </div>

                    {/* Password */}
                    <div className="relative bg-[#f0fbf9] border border-[#dbf5f0] rounded-xl flex items-center px-4 py-2.5 transition-all focus-within:border-teal-400">
                      <Lock className="h-4.5 w-4.5 text-[#0d9488] shrink-0 mr-3" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full bg-transparent focus:outline-none text-[#0f766e] text-xs placeholder-[#0d9488]/40 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-[#0d9488] hover:text-teal-700 cursor-pointer flex items-center"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-between items-center">
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                  >
                    {isLogin ? "Need a new account? Register" : "Have an account? Log in"}
                  </button>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 py-2 rounded flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    {authLoading ? (
                      <Loader className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        {isLogin ? 'Log In' : 'Sign Up'}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : (
        // Authenticated Dashboard layout
        <Layout>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            {/* Left section (Dashboard/Goal lists + Chat interface) */}
            <div className="lg:col-span-3 space-y-6">
              {activePanel === 'dashboard' ? (
                <DashboardOverview />
              ) : (
                <GoalTimeline />
              )}
              <ChatInterface />
            </div>

            {/* Right section (observability timeline) */}
            <div className="lg:col-span-2 lg:sticky lg:top-24">
              <ObservabilityPanel />
            </div>
          </div>
        </Layout>
      )}
    </div>
  );
}
