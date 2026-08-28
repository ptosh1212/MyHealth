'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  ChevronLeft,
  MessageCircle,
  Clock,
  CheckCheck,
  Paperclip,
  Smile,
  Phone,
} from 'lucide-react';

import {
  sendMessage,
  subscribeToMessages,
  ChatMessage,
} from '@/lib/chat';

import { useAuthStore } from '@/lib/store';

interface ChatPortalProps {
  isOpen: boolean;
  onClose: () => void;

  appointmentId?: string;

  chatId: string;
  recipientName: string;
  recipientRole: 'doctor' | 'patient';

  recipientPhone?: string;
  doctorName?: string;
}

export default function ChatPortal({
  isOpen,
  onClose,
  appointmentId,
  chatId,
  recipientName,
  recipientRole,
  recipientPhone,
  doctorName,
}: ChatPortalProps) {
  const { user } = useAuthStore();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !chatId) {
      return;
    }

    const unsubscribe = subscribeToMessages(chatId, (newMessages) => {
      setMessages(newMessages);

      setTimeout(() => {
        scrollToBottom();
      }, 100);
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, chatId]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!inputText.trim() || !user?.uid || loading) {
      return;
    }

    const currentText = inputText.trim();

    setInputText('');
    setLoading(true);

    try {
      const recipientData =
        recipientRole === 'patient'
          ? {
              phone: recipientPhone || '',
              name: recipientName,
              isPatient: true,
              doctorName: doctorName || 'Doctor',
            }
          : undefined;

      await sendMessage(
        chatId,
        user.uid,
        user.email?.split('@')[0] || 'User',
        currentText,
        recipientData
      );
    } catch (error) {
      console.error('Send error:', error);
      setInputText(currentText);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[150] flex items-end justify-center overflow-hidden p-0 sm:items-center sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Chat Container */}
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-t-2xl border-t border-gray-200 bg-white shadow-sm sm:h-[85vh] sm:max-w-2xl sm:rounded-md sm:border">
        {/* Header */}
        <div className="z-20 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-5">
          <div className="flex items-center gap-4">
            {/* Mobile Back */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-400 transition active:scale-90 sm:hidden"
              aria-label="Close chat"
            >
              <ChevronLeft size={20} />
            </button>

            {/* Avatar */}
            <div className="relative">
              <div className="flex h-11 w-11 items-center justify-center rounded-md border border-teal-200 bg-teal-50 font-semibold text-teal-700">
                {recipientName?.charAt(0)?.toUpperCase() || '?'}
              </div>

              <div className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-teal-500" />
            </div>

            {/* Name */}
            <div>
              <h3 className="text-[15px] font-semibold leading-tight text-gray-900">
                {recipientName}
              </h3>

              <div className="mt-1 flex items-center gap-1.5">
                <div className="rounded-md border border-teal-200 bg-teal-50 px-1.5 py-0.5 text-[10px] font-medium capitalize text-teal-700">
                  {recipientRole}
                </div>

                <span className="text-[11px] font-medium text-gray-400">
                  Secure channel
                </span>
              </div>
            </div>
          </div>

          {/* Header Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="hidden h-9 w-9 items-center justify-center rounded-sm border border-gray-200 bg-gray-50 text-gray-400 transition hover:text-gray-700 sm:flex"
              aria-label="Call"
            >
              <Phone size={16} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-sm border border-gray-200 bg-gray-50 text-gray-400 transition-all hover:text-gray-700"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Message Thread */}
        <div
          ref={scrollRef}
          className="custom-scrollbar relative z-10 flex-1 space-y-6 overflow-y-auto bg-white p-6 pb-12"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center px-12 py-32 text-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-300">
                <MessageCircle size={28} />
              </div>

              <h4 className="text-[15px] font-semibold leading-relaxed text-gray-400">
                MyHealth clinical channel
                <br />

                <span className="text-[13px] font-medium text-gray-400">
                  Start messaging {recipientRole === 'doctor' ? 'Dr. ' : ''}
                  {recipientName}
                </span>
              </h4>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderId === user?.uid;

              const createdAt =
                msg.createdAt?.seconds
                  ? new Date(msg.createdAt.seconds * 1000)
                  : new Date();

              return (
                <div
                  key={msg.id}
                  className={`group flex flex-col ${
                    isMe ? 'items-end' : 'items-start'
                  }`}
                >
                  {/* Sender */}
                  <div className="mb-1.5 flex items-center gap-2">
                    {!isMe && (
                      <span className="text-[11px] font-medium text-gray-400">
                        {msg.senderName}
                      </span>
                    )}
                  </div>

                  {/* Message */}
                  <div
                    className={`relative max-w-[88%] rounded-md px-5 py-3 text-[14px] font-normal leading-[1.6] transition-all ${
                      isMe
                        ? 'rounded-tr-[4px] bg-teal-600 text-white'
                        : 'rounded-tl-[4px] border border-gray-200 bg-gray-100 text-gray-900'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Time */}
                  <div className="mt-2 flex items-center gap-2 px-1">
                    <span className="tabular-nums text-[11px] font-medium text-gray-400">
                      {createdAt.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    {isMe && (
                      <CheckCheck
                        size={12}
                        className="text-teal-500"
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input */}
        <div className="z-30 border-t border-gray-100 bg-white p-6">
          <form
            onSubmit={handleSend}
            className="mx-auto flex max-w-4xl items-end gap-3"
          >
            <div className="relative flex-1">
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
                className="min-h-[52px] max-h-[150px] w-full resize-none overflow-hidden rounded-md border border-gray-200 bg-gray-50 py-3.5 pl-5 pr-12 text-[14px] text-gray-900 placeholder-gray-400 transition-all focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
              />

              <button
                type="button"
                className="absolute bottom-3.5 right-4 flex h-7 w-7 items-center justify-center rounded-full text-gray-300 transition hover:text-gray-500"
                aria-label="Emoji"
              >
                <Smile size={18} />
              </button>
            </div>

            {/* Send */}
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-md bg-teal-600 text-white transition-all hover:bg-teal-700 disabled:bg-gray-300 disabled:opacity-30"
              aria-label="Send message"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Send
                  size={19}
                  strokeWidth={2.5}
                />
              )}
            </button>
          </form>

          {/* Bottom Actions */}
          <div className="mt-4 flex items-center justify-center gap-6 text-gray-400">
            <button
              type="button"
              className="flex items-center gap-1.5 text-[11px] font-medium transition hover:text-gray-600"
            >
              <Paperclip size={12} />
              Attach case
            </button>

            <div className="h-1 w-1 rounded-full bg-gray-300" />

            <button
              type="button"
              className="flex items-center gap-1.5 text-[11px] font-medium transition hover:text-gray-600"
            >
              <Clock size={12} />
              Scheduled
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}