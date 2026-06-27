import React, { useState } from 'react';
import api from '../services/api';
import { useStore } from '../store/useStore';
import { Sparkles, Loader } from 'lucide-react';

export const DemoControl: React.FC = () => {
  const { setToken, setUser, setGoals, setTransactions, setInsights, addChatMessage, setActivePanel } = useStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSeedDemo = async () => {
    setLoading(true);
    setSuccess(false);
    try {
      const response = await api.post('/auth/seed');
      if (response.data.status === 'success') {
        const { access_token, user } = response.data;
        
        // Update Zustand store
        setToken(access_token);
        setUser(user);
        
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
          text: `👋 Demo Mode Activated! Loaded profile for Rohan Sharma (Senior Software Engineer). Active monthly income: ₹1,20,000. Goals Loaded: "Buy 2BHK Flat" and "Retire at 55". Qdrant Vector Memory populated with preferences. Let's start financial planning!`
        });
        
        setSuccess(true);
        setActivePanel('dashboard');
        
        // Reset success state after 3s
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Failed to seed demo:', error);
      alert('Demo seeding failed. Please check backend server log.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-600/30 to-emerald-600/30 border-b border-blue-500/20 px-4 py-2.5 flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4.5 w-4.5 text-blue-400 animate-pulse" />
        <span className="font-medium text-gray-200">
          Google Agent Labs Hackathon 2026 Sandbox Environment
        </span>
        <span className="text-gray-400 text-xs hidden sm:inline">
          | Zero configuration required to test A2A reasoning & Qdrant vector memory.
        </span>
      </div>
      <button
        onClick={handleSeedDemo}
        disabled={loading}
        className={`px-3 py-1 rounded font-medium flex items-center gap-1.5 transition-all text-xs cursor-pointer ${
          success 
            ? 'bg-emerald-600 text-white' 
            : 'bg-blue-600 hover:bg-blue-500 text-white shadow shadow-blue-500/20 active:scale-95'
        }`}
      >
        {loading ? (
          <>
            <Loader className="h-3 w-3 animate-spin" />
            Seeding Database...
          </>
        ) : success ? (
          '✓ Demo Loaded!'
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5" />
            Launch 2-Min Demo Mode
          </>
        )}
      </button>
    </div>
  );
};
