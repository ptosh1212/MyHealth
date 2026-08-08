'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X, Send, ChevronLeft, MessageCircle,
  Clock, CheckCheck,
  Paperclip, Smile, Phone
} from 'lucide-react';
import { sendMessage, subscribeToMessages, ChatMessage } from '@/lib/chat';
import { useAuthStore } from '@/lib/store';

interface ChatPortalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  recipientName: string;
  recipientRole: 'doctor' | 'patient';
  recipientPhone?: string;
  doctorName?: string;
}

export default function ChatPortal({
  isOpen, onClose, chatId, recipientName, recipientRole, recipientPhone, doctorName
}: ChatPortalProps) {
  const { user, userRole } = useAuthStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && chatId) {
      const unsubscribe = subscribeToMessages(chatId, (newMessages) => {
        setMessages(newMessages);
        setTimeout(scrollToBottom, 100);
      });
      return () => unsubscribe();
    }
  }, [isOpen, chatId]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !user?.uid) return;

    const currentText = inputText;
    setInputText('');

    setLoading(true);
    try {
      const recipientData = recipientRole === 'patient' ? {
        phone: recipientPhone || '',
        name: recipientName,
        isPatient: true,
        doctorName: doctorName || 'Doctor'
      } : undefined;

      await sendMessage(chatId, user.uid, user.email?.split('@')[0] || 'User', currentText, recipientData);
    } catch (error) {
      console.error('Send error:', error);
      setInputText(currentText); // Restore on error
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Chat Container */}
      <div className="relative w-full sm:max-w-2xl h-full sm:h-[85vh] bg-white rounded-t-2xl sm:rounded-md border-t border-gray-200 sm:border sm:border-gray-200 shadow-sm flex flex-col animate-slide-up overflow-hidden">

        {/* ── HEADER ── */}
        <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100 bg-white z-20">
          <div className="flex items-center gap-4">
             <button onClick={onClose} className="sm:hidden w-9 h-9 rounded-full bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 active:scale-90 transition">
                <ChevronLeft size={20} />
             </button>

             <div className="relative">
                <div className="w-11 h-11 rounded-md bg-teal-50 flex items-center justify-center text-teal-700 border border-teal-200 font-semibold">
                   {recipientName[0].toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-teal-500 border-2 border-white" />
             </div>

             <div>
                <h3 className="text-[15px] font-semibold text-gray-900 leading-tight">{recipientName}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                   <div className="px-1.5 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-[10px] font-medium text-teal-700 capitalize">
                      {recipientRole}
                   </div>
                   <span className="text-[11px] font-medium text-gray-400">Secure channel</span>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-2">
             <button className="hidden sm:flex w-9 h-9 rounded-sm bg-gray-50 border border-gray-200 items-center justify-center text-gray-400 hover:text-gray-700 transition"><Phone size={16} /></button>
             <button onClick={onClose} className="w-9 h-9 rounded-sm bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-all">
                <X size={18} />
             </button>
          </div>
        </div>

        {/* ── MESSAGE THREAD ── */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar pb-12 bg-white relative z-10"
        >
           {messages.length === 0 ? (
             <div className="py-32 flex flex-col items-center text-center px-12">
                <div className="w-16 h-16 rounded-md bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-300 mb-6">
                   <MessageCircle size={28} />
                </div>
                <h4 className="text-[15px] font-semibold text-gray-400 leading-relaxed">
                    MyHealth clinical channel<br/>
                   <span className="text-[13px] font-medium text-gray-400">Start messaging Dr. {recipientName}</span>
                </h4>
             </div>
           ) : (
             messages.map((msg) => {
               const isMe = msg.senderId === user?.uid;
               return (
                 <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
                    <div className="flex items-center gap-2 mb-1.5">
                       {!isMe && <span className="text-[11px] font-medium text-gray-400">{msg.senderName}</span>}
                    </div>

                    <div className={`relative px-5 py-3 rounded-md max-w-[88%] text-[14px] font-normal leading-[1.6] transition-all ${
                      isMe
                      ? 'bg-teal-600 text-white rounded-tr-[4px]'
                      : 'bg-gray-100 text-gray-900 rounded-tl-[4px] border border-gray-200'
                    }`}>
                       {msg.text}
                    </div>

                    <div className="flex items-center gap-2 mt-2 px-1">
                       <span className="text-[11px] font-medium text-gray-400 tabular-nums">
                          {new Date(msg.createdAt?.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </span>
                       {isMe && <CheckCheck size={12} className="text-teal-500" />}
                    </div>
                 </div>
               );
             })
           )}
        </div>

        {/* ── INPUT HUB ── */}
        <div className="p-6 bg-white border-t border-gray-100 z-30">
           <form onSubmit={handleSend} className="flex items-end gap-3 max-w-4xl mx-auto">
              <div className="flex-1 relative">
                 <textarea
                   rows={1}
                   value={inputText}
                   onChange={(e) => setInputText(e.target.value)}
                   onKeyDown={(e) => {
                     if (e.key === 'Enter' && !e.shiftKey) {
                       e.preventDefault();
                       handleSend();
                     }
                   }}
                   placeholder="Write a message..."
                   className="w-full min-h-[52px] max-h-[150px] bg-gray-50 border border-gray-200 rounded-md pl-5 pr-12 py-3.5 text-[14px] text-gray-900 placeholder-gray-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:bg-white transition-all resize-none overflow-hidden"
                 />
                 <button type="button" className="absolute right-4 bottom-3.5 w-7 h-7 rounded-full flex items-center justify-center text-gray-300 hover:text-gray-500 transition">
                    <Smile size={18} />
                 </button>
              </div>

              <button
                type="submit"
                disabled={loading || !inputText.trim()}
                className="w-12 h-12 rounded-md bg-teal-600 hover:bg-teal-700 flex items-center justify-center text-white transition-all disabled:opacity-30 disabled:bg-gray-300 flex-shrink-0"
              >
                {loading ? (
                   <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                ) : (
                   <Send size={19} strokeWidth={2.5} />
                )}
              </button>
           </form>

           <div className="flex items-center justify-center gap-6 mt-4 text-gray-400">
              <button className="flex items-center gap-1.5 text-[11px] font-medium hover:text-gray-600 transition"><Paperclip size={12} /> Attach case</button>
              <div className="w-1 h-1 rounded-full bg-gray-300" />
              <button className="flex items-center gap-1.5 text-[11px] font-medium hover:text-gray-600 transition"><Clock size={12} /> Scheduled</button>
           </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
}