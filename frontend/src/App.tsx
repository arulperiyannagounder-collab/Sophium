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
import { Sparkles, Loader, User, Lock, Mail, ChevronRight } from 'lucide-react';

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
    setActivePanel
  } = useStore();
  
  // Auth screen states
  const [authMode, setAuthMode] = useState<'demo' | 'manual'>('demo');
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

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
      if (response.data.success) {
        const { access_token, user: seededUser } = response.data.data;
        
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
        setToken(res.data.data.access_token);
        setUser(res.data.data.user);
        
        addChatMessage({
          sender: 'cfo',
          text: `Welcome back, ${res.data.data.user.full_name}! Active session restored. Ready to proceed with financial evaluations.`
        });
        setActivePanel('home');
      } else {
        const res = await api.post('/auth/signup', {
          email: email,
          password: password,
          full_name: fullName,
          monthly_income: 85000.0,
          currency: "INR",
          risk_profile: "Moderate"
        });
        setToken(res.data.data.access_token);
        setUser(res.data.data.user);

        // Add a default transaction to avoid blank view
        await api.post('/transactions', {
          amount: 25000,
          category: 'Rent',
          description: 'Basic apartment rent',
          is_recurring: true
        });

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
          text: `Hello ${res.data.data.user.full_name}! Your personal CFO account has been registered successfully. I have created a sample rent expense. Ask me anything to populate more insights!`
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
        <div className="min-h-screen bg-[#F5F7FB] text-[#1E293B] flex flex-col justify-center items-center p-6">
          <div className="w-full max-w-md space-y-6 text-center">
            
            {/* Header branding */}
            <div className="flex flex-col items-center space-y-3">
              <div className="h-12 w-12 bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] rounded-2xl flex items-center justify-center font-black text-white text-2xl shadow-xl shadow-blue-500/10">
                S
              </div>
              <h2 className="text-2xl font-black text-[#0F172A] tracking-tight">Sophium</h2>
              <p className="text-[#7C3AED] text-[9px] tracking-widest font-extrabold uppercase -mt-1">
                Your AI Personal CFO
              </p>
              <p className="text-[#64748B] text-xs max-w-sm leading-relaxed pt-1">
                Smarter Financial Decisions. Powered by Intelligent AI Agents.
              </p>
            </div>

            {/* Auth panel wrapper */}
            <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 space-y-5 shadow-sm">
              
              {/* Tabs Selector */}
              <div className="flex bg-[#F5F7FB] p-1 rounded-xl border border-[#E2E8F0]">
                <button
                  onClick={() => setAuthMode('demo')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    authMode === 'demo' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Quick Demo Tour
                </button>
                <button
                  onClick={() => setAuthMode('manual')}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    authMode === 'manual' ? 'bg-[#2563EB] text-white shadow-sm' : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  Manual Log In
                </button>
              </div>

              {/* One-Click Sandbox Trigger */}
              {authMode === 'demo' ? (
                <div className="space-y-4 py-2">
                  <div className="flex items-start gap-3 text-left bg-[#F5F7FB] p-4 rounded-2xl border border-[#E2E8F0]">
                    <Sparkles className="h-5 w-5 text-[#2563EB] shrink-0 mt-0.5 animate-pulse" />
                    <div>
                      <h5 className="font-bold text-[#0F172A] text-xs">Simulated Drive Workspace</h5>
                      <p className="text-[#64748B] text-[10px] mt-1 leading-relaxed">
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
                <form onSubmit={handleManualAuth} className="space-y-3.5 text-left text-[#0F172A]">
                  {!isLogin && (
                    <div>
                      <label className="text-[10px] text-[#64748B] font-bold uppercase block mb-1">Full Name</label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-[#64748B]/50" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Saran Kumar"
                          className="w-full bg-[#F5F7FB] border border-[#E2E8F0] rounded-xl px-9 py-2 text-xs focus:outline-none focus:bg-white focus:border-[#2563EB] text-[#0F172A]"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="text-[10px] text-[#64748B] font-bold uppercase block mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-[#64748B]/50" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="saran@sophium.com"
                        className="w-full bg-[#F5F7FB] border border-[#E2E8F0] rounded-xl px-9 py-2 text-xs focus:outline-none focus:bg-white focus:border-[#2563EB] text-[#0F172A]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-[#64748B] font-bold uppercase block mb-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-[#64748B]/50" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#F5F7FB] border border-[#E2E8F0] rounded-xl px-9 py-2 text-xs focus:outline-none focus:bg-white focus:border-[#2563EB] text-[#0F172A]"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-between items-center text-xs">
                    <button
                      type="button"
                      onClick={() => setIsLogin(!isLogin)}
                      className="text-[10px] text-[#2563EB] hover:text-[#2563EB]/80 font-bold cursor-pointer"
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
            <p className="text-[9px] text-[#64748B]/60">
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
