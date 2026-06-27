import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../store/useStore';
import api from '../services/api';
import { Send, Sparkles, Loader, CheckCircle, AlertTriangle } from 'lucide-react';

export const ChatInterface: React.FC = () => {
  const { chatHistory, addChatMessage, setTelemetry, isLoading, setIsLoading } = useStore();
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
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
      const { response: cfoResponse, telemetry } = response.data;
      
      // Update telemetry
      setTelemetry(telemetry);
      
      // Add CFO message
      addChatMessage({
        sender: 'cfo',
        text: cfoResponse.text_recommendation,
        data_payload: cfoResponse.data_payload,
        telemetry: telemetry
      });
      
    } catch (error) {
      console.error('Chat error:', error);
      addChatMessage({
        sender: 'cfo',
        text: 'Sorry, I encountered an issue analyzing your financial profiles. Please ensure the backend is running and seeded.'
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

  // Quick prompt triggers
  const promptTemplates = [
    "I want to buy a house in five years.",
    "What if I increase my monthly savings to ₹15,000?",
    "How does this impact my retirement goal?"
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-[550px]">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-800/80 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-gray-200 text-sm flex items-center gap-1.5">
            <Sparkles className="h-4.5 w-4.5 text-blue-400 animate-pulse" />
            Sophium CFO Console
          </h4>
          <p className="text-[10px] text-gray-500 mt-0.5">
            Multi-Agent pipeline simulator powered by Google ADK & Gemini
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4">
        {chatHistory.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] rounded-xl p-4 text-xs leading-relaxed ${
              msg.sender === 'user'
                ? 'bg-blue-600 text-white font-medium shadow-sm'
                : 'bg-slate-950 text-gray-300 border border-slate-850'
            }`}>
              {/* Message text */}
              <p>{msg.text}</p>

              {/* Structured XAI recommendation if data payload is present */}
              {msg.sender === 'cfo' && msg.data_payload && (
                <div className="mt-4 pt-4 border-t border-slate-850 space-y-3.5">
                  
                  {/* Top line with confidence score */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400">
                      Recommendation Breakdown
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      {Math.round(msg.data_payload.confidence_score * 100)}% Confidence
                    </span>
                  </div>

                  {/* Reasons list */}
                  {msg.data_payload.reasons && (
                    <div className="space-y-1.5">
                      <span className="text-[9px] text-gray-500 uppercase tracking-wider block">Rationale</span>
                      <ul className="space-y-1">
                        {msg.data_payload.reasons.map((r: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5 text-gray-300">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Supporting Facts */}
                  {msg.data_payload.supporting_facts && (
                    <div className="space-y-1.5">
                      <span className="text-[9px] text-gray-500 uppercase tracking-wider block">Supporting Facts</span>
                      <ul className="space-y-1">
                        {msg.data_payload.supporting_facts.map((sf: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5 text-gray-300">
                            <Sparkles className="h-3.5 w-3.5 text-blue-400 shrink-0 mt-0.5" />
                            <span>{sf}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Risks */}
                  {msg.data_payload.risks && (
                    <div className="space-y-1.5">
                      <span className="text-[9px] text-gray-500 uppercase tracking-wider block">Risks & Constraints</span>
                      <ul className="space-y-1">
                        {msg.data_payload.risks.map((risk: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-1.5 text-yellow-400/90">
                            <AlertTriangle className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />
                            <span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Alternative path */}
                  {msg.data_payload.alternative_recommendation && (
                    <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                      <span className="text-[9px] text-gray-500 uppercase tracking-wider block mb-1">
                        Alternative Approach
                      </span>
                      <p className="text-gray-400 text-[11px] leading-relaxed">
                        {msg.data_payload.alternative_recommendation}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 text-xs text-gray-500 flex items-center gap-2">
              <Loader className="h-4.5 w-4.5 text-blue-400 animate-spin" />
              <span>Coordinator Agent orchestrating downstream pipeline...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Quick Prompts */}
      <div className="px-5 py-2 flex flex-wrap gap-2 border-t border-slate-800/40">
        {promptTemplates.map((tmpl, idx) => (
          <button
            key={idx}
            onClick={() => handleSubmit(tmpl)}
            disabled={isLoading}
            className="text-[10px] bg-slate-950 hover:bg-slate-850 text-gray-400 hover:text-gray-200 border border-slate-850 px-2.5 py-1 rounded transition-colors disabled:opacity-50 cursor-pointer"
          >
            {tmpl}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-slate-800/80 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="Ask CFO... (e.g. 'What if I invest ₹10,000 monthly?')"
          className="flex-1 bg-slate-950 border border-slate-850 rounded-lg px-4 py-2.5 text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:border-blue-500 disabled:opacity-50"
        />
        <button
          onClick={() => handleSubmit(input)}
          disabled={!input.trim() || isLoading}
          className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
