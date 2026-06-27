import React from 'react';
import { useStore } from '../store/useStore';
import { ShieldCheck, Cpu, Database, Network, Clock, CheckCircle2 } from 'lucide-react';

export const ObservabilityPanel: React.FC = () => {
  const { telemetry } = useStore();

  if (!telemetry) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-full flex flex-col justify-center items-center text-center">
        <Cpu className="h-10 w-10 text-slate-700 animate-pulse mb-3" />
        <h4 className="font-bold text-gray-400 text-sm">Agent Activity Telemetry</h4>
        <p className="text-[10px] text-gray-500 max-w-xs mt-1.5 leading-relaxed">
          Start a chat simulation (e.g., ask "what if I buy a house in five years?") to trace agent-to-agent reasoning pipelines in real-time.
        </p>
      </div>
    );
  }

  const durationSec = (telemetry.total_execution_time_ms / 1000).toFixed(2);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 h-full flex flex-col">
      {/* Header telemetry summary */}
      <div className="border-b border-slate-800/80 pb-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-bold text-gray-200 text-sm flex items-center gap-1.5">
            <Cpu className="h-4.5 w-4.5 text-blue-400" />
            Agent Activity Trace
          </h4>
          <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
            <ShieldCheck className="h-3 w-3" /> Live ADK
          </span>
        </div>
        
        {/* Core Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-slate-950 p-2 rounded border border-slate-850">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider block">Duration</span>
            <span className="text-xs font-bold text-blue-400 mt-1 flex items-center justify-center gap-0.5">
              <Clock className="h-3 w-3" /> {durationSec}s
            </span>
          </div>
          <div className="bg-slate-950 p-2 rounded border border-slate-850">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider block">Mem Reads</span>
            <span className="text-xs font-bold text-indigo-400 mt-1 flex items-center justify-center gap-0.5">
              <Database className="h-3 w-3" /> {telemetry.qdrant_memory_retrievals}
            </span>
          </div>
          <div className="bg-slate-950 p-2 rounded border border-slate-850">
            <span className="text-[9px] text-gray-500 uppercase tracking-wider block">RAG Hits</span>
            <span className="text-xs font-bold text-purple-400 mt-1 flex items-center justify-center gap-0.5">
              <Network className="h-3 w-3" /> {telemetry.qdrant_rag_hits}
            </span>
          </div>
        </div>
      </div>

      {/* Sequential Agents list */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-1">
        {telemetry.trace.map((step) => (
          <div key={step.step} className="relative pl-6 border-l border-slate-800 pb-1 group">
            {/* Step Check dot */}
            <div className="absolute -left-1.5 top-0.5 bg-slate-900 text-emerald-400 rounded-full border border-slate-800 group-hover:border-emerald-500 transition-colors">
              <CheckCircle2 className="h-3.5 w-3.5" />
            </div>

            {/* Agent block */}
            <div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-200 text-xs">{step.agent}</span>
                <span className="text-[10px] text-gray-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-850">
                  {step.execution_time_ms} ms
                </span>
              </div>
              <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">
                {step.action_taken}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
