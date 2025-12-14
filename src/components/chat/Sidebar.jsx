import React, { useState } from 'react';
import { useUser } from '../../context/UserContext';
import ChatList from './ChatList';
import SettingsDrawer from '../settings/SettingsDrawer';
import {
    LogOut, MessageSquarePlus, MoreVertical, Search, User,
    ArrowLeft, Camera, Edit2, Loader2
} from 'lucide-react';
import { doc, setDoc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';

export default function Sidebar({ currentUser, onSelectChat, activeChatId, onLogout }) {
    const [activeDrawer, setActiveDrawer] = useState(null); // 'profile' | 'new_chat' | 'settings'
    const [showMenu, setShowMenu] = useState(false); // Controls the 3-dot dropdown

    // Start Chat Logic
    const handleStartChat = async (targetPhone) => {
        if (!targetPhone) return;
        const cleanTarget = targetPhone.replace(/\D/g, '');

        if (cleanTarget === currentUser.id) return alert("Cannot chat with yourself.");

        try {
            const userDoc = await getDoc(doc(db, 'users', cleanTarget));
            if (!userDoc.exists()) return alert("User not registered on ChatBridge.");

            const targetUser = userDoc.data();
            const chatId = [currentUser.id, cleanTarget].sort().join('_');

            await setDoc(doc(db, 'chats', chatId), {
                participants: [currentUser.id, cleanTarget],
                lastUpdated: serverTimestamp(),
                lastMessageText: "Chat started"
            }, { merge: true });

            onSelectChat(chatId, targetUser);
            setActiveDrawer(null);
        } catch (err) {
            console.error(err);
            alert("Error creating chat");
        }
    };

    // Helper to update user locally and reload (needed for Settings Drawer)
    const handleUserUpdate = (updatedUser) => {
        // Ensure we use the same key as App.jsx
        const storageKey = localStorage.getItem('wa_user_v11') ? 'wa_user_v11' : 'wa_user_v10';
        localStorage.setItem(storageKey, JSON.stringify(updatedUser));
        window.location.reload();
    };

    return (
        <div className="flex flex-col h-full w-full relative overflow-hidden bg-[var(--bg-sidebar)] border-r border-[var(--border-color)]">

            {/* Sidebar Header */}
            <div className="h-16 bg-[var(--bg-panel)] flex items-center justify-between px-4 shrink-0 z-20">
                <img
                    src={currentUser.avatar}
                    onClick={() => setActiveDrawer('profile')}
                    className="w-10 h-10 rounded-full object-cover cursor-pointer hover:opacity-80 transition"
                    alt="Profile"
                />

                <div className="flex gap-4 text-[#aebac1] relative">
                    <button onClick={() => setActiveDrawer('new_chat')} title="New Chat">
                        <MessageSquarePlus size={22} />
                    </button>

                    {/* --- THE THREE DOTS BUTTON --- */}
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        title="Menu"
                        className={`rounded-full p-1 transition ${showMenu ? 'bg-[var(--bg-hover)] text-[var(--text-primary)]' : ''}`}
                    >
                        <MoreVertical size={22} />
                    </button>

                    {/* --- DROPDOWN MENU --- */}
                    {showMenu && (
                        <div className="absolute right-0 top-10 bg-[var(--bg-panel)] shadow-xl rounded-lg py-2 w-48 z-50 border border-[var(--border-color)] animate-fade-in">
                            <button
                                onClick={() => { setActiveDrawer('new_chat'); setShowMenu(false); }}
                                className="w-full text-left px-4 py-3 hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
                            >
                                New chat
                            </button>
                            <button
                                onClick={() => { setActiveDrawer('settings'); setShowMenu(false); }}
                                className="w-full text-left px-4 py-3 hover:bg-[var(--bg-hover)] text-[var(--text-primary)]"
                            >
                                Settings
                            </button>
                            <div className="border-t border-[var(--border-color)] my-1"></div>
                            <button
                                onClick={onLogout}
                                className="w-full text-left px-4 py-3 hover:bg-[var(--bg-hover)] text-red-400"
                            >
                                Log out
                            </button>
                        </div>
                    )}

                    {/* Transparent overlay to close menu when clicking outside */}
                    {showMenu && (
                        <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>
                    )}
                </div>
            </div>

            {/* Search Bar */}
            <div className="p-2 border-b border-[var(--border-color)]">
                <div className="bg-[var(--bg-panel)] rounded-lg flex items-center px-4 py-1.5">
                    <Search size={18} className="text-[#8696a0]" />
                    <input
                        placeholder="Search or start new chat"
                        className="bg-transparent border-none outline-none text-sm ml-4 w-full text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
                    />
                </div>
            </div>

            {/* Chat List */}
            <ChatList
                currentUser={currentUser}
                activeChatId={activeChatId}
                onSelectChat={onSelectChat}
            />

            {/* --- DRAWERS --- */}

            {/* Profile Drawer */}
            {activeDrawer === 'profile' && (
                <ProfileDrawer
                    user={currentUser}
                    onClose={() => setActiveDrawer(null)}
                    onUpdateUser={handleUserUpdate}
                />
            )}

            {/* New Chat Drawer */}
            {activeDrawer === 'new_chat' && (
                <NewChatDrawer
                    onClose={() => setActiveDrawer(null)}
                    onStartChat={handleStartChat}
                />
            )}

            {/* Settings Drawer - THIS WAS FIXED */}
            {activeDrawer === 'settings' && (
                <SettingsDrawer
                    onClose={() => setActiveDrawer(null)}
                    currentUser={currentUser}
                    onUpdateUser={handleUserUpdate}
                />
            )}
        </div>
    );
}

// --- SUB-COMPONENTS ---

function ProfileDrawer({ user, onClose, onUpdateUser }) {
    const [name, setName] = useState(user.name);
    const [loading, setLoading] = useState(false);

    const handleSaveName = async () => {
        if (!name.trim()) return;
        await updateDoc(doc(db, 'users', user.id), { name });
        if (onUpdateUser) onUpdateUser({ ...user, name });
        else window.location.reload();
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setLoading(true);
        try {
            const storageRef = ref(storage, `avatars/${user.id}_${Date.now()}`);
            await uploadBytesResumable(storageRef, file);
            const url = await getDownloadURL(storageRef);
            await updateDoc(doc(db, 'users', user.id), { avatar: url });

            if (onUpdateUser) onUpdateUser({ ...user, avatar: url });
            else window.location.reload();
        } catch (err) {
            alert("Upload failed");
        }
        setLoading(false);
    };

    return (
        <div className="absolute inset-0 z-50 bg-[var(--bg-sidebar)] animate-slide-in flex flex-col">
            <div className="h-28 bg-[var(--bg-panel)] flex items-end px-4 pb-4 gap-4 text-[var(--text-primary)]">
                <button onClick={onClose}><ArrowLeft /></button>
                <h2 className="text-xl font-medium">Profile</h2>
            </div>

            <div className="p-6 flex flex-col items-center flex-1 overflow-y-auto">
                <div className="relative mb-6 group cursor-pointer" onClick={() => document.getElementById('p-upload').click()}>
                    <img src={user.avatar} className="w-48 h-48 rounded-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <Camera className="text-white mb-1" />
                        <span className="text-[10px] text-white uppercase text-center w-20">Change Photo</span>
                    </div>
                    <input type="file" id="p-upload" hidden onChange={handleAvatarUpload} />
                    {loading && <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full"><Loader2 className="animate-spin text-[#00a884]" /></div>}
                </div>

                <div className="w-full space-y-6">
                    <div>
                        <label className="text-[#00a884] text-sm">Your Name</label>
                        <div className="flex items-center border-b border-[var(--border-color)] py-2">
                            <input value={name} onChange={e => setName(e.target.value)} className="bg-transparent flex-1 text-[var(--text-primary)] outline-none" />
                            <button onClick={handleSaveName}><Edit2 size={18} className="text-[#8696a0]" /></button>
                        </div>
                    </div>
                    <div>
                        <label className="text-[#00a884] text-sm">Phone Number</label>
                        <div className="py-2 text-[#8696a0] border-b border-[var(--border-color)]">{user.phone}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function NewChatDrawer({ onClose, onStartChat }) {
    const [phone, setPhone] = useState('');
    return (
        <div className="absolute inset-0 z-50 bg-[var(--bg-sidebar)] flex flex-col animate-slide-in">
            <div className="h-28 bg-[var(--bg-panel)] flex items-end px-4 pb-4 gap-4 text-[var(--text-primary)]">
                <button onClick={onClose}><ArrowLeft /></button>
                <h2 className="text-xl font-medium">New chat</h2>
            </div>
            <div className="p-4">
                <div className="bg-[var(--bg-panel)] flex items-center px-4 py-2 rounded-lg mb-4">
                    <Search className="text-[#8696a0]" />
                    <input autoFocus value={phone} onChange={e => setPhone(e.target.value)} placeholder="Type phone number..." className="bg-transparent flex-1 text-[var(--text-primary)] outline-none ml-4" type="tel" />
                </div>
                {phone.length >= 5 && (
                    <div onClick={() => onStartChat(phone)} className="flex items-center gap-4 p-4 hover:bg-[var(--bg-hover)] cursor-pointer rounded-lg transition-colors">
                        <div className="w-12 h-12 bg-[#00a884] rounded-full flex items-center justify-center"><User className="text-white" /></div>
                        <div className="flex flex-col">
                            <span className="text-[var(--text-primary)] font-bold">Chat with {phone}</span>
                            <span className="text-[#8696a0] text-xs">Click to start conversation</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}