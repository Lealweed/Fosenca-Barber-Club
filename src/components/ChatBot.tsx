import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { MessageSquare, X, Send, Loader2, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SYSTEM_INSTRUCTION = `Você é o assistente virtual da Fonseca Barber Club. 
Seu objetivo é ajudar os clientes com dúvidas sobre a barbearia e incentivá-los a agendar um horário via WhatsApp.
A barbearia oferece:
- Corte de Cabelo (Degradê, Social, etc.) - R$ 50
- Barba (Toalha quente, alinhamento) - R$ 40
- Combo (Corte + Barba) - R$ 80
- Ambiente: Cadeiras de couro, cerveja gelada, sinuca e música boa.
Localização: Rua das Barbearias, 123, Centro.
Horário: Seg-Sáb, 09h às 20h.

Sempre seja cordial, use um tom masculino e profissional. 
Se o usuário quiser agendar, forneça o link do WhatsApp: https://wa.me/5511999999999`;

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([
    { role: 'bot', text: 'Olá! Sou o assistente da Fonseca Barber Club. Como posso te ajudar hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: userMessage,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
        },
      });

      const botText = response.text || "Desculpe, tive um problema ao processar sua mensagem. Tente novamente ou nos chame no WhatsApp!";
      setMessages(prev => [...prev, { role: 'bot', text: botText }]);
    } catch (error) {
      console.error("ChatBot Error:", error);
      setMessages(prev => [...prev, { role: 'bot', text: "Ocorreu um erro. Por favor, tente nos contatar diretamente pelo WhatsApp." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 z-50 bg-gold p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center text-zinc-950"
        id="chatbot-trigger"
      >
        <Bot className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-[60] w-[90vw] sm:w-[400px] h-[500px] bg-zinc-900 border border-gold/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            id="chatbot-window"
          >
            {/* Header */}
            <div className="bg-zinc-800 p-4 border-b border-gold/20 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center">
                  <Bot className="w-5 h-5 text-zinc-950" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gold">Fonseca AI</h3>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Online</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-gold text-zinc-950 rounded-tr-none' 
                      : 'bg-zinc-800 text-zinc-100 border border-zinc-700 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800 p-3 rounded-2xl rounded-tl-none border border-zinc-700">
                    <Loader2 className="w-4 h-4 animate-spin text-gold" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-zinc-800 border-t border-gold/20">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Tire suas dúvidas..."
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gold transition-colors"
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading}
                  className="bg-gold text-zinc-950 p-2 rounded-lg hover:bg-gold/80 transition-colors disabled:opacity-50"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
