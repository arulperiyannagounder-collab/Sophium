import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import api from '../services/api';
import { 
  Send, 
  Sparkles, 
  Loader, 
  CheckCircle, 
  AlertTriangle, 
  Bot, 
  Zap
} from 'lucide-react';

export const ChatInterface: React.FC = () => {
  const { chatHistory, addChatMessage, setTelemetry, isLoading, setIsLoading } = useStore();
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isLoading]);

  const handleSubmit = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;
    
    // Add user message
    addChatMessage({ sender: 'user', text: textToSend });
    setInput('');
    setIsLoading(true);
    
    try {
      const response = await api.post('/chat', { message: textToSend });
      const { response: cfoResponse, telemetry: adkTelemetry } = response.data;
      
      setTelemetry(adkTelemetry);
      
      addChatMessage({
        sender: 'cfo',
        text: cfoResponse.text_recommendation,
        data_payload: cfoResponse.data_payload,
        telemetry: adkTelemetry
      });
      
    } catch (error) {
      console.error('Chat error:', error);
      addChatMessage({
        sender: 'cfo',
        text: 'Sorry, I encountered an issue analyzing your financial profiles. Please verify that the backend server is running.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSubmit(input);
    }
  };

  const promptTemplates = [
    "I want to buy a house in five years.",
    "What if I increase my monthly savings by ₹15,000?",
    "How does this impact my retirement goal?"
  ];

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-[24px] flex flex-col h-[600px] overflow-hidden shadow-sm">
      
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-[#2563EB] to-[#7C3AED] flex items-center justify-center shadow-md shadow-blue-500/10">
            <Bot className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h4 className="font-extrabold text-[#0F172A] text-xs uppercase tracking-wider flex items-center gap-1.5">
              AI Advisor Workspace
            </h4>
            <p className="text-[10px] text-[#64748B] mt-0.5">
              Active CFO agent pipeline synchronized with Qdrant vector-space memory.
            </p>
          </div>
        </div>
        <span className="text-[9px] text-[#2563EB] font-bold bg-[#2563EB]/10 px-2 py-0.5 rounded-full flex items-center gap-1 border border-[#2563EB]/20">
          <Zap className="h-2.5 w-2.5 animate-pulse" /> Active Pipeline
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#F5F7FB]/40">
        {chatHistory.map((msg, idx) => {
          const isUser = msg.sender === 'user';
          return (
            <div 
              key={idx} 
              className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {/* Bot Avatar */}
              {!isUser && (
                <div className="h-8 w-8 shrink-0 rounded-xl bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-[#E2E8F0] flex items-center justify-center font-bold text-xs text-[#2563EB]">
                  CFO
                </div>
              )}

              {/* Bubble */}
              <div className={`max-w-[80%] rounded-[20px] p-4 text-xs leading-relaxed ${
                isUser
                  ? 'bg-gradient-to-r from-[#2563EB] to-[#7C3AED] text-white font-medium shadow-md shadow-blue-500/5'
                  : 'bg-white text-[#0F172A] border border-[#E2E8F0] shadow-sm'
              }`}>
                <p className="whitespace-pre-line font-medium">{msg.text}</p>

                {/* Structured CFO Recommendation data payload */}
                {!isUser && msg.data_payload && (
                  <div className="mt-4 pt-4 border-t border-[#E2E8F0] space-y-4 text-[#0F172A]">
                    
                    {/* Confidence score */}
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-[#2563EB]">
                        CFO Projections Breakdown
                      </span>
                      <span className="text-[9px] font-extrabold text-[#22C55E] bg-[#22C55E]/10 border border-[#22C55E]/20 px-2.5 py-0.5 rounded-full font-mono">
                        {Math.round(msg.data_payload.confidence_score * 100)}% Confidence
                      </span>
                    </div>

                    {/* Rationale */}
                    {msg.data_payload.reasons && (
                      <div className="space-y-1.5">
                        <span className="text-[8px] text-[#64748B] uppercase tracking-wider block font-bold">Supporting Analysis</span>
                        <ul className="space-y-1.5">
                          {msg.data_payload.reasons.map((r: string, rIdx: number) => (
                            <li key={rIdx} className="flex items-start gap-2">
                              <CheckCircle className="h-4 w-4 text-[#22C55E] shrink-0 mt-0.5" />
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Supporting Facts */}
                    {msg.data_payload.supporting_facts && (
                      <div className="space-y-1.5">
                        <span className="text-[8px] text-[#64748B] uppercase tracking-wider block font-bold">Financial Facts Found</span>
                        <ul className="space-y-1.5">
                          {msg.data_payload.supporting_facts.map((sf: string, sfIdx: number) => (
                            <li key={sfIdx} className="flex items-start gap-2">
                              <Sparkles className="h-4 w-4 text-[#2563EB] shrink-0 mt-0.5" />
                              <span>{sf}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Risks warnings */}
                    {msg.data_payload.risks && msg.data_payload.risks.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-[8px] text-[#64748B] uppercase tracking-wider block font-bold">Risks & Constraints</span>
                        <ul className="space-y-1.5">
                          {msg.data_payload.risks.map((risk: string, rskIdx: number) => (
                            <li key={rskIdx} className="flex items-start gap-2 text-[#EF4444]">
                              <AlertTriangle className="h-4 w-4 text-[#EF4444] shrink-0 mt-0.5" />
                              <span>{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Alternative Recommendation */}
                    {msg.data_payload.alternative_recommendation && (
                      <div className="bg-[#F5F7FB] border border-[#E2E8F0] p-3 rounded-xl">
                        <span className="text-[8px] text-[#64748B] uppercase tracking-wider block mb-1 font-bold">
                          Alternative Scenario path
                        </span>
                        <p className="text-[#64748B] text-[11px] leading-relaxed">
                          {msg.data_payload.alternative_recommendation}
                        </p>
                      </div>
                    )}

                  </div>
                )}
              </div>

              {/* User Avatar */}
              {isUser && (
                <div className="h-8 w-8 shrink-0 rounded-xl bg-[#2563EB]/10 border border-[#E2E8F0] flex items-center justify-center font-bold text-xs text-[#2563EB]">
                  U
                </div>
              )}
            </div>
          );
        })}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="h-8 w-8 shrink-0 rounded-xl bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-[#E2E8F0] flex items-center justify-center font-bold text-xs text-[#2563EB]">
              CFO
            </div>
            <div className="bg-white border border-[#E2E8F0] rounded-[20px] p-4 text-xs text-[#64748B] flex items-center gap-2 shadow-sm">
              <Loader className="h-4.5 w-4.5 text-[#2563EB] animate-spin" />
              <span>CFO Multi-Agent pipeline orchestrating downstream simulations...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggested Prompts */}
      <div className="px-5 py-2.5 flex flex-wrap gap-2 border-t border-[#E2E8F0] bg-[#F8FAFC]">
        {promptTemplates.map((tmpl, idx) => (
          <button
            key={idx}
            onClick={() => handleSubmit(tmpl)}
            disabled={isLoading}
            className="text-[10px] bg-white text-[#64748B] hover:text-[#2563EB] border border-[#E2E8F0] px-3 py-1 rounded-xl transition-all disabled:opacity-50 cursor-pointer"
          >
            {tmpl}
          </button>
        ))}
      </div>

      {/* Message Input Box */}
      <div className="p-4 border-t border-[#E2E8F0] flex gap-2 bg-[#F8FAFC]">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="Ask CFO... (e.g. 'What if I increase monthly investments to ₹15,000?')"
          className="flex-1 bg-[#F5F7FB] border border-[#E2E8F0] rounded-xl px-4 py-2.5 text-xs text-[#0F172A] placeholder-gray-400 focus:outline-none focus:bg-white focus:border-[#2563EB] disabled:opacity-50"
        />
        <button
          onClick={() => handleSubmit(input)}
          disabled={!input.trim() || isLoading}
          className="px-4 bg-[#2563EB] hover:bg-[#2563EB]/90 disabled:bg-[#F1F5F9] text-white rounded-xl transition-all cursor-pointer disabled:cursor-not-allowed flex items-center justify-center shadow-md shadow-blue-500/10"
        >
          <Send className="h-4.5 w-4.5" />
        </button>
      </div>

    </div>
  );
};
