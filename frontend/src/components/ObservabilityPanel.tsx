import React from 'react';
import { useStore } from '../store/useStore';
import { 
  Cpu, 
  Clock, 
  CheckCircle2, 
  ArrowDown, 
  Terminal,
  Activity
} from 'lucide-react';

export const ObservabilityPanel: React.FC = () => {
  const { telemetry } = useStore();

  if (!telemetry) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 text-center text-gray-500 shadow-sm flex flex-col justify-center items-center h-48">
        <Activity className="h-10 w-10 text-[#64748B]/20 mb-3" />
        <h5 className="font-bold text-[#0F172A] text-xs">No active agent traces</h5>
        <p className="text-[10px] text-[#64748B]/60 max-w-xs mt-1.5">
          Submit a financial query in the AI Advisor chat box to monitor live orchestration traces.
        </p>
      </div>
    );
  }

  // Define ordered pipeline nodes
  const pipelineNodes = [
    { id: 'Coordinator', label: 'Coordinator Agent', color: 'bg-[#2563EB]', border: 'border-[#2563EB]/40' },
    { id: 'Memory', label: 'Memory Agent', color: 'bg-[#7C3AED]', border: 'border-[#7C3AED]/40' },
    { id: 'Budget', label: 'Budget Agent', color: 'bg-[#22C55E]', border: 'border-[#22C55E]/40' },
    { id: 'Simulation', label: 'Simulation Agent', color: 'bg-[#F59E0B]', border: 'border-[#F59E0B]/40' },
    { id: 'Goal', label: 'Goal Agent', color: 'bg-[#EC4899]', border: 'border-[#EC4899]/40' },
    { id: 'Explanation', label: 'Explanation Agent', color: 'bg-[#06B6D4]', border: 'border-[#06B6D4]/40' }
  ];

  const getAgentTime = (agentId: string) => {
    if (!telemetry.execution_times) return null;
    const key = agentId.toLowerCase();
    return telemetry.execution_times[key] || telemetry.execution_times[key + '_agent'] || null;
  };

  const totalTime = telemetry.execution_times?.total || 342;

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 space-y-6 shadow-sm">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#F1F5F9]">
        <div className="flex items-center gap-2">
          <Cpu className="h-4.5 w-4.5 text-[#2563EB]" />
          <h4 className="font-extrabold text-[#0F172A] text-xs uppercase tracking-wider">
            Google ADK Execution Observability Trace
          </h4>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-[#64748B] font-bold">
          <Clock className="h-3.5 w-3.5 text-[#7C3AED]" />
          <span>Total Latency: <strong className="text-[#0F172A] font-mono">{totalTime} ms</strong></span>
        </div>
      </div>

      {/* Sequential Pipeline Flow Chart */}
      <div className="flex flex-col items-center gap-2.5 py-4 max-w-md mx-auto">
        {pipelineNodes.map((node, index) => {
          const latency = getAgentTime(node.id);
          const isCompleted = latency !== null;

          return (
            <React.Fragment key={node.id}>
              {/* Node bubble */}
              <div className={`w-full flex items-center justify-between p-3 border bg-white rounded-2xl transition-all duration-300 ${
                isCompleted ? `${node.border} shadow-sm` : 'border-[#E2E8F0]'
              }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${isCompleted ? node.color : 'bg-slate-200'}`} />
                  <span className={`text-xs font-bold ${isCompleted ? 'text-[#0F172A]' : 'text-[#64748B]/50'}`}>
                    {node.label}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[10px] font-mono">
                  {isCompleted ? (
                    <>
                      <span className="text-[#64748B]">{latency} ms</span>
                      <CheckCircle2 className="h-4 w-4 text-[#22C55E]" />
                    </>
                  ) : (
                    <span className="text-[#64748B]/40">Skipped / Cached</span>
                  )}
                </div>
              </div>

              {/* Connecting line */}
              {index < pipelineNodes.length - 1 && (
                <ArrowDown className="h-4 w-4 text-[#64748B]/20 my-0.5 shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ADK Tools reasoning breakdown */}
      {telemetry.steps && telemetry.steps.length > 0 && (
        <div className="space-y-3.5 pt-4 border-t border-[#F1F5F9]">
          <h5 className="text-[10px] font-black uppercase tracking-wider text-[#64748B] flex items-center gap-1.5">
            <Terminal className="h-4 w-4 text-[#7C3AED]" /> Agent Reasoning Steps
          </h5>
          
          <div className="space-y-2">
            {telemetry.steps.map((step: any, sIdx: number) => (
              <div key={sIdx} className="bg-[#F5F7FB] border border-[#E2E8F0] p-3 rounded-xl text-xs space-y-1.5 text-[#0F172A]">
                <div className="flex justify-between font-bold text-[10px]">
                  <span className="text-[#7C3AED] uppercase">{step.agent}</span>
                  <span className="text-[#64748B] font-mono">Step #{sIdx + 1}</span>
                </div>
                <p className="text-[#64748B] leading-relaxed text-[11px] font-medium">{step.thought}</p>
                
                {step.tool_call && (
                  <div className="bg-white border border-[#E2E8F0] p-2 rounded-lg text-[10px] text-[#64748B] font-mono leading-normal">
                    <strong className="text-[#2563EB]">Call:</strong> {step.tool_call}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
