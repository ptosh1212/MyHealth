'use client';

import { useState, useEffect } from 'react';
import { 
  User, MessageCircle, Clock, ChevronRight, 
  Search, ShieldCheck, Zap, TrendingUp,
  Circle
} from 'lucide-react';
import { subscribeToUserChats } from '@/lib/chat';
import { useAuthStore } from '@/lib/store';
import { ListSkeleton } from './SkeletonLoader';

interface ChatListProps {
  onChatSelect: (chat: any) => void;
  activeChatId?: string;
}

export default function ChatList({ onChatSelect, activeChatId }: ChatListProps) {
  const { user, userRole } = useAuthStore();
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user?.uid) return;
    
    const unsubscribe = subscribeToUserChats(user.uid, (data) => {
      setChats(data);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [user?.uid]);

  const filteredChats = chats.filter(chat => {
    const name = userRole === 'patient' ? chat.doctorName : chat.userName;
    return name?.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (loading) return <div className="p-6"><ListSkeleton count={4} /></div>;

  return (
    <div className="flex flex-col h-full bg-transparent">
      
      {/* ── SEARCH & TOOLS ── */}
      <div className="px-6 py-4 space-y-4">
         <div className="relative group">
            <div className="absolute inset-0 bg-primary/5 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition duration-500" />
            <div className="relative flex items-center bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 h-[52px] group-focus-within:border-primary/40 transition-all">
               <Search size={18} className="text-white/20 group-focus-within:text-primary transition-colors" />
               <input 
                 type="text"
                 placeholder="Search contacts..."
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 className="flex-1 bg-transparent border-none focus:outline-none text-[14px] text-white placeholder-white/20 px-4 ml-1"
               />
            </div>
         </div>

         <div className="flex items-center gap-2 overflow-x-auto scroll-hide pb-2">
            {['All', 'Awaiting Pulse', 'Archive'].map((filter) => (
              <button key={filter} className="flex-shrink-0 px-4 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.05] text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white hover:bg-white/[0.08] transition-all">
                {filter}
              </button>
            ))}
         </div>
      </div>

      {/* ── CHAT THREADS ── */}
      <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-10">
         {filteredChats.length === 0 ? (
           <div className="py-20 flex flex-col items-center text-center px-10">
              <div className="w-16 h-16 rounded-[28px] bg-white/[0.02] border border-white/[0.05] flex items-center justify-center text-white/10 mb-5">
                 <Zap size={28} />
              </div>
              <p className="text-[14px] font-bold text-white/20 uppercase tracking-[2px]">No Active Threads</p>
              <p className="text-[12px] text-white/10 mt-2">Book a consultation to initiate secure clinical messaging.</p>
           </div>
         ) : (
           filteredChats.map((chat) => {
             const recipientName = userRole === 'patient' ? chat.doctorName : chat.userName;
             const isActive = activeChatId === chat.id;
             const timeStr = chat.lastMessageAt?.seconds 
                ? new Date(chat.lastMessageAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : 'Now';

             return (
               <button
                 key={chat.id}
                 onClick={() => onChatSelect(chat)}
                 className={`w-full group relative flex items-center gap-4 p-4 rounded-[28px] border transition-all duration-300 ${
                   isActive 
                   ? 'bg-primary/10 border-primary/30' 
                   : 'bg-transparent border-transparent hover:bg-white/[0.03] hover:border-white/[0.05]'
                 }`}
               >
                  {/* Identity Avatar */}
                  <div className="relative">
                     <div className={`w-14 h-14 rounded-[20px] flex items-center justify-center text-xl font-black transition-transform group-hover:scale-105 ${
                       userRole === 'patient' ? 'bg-primary/10 text-primary border border-primary/10' : 'bg-violet/10 text-violet border border-violet/10'
                     }`}>
                        {recipientName?.[0]?.toUpperCase()}
                     </div>
                     <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary border-2 border-[#0E1419] shadow-lg" />
                  </div>

                  {/* Preview Info */}
                  <div className="flex-1 text-left min-w-0">
                     <div className="flex items-center justify-between mb-0.5">
                        <p className={`text-[15px] font-black truncate transition-colors ${isActive ? 'text-primary' : 'text-white'}`}>
                          {userRole === 'patient' ? `Dr. ${recipientName}` : recipientName}
                        </p>
                        <span className="text-[10px] font-black text-white/20 uppercase tabular-nums">{timeStr}</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <p className={`text-[12px] font-medium truncate max-w-[180px] ${isActive ? 'text-white/60' : 'text-white/30'}`}>
                           {chat.lastMessage || 'Channel established. Send a diagnostic note.'}
                        </p>
                        {chat.unreadCount > 0 && !isActive && (
                           <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-black text-[#080C10] shadow-[0_0_10px_rgba(0,229,160,0.3)]">
                              {chat.unreadCount}
                           </div>
                        )}
                     </div>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                     <ChevronRight size={16} className="text-white/20" />
                  </div>
               </button>
             );
           })
         )}
      </div>

      <style>{`
        .scroll-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}