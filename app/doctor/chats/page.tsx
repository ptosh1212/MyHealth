'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/store';
import DoctorSidebar from '@/components/DoctorSidebar';
import ChatList from '@/components/ChatList';
import ChatPortal from '@/components/ChatPortal';
import {
  MessageSquare, ShieldCheck,
  Filter, User, Clock
} from 'lucide-react';

// ── Shared style tokens (flat, light, restrained) ───────────────────────────
const CARD = 'bg-white border border-slate-200';
const LABEL = 'text-[11px] font-semibold text-slate-400 uppercase tracking-wider';

export default function DoctorChats() {
  const { user } = useAuthStore();
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleChatSelect = (chat: any) => {
    setSelectedChat(chat);
    setIsChatOpen(true);
  };

  return (
    <div className="min-h-svh bg-white flex flex-col lg:flex-row">
      <DoctorSidebar />

      <main className="flex-1 lg:ml-64 px-4 sm:px-8 py-8 flex flex-col">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 mb-8 border-b border-slate-200">
           <div>
              <h1 className="text-[24px] font-semibold text-slate-900 flex items-center gap-3">
                 Clinical inbox
                 <span className="w-6 h-6 border border-slate-300 text-slate-500 flex items-center justify-center text-[12px] font-semibold">0</span>
              </h1>
              <div className="flex items-center gap-2 mt-2">
                 <ShieldCheck size={14} className="text-teal-700" />
                 <p className="text-[12px] font-semibold text-slate-400 uppercase tracking-wider">End-to-end secure channel</p>
              </div>
           </div>

           <div className={`${CARD} p-4 flex items-center gap-4`}>
              <div className="w-9 h-9 border border-slate-200 flex items-center justify-center text-slate-500">
                 <ShieldCheck size={18} />
              </div>
              <div>
                 <p className={LABEL}>Sync priority</p>
                 <p className="text-[14px] font-semibold text-slate-800">Emergency level 1</p>
              </div>
           </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">

           {/* Left: Chat List Panel */}
           <div className={`lg:col-span-5 xl:col-span-4 flex flex-col ${CARD} overflow-hidden`}>
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                 <h2 className="text-[12px] font-semibold text-slate-500 uppercase tracking-wider">Patient threads</h2>
                 <button className="text-slate-300 hover:text-slate-700 transition-colors"><Filter size={16} /></button>
              </div>
              <div className="flex-1 overflow-hidden">
                 <ChatList
                    onChatSelect={handleChatSelect}
                    activeChatId={selectedChat?.id}
                 />
              </div>
           </div>

           {/* Right: Empty State / Dashboard Info */}
           <div className="hidden lg:flex lg:col-span-7 xl:col-span-8 flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-200 p-12 text-center">

              <div className="max-w-sm">
                 <div className="w-16 h-16 border border-slate-200 bg-white flex items-center justify-center text-slate-300 mb-6 mx-auto">
                    <MessageSquare size={28} />
                 </div>
                 <h3 className="text-[17px] font-semibold text-slate-800 mb-2">Professional consultation hub</h3>
                 <p className="text-[13px] text-slate-500 leading-relaxed">
                    Maintain clinical standards in your responses. All messages are logged for compliance and emergency monitoring.
                 </p>

                 <div className="grid grid-cols-2 gap-3 mt-8">
                    <div className={`${CARD} p-4 text-left`}>
                       <Clock className="text-slate-400 mb-2" size={17} />
                       <p className={LABEL}>Avg response</p>
                       <p className="text-[15px] font-semibold text-slate-900">4m 12s</p>
                    </div>
                    <div className={`${CARD} p-4 text-left`}>
                       <User className="text-slate-400 mb-2" size={17} />
                       <p className={LABEL}>Active threads</p>
                       <p className="text-[15px] font-semibold text-slate-900">0 live</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>

      </main>

      {/* Global Chat Portal for Full View */}
      {selectedChat && (
        <ChatPortal
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          chatId={selectedChat.id}
          recipientName={selectedChat.userName}
          recipientRole="patient"
          recipientPhone={selectedChat.userPhone}
          doctorName={user?.email?.split('@')[0]}
        />
      )}
    </div>
  );
}