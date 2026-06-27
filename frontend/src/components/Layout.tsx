import React from 'react';
import { useStore } from '../store/useStore';
import { LayoutDashboard, Goal, LogOut, ShieldCheck, User } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { activePanel, setActivePanel, user, logout } = useStore();

  const menuItems = [
    { id: 'dashboard', label: 'CFO Dashboard', icon: <LayoutDashboard className="h-4.5 w-4.5" /> },
    { id: 'goals', label: 'Milestones', icon: <Goal className="h-4.5 w-4.5" /> }
  ];

  return (
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 flex flex-col">
      {/* Top Header */}
      <header className="bg-slate-900/50 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        {/* Brand */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-white text-lg tracking-wider">
            S
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white">Sophium</h1>
            <p className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase -mt-0.5">
              Your AI Personal CFO
            </p>
          </div>
        </div>

        {/* Navigation tabs for main panels */}
        <nav className="flex items-center gap-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActivePanel(item.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
                activePanel === item.id
                  ? 'bg-blue-600 text-white font-bold shadow shadow-blue-500/20'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-slate-850'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        {/* User profile action */}
        {user ? (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center border border-slate-750">
                <User className="h-4 w-4 text-blue-400" />
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-gray-200">{user.full_name}</p>
                <p className="text-[9px] text-gray-500 uppercase font-semibold">
                  {user.financial_risk_tolerance} Risk
                </p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-500/10 text-gray-400 hover:text-red-400 transition-colors border border-slate-750 cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[10px] text-gray-500 font-semibold bg-slate-900 px-3 py-1 rounded border border-slate-800">
            <ShieldCheck className="h-3.5 w-3.5 text-blue-500 animate-pulse" />
            SANDBOX MODE
          </div>
        )}
      </header>

      {/* Main Body Layout */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-900/60 bg-slate-950/40 text-center text-[10px] text-gray-600">
        Sophium Personal CFO • Built with Google ADK, Gemini Pro & Qdrant • Google Agent Labs 2026
      </footer>
    </div>
  );
};
