import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getFirestore, doc, setDoc, updateDoc, serverTimestamp,
    getDoc
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// --- IMPORT THE PROVIDER ---
import { SettingsProvider } from './context/SettingsContext';

// Components
import LoginScreen from './components/auth/Login';
import RegisterScreen from './components/auth/Register'; // NEW IMPORT
import Sidebar from './components/chat/Sidebar';
import ChatWindow from './components/chat/ChatWindow';
import ImageLightbox from './components/chat/ImagePreview';

function cn(...inputs) { return twMerge(clsx(inputs)); }

// --- Firebase Config ---
const firebaseConfig = {
    apiKey: "AIzaSyCS7HPWqw_K7UXwLNM6-F5PYX6yicph7qs",
    authDomain: "sync-bridge-36fac.firebaseapp.com",
    projectId: "sync-bridge-36fac",
    storageBucket: "sync-bridge-36fac.firebasestorage.app",
    messagingSenderId: "781025230842",
    appId: "1:781025230842:web:122e30b3fbe781c5772e43",
    measurementId: "G-0J1HG9G9Q0"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

// --- ROOT COMPONENT ---
export default function App() {
    return (
        <SettingsProvider>
            <MainApp />
        </SettingsProvider>
    );
}

// --- Main Logic ---
function MainApp() {
    const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem('wa_user_v11')) || null);
    const [view, setView] = useState(currentUser ? 'dashboard' : 'login'); // 'login' | 'register' | 'dashboard'
    const [tempPhone, setTempPhone] = useState(''); // Store phone for registration step

    // 1. Check if user exists (Called from Login Screen)
    const handleAuthCheck = async (phone) => {
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length < 5) return alert("Enter valid phone number");

        const userDoc = await getDoc(doc(db, 'users', cleanPhone));

        if (userDoc.exists()) {
            // User exists -> Login
            const userData = userDoc.data();
            localStorage.setItem('wa_user_v11', JSON.stringify(userData));
            setCurrentUser(userData);
            setView('dashboard');
        } else {
            // User does not exist -> Go to Register
            setTempPhone(cleanPhone);
            setView('register');
        }
    };

    // 2. Create User (Called from Register Screen)
    const handleRegister = async ({ phone, name, avatar, about }) => {
        const userData = {
            id: phone,
            phone: phone,
            name: name,
            avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`,
            about: about || "Hey there! I am using ChatBridge.",
            online: true,
            lastSeen: serverTimestamp()
        };

        await setDoc(doc(db, 'users', phone), userData, { merge: true });
        localStorage.setItem('wa_user_v11', JSON.stringify(userData));
        setCurrentUser(userData);
        setView('dashboard');
    };

    const handleLogout = () => {
        if (currentUser) {
            updateDoc(doc(db, 'users', currentUser.id), { online: false, lastSeen: serverTimestamp() });
        }
        localStorage.removeItem('wa_user_v11');
        window.location.reload();
    };

    // --- VIEW ROUTING ---
    // --- VIEW ROUTING ---

    if (view === 'login') {
        return (
            <LoginScreen
                onNext={handleAuthCheck}
                onSwitchToRegister={() => setView('register')} // <--- THIS WAS MISSING
            />
        );
    }

    if (view === 'register') {
        return (
            <RegisterScreen
                initialPhone={tempPhone}
                onRegister={handleRegister}
                onBack={() => setView('login')}
            />
        );
    }

    return (
        <Dashboard
            currentUser={currentUser}
            onLogout={handleLogout}
        />
    );
}

// --- Dashboard Layout ---
function Dashboard({ currentUser, onLogout }) {
    const [activeChatId, setActiveChatId] = useState(null);
    const [activeChatUser, setActiveChatUser] = useState(null);
    const [leftDrawer, setLeftDrawer] = useState(null);
    const [rightDrawer, setRightDrawer] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);

    // Heartbeat for Online Status
    useEffect(() => {
        const setOnline = () => updateDoc(doc(db, 'users', currentUser.id), { lastSeen: serverTimestamp(), online: true });
        setOnline();
        const interval = setInterval(setOnline, 60000);

        const handleUnload = () => updateDoc(doc(db, 'users', currentUser.id), { online: false, lastSeen: serverTimestamp() });
        window.addEventListener('beforeunload', handleUnload);
        return () => { clearInterval(interval); window.removeEventListener('beforeunload', handleUnload); handleUnload(); };
    }, [currentUser]);

    return (
        <div className="h-full w-full flex bg-[var(--bg-main)] relative overflow-hidden text-[var(--text-primary)]">

            <div className="hidden md:block absolute top-0 left-0 w-full h-32 bg-[#00a884] z-0"></div>

            <div className="z-10 w-full h-full md:p-5 md:max-w-[1600px] md:mx-auto flex justify-center">
                <div className="w-full h-full bg-[var(--bg-sidebar)] md:rounded-xl overflow-hidden shadow-2xl flex relative">

                    {/* LEFT SIDEBAR */}
                    <div className={cn(
                        "w-full md:w-[400px] h-full flex flex-col bg-[var(--bg-sidebar)] border-r border-[var(--border-color)]",
                        activeChatId ? "hidden md:flex" : "flex"
                    )}>
                        <Sidebar
                            currentUser={currentUser}
                            activeChatId={activeChatId}
                            onSelectChat={(id, user) => { setActiveChatId(id); setActiveChatUser(user); setRightDrawer(null); }}
                            onLogout={onLogout}
                        />
                    </div>

                    {/* RIGHT CHAT WINDOW */}
                    <div className={cn(
                        "w-full md:flex-1 h-full flex flex-col bg-[var(--bg-main)] relative",
                        !activeChatId ? "hidden md:flex" : "flex"
                    )}>
                        {activeChatId && activeChatUser ? (
                            <ChatWindow
                                currentUser={currentUser}
                                chatId={activeChatId}
                                otherUser={activeChatUser}
                                onBack={() => { setActiveChatId(null); setActiveChatUser(null); }}
                                onOpenInfo={() => setRightDrawer(prev => prev ? null : 'contact_info')}
                                onViewImage={setPreviewImage}
                            />
                        ) : (
                            <EmptyState />
                        )}

                        {rightDrawer === 'contact_info' && activeChatUser && (
                            <ContactInfoDrawer user={activeChatUser} onClose={() => setRightDrawer(null)} />
                        )}
                    </div>

                    {/* Image Modal */}
                    {previewImage && (
                        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewImage(null)}>
                            <img src={previewImage} className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
                            <button className="absolute top-4 right-4 text-white p-4" onClick={() => setPreviewImage(null)}>✕</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function ContactInfoDrawer({ user, onClose }) {
    return (
        <div className="absolute inset-0 bg-[var(--bg-sidebar)] z-30 flex flex-col animate-slide-in border-l border-[var(--border-color)]">
            <div className="h-16 bg-[var(--bg-panel)] flex items-center px-4 gap-4 text-[var(--text-primary)]">
                <button onClick={onClose}>✕</button>
                <h2 className="font-medium">Contact Info</h2>
            </div>
            <div className="p-8 flex flex-col items-center flex-1 overflow-y-auto">
                <img src={user.avatar} className="w-48 h-48 rounded-full object-cover mb-4 border-4 border-[var(--bg-panel)]" />
                <h2 className="text-2xl mb-1">{user.name}</h2>
                <p className="text-[var(--text-secondary)] mb-6">{user.phone}</p>
                <div className="w-full bg-[var(--bg-sidebar)] border-t border-[var(--border-color)] p-4">
                    <p className="text-[var(--text-secondary)] text-sm mb-1">About</p>
                    <p>{user.about || "Hey there! I am using ChatBridge."}</p>
                </div>
            </div>
        </div>
    );
}

function EmptyState() {
    return (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-[var(--bg-panel)] border-b-[6px] border-[#00a884] text-center p-10">
            <div className="w-64 h-64 bg-[url('https://static.whatsapp.net/rsrc.php/v3/y6/r/wa66945k.png')] bg-contain bg-no-repeat opacity-40 mb-8" />
            <h1 className="text-3xl font-light mb-4">ChatBridge Web</h1>
            <p className="text-[var(--text-secondary)] text-sm">Send and receive messages without keeping your phone online.</p>
        </div>
    );
}