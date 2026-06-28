import React, { useState } from 'react';
import api from '../services/api';
import { useStore } from '../store/useStore';
import { CustomSelect } from './CustomSelect';
import { 
  User, 
  Settings, 
  Sparkles, 
  Loader, 
  Check, 
  Key, 
  BrainCircuit 
} from 'lucide-react';

export const SettingsPanel: React.FC = () => {
  const { user, setUser, setToken, setGoals, setTransactions, setInsights, addChatMessage } = useStore();
  const [profileLoading, setProfileLoading] = useState(false);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [monthlyIncome, setMonthlyIncome] = useState(String(user?.monthly_income || 120000));
  const [currency, setCurrency] = useState(user?.currency || 'INR');
  const [riskProfile, setRiskProfile] = useState(user?.risk_profile || 'Moderate');
  const [country, setCountry] = useState(user?.country || 'India');
  const [timezone, setTimezone] = useState(user?.timezone || 'IST');

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess(false);
    try {
      const res = await api.put('/auth/profile', {
        full_name: fullName,
        monthly_income: parseFloat(monthlyIncome),
        currency,
        risk_profile: riskProfile,
        country,
        timezone
      });
      
      if (res.data.success) {
        setUser(res.data.data);
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
      }
    } catch (err) {
      console.error("Failed to update profile:", err);
      alert("Failed to update profile details.");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSeedMockData = async () => {
    setSeedLoading(true);
    setSeedSuccess(false);
    try {
      const response = await api.post('/auth/seed');
      if (response.data.success) {
        const { access_token, user: seededUser } = response.data.data;
        
        setToken(access_token);
        setUser(seededUser);
        
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
          text: `👋 Simulated Drive Loaded! Loaded Rohan Sharma's profile. Monthly income: ₹1,20,000. Goals: "Buy 2BHK Flat" & "Retire at 55". Qdrant Vector memory populated. Let's start financial planning!`
        });
        
        setSeedSuccess(true);
        setTimeout(() => setSeedSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Failed to seed demo:', error);
      alert('Mock seeding failed. Please check backend logs.');
    } finally {
      setSeedLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-2">
          <Settings className="h-5 w-5 text-[#2563EB]" />
          Platform Settings & Profile
        </h2>
        <p className="text-xs text-[#64748B] mt-1">
          Configure risk thresholds, currency standards, and manage sandbox simulation states.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Profile Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 lg:col-span-2 space-y-6 shadow-sm">
          <h4 className="text-xs font-black uppercase tracking-wider text-[#64748B] border-b border-[#F1F5F9] pb-2 flex items-center gap-1.5">
            <User className="h-4.5 w-4.5 text-[#2563EB]" /> User Profile Parameters
          </h4>

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs text-[#0F172A]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              <div>
                <label className="text-[#64748B] dark:text-slate-405 block mb-1 font-semibold">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
              </div>

              <div>
                <label className="text-[#64748B] dark:text-slate-405 block mb-1 font-semibold">Monthly Income (INR)</label>
                <input
                  type="number"
                  required
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono"
                />
              </div>

              <div>
                <label className="text-[#64748B] dark:text-slate-405 block mb-1 font-semibold">Primary Currency</label>
                <CustomSelect
                  value={currency}
                  onChange={(val) => setCurrency(val)}
                  options={[
                    { value: 'INR', label: 'INR (₹)' },
                    { value: 'USD', label: 'USD ($)' },
                    { value: 'EUR', label: 'EUR (€)' },
                    { value: 'GBP', label: 'GBP (£)' }
                  ]}
                />
              </div>

              <div>
                <label className="text-[#64748B] dark:text-slate-405 block mb-1 font-semibold">Investment Risk Tolerances</label>
                <CustomSelect
                  value={riskProfile}
                  onChange={(val) => setRiskProfile(val)}
                  options={[
                    { value: 'Conservative', label: 'Conservative' },
                    { value: 'Moderate', label: 'Moderate' },
                    { value: 'Aggressive', label: 'Aggressive' }
                  ]}
                />
              </div>

              <div>
                <label className="text-[#64748B] dark:text-slate-405 block mb-1 font-semibold">Location / Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                />
              </div>

              <div>
                <label className="text-[#64748B] dark:text-slate-405 block mb-1 font-semibold">Timezone</label>
                <input
                  type="text"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-xl px-3 py-2 text-slate-850 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all font-mono"
                />
              </div>

            </div>

            <div className="pt-4 border-t border-[#F1F5F9] flex items-center justify-end gap-2">
              {profileSuccess && (
                <span className="text-[#22C55E] font-bold flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Profile Saved!
                </span>
              )}
              <button
                type="submit"
                disabled={profileLoading}
                className="px-5 py-2 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white font-bold rounded-xl shadow-md shadow-blue-500/10 cursor-pointer disabled:opacity-50 transition-all"
              >
                {profileLoading ? <Loader className="h-3.5 w-3.5 animate-spin" /> : 'Save Profile'}
              </button>
            </div>
          </form>

        </div>

        {/* Right Side: Dev Simulation / Security Panel */}
        <div className="space-y-6 lg:col-span-1">
          
          <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 space-y-4 shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#64748B] border-b border-[#F1F5F9] pb-2 flex items-center gap-1.5">
              <BrainCircuit className="h-4.5 w-4.5 text-[#7C3AED]" />
              Simulation Console
            </h4>
            <p className="text-[11px] text-[#64748B] leading-relaxed">
              Load Rohan Sharma's pre-populated financial worksheet (₹1.2L income, goals, asset holdings, and Qdrant memories) for a complete sandbox evaluation.
            </p>
            <button
              onClick={handleSeedMockData}
              disabled={seedLoading}
              className={`w-full py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all text-xs cursor-pointer ${
                seedSuccess 
                  ? 'bg-[#22C55E] text-white shadow shadow-emerald-500/10' 
                  : 'bg-[#F5F7FB] hover:bg-[#F1F5F9] border border-[#E2E8F0] text-[#0F172A]'
              }`}
            >
              {seedLoading ? (
                <>
                  <Loader className="h-3.5 w-3.5 animate-spin" />
                  Warming memory buffers...
                </>
              ) : seedSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Workspace Loaded!
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-[#2563EB]" />
                  Populate Mock Sheet
                </>
              )}
            </button>
          </div>

          <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 space-y-3.5 text-xs shadow-sm">
            <h4 className="text-xs font-black uppercase tracking-wider text-[#64748B] border-b border-[#F1F5F9] pb-2 flex items-center gap-1.5">
              <Key className="h-4 w-4 text-[#F59E0B]" />
              API Settings
            </h4>
            <div className="p-3 bg-[#F5F7FB] border border-[#E2E8F0] rounded-xl text-[#64748B] leading-relaxed text-[10px]">
              <span className="font-bold text-[#0F172A] block mb-0.5">Vector Memory Endpoint</span>
              Qdrant Vector Server online at localhost:6333 (fallback enabled).
            </div>
            <div className="p-3 bg-[#F5F7FB] border border-[#E2E8F0] rounded-xl text-[#64748B] leading-relaxed text-[10px]">
              <span className="font-bold text-[#0F172A] block mb-0.5">Gemini Intelligence Context</span>
              Google Gemini Pro active via ADK coordination protocols.
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
