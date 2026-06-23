import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Loader2, BookOpen, Quote, HelpCircle } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function P2PAdvisor() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Hello! I am your Singapore P2P (Purchase-to-Pay) Consulting Expert. I can assist you with local cash flow planning, accounts payable strategy, bank remittance rails (FAST vs GIRO), negotiating supplier credit terms, or Singapore GST validation. How can I help your SME today?",
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Quick prompt questions
  const RECOMMENDED_PROMPTS = [
    {
      label: "FAST vs GIRO Payment Limits",
      text: "What are the transaction limits, delay schedules, and best business practices for Singapore FAST bank transfers versus GIRO bulk batch routing?",
    },
    {
      label: "Negotiate Credit Terms",
      text: "How can our logistics SME negotiate supplier credit terms from COD (Cash on Delivery) to Net 30 or Net 60 days to improve cash-flow?",
    },
    {
      label: "Validate GST in Invoices",
      text: "What are the rules for validating Singapore GST (currently 9%) on invoices? How can we verify the supplier is registered with IRAS before transferring funds?",
    },
    {
      label: "Resolving Supplier Disputes",
      text: "What is the standard accounts payable protocol to handle a supplier invoice dispute due to short shipment or damaged cargo under Singapore carriage laws?",
    },
  ];

  // Auto scroll down in chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = { role: "user", content: textToSend };
    const updatedMessages = [...messages, userMsg];
    
    setMessages(updatedMessages);
    setInputMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/gemini/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!response.ok) {
        throw new Error("Advisor response error " + response.status);
      }

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.text }]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Apologies, I encountered an error communicating with the P2P Advisory core. Please secure your Gemini credentials or check network connectivity.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="advisor-tab">
      {/* Informative Side Panel */}
      <div className="lg:col-span-4 space-y-4" id="advisor-ref-panel">
        <div className="bg-slate-900 text-slate-100 rounded-lg p-5 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-semibold tracking-wide uppercase">CA Singapore Reference</h3>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            According to Singapore IRAS (Inland Revenue Authority of Singapore) guidelines and SMA best practice frameworks:
          </p>
          <ul className="space-y-2.5 text-[11.5px] text-slate-300">
            <li className="flex items-start gap-1.5">
              <span className="text-cyan-400 font-bold font-mono">1.</span>
              <span>
                <strong>Corporate PayNow</strong>: Settles instantly up to SGD 200k via UEN. Best for immediate strategic dispatch payments.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-cyan-400 font-bold font-mono">2.</span>
              <span>
                <strong>FAST Remittance</strong>: Near real-time bank ledger transfer, validated via standard SWIFT bank routing codes.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-cyan-400 font-bold font-mono">3.</span>
              <span>
                <strong>GST Compliance Check</strong>: Always check supplier GST registration on IRAS portal to prevent legal tax refund claims rejection.
              </span>
            </li>
          </ul>
        </div>

        {/* Quick query list */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 space-y-2.5" id="suggested-queries-card">
          <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-wider">Suggested SME Inquiries</span>
          <div className="flex flex-col gap-2">
            {RECOMMENDED_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(prompt.text)}
                className="w-full text-left p-2.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100/60 hover:border-slate-200 text-xs text-slate-700 transition-all font-medium flex items-start gap-1.5 cursor-pointer"
              >
                <HelpCircle className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span>{prompt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="lg:col-span-8 bg-white rounded-lg border border-slate-200 flex flex-col h-[580px] justify-between shadow-xs" id="chat-workspace">
        {/* Chat Title */}
        <div className="border-b border-slate-100 p-4 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 text-cyan-400 p-1.5 rounded-md">
              <Bot className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">P2P Treasury AI Advisor</h3>
              <p className="text-[10.5px] text-slate-500 font-medium">Chartered Accountant Consulting Framework</p>
            </div>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Gemini 3.5-flash live</span>
        </div>

        {/* Chat Message Lists */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" id="chat-scroller">
          {messages.map((m, index) => {
            const isUser = m.role === "user";
            return (
              <div key={index} className={`flex gap-3 max-w-[85%] ${isUser ? "ml-auto flex-row-reverse" : ""}`}>
                <div
                  className={`p-2 rounded-full h-8 w-8 shrink-0 flex items-center justify-center border ${
                    isUser ? "bg-slate-900 border-slate-800 text-white" : "bg-slate-100 border-slate-200 text-slate-700"
                  }`}
                >
                  {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                <div
                  className={`p-3.5 rounded-lg text-xs leading-relaxed whitespace-pre-wrap ${
                    isUser
                      ? "bg-slate-900 text-slate-100 font-medium"
                      : "bg-slate-50 border border-slate-150 text-slate-800 font-sans"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            );
          })}
          {loading && (
            <div className="flex gap-3 max-w-[80%]">
              <div className="p-2 rounded-full h-8 w-8 shrink-0 flex items-center justify-center bg-slate-100 border border-slate-200">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-slate-50 border border-slate-150 p-3 rounded-lg text-slate-400 text-xs flex items-center gap-2 font-medium">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Formulating P2P strategy advice...</span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputMessage);
          }}
          className="border-t border-slate-100 p-3 bg-slate-50/50 flex gap-2 items-center"
          id="chat-input-form"
        >
          <input
            type="text"
            value={inputMessage}
            disabled={loading}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Ask about FAST transfer schedules, prompt payment negotiation, GIRO setup..."
            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-hidden focus:border-slate-500 placeholder-slate-400"
          />
          <button
            type="submit"
            disabled={loading || !inputMessage.trim()}
            className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white p-2 w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
            id="chat-send-btn"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
