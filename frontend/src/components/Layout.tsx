import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { 
  LayoutDashboard, 
  Bot, 
  Landmark, 
  Goal, 
  Brain, 
  Sliders, 
  Cpu, 
  BarChart3, 
  Bell, 
  Settings, 
  LogOut, 
  Menu, 
  Search, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { activePanel, setActivePanel, user, logout, notifications } = useStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuItems = [
    { id: 'home', label: 'Home Workspace', icon: <LayoutDashboard className="h-4.5 w-4.5" /> },
    { id: 'chat', label: 'AI Advisor Workspace', icon: <Bot className="h-4.5 w-4.5" /> },
    { id: 'financials', label: 'Financial Hub', icon: <Landmark className="h-4.5 w-4.5" /> },
    { id: 'goals', label: 'Milestone Planner', icon: <Goal className="h-4.5 w-4.5" /> },
    { id: 'twin', label: 'Digital Twin Projections', icon: <Cpu className="h-4.5 w-4.5" /> },
    { id: 'simulator', label: 'What-If Simulator', icon: <Sliders className="h-4.5 w-4.5" /> },
    { id: 'memory', label: 'Memory Explorer', icon: <Brain className="h-4.5 w-4.5" /> },
    { id: 'analytics', label: 'Advanced Analytics', icon: <BarChart3 className="h-4.5 w-4.5" /> },
    { id: 'notifications', label: 'Coaching Alerts', icon: <Bell className="h-4.5 w-4.5" /> },
    { id: 'settings', label: 'Profile & Settings', icon: <Settings className="h-4.5 w-4.5" /> },
  ];

  const unreadNotifications = notifications.length;

  return (
    <div className="min-h-screen bg-[#F5F7FB] text-[#1E293B] font-sans flex overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-[#0F172A]/30 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex flex-col bg-white/70 backdrop-blur-md border-r border-[#E2E8F0] transition-all duration-300 lg:static ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'w-20' : 'w-64'}`}
      >
        {/* Brand Logo */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-[#E2E8F0]">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="h-9 w-9 shrink-0 bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] rounded-xl flex items-center justify-center font-black text-white text-xl shadow-md shadow-blue-500/20">
              S
            </div>
            {!isCollapsed && (
              <div className="flex flex-col">
                <span className="font-black text-sm tracking-tight text-[#0F172A] leading-none">Sophium</span>
                <span className="text-[9px] text-[#7C3AED] font-extrabold tracking-wider uppercase mt-1">AI CFO OS</span>
              </div>
            )}
          </div>
          
          {/* Collapse Toggle Desktop */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-1.5 rounded-xl hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] transition-colors cursor-pointer"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = activePanel === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActivePanel(item.id as any);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative group cursor-pointer ${
                  isActive 
                    ? 'bg-gradient-to-r from-[#2563EB]/10 to-[#7C3AED]/10 text-[#2563EB] border-l-4 border-[#2563EB]' 
                    : 'text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9]/60'
                }`}
                title={isCollapsed ? item.label : undefined}
              >
                <div className={`transition-colors shrink-0 ${isActive ? 'text-[#2563EB]' : 'text-[#64748B] group-hover:text-[#0F172A]'}`}>
                  {item.icon}
                </div>
                {!isCollapsed && <span>{item.label}</span>}
                {isActive && !isCollapsed && (
                  <div className="absolute right-3 h-1.5 w-1.5 bg-[#2563EB] rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Card */}
        {user && (
          <div className="p-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-[#2563EB]/10 to-[#7C3AED]/10 border border-[#E2E8F0] flex items-center justify-center font-bold text-xs text-[#2563EB]">
                {user.full_name.charAt(0)}
              </div>
              {!isCollapsed && (
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-extrabold text-[#0F172A] truncate leading-none">{user.full_name}</p>
                  <p className="text-[9px] text-[#7C3AED] uppercase font-bold tracking-wider mt-1 truncate">
                    {user.risk_profile || 'Moderate'} Risk
                  </p>
                </div>
              )}
              {!isCollapsed && (
                <button
                  onClick={logout}
                  className="p-2 rounded-xl hover:bg-red-50 text-[#64748B] hover:text-[#EF4444] transition-colors cursor-pointer"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              )}
            </div>
            {isCollapsed && (
              <button
                onClick={logout}
                className="w-full mt-3 py-2 flex justify-center rounded-xl hover:bg-red-50 text-[#64748B] hover:text-[#EF4444] transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            )}
          </div>
        )}
      </aside>

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header */}
        <header className="h-16 px-6 bg-white/70 backdrop-blur-md border-b border-[#E2E8F0] flex items-center justify-between sticky top-0 z-30 shrink-0">
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-xl hover:bg-[#F1F5F9] text-[#64748B] lg:hidden cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Quick search */}
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#64748B]" />
              <input 
                type="text" 
                placeholder="Search ledger sheets, parameters, vector indices..." 
                className="w-64 pl-9 pr-4 py-1.5 bg-[#F1F5F9] border border-transparent rounded-xl text-xs text-[#0F172A] placeholder-[#64748B]/60 focus:outline-none focus:bg-white focus:border-[#2563EB] transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-white border border-[#E2E8F0] rounded-xl px-3 py-1 text-[10px] text-[#64748B] font-bold shadow-sm">
              <TrendingUp className="h-3.5 w-3.5 text-[#22C55E]" />
              <span>ACTIVE SAAS OS</span>
            </div>

            {/* Notifications Bell */}
            <button 
              onClick={() => setActivePanel('notifications')}
              className="p-2 rounded-xl hover:bg-[#F1F5F9] text-[#64748B] hover:text-[#0F172A] transition-colors relative cursor-pointer"
            >
              <Bell className="h-4.5 w-4.5" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-[#EF4444] rounded-full ring-2 ring-white" />
              )}
            </button>

            {/* Ask CFO shortcut */}
            <button 
              onClick={() => setActivePanel('chat')}
              className="px-3.5 py-1.5 bg-[#2563EB] hover:bg-[#2563EB]/90 text-white rounded-xl text-[10px] font-extrabold tracking-wide uppercase transition-all shadow-md shadow-blue-500/10 cursor-pointer"
            >
              CFO Workspace
            </button>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          <div className="w-full h-full max-w-[1600px] mx-auto animate-fade-in">
            {children}
          </div>
        </main>

        {/* Commercial Footer */}
        <footer className="h-10 px-6 bg-white/40 border-t border-[#E2E8F0] flex items-center justify-between text-[9px] text-[#64748B]/60 shrink-0">
          <span>Sophium OS Platform &copy; 2026. All rights reserved.</span>
          <span>Google ADK & Qdrant Connected</span>
        </footer>
      </div>

    </div>
  );
};
