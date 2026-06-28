import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  full_name: string;
  monthly_income: number;
  financial_risk_tolerance: string;
  currency?: string;
  risk_profile?: string;
  country?: string;
  timezone?: string;
}

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  target_date: string;
  category: string;
  priority?: string;
}

export interface Transaction {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  is_recurring: boolean;
  type?: string;
  payment_method?: string;
  tags?: string;
  notes?: string;
}

export interface TelemetryStep {
  agent: string;
  step: number;
  execution_time_ms: number;
  action_taken: string;
}

export interface Telemetry {
  execution_times?: {
    total?: number;
    [key: string]: any;
  };
  steps?: {
    agent: string;
    thought: string;
    tool_call?: string;
  }[];
  total_execution_time_ms?: number;
  qdrant_memory_retrievals?: number;
  qdrant_rag_hits?: number;
  trace?: TelemetryStep[];
}

export interface ChatMessage {
  sender: 'user' | 'cfo';
  text: string;
  telemetry?: Telemetry;
  data_payload?: any;
}

export interface ProactiveNotification {
  id: string;
  title: string;
  message: string;
  severity: 'warning' | 'info';
  timestamp: string;
}
interface SophiumState {
  user: User | null;
  token: string | null;
  goals: Goal[];
  transactions: Transaction[];
  insights: any;
  telemetry: Telemetry | null;
  chatHistory: ChatMessage[];
  notifications: ProactiveNotification[];
  isLoading: boolean;
  activePanel: 'home' | 'chat' | 'financials' | 'goals' | 'twin' | 'simulator' | 'memory' | 'analytics' | 'notifications' | 'settings';
  theme: 'light' | 'dark';
  
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setGoals: (goals: Goal[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setInsights: (insights: any) => void;
  setTelemetry: (telemetry: Telemetry | null) => void;
  addChatMessage: (msg: ChatMessage) => void;
  setNotifications: (notes: ProactiveNotification[]) => void;
  setIsLoading: (val: boolean) => void;
  setActivePanel: (panel: 'home' | 'chat' | 'financials' | 'goals' | 'twin' | 'simulator' | 'memory' | 'analytics' | 'notifications' | 'settings') => void;
  setTheme: (theme: 'light' | 'dark') => void;
  logout: () => void;
}

// Bootstrap theme class on document.documentElement on first load
const initialTheme = localStorage.getItem('theme') as 'light' | 'dark' || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
if (initialTheme === 'dark') {
  document.documentElement.classList.add('dark');
} else {
  document.documentElement.classList.remove('dark');
}

export const useStore = create<SophiumState>((set) => ({
  user: null,
  token: localStorage.getItem('token'),
  goals: [],
  transactions: [],
  insights: null,
  telemetry: null,
  chatHistory: [
    { sender: 'cfo', text: "Hello! I am Sophium, your AI Personal CFO. Ask me anything about your budget, savings targets, or simulate 'what-if' projections." }
  ],
  notifications: [],
  isLoading: false,
  activePanel: 'home',
  theme: initialTheme,
  
  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
    set({ token });
  },
  setGoals: (goals) => set({ goals }),
  setTransactions: (transactions) => set({ transactions }),
  setInsights: (insights) => set({ insights }),
  setTelemetry: (telemetry) => set({ telemetry }),
  addChatMessage: (msg) => set((state) => ({ chatHistory: [...state.chatHistory, msg] })),
  setNotifications: (notifications) => set({ notifications }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setActivePanel: (activePanel) => set({ activePanel }),
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    set({ theme });
  },
  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, token: null, goals: [], transactions: [], insights: null, telemetry: null, notifications: [], chatHistory: [
      { sender: 'cfo', text: "Hello! I am Sophium, your AI Personal CFO. Ask me anything about your budget, savings targets, or simulate 'what-if' projections." }
    ] });
  }
}));
