import React, { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import api from './services/api';
import { Layout } from './components/Layout';
import { DashboardOverview } from './components/DashboardOverview';
import { GoalTimeline } from './components/GoalTimeline';
import { ChatInterface } from './components/ChatInterface';
import { ObservabilityPanel } from './components/ObservabilityPanel';
import { FinancialsPanel } from './components/FinancialsPanel';
import { MemoryExplorer } from './components/MemoryExplorer';
import { TwinSimulator } from './components/TwinSimulator';
import { TwinTimeline } from './components/TwinTimeline';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { NotificationsPanel } from './components/NotificationsPanel';
import { CustomSelect } from './components/CustomSelect';
import { 
  Sparkles, Loader, User, Lock, Mail, ChevronRight, 
  Eye, EyeOff, Wallet, TrendingUp, Sun, Moon 
} from 'lucide-react';

export default function App() {
  const { 
    user, 
    token, 
    activePanel, 
    setUser, 
    setToken, 
    setGoals, 
    setTransactions, 
    setInsights, 
    setNotifications, 
    addChatMessage,
    setActivePanel,
    theme,
    setTheme
  } = useStore();
  
  // Auth screen states
  const [authMode, setAuthMode] = useState<'demo' | 'manual'>('demo');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  
  // Custom themed CFO auth form states
  const [showPassword, setShowPassword] = useState(false);
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [riskTolerance, setRiskTolerance] = useState('Moderate');
  const [preferredGoal, setPreferredGoal] = useState('House');
  const [existingSavings, setExistingSavings] = useState('');

  const handleThemeToggleWithRipple = (event: React.MouseEvent<HTMLButtonElement>) => {
    const x = event.clientX;
    const y = event.clientY;
    const newTheme = theme === 'light' ? 'dark' : 'light';
    
    if (!(document as any).startViewTransition) {
      setTheme(newTheme);
      return;
    }
    
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );
    
    const transition = (document as any).startViewTransition(() => {
      setTheme(newTheme);
    });
    
    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`
          ],
        },
        {
          duration: 500,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          pseudoElement: '::view-transition-new(root)'
        }
      );
    });
  };

  // Restore session on mount
  useEffect(() => {
    const restoreSession = async () => {
      if (token) {
        try {
          const profileRes = await api.get('/auth/profile');
          setUser(profileRes.data.data || profileRes.data);
          
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
          setToken(null);
          setUser(null);
        }
      }
    };
    restoreSession();
  }, [token]);

  // Periodic proactive notifications check
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
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // One-click demo workspace seeder
  const handleSeedDemoWorkspace = async () => {
    setDemoLoading(true);
    try {
      const response = await api.post('/auth/seed');
      console.log(response);
      console.log(response.data);
      if (response.data.success) {
        const { access_token, user: seededUser } = response.data;
        
        
        // Update Zustand store
        setToken(access_token);
        setUser(seededUser);
        
        // Fetch fresh seeded data
        const [goalsRes, txsRes, insightsRes] = await Promise.all([
          api.get('/goals'),
          api.get('/transactions'),
          api.get('/transactions/insights')
        ]);
        
        setGoals(goalsRes.data);
        setTransactions(txsRes.data);
        setInsights(insightsRes.data);
        
        // Add chat welcome message
        addChatMessage({
          sender: 'cfo',
          text: `👋 Demo Workspace Activated! Loaded Saran's profile. Monthly income: ₹1,20,000. Goals: "Buy 2BHK Flat" & "Retire at 55". Let's start financial planning!`
        });
        
        setActivePanel('home');
      }
    } catch (error) {
      console.error('Failed to seed demo:', error);
      alert('Seeding workspace failed. Verify that the backend server is running.');
    } finally {
      setDemoLoading(false);
    }
  };

  const handleManualAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setAuthLoading(true);
    try {
      if (isLogin) {
        // OAuth2 form data
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
        setActivePanel('home');
      } else {
        const incomeValue = Number(monthlyIncome) || 85000;
        const res = await api.post('/auth/signup', {
          email,
          password,
          full_name: fullName,
          monthly_income: incomeValue,
          currency: "INR",
          risk_profile: riskTolerance
        });
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
          text: `Congratulations on registering, ${fullName}! Loaded your savings profile with target milestone goals. Let's analyze your path to financial freedom.`
        });
        setActivePanel('home');
      }
    } catch (err: any) {
      console.error("Authentication failed:", err);
      alert(err.response?.data?.detail || "Authentication failed. Please verify credentials.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Render Panel content dynamically based on sidebar state
  const renderPanel = () => {
    switch (activePanel) {
      case 'home':
        return <DashboardOverview />;
      case 'chat':
        return (
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start h-full">
            <div className="xl:col-span-3">
              <ChatInterface />
            </div>
            <div className="xl:col-span-2 xl:sticky xl:top-20">
              <ObservabilityPanel />
            </div>
          </div>
        );
      case 'financials':
        return <FinancialsPanel />;
      case 'goals':
        return <GoalTimeline />;
      case 'twin':
        return <TwinTimeline />;
      case 'simulator':
        return <TwinSimulator />;
      case 'memory':
        return <MemoryExplorer />;
      case 'analytics':
        return <AnalyticsPanel />;
      case 'notifications':
        return <NotificationsPanel />;
      case 'settings':
        return <SettingsPanel />;
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <React.Fragment>
      {!user ? (
        // Unauthenticated Login / Sign Up Landing Screen
        <div className="min-h-screen bg-[#F5F7FB] dark:bg-[#020202] text-[#1E293B] dark:text-slate-350 flex flex-col justify-center items-center p-6 transition-colors duration-300 relative">
          
          {/* Top-Right Theme Toggle button for Auth Screen */}
          <div className="absolute top-6 right-6">
            <button
              onClick={handleThemeToggleWithRipple}
              className="p-2.5 rounded-xl bg-white dark:bg-[#0a0f1d] border border-[#E2E8F0] dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white shadow-sm shadow-blue-500/5 cursor-pointer transition-all hover:scale-105 active:scale-95 flex items-center justify-center"
              aria-label="Toggle Theme"
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </button>
          </div>

          <div className="w-full max-w-md space-y-6 text-center">
            
            {/* Header branding */}
            <div className="flex flex-col items-center space-y-3">
              <div className="h-12 w-12 bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] rounded-2xl flex items-center justify-center font-black text-white text-2xl shadow-xl shadow-blue-500/10">
                S
              </div>
              <h2 className="text-2xl font-black text-[#0F172A] dark:text-white tracking-tight">Sophium</h2>
              <p className="text-[#7C3AED] dark:text-blue-400 text-[9px] tracking-widest font-extrabold uppercase -mt-1">
                Your AI Personal CFO
              </p>
              <p className="text-[#64748B] dark:text-slate-450 text-xs max-w-sm leading-relaxed pt-1">
                Smarter Financial Decisions. Powered by Intelligent AI Agents.
              </p>
            </div>

            {/* Auth panel wrapper */}
            <div className="bg-white dark:bg-[#0a0f1d] border border-[#E2E8F0] dark:border-slate-800 rounded-[24px] p-6 space-y-5 shadow-sm shadow-blue-500/5 glow-card">
              
              {/* Tabs Selector */}
              <div className="flex bg-[#F5F7FB] dark:bg-slate-900 p-1 rounded-xl border border-[#E2E8F0] dark:border-slate-800">
                <button
                  onClick={() => setAuthMode('demo')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    authMode === 'demo' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-[#64748B] dark:text-slate-450 hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                >
                  Quick Demo Tour
                </button>
                <button
                  onClick={() => setAuthMode('manual')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    authMode === 'manual' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-[#64748B] dark:text-slate-450 hover:text-[#0F172A] dark:hover:text-white'
                  }`}
                >
                  Manual Log In
                </button>
              </div>

              {/* One-Click Sandbox Trigger */}
              {authMode === 'demo' ? (
                <div className="space-y-4 py-2">
                  <div className="flex items-start gap-3 text-left bg-[#F5F7FB] dark:bg-slate-950 p-4 rounded-2xl border border-[#E2E8F0] dark:border-slate-850">
                    <Sparkles className="h-5 w-5 text-[#2563EB] dark:text-blue-400 shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <h5 className="font-bold text-[#0F172A] dark:text-white text-xs">Simulated Drive Workspace</h5>
                      <p className="text-[#64748B] dark:text-slate-450 text-[10px] mt-1 leading-relaxed">
                        Launches a pre-configured profile containing balance sheets, milestone planners, and long-term memory points to preview capabilities instantly.
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleSeedDemoWorkspace}
                    disabled={demoLoading}
                    className="w-full py-2.5 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/10 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
                  >
                    {demoLoading ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        Initializing Ledger...
                      </>
                    ) : (
                      <>
                        <span>Load Demo Drive Workspace</span>
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              ) : (
                // Manual Registration/Login inputs
                <form onSubmit={handleManualAuth} className="space-y-3.5 text-left">
                  {!isLogin && (
                    <>
                      {/* Full Name */}
                      <div>
                        <label className="text-[10px] text-[#64748B] dark:text-slate-400 font-bold uppercase block mb-1">Full Name</label>
                        <div className="relative bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center px-4 py-2 text-xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
                          <User className="h-4.5 w-4.5 text-slate-400 dark:text-slate-500 shrink-0 mr-3" />
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Rohan Sharma"
                            className="w-full bg-transparent focus:outline-none text-slate-800 dark:text-slate-100 text-xs placeholder-slate-400 dark:placeholder-slate-550"
                          />
                        </div>
                      </div>

                      {/* Financial Profile Section */}
                      <div>
                        <div className="text-blue-600 dark:text-blue-400 font-bold text-[10px] uppercase tracking-wider mb-2 mt-4 border-b border-slate-200 dark:border-slate-800 pb-1">
                          Financial Profile
                        </div>

                        <div className="space-y-3">
                          {/* Monthly Income */}
                          <div>
                            <label className="text-[10px] text-[#64748B] dark:text-slate-400 font-bold uppercase block mb-1">Monthly Income (INR)</label>
                            <div className="relative bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center px-4 py-2 text-xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
                              <Wallet className="h-4.5 w-4.5 text-slate-400 dark:text-slate-500 shrink-0 mr-3" />
                              <input
                                type="number"
                                required
                                value={monthlyIncome}
                                onChange={(e) => setMonthlyIncome(e.target.value)}
                                placeholder="120000"
                                className="w-full bg-transparent focus:outline-none text-slate-800 dark:text-slate-100 text-xs placeholder-slate-400 dark:placeholder-slate-555"
                              />
                            </div>
                          </div>

                          {/* Risk Tolerance Dropdown */}
                          <div>
                            <label className="text-[10px] text-[#64748B] dark:text-slate-400 font-bold uppercase block mb-1">Financial Risk Tolerance</label>
                            <CustomSelect
                              value={riskTolerance}
                              onChange={(val) => setRiskTolerance(val)}
                              options={[
                                { value: 'Conservative', label: 'Conservative (Low risk)' },
                                { value: 'Moderate', label: 'Moderate (Balanced growth)' },
                                { value: 'Aggressive', label: 'Aggressive (High growth)' }
                              ]}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Primary Focus Section */}
                      <div>
                        <div className="text-blue-600 dark:text-blue-400 font-bold text-[10px] uppercase tracking-wider mb-2 mt-4 border-b border-slate-200 dark:border-slate-800 pb-1">
                          Primary Focus
                        </div>

                        <div className="space-y-3">
                          {/* Target Savings Goal Dropdown */}
                          <div>
                            <label className="text-[10px] text-[#64748B] dark:text-slate-400 font-bold uppercase block mb-1">Target Savings Goal</label>
                            <CustomSelect
                              value={preferredGoal}
                              onChange={(val) => setPreferredGoal(val)}
                              options={[
                                { value: 'House', label: 'Buy 2BHK Flat (Housing)' },
                                { value: 'Retirement', label: 'Retire Early (Independence)' },
                                { value: 'General', label: 'General Savings Target' }
                              ]}
                            />
                          </div>

                          {/* Pre-Existing Savings */}
                          <div>
                            <label className="text-[10px] text-[#64748B] dark:text-slate-400 font-bold uppercase block mb-1">Pre-Existing Savings (INR)</label>
                            <div className="relative bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center px-4 py-2 text-xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
                              <TrendingUp className="h-4.5 w-4.5 text-slate-400 dark:text-slate-500 shrink-0 mr-3" />
                              <input
                                type="number"
                                value={existingSavings}
                                onChange={(e) => setExistingSavings(e.target.value)}
                                placeholder="500000"
                                className="w-full bg-transparent focus:outline-none text-slate-800 dark:text-slate-100 text-xs placeholder-slate-400 dark:placeholder-slate-555"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Email Address */}
                  <div>
                    <label className="text-[10px] text-[#64748B] dark:text-slate-400 font-bold uppercase block mb-1">Email Address</label>
                    <div className="relative bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center px-4 py-2 text-xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
                      <Mail className="h-4.5 w-4.5 text-slate-400 dark:text-slate-505 shrink-0 mr-3" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="rohan@sophium.com"
                        className="w-full bg-transparent focus:outline-none text-slate-800 dark:text-slate-100 text-xs placeholder-slate-400 dark:placeholder-slate-550"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="text-[10px] text-[#64748B] dark:text-slate-400 font-bold uppercase block mb-1">Password</label>
                    <div className="relative bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex items-center px-4 py-2 text-xs focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/20 transition-all">
                      <Lock className="h-4.5 w-4.5 text-slate-400 dark:text-slate-505 shrink-0 mr-3" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-transparent focus:outline-none text-slate-800 dark:text-slate-100 text-xs placeholder-slate-400 dark:placeholder-slate-550 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 text-slate-400 hover:text-slate-650 cursor-pointer flex items-center"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-center text-xs">
                    <button
                      type="button"
                      onClick={() => setIsLogin(!isLogin)}
                      className="text-[10px] text-[#2563EB] hover:text-[#2563EB]/80 font-bold cursor-pointer transition-colors"
                    >
                      {isLogin ? "Need a new account? Register" : "Have an account? Log in"}
                    </button>

                    <button
                      type="submit"
                      disabled={authLoading}
                      className="bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md shadow-blue-500/10 transition-all"
                    >
                      {authLoading ? (
                        <Loader className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          {isLogin ? 'Log In' : 'Sign Up'}
                          <ChevronRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Footer details */}
            <p className="text-[9px] text-[#64748B]/60 dark:text-slate-500">
              Sophium Security Standard &bull; Encrypted Session Channels &bull; &copy; 2026
            </p>
          </div>
        </div>
      ) : (
        // Authenticated Dashboard Layout wrapper
        <Layout>
          {renderPanel()}
        </Layout>
      )}
    </React.Fragment>
  );
}
