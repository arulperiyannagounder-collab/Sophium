import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import api from '../services/api';
import { 
  Bell, 
  AlertCircle, 
  Info, 
  CheckCircle, 
  Sparkles,
  Clock,
  Loader,
  RefreshCw
} from 'lucide-react';

export const NotificationsPanel: React.FC = () => {
  const { notifications, setNotifications } = useStore();
  const [scanLoading, setScanLoading] = useState(false);

  const getSeverityStyles = (severity: 'warning' | 'info') => {
    if (severity === 'warning') {
      return {
        bg: 'bg-[#EF4444]/10 border-[#EF4444]/20',
        text: 'text-[#EF4444]',
        icon: <AlertCircle className="h-4.5 w-4.5 text-[#EF4444] shrink-0 mt-0.5" />
      };
    }
    return {
      bg: 'bg-[#2563EB]/10 border-[#2563EB]/20',
      text: 'text-[#2563EB]',
      icon: <Info className="h-4.5 w-4.5 text-[#2563EB] shrink-0 mt-0.5" />
    };
  };

  const handleTriggerScan = async () => {
    setScanLoading(true);
    try {
      await api.post('/chat/notifications/trigger');
      // Reload notifications
      const res = await api.get('/chat/notifications');
      setNotifications(res.data);
    } catch (err) {
      console.error("Failed to run manual budget check:", err);
      alert("Failed to execute proactive advisory scan.");
    } finally {
      setScanLoading(false);
    }
  };

  const fallbackNotifications = [
    { id: '1', title: 'Salary Credited', message: 'Projected monthly income of ₹1,20,000 has been verified and synced in the profile.', severity: 'info' as const, timestamp: new Date().toISOString() },
    { id: '2', title: 'Tax Saving Opportunity', message: 'You have only utilized 45% of Section 80C limits. Incremental ELSS deposits of ₹40,000 will save ₹12,000 in taxes.', severity: 'info' as const, timestamp: new Date(Date.now() - 3600000).toISOString() },
    { id: '3', title: 'Shopping Budget Alert', message: 'Discretionary spending is approaching the 90% threshold for the current cycle.', severity: 'warning' as const, timestamp: new Date(Date.now() - 7200000).toISOString() }
  ];

  const activeNotifications = notifications.length > 0 ? notifications : fallbackNotifications;

  return (
    <div className="space-y-6 pb-10">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-2">
            <Bell className="h-5 w-5 text-[#2563EB]" />
            Proactive Coaching & Alerts
          </h2>
          <p className="text-xs text-[#64748B] mt-1">
            Monitor auto-triggered financial alerts, budget warnings, and tax optimization suggestions.
          </p>
        </div>
        
        <button
          onClick={handleTriggerScan}
          disabled={scanLoading}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#2563EB] hover:bg-[#2563EB]/90 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all shrink-0"
        >
          {scanLoading ? (
            <Loader className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Trigger Advisory Scan
        </button>
      </div>

      {/* Notifications list */}
      <div className="space-y-4 animate-fade-in-up">
        {activeNotifications.map((note) => {
          const styles = getSeverityStyles(note.severity);
          return (
            <div 
              key={note.id} 
              className={`p-4 bg-white border border-[#E2E8F0] rounded-[24px] shadow-sm flex items-start gap-4 hover:shadow-md transition-all duration-300 relative overflow-hidden`}
            >
              {/* Left indicator vertical bar */}
              <div className={`absolute left-0 inset-y-0 w-1.5 ${note.severity === 'warning' ? 'bg-[#EF4444]' : 'bg-[#2563EB]'}`} />

              <div className="h-9 w-9 bg-[#F5F7FB] border border-[#E2E8F0] rounded-xl flex items-center justify-center shrink-0 shadow-sm">
                {styles.icon}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2 mb-1">
                  <h4 className="font-extrabold text-[#0F172A] text-xs uppercase tracking-wider">{note.title}</h4>
                  <span className="text-[9px] text-[#64748B] font-mono flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-[#64748B] leading-relaxed mt-1">{note.message}</p>

                {/* Simulated AI recommendations badge */}
                {note.title.toLowerCase().includes('tax') && (
                  <div className="mt-3 flex items-center gap-1 text-[9px] text-[#7C3AED] font-bold bg-[#7C3AED]/10 px-2 py-0.5 rounded-lg border border-[#7C3AED]/20 self-start w-fit">
                    <Sparkles className="h-3 w-3" /> OPTIMIZATION SUGGESTION
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Clear Coaching note */}
      <div className="bg-[#2563EB]/5 border border-[#2563EB]/15 rounded-[24px] p-5 flex items-start gap-4 shadow-sm">
        <div className="h-10 w-10 bg-white border border-[#E2E8F0] rounded-xl flex items-center justify-center shrink-0 shadow-sm">
          <CheckCircle className="h-5 w-5 text-[#22C55E]" />
        </div>
        <div>
          <h5 className="font-extrabold text-[#0F172A] text-xs">Advisory Summary</h5>
          <p className="text-[11px] text-[#64748B] mt-1.5 leading-relaxed">
            Your general liquidity index is stable. Follow the Section 80C recommendations to save on tax drawdowns before the next payroll cycle updates.
          </p>
        </div>
      </div>

    </div>
  );
};
