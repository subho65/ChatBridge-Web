import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { User } from 'lucide-react';
import { format } from 'date-fns';
import Skeleton from '../ui/Skeleton'; // Import Skeleton

export default function ChatList({ currentUser, onSelectChat, activeChatId }) {
    const [chats, setChats] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser?.id) return;

        const q = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', currentUser.id)
        );

        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort: Newest First
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
                    <div key={i} className="flex items-center gap-3 p-3 border-b border-[#222d34] opacity-60">
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
                <div className="p-8 text-center text-[#8696a0] text-sm">
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

// Sub-component
function ChatListItem({ chat, currentUserId, isActive, onSelect }) {
    const [otherUser, setOtherUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);
    const otherId = chat.participants.find(id => id !== currentUserId);

    useEffect(() => {
        if (!otherId) return;
        const fetchUser = async () => {
            const snap = await getDoc(doc(db, 'users', otherId));
            if (snap.exists()) setOtherUser(snap.data());
            setLoadingUser(false);
        };
        fetchUser();
    }, [otherId]);

    const handleClick = () => {
        if (otherUser) onSelect(chat.id, otherUser);
    };

    // Small skeleton for individual row if user data is slow
    if (loadingUser) {
        return (
            <div className="flex items-center gap-3 p-3 border-b border-[#222d34]">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-full" />
                </div>
            </div>
        );
    }

    const displayName = otherUser ? otherUser.name : otherId;
    const time = chat.lastUpdated ? format(chat.lastUpdated.toDate(), 'HH:mm') : '';

    return (
        <div
            onClick={handleClick}
            className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-[#202c33] transition border-b border-[#222d34] ${isActive ? 'bg-[#2a3942]' : ''}`}
        >
            {otherUser?.avatar ? (
                <img src={otherUser.avatar} className="w-12 h-12 rounded-full object-cover bg-gray-600" alt="Avatar" />
            ) : (
                <div className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center"><User className="text-white" /></div>
            )}

            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                    <h3 className="text-[#e9edef] font-medium truncate text-[17px]">{displayName}</h3>
                    <span className="text-xs text-[#8696a0]">{time}</span>
                </div>
                <p className="text-sm text-[#8696a0] truncate">
                    {chat.lastMessageText || 'Start chatting'}
                </p>
            </div>
        </div>
    );
}