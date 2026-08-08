'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/store';
import Navbar from '@/components/Navbar';
import PatientBottomNav from '@/components/PatientBottomNav';
import ChatList from '@/components/ChatList';
import ChatPortal from '@/components/ChatPortal';
import { MessageSquare, ShieldCheck, Zap } from 'lucide-react';

export default function PatientChats() {
  const { user } = useAuthStore();
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleChatSelect = (chat: any) => {
    setSelectedChat(chat);
    setIsChatOpen(true);
  };

  return (
    <div className="min-h-svh bg-[#080C10] pb-28 lg:pb-8 flex flex-col">
      <Navbar />
      
      <div className="flex-1 max-w-2xl mx-auto w-full flex flex-col pt-6 px-4">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in px-2">
           <div>
              <h1 className="text-[28px] font-black text-white tracking-tight">Clinical Inbox</h1>
              <div className="flex items-center gap-2 mt-1">
                 <ShieldCheck size={14} className="text-primary/60" />
                 <p className="text-[12px] font-bold text-white/30 uppercase tracking-widest">End-to-End Encrypted</p>
              </div>
           </div>
           <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center text-white/20">
              <MessageSquare size={22} />
           </div>
        </div>

        {/* Global Chat Status */}
        <div className="bg-primary/5 border border-primary/10 rounded-3xl p-4 mb-6 flex items-center gap-4 animate-fade-in-up">
           <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(0,229,160,0.2)]">
              <Zap size={20} />
           </div>
           <div>
              <p className="text-[13px] font-black text-white uppercase tracking-wider">Sync Active</p>
              <p className="text-[11px] font-bold text-primary/60">Pulse-Response monitoring enabled</p>
           </div>
        </div>

        {/* The List */}
        <div className="flex-1 min-h-[500px] animate-fade-in-up delay-100">
           <ChatList 
             onChatSelect={handleChatSelect} 
             activeChatId={selectedChat?.id}
           />
        </div>
      </div>

      <PatientBottomNav />

      {/* Full Chat View */}
      {selectedChat && (
        <ChatPortal 
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          chatId={selectedChat.id}
          recipientName={selectedChat.doctorName}
          recipientRole="doctor"
        />
      )}
    </div>
  );
}