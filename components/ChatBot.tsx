
import React, { useState, useRef, useEffect } from 'react';
import { chatWithAI } from '../services/geminiService';
import { ChatMessage } from '../types';

interface Props {
  analysisData: any;
}

const ChatBot: React.FC<Props> = ({ analysisData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Hello! I am your AI Insight Assistant. Ask me anything about your customer sentiment report.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      // Inject data context into the first message or history if needed
      const contextMessage = `Context of the current analysis: ${JSON.stringify(analysisData)}. User asks: ${userMsg}`;
      
      let fullResponse = '';
      setMessages(prev => [...prev, { role: 'model', text: '', isThinking: true }]);
      
      const stream = chatWithAI(history, contextMessage);
      
      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = { role: 'model', text: fullResponse, isThinking: false };
          return newMsgs;
        });
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {isOpen ? (
        <div className="bg-white rounded-2xl shadow-2xl w-[400px] h-[550px] flex flex-col border border-slate-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center">
                <i className="fas fa-robot text-sm"></i>
              </div>
              <div>
                <h3 className="font-semibold text-sm">Insight Assistant</h3>
                <p className="text-[10px] text-indigo-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Gemini 3 Pro Active
                </p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-indigo-500 p-1 rounded transition-colors">
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-tl-none'
                }`}>
                  {msg.isThinking && (
                    <div className="flex items-center gap-2 text-indigo-500 mb-1">
                      <i className="fas fa-brain animate-pulse text-xs"></i>
                      <span className="text-[10px] font-semibold uppercase tracking-wider">Deep Analysis...</span>
                    </div>
                  )}
                  {msg.text || (msg.isThinking ? "Thinking deeply..." : "")}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask for deeper insights..."
              className="flex-1 bg-slate-100 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <i className="fas fa-paper-plane"></i>
            </button>
          </div>
        </div>
      ) : (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-all hover:scale-110 active:scale-95"
        >
          <i className="fas fa-comment-dots text-xl"></i>
        </button>
      )}
    </div>
  );
};

export default ChatBot;
