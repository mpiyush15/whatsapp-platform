"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CalendarCheck, 
  CreditCard, 
  MessageCircle, 
  Smartphone, 
  ArrowRight,
  ShieldCheck,
  Clock,
  Scissors,
  RefreshCw,
  X,
  Send,
  CheckCircle
} from 'lucide-react';
import Image from 'next/image';

const InteractiveChatModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [history, setHistory] = useState([{ sender: 'bot', text: "Hello! I am the AI Receptionist. How can I assist you today?", time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endOfMessagesRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (endOfMessagesRef.current) {
      endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history, isTyping]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = input.trim();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setHistory(prev => [...prev, { sender: 'user', text: userMessage, time: timeStr }]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      let reply = "I'm an AI demo agent for Replysys! In a live environment, I can understand complex queries, process intent, and sync directly with your salon's calendar software.";
      const lowerInput = userMessage.toLowerCase();
      
      if (lowerInput.match(/hi|hello|hey/)) {
        reply = "Hello there! Welcome to Replysys Salon. Are you looking to book an appointment or check our services?";
      } else if (lowerInput.match(/book|appointment|haircut|color|treatment|service/)) {
        reply = "I'd love to help you book that! What day and time were you thinking?";
      } else if (lowerInput.match(/today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|morning|afternoon|evening/)) {
        reply = "Perfect! I have availability then. To secure this slot, we require a quick ₹500 booking deposit. Shall I generate a secure payment link for you?";
      } else if (lowerInput.match(/yes|sure|ok|send|pay/)) {
        reply = "Awesome. Here is your secure payment link: https://pay.replysys.com/deposit-500 - Just reply 'done' once you've completed the payment!";
      } else if (lowerInput.match(/done|paid|completed/)) {
        reply = "Payment successfully verified! Your appointment is now fully confirmed. We look forward to pampering you! ✨";
      } else if (lowerInput.match(/price|cost|how much/)) {
        reply = "Our signature haircuts start at ₹1,500, and coloring starts at ₹3,000. Would you like me to find a time for a consultation?";
      }

      setHistory(prev => [...prev, { sender: 'bot', text: reply, time: botTime }]);
    }, 1200 + Math.random() * 800);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div 
          initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
          className="relative w-full max-w-[400px] h-[80vh] max-h-[700px] bg-black rounded-[40px] shadow-2xl border-[6px] border-black overflow-hidden flex flex-col font-sans"
          onClick={e => e.stopPropagation()}
        >
          {/* iPhone Notch */}
          <div className="absolute top-0 inset-x-0 h-6 bg-black z-30 rounded-b-2xl w-32 mx-auto flex items-center justify-center">
             <div className="w-16 h-4 bg-[#111] rounded-full mt-1"></div>
          </div>
          
          {/* Header */}
          <div className="bg-[#008069] text-white pt-8 pb-3 px-4 flex items-center gap-3 shrink-0 z-20 shadow-md">
            <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full transition-colors">
               <ArrowRight className="w-5 h-5 rotate-180" />
            </button>
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center overflow-hidden shrink-0">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 leading-tight">
              <h3 className="font-semibold text-[15px]">Virtual Concierge</h3>
              <p className="text-white/80 text-[11px]">{isTyping ? "typing..." : "online"}</p>
            </div>
            <button onClick={onClose} className="hover:bg-white/10 p-1 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Background */}
          <div className="flex-1 overflow-y-auto bg-[#EFEAE2] p-4 flex flex-col space-y-4 relative no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/arabesque.png")' }}></div>
            <style dangerouslySetInnerHTML={{__html: '.no-scrollbar::-webkit-scrollbar { display: none; }'}} />
            
            <div className="flex justify-center mb-2 z-10 mt-2">
              <div className="bg-white/80 text-[#54656f] text-[10px] uppercase px-3 py-1 rounded-md shadow-sm font-medium">Today</div>
            </div>

            {history.map((msg, i) => (
              <motion.div 
                key={i} initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
                className={`max-w-[85%] z-10 relative flex flex-col shadow-sm text-[14px] leading-relaxed ${msg.sender === 'bot' ? "bg-white text-[#111B21] rounded-xl rounded-tl-sm self-start" : "bg-[#D9FDD3] text-[#111B21] rounded-xl rounded-tr-sm self-end"}`}
              >
                <div className="px-3 pt-2 pb-6 break-words whitespace-pre-wrap">{msg.text}</div>
                <div className="absolute right-2 bottom-1 text-[10px] text-[#667781] flex items-center gap-1">
                  {msg.time}
                  {msg.sender === 'user' && <ShieldCheck className="w-3 h-3 text-[#53bdeb]" />}
                </div>
              </motion.div>
            ))}
            
            {isTyping && (
               <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-xl rounded-tl-sm self-start p-3 z-10 max-w-[85%] flex gap-1 items-center shadow-sm">
                 <span className="w-2 h-2 bg-[#8696A0] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                 <span className="w-2 h-2 bg-[#8696A0] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                 <span className="w-2 h-2 bg-[#8696A0] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
               </motion.div>
            )}
            <div ref={endOfMessagesRef} />
          </div>

          {/* Input Area */}
          <div className="bg-[#f0f2f5] p-3 shrink-0 z-20">
            <form onSubmit={handleSend} className="flex items-center gap-2">
              <div className="bg-white rounded-full flex items-center p-1 px-4 flex-1 border border-[#d1d7db] shadow-sm">
                <input 
                  type="text" 
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Type a message" 
                  className="w-full bg-transparent outline-none text-[#111B21] text-[15px] py-2"
                  autoFocus
                />
              </div>
              <button type="submit" disabled={!input.trim()} className={`p-3 rounded-full flex items-center justify-center transition-colors ${input.trim() ? 'bg-[#00A884] text-white hover:bg-[#008f6f]' : 'bg-[#d1d7db] text-white'}`}>
                 <Send className="w-5 h-5 ml-1" />
              </button>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const WhatsAppDemoChat = () => {
  const [history, setHistory] = useState([{ sender: 'bot', text: "Welcome! I am the Salon's Virtual Concierge. May I help you book your next experience?", time: "10:00 AM" }]);
  const [step, setStep] = useState(0);
  const [isTyping, setIsTyping] = useState(false);

  const steps = [
    { options: ["Yes, please!"] },
    {
      bot: "Wonderful. What service are you looking to indulge in today?",
      options: ["Signature Haircut", "Balayage Color", "Spa Treatment"]
    },
    {
      bot: "Perfect choice. When would you like to visit us?",
      options: ["Today, 3:00 PM", "Tomorrow, 10:00 AM", "Tomorrow, 5:00 PM"]
    },
    {
      bot: "Excellent. To secure your reservation, please complete the ₹500 booking deposit.",
      options: ["Pay Deposit securely"]
    },
    {
      bot: "Payment received. Your appointment is confirmed! We look forward to pampering you. ✨",
      options: []
    }
  ];

  const handleOptionClick = (optionText: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setHistory(prev => [...prev, { sender: 'user', text: optionText, time: timeStr }]);
    setIsTyping(true);
    
    setTimeout(() => {
      setIsTyping(false);
      const nextStep = step + 1;
      if (nextStep < steps.length && steps[nextStep].bot) {
        const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setHistory(prev => [...prev, { sender: 'bot', text: steps[nextStep].bot, time: botTime }]);
      }
      setStep(nextStep);
    }, 1500);
  };

  return (
    <div className="relative mx-auto w-full max-w-[280px] h-[550px] bg-black rounded-[40px] shadow-2xl border-[6px] border-black overflow-hidden flex flex-col font-sans z-10">
      {/* iPhone Notch */}
      <div className="absolute top-0 inset-x-0 h-5 bg-black z-30 rounded-b-2xl w-32 mx-auto"></div>
      
      {/* WhatsApp Header */}
      <div className="bg-[#008069] text-white pt-6 pb-2 px-3 flex items-center gap-2 shrink-0 z-20 shadow-md">
        <div className="flex items-center">
           <ArrowRight className="w-4 h-4 rotate-180" />
        </div>
        <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center overflow-hidden shrink-0">
          <MessageCircle className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 leading-tight">
          <h3 className="font-semibold text-[13px]">Virtual Concierge</h3>
          <p className="text-white/80 text-[10px]">
            {isTyping ? "typing..." : "online"}
          </p>
        </div>
      </div>
      
      {/* WhatsApp Chat Background */}
      <div className="flex-1 overflow-y-auto bg-[#EFEAE2] p-3 flex flex-col space-y-3 relative no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <div className="absolute inset-0 opacity-40 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/arabesque.png")' }}></div>
        <style dangerouslySetInnerHTML={{__html: `
          .no-scrollbar::-webkit-scrollbar { display: none; }
        `}} />
        
        {/* Date bubble */}
        <div className="flex justify-center mb-1 z-10 mt-2">
          <div className="bg-white/80 text-[#54656f] text-[9px] uppercase px-2 py-1 rounded-md shadow-sm">
            Today
          </div>
        </div>

        {history.map((msg, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className={`max-w-[85%] z-10 relative flex flex-col shadow-sm text-[13px] leading-relaxed ${
              msg.sender === 'bot' 
                ? "bg-white text-[#111B21] rounded-xl rounded-tl-sm self-start" 
                : "bg-[#D9FDD3] text-[#111B21] rounded-xl rounded-tr-sm self-end"
            }`}
          >
            <div className="px-3 pt-2 pb-6 break-words whitespace-pre-wrap">
              {msg.text}
            </div>
            <div className="absolute right-2 bottom-1 text-[10px] text-[#667781] flex items-center gap-1">
              {msg.time}
              {msg.sender === 'user' && (
                <ShieldCheck className="w-3 h-3 text-[#53bdeb]" /> // Simulated blue ticks
              )}
            </div>
          </motion.div>
        ))}
        
        {isTyping && (
           <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }}
             className="bg-white rounded-xl rounded-tl-sm self-start p-2 z-10 max-w-[85%] flex gap-1 items-center shadow-sm mb-2"
           >
             <span className="w-1.5 h-1.5 bg-[#8696A0] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
             <span className="w-1.5 h-1.5 bg-[#8696A0] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
             <span className="w-1.5 h-1.5 bg-[#8696A0] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
           </motion.div>
        )}
      </div>

      {/* WhatsApp Input/Options Area */}
      <div className="bg-[#f0f2f5] p-2 shrink-0 z-20 pb-4">
        {!isTyping && step < steps.length && steps[step].options.length > 0 ? (
          <div className="flex flex-col gap-2">
            <span className="text-center text-[9px] text-[#54656f] uppercase font-medium">Select an option</span>
            {steps[step].options.map((opt, j) => (
              <motion.button 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: j * 0.1 }}
                key={j}
                onClick={() => handleOptionClick(opt)}
                className="bg-white border border-[#d1d7db] text-[#008069] font-medium text-[13px] px-3 py-2 rounded-lg shadow-sm text-center w-full hover:bg-gray-50 transition-colors"
              >
                {opt}
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-full flex items-center p-2 border border-[#d1d7db]">
            <div className="text-[#8696A0] px-3 text-[12px]">Message</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function SalonLandingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1A1A1A] selection:bg-[#3b2f2f] selection:text-white font-sans overflow-x-hidden">
      <InteractiveChatModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      
      {/* 1. Hero Section (WhatsApp Business Match) */}
      <section className="relative min-h-screen bg-[#111b21] flex items-center pt-20 pb-24 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-20 w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
          
          <div className="lg:w-1/2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h1 className="text-5xl md:text-6xl lg:text-[4.5rem] font-bold tracking-tight mb-8 leading-[1.1] text-[#25D366]">
                Automate your <br/>salon bookings.
              </h1>
              
              <p className="text-xl md:text-2xl text-white max-w-xl mb-12 leading-relaxed">
                Drive AI-enabled customer engagement on WhatsApp with the platform trusted by top salons to eliminate no-shows and missed calls.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button 
                  onClick={() => setIsModalOpen(true)}
                  className="w-full sm:w-auto px-8 py-4 bg-[#25D366] hover:bg-[#1DA851] text-[#111b21] font-bold tracking-wide rounded-full text-[17px] flex items-center justify-center transition-colors shadow-2xl"
                >
                  Test the AI Demo
                </button>
                <button className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-gray-100 text-[#111b21] font-bold tracking-wide rounded-full text-[17px] flex items-center justify-center transition-colors">
                  Book a Consultation
                </button>
              </div>
            </motion.div>
          </div>

          <div className="lg:w-1/2 flex justify-center lg:justify-end w-full">
            <div 
              className="relative w-full max-w-[500px] h-[550px] cursor-pointer group hover:scale-[1.02] transition-transform duration-300"
              onClick={() => setIsModalOpen(true)}
            >
              {/* Main Image Container */}
              <div className="absolute inset-0 rounded-[40px] overflow-hidden z-10 shadow-2xl border-[6px] border-[#111b21]">
                 <Image 
                   src="/premium_salon_interior.png" 
                   alt="Luxurious Salon Interior" 
                   fill
                   className="object-cover object-center opacity-70"
                   priority
                 />
                 <div className="absolute inset-0 bg-[#111b21]/30"></div>
              </div>

              {/* Floating Salon Images */}
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity }} className="absolute -top-6 -left-6 w-20 h-20 rounded-full border-4 border-[#111b21] overflow-hidden z-20 shadow-xl">
                 <img src="https://images.unsplash.com/photo-1512496015851-a1c8ca92e477?auto=format&fit=crop&q=80&w=200" alt="Lashes" className="w-full h-full object-cover" />
              </motion.div>
              <motion.div animate={{ y: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity, delay: 1 }} className="absolute -bottom-4 -right-4 w-24 h-24 rounded-2xl rotate-6 border-4 border-[#111b21] overflow-hidden z-20 shadow-xl">
                 <img src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&q=80&w=200" alt="Brushes" className="w-full h-full object-cover" />
              </motion.div>
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 3.5, repeat: Infinity, delay: 2 }} className="absolute top-[30%] -right-8 w-16 h-16 rounded-full border-4 border-[#111b21] overflow-hidden z-20 shadow-xl">
                 <img src="https://images.unsplash.com/photo-1600948836101-f9ff5f58c70f?auto=format&fit=crop&q=80&w=200" alt="Color" className="w-full h-full object-cover" />
              </motion.div>

              {/* Fake Phone Outline Frame */}
              <div className="absolute top-[10%] bottom-[10%] left-[20%] right-[20%] border-[2px] border-white/60 rounded-[40px] z-20 pointer-events-none shadow-[0_0_15px_rgba(255,255,255,0.2)]"></div>

              {/* Floating Chat Bubbles */}
              <div className="absolute inset-0 z-30 flex flex-col justify-center space-y-8 pointer-events-none px-4">
                
                {/* User Message 1 */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="flex items-center gap-3 relative -left-8">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-[3px] border-white bg-gray-300 shrink-0 shadow-lg z-10">
                    <img src="https://i.pravatar.cc/100?img=5" alt="User" className="w-full h-full object-cover" />
                  </div>
                  <div className="bg-white text-[#111b21] px-5 py-3 rounded-3xl rounded-tl-sm text-[16px] font-medium shadow-2xl relative -left-4 z-0">
                    I need a haircut for tomorrow!
                  </div>
                </motion.div>

                {/* Bot Message 1 */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.0 }} className="flex justify-end relative -right-8">
                  <div className="bg-[#D9FDD3] text-[#111b21] px-5 py-3 rounded-3xl rounded-tr-sm text-[16px] font-medium shadow-2xl flex flex-col max-w-[300px]">
                    <span>Hello Anika, we have slots open at 2 PM.</span>
                    <span className="text-[10px] text-gray-500 font-bold self-end mt-1 tracking-wider flex items-center gap-1">AI <span className="text-[#25D366]">✨</span></span>
                  </div>
                </motion.div>

                {/* User Message 2 */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.8 }} className="flex items-center gap-3 relative -left-8">
                  <div className="w-12 h-12 rounded-full overflow-hidden border-[3px] border-white bg-gray-300 shrink-0 shadow-lg z-10">
                    <img src="https://i.pravatar.cc/100?img=5" alt="User" className="w-full h-full object-cover" />
                  </div>
                  <div className="bg-white text-[#111b21] px-5 py-3 rounded-3xl rounded-tl-sm text-[16px] font-medium shadow-2xl relative -left-4 z-0">
                    Love it, book me in!
                  </div>
                </motion.div>

                {/* Bot Message 2 */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 2.6 }} className="flex justify-end relative -right-8">
                  <div className="bg-[#D9FDD3] text-[#111b21] px-5 py-3 rounded-3xl rounded-tr-sm text-[16px] font-medium shadow-2xl flex flex-col max-w-[300px]">
                    <span>Great! Your booking #SX402 is confirmed.</span>
                    <span className="text-[10px] text-gray-500 font-bold self-end mt-1 tracking-wider flex items-center gap-1">AI <span className="text-[#25D366]">✨</span></span>
                  </div>
                </motion.div>
                
              </div>

              {/* Hover overlay for interactivity */}
              <div className="absolute inset-0 z-40 bg-[#111b21]/50 rounded-[40px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                <div className="bg-white text-[#111b21] font-semibold px-8 py-4 rounded-full shadow-2xl flex items-center gap-2 text-lg">
                  <MessageCircle className="w-6 h-6 text-[#25D366]" />
                  Click to Interact
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* 4. Trust Signals */}
      <section className="border-y border-[#E8E6DF] bg-[#F6F5F2] py-12">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-[#8b6d5c] text-xs font-bold mb-8 uppercase tracking-widest">Seamlessly Integrated With</p>
          <div className="flex flex-wrap justify-center items-center gap-16 opacity-80">
            <div className="flex items-center gap-3 text-xl font-serif text-[#1A1A1A]"><MessageCircle className="w-6 h-6"/> WhatsApp</div>
            <div className="flex items-center gap-3 text-xl font-serif text-[#1A1A1A]"><CalendarCheck className="w-6 h-6"/> Google</div>
            <div className="flex items-center gap-3 text-xl font-serif text-[#1A1A1A]"><CreditCard className="w-6 h-6"/> UPI</div>
          </div>
        </div>
      </section>

      {/* 2. Pain-Relief Context */}
      <section className="py-32 max-w-7xl mx-auto px-6">
        <div className="mb-20 md:w-2/3">
          <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-[#111b21] leading-[1.1]">
            More Bookings.<br/>
            <span className="text-[#25D366]">Zero Friction.</span>
          </h2>
          <p className="text-[#4a4a4a] text-2xl font-medium">Stop losing revenue to unanswered DMs. Let your AI Agent handle the bookings while your team focuses on the chair.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-12">
          {[
            {
              icon: <Clock className="w-10 h-10 text-[#25D366]" />,
              title: "Scale Without Overhead",
              desc: "Your AI Agent handles inquiries and books clients instantly—even when your team is busy. Grow your revenue without adding to your payroll."
            },
            {
              icon: <CreditCard className="w-10 h-10 text-[#25D366]" />,
              title: "Eliminate No-Shows",
              desc: "Secure every slot with automated UPI deposits directly in WhatsApp. If a client doesn’t pay, the slot stays open for someone who will."
            },
            {
              icon: <RefreshCw className="w-10 h-10 text-[#25D366]" />,
              title: "Waitlist Activation",
              desc: "Last-minute cancellation? Your Agent immediately texts your waitlist to fill the gap. Never let a chair sit empty again."
            }
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="bg-white border-2 border-[#E8E6DF] hover:border-[#25D366]/50 p-10 rounded-[30px] shadow-sm hover:shadow-xl transition-all group"
            >
              <div className="mb-8 transform group-hover:-translate-y-2 transition-transform duration-500">
                {feature.icon}
              </div>
              <h3 className="text-3xl font-bold tracking-tight text-[#111b21] mb-4">{feature.title}</h3>
              <p className="text-[#6a6a6a] leading-relaxed text-lg font-medium">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 3. How It Works */}
      <section className="py-32 bg-[#111b21] text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row gap-20 items-center">
            <div className="md:w-1/2">
              <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-10 leading-[1.1]">
                Plug & Play <br/>
                <span className="text-[#25D366]">Infrastructure.</span>
              </h2>
              <div className="space-y-12 mt-16">
                {[
                  { step: "01", title: "Connect", desc: "Link your salon's WhatsApp Business API in under 60 seconds." },
                  { step: "02", title: "Sync", desc: "Integrate your existing POS, calendar, and enterprise service menu." },
                  { step: "03", title: "Automate", desc: "Deploy your AI Agent to autonomously manage queries, take deposits, and close bookings." }
                ].map((s, i) => (
                  <div key={i} className="flex gap-8 group cursor-default">
                    <div className="text-3xl font-bold tracking-tight text-gray-500 group-hover:text-[#25D366] transition-colors">
                      {s.step}
                    </div>
                    <div>
                      <h4 className="text-3xl font-bold tracking-tight mb-3 text-white">{s.title}</h4>
                      <p className="text-gray-300 text-lg font-medium leading-relaxed max-w-sm">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="md:w-1/2 w-full flex justify-center relative">
               {/* Floating elements for salon vibe */}
               <motion.div animate={{ y: [0, 15, 0] }} transition={{ duration: 6, repeat: Infinity }} className="absolute top-10 -left-10 w-28 h-28 rounded-full border-8 border-[#111b21] overflow-hidden z-20 shadow-2xl hidden md:block">
                 <img src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=300" alt="Skincare" className="w-full h-full object-cover" />
               </motion.div>
               <motion.div animate={{ y: [0, -15, 0] }} transition={{ duration: 5, repeat: Infinity, delay: 2 }} className="absolute bottom-20 -right-10 w-32 h-32 rounded-3xl -rotate-6 border-8 border-[#111b21] overflow-hidden z-20 shadow-2xl hidden md:block">
                 <img src="https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&q=80&w=300" alt="Nails" className="w-full h-full object-cover" />
               </motion.div>

               <div className="relative w-full max-w-md aspect-[4/5] bg-[#111b21] rounded-t-full flex items-end justify-center overflow-hidden border-8 border-white/10 shadow-2xl z-10">
                  <Image 
                    src="/premium_salon_interior.png"
                    alt="Salon Ambience"
                    fill
                    className="object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111b21] to-transparent opacity-100"></div>
                  <div className="relative z-10 pb-16 text-center">
                    <Smartphone className="w-16 h-16 text-[#25D366] mx-auto mb-6" />
                    <p className="font-bold tracking-tight text-2xl text-white">Always Available.</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI Agents Distinction Section */}
      <section className="py-40 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h2 className="text-6xl md:text-[7rem] font-bold text-[#111b21] leading-[0.95] tracking-tight mb-12">
            Stop Losing Customers.<br />
            <span className="text-[#25D366]">To Generic Bots.</span>
          </h2>
          <p className="text-2xl md:text-4xl text-[#111b21] max-w-4xl mx-auto font-bold tracking-tight leading-snug">
            Most chatbots just send automated replies. Replysys AI Agents close the deal.
          </p>
          <p className="text-xl md:text-2xl text-[#4a4a4a] max-w-3xl mx-auto font-medium mt-8 mb-12 leading-relaxed">
            From managing complex schedules to securing deposits, our agents act like your best receptionist—working 24/7 to turn conversations into confirmed, paid appointments.
          </p>
          <div className="flex justify-center">
            <button 
              onClick={() => setIsModalOpen(true)}
              className="px-10 py-5 bg-[#111b21] hover:bg-black text-white font-bold tracking-wide rounded-full text-xl flex items-center justify-center gap-3 transition-transform hover:scale-105 shadow-xl"
            >
              <MessageCircle className="w-6 h-6 text-[#25D366]" />
              See the AI in Action
            </button>
          </div>
        </div>
      </section>

      {/* 5. Interactive Demo Section */}
      <section className="py-40 bg-[#FDFBF7]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16">
          <div className="lg:w-1/2 text-left relative z-10">
            <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-8 text-[#111b21] leading-tight">
              Try the AI Agent <br />
              <span className="text-[#25D366]">for Yourself.</span>
            </h2>
            <p className="text-2xl text-[#4a4a4a] mb-12 font-medium">
              Scan the QR code with your phone to start a real WhatsApp conversation. See how the AI manages a booking, answers questions, and confirms appointments in seconds.
            </p>
            
            <div className="flex flex-col md:flex-row items-start gap-12 relative">
              <div className="flex flex-col items-center md:items-start text-center md:text-left">
                <div className="bg-white rounded-3xl p-6 inline-block mb-4 shadow-xl border border-[#E8E6DF] relative z-10">
                  <div className="w-48 h-48 bg-[#FDFBF7] rounded-2xl flex items-center justify-center flex-col gap-3 border border-[#E8E6DF]">
                    <Smartphone className="w-12 h-12 text-[#25D366]" />
                    <span className="text-[#111b21] font-bold text-sm uppercase px-4 tracking-widest">Scan to Demo</span>
                  </div>
                </div>
                <p className="text-sm font-bold text-gray-500 max-w-[240px]">
                  No sign-up required. Instantly experience the client's booking journey.
                </p>
              </div>

              {/* Arrow pointing right (desktop only) */}
              <div className="hidden xl:block absolute top-[25%] left-[260px] text-[#25D366]">
                <svg width="60" height="40" viewBox="0 0 100 50" className="opacity-80">
                  <path d="M0,25 Q40,5 90,25" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="6,6" />
                  <polygon points="90,20 100,25 90,30" fill="currentColor" />
                </svg>
              </div>

              <div className="flex flex-col gap-8 mt-2">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#D9FDD3] flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                    <MessageCircle className="w-5 h-5 text-[#25D366]" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-[#111b21]">See the "Instant Reply"</h4>
                    <p className="text-gray-500 font-medium mt-1 leading-snug max-w-[250px]">Watch how the agent answers service queries immediately.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#D9FDD3] flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                    <CalendarCheck className="w-5 h-5 text-[#25D366]" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-[#111b21]">Experience "Smart Booking"</h4>
                    <p className="text-gray-500 font-medium mt-1 leading-snug max-w-[250px]">See how easy it is for clients to pick a time and confirm.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#D9FDD3] flex items-center justify-center flex-shrink-0 mt-1 shadow-sm">
                    <CheckCircle className="w-5 h-5 text-[#25D366]" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-[#111b21]">Check the "Closing"</h4>
                    <p className="text-gray-500 font-medium mt-1 leading-snug max-w-[250px]">Watch it generate a professional booking confirmation instantly.</p>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
          
          <div className="lg:w-1/2 w-full relative flex justify-center lg:justify-end mt-16 lg:mt-0">
            <WhatsAppDemoChat />
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-[#111b21] py-16 text-center">
        <p className="text-gray-400 font-bold tracking-tight text-xl">© 2026 Replysys. The Art of Automation.</p>
      </footer>
    </div>
  );
}
