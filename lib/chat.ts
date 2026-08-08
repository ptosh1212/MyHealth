import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp, 
  setDoc, 
  doc, 
  getDocs,
  limit,
  updateDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { notifyNewMessage } from './whatsapp';

export interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: any;
  type: 'text' | 'system';
}

/**
 * Get or create a chat session between a patient and a doctor for a specific booking.
 */
export async function getOrCreateChat(bookingId: string, doctorId: string, userId: string, doctorName: string, userName: string) {
  const chatId = `chat_${bookingId}`;
  const chatRef = doc(db, 'chats', chatId);

  // TEMP DEBUG — remove once chat creation is confirmed working
  console.log('[getOrCreateChat] called with:', { bookingId, doctorId, userId, doctorName, userName, chatId });

  // Register the chat document if it doesn't exist
  await setDoc(chatRef, {
    chatId,
    bookingId,
    doctorId,
    userId,
    doctorName,
    userName,
    participants: [doctorId, userId],
    lastMessageAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }, { merge: true });

  // TEMP DEBUG — remove once chat creation is confirmed working
  console.log('[getOrCreateChat] setDoc completed for', chatId);

  return chatId;
}

/**
 * Send a message and trigger WhatsApp notification if sender is doctor.
 */
export async function sendMessage(
  chatId: string, 
  senderId: string, 
  senderName: string, 
  text: string, 
  recipientData?: { phone: string, name: string, isPatient: boolean, doctorName: string }
) {
  const messageData: ChatMessage = {
    senderId,
    senderName,
    text,
    createdAt: Timestamp.now(),
    type: 'text'
  };

  await addDoc(collection(db, 'chats', chatId, 'messages'), messageData);

  // FIX: was updateDoc() — threw "No document to update" whenever the parent
  // chats/{chatId} doc didn't exist yet (e.g. getOrCreateChat() was never
  // called for this chatId, or ran against a different id). setDoc with
  // merge:true creates the doc if missing and updates it if it already
  // exists, so a message can never fail to register on the parent chat.
  await setDoc(doc(db, 'chats', chatId), {
    lastMessage: text,
    lastMessageAt: Timestamp.now(),
    unreadCount: 1, // Simplified for now
  }, { merge: true });

  // If doctor sends a message, notify patient via WhatsApp
  if (recipientData && recipientData.isPatient && recipientData.phone) {
    try {
      await notifyNewMessage(
        recipientData.phone,
        recipientData.name,
        recipientData.doctorName,
        text
      );
    } catch (e) {
      console.error('Chat WhatsApp notify failed:', e);
    }
  }
}

/**
 * Listen for real-time messages.
 */
export function subscribeToMessages(chatId: string, callback: (messages: ChatMessage[]) => void) {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ChatMessage[];
    callback(messages);
  });
}

/**
 * Listen for all conversations for a specific user.
 */
export function subscribeToUserChats(userId: string, callback: (chats: any[]) => void) {
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', userId),
    orderBy('lastMessageAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const chats = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(chats);
  });
}