import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import Skeleton from '../ui/Skeleton';

export default function ChatList({ currentUser, onSelectChat, activeChatId }) {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser?.id) return;

        // Query chats where I am a participant
        const q = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', currentUser.id)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Sort Client-side (Newest First)
            list.sort((a, b) => {
                const tA = a.lastUpdated?.seconds || 0;
                const tB = b.lastUpdated?.seconds || 0;
                return tB - tA;
            });

            setChats(list);
            setLoading(false);
        });

        return () => unsub();
    }, [currentUser.id]);

    // --- SKELETON LOADING STATE ---
    if (loading) {
        return (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {[...Array(10)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 border-b border-[var(--border-color)] opacity-60">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <div className="flex justify-between">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-10" />
                            </div>
                            <Skeleton className="h-3 w-48" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {chats.length === 0 ? (
                <div className="p-8 text-center text-[var(--text-secondary)] text-sm">
                    <p>No chats yet.</p>
                    <p>Click the <b>+</b> icon to start.</p>
                </div>
            ) : (
                chats.map(chat => (
                    <ChatListItem
                        key={chat.id}
                        chat={chat}
                        currentUserId={currentUser.id}
                        isActive={activeChatId === chat.id}
                        onSelect={(id, user) => onSelectChat(id, user)}
                    />
                ))
            )}
        </div>
    );
}

// --- SUB COMPONENT FOR INDIVIDUAL ROW ---
function ChatListItem({ chat, currentUserId, isActive, onSelect }) {
    const [otherUser, setOtherUser] = useState(null);
    const [unreadCount, setUnreadCount] = useState(0); // State for Green Badge
    const otherId = chat.participants.find(id => id !== currentUserId);

    // 1. Fetch User Details
    useEffect(() => {
        if (!otherId) return;
        const fetchUser = async () => {
            const snap = await getDoc(doc(db, 'users', otherId));
            if (snap.exists()) setOtherUser(snap.data());
        };
        fetchUser();
    }, [otherId]);

    // 2. Real-time Unread Count Listener
    useEffect(() => {
        // Query ALL unread messages in this chat
        const q = query(
            collection(db, 'chats', chat.id, 'messages'),
            where('read', '==', false)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            // Filter in JS: Count only messages sent by the OTHER person
            // (We don't want to count our own sent messages as unread)
            const count = snapshot.docs.filter(doc => doc.data().senderId !== currentUserId).length;
            setUnreadCount(count);
        });

        return () => unsub();
    }, [chat.id, currentUserId]);

    const handleClick = () => {
        if (otherUser) onSelect(chat.id, otherUser);
    };

    // Placeholder while loading user
    if (!otherUser) return null;

    const displayName = otherUser.name || otherId;
    const time = chat.lastUpdated ? format(chat.lastUpdated.toDate(), 'HH:mm') : '';

    return (
        <div
            onClick={handleClick}
            className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-[var(--bg-hover)] transition border-b border-[var(--border-color)] ${isActive ? 'bg-[var(--bg-hover)]' : ''}`}
        >
            {/* Avatar */}
            <div className="relative">
                {otherUser.avatar ? (
                    <img src={otherUser.avatar} className="w-12 h-12 rounded-full object-cover bg-gray-600" alt="Avatar" />
                ) : (
                    <div className="w-12 h-12 bg-gray-500 rounded-full flex items-center justify-center"><User className="text-white" /></div>
                )}
            </div>

            {/* Chat Info */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                    <h3 className="text-[var(--text-primary)] font-medium truncate text-[17px]">{displayName}</h3>

                    {/* Time (Green if unread) */}
                    <span className={`text-xs ${unreadCount > 0 ? 'text-[#25d366] font-bold' : 'text-[var(--text-secondary)]'}`}>
                        {time}
                    </span>
                </div>

                <div className="flex justify-between items-center">
                    <p className="text-sm text-[var(--text-secondary)] truncate flex-1 pr-2">
                        {chat.lastMessageText || 'Start chatting'}
                    </p>

                    {/* GREEN UNREAD BADGE */}
                    {unreadCount > 0 && (
                        <div className="min-w-[20px] h-5 rounded-full bg-[#25d366] flex items-center justify-center px-1.5 animate-bounce-in">
                            <span className="text-[#0c1317] text-[10px] font-bold">{unreadCount}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}