import React, { useState, useEffect, useRef } from 'react';
import {
    collection, query, orderBy, onSnapshot, doc, updateDoc,
    addDoc, serverTimestamp, writeBatch, arrayUnion, arrayRemove, getDoc
} from 'firebase/firestore';
import {
    ref, uploadBytesResumable, getDownloadURL
} from 'firebase/storage';
import { db, storage } from '../../lib/firebase';
import { format, isSameDay, isToday } from 'date-fns';
import EmojiPicker from 'emoji-picker-react';
import {
    ArrowLeft, MoreVertical, Search, Paperclip, Smile, Mic, Send,
    Check, CheckCheck, Trash2, ChevronDown, StopCircle, Pause, Play, Lock, Ban, X
} from 'lucide-react';
import MessageBubble from './MessageBubble';
import UploadBubble from './UploadBubble';
import ImagePreview from './ImagePreview';
import Skeleton from '../ui/Skeleton';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { useSettings } from '../../context/SettingsContext';
import { useUI } from '../../context/UIContext';

function cn(...inputs) { return twMerge(clsx(inputs)); }

export default function ChatWindow({ currentUser, chatId, otherUser, onBack, onViewImage, onOpenInfo }) {
    // Contexts
    const { wallpaper } = useSettings();
    const { showConfirm, showAlert, showToast } = useUI();

    // --- STATE ---
    const [messages, setMessages] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(true);
    const [inputText, setInputText] = useState('');

    // Block State
    const [isBlocked, setIsBlocked] = useState(false); // Did I block them?

    // Recording & Upload State
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recTime, setRecTime] = useState(0);
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadStats, setUploadStats] = useState({ progress: 0, speed: 0, timeLeft: '...' });
    const [showPreview, setShowPreview] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    // UI State
    const [showEmoji, setShowEmoji] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [presence, setPresence] = useState(null);

    // Search State
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Refs
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const uploadTaskRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const timerRef = useRef(null);
    const streamRef = useRef(null);

    // --- 1. CHECK BLOCK STATUS ---
    useEffect(() => {
        // Listen to MY user document to see if I blocked this person
        const unsub = onSnapshot(doc(db, 'users', currentUser.id), (docSnap) => {
            if (docSnap.exists()) {
                const myData = docSnap.data();
                const blockedList = myData.blocked || [];
                setIsBlocked(blockedList.includes(otherUser.id));
            }
        });
        return () => unsub();
    }, [currentUser.id, otherUser.id]);

    // --- 2. BLOCK / UNBLOCK HANDLER ---
    const toggleBlock = async () => {
        const action = isBlocked ? "Unblock" : "Block";

        if (await showConfirm(`Are you sure you want to ${action} ${otherUser.name}?`)) {
            try {
                const userRef = doc(db, 'users', currentUser.id);
                if (isBlocked) {
                    // Unblock
                    await updateDoc(userRef, {
                        blocked: arrayRemove(otherUser.id)
                    });
                    showToast(`${otherUser.name} unblocked.`);
                } else {
                    // Block
                    await updateDoc(userRef, {
                        blocked: arrayUnion(otherUser.id)
                    });
                    showToast(`${otherUser.name} blocked.`);
                }
            } catch (err) {
                console.error(err);
                showAlert(`Failed to ${action} user.`);
            }
        }
    };

    // --- 3. LOAD MESSAGES ---
    useEffect(() => {
        if (!chatId) return;
        setLoadingMessages(true);
        const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
        const unsub = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setMessages(msgs);
            setLoadingMessages(false);

            const batch = writeBatch(db);
            let commit = false;
            snapshot.docs.forEach(d => {
                if (d.data().senderId !== currentUser.id && !d.data().read) {
                    batch.update(d.ref, { read: true });
                    commit = true;
                }
            });
            if (commit) batch.commit();
        });
        return () => unsub();
    }, [chatId, currentUser.id]);

    // --- 4. PRESENCE LISTENER ---
    useEffect(() => {
        if (!otherUser?.id) return;
        const unsub = onSnapshot(doc(db, 'users', otherUser.id), (s) => {
            if (s.exists()) setPresence(s.data());
        });
        return () => unsub();
    }, [otherUser]);

    // Scroll to bottom
    useEffect(() => {
        if (!searchQuery) messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [messages, isRecording, uploadFile, loadingMessages, searchQuery]);

    // --- 5. SEND & UPLOAD HANDLERS ---
    const sendMessage = async (type = 'text', content = null, fileName = null, caption = null) => {
        if (isBlocked) return showAlert("You blocked this contact. Unblock to send messages.");

        if ((type === 'text' && !content.trim())) return;

        if (type === 'text') { setInputText(''); setShowEmoji(false); }

        const payload = {
            text: type === 'text' ? content : (caption || ''),
            senderId: currentUser.id,
            timestamp: serverTimestamp(),
            type,
            read: false
        };

        if (type !== 'text') {
            payload.fileUrl = content;
            payload.fileName = fileName;
        }

        await addDoc(collection(db, 'chats', chatId, 'messages'), payload);

        let lastMsg = type === 'text' ? content : (type === 'audio' ? '🎤 Voice Message' : (type === 'image' ? '📷 Photo' : '📄 File'));
        await updateDoc(doc(db, 'chats', chatId), {
            lastUpdated: serverTimestamp(),
            lastMessageText: lastMsg
        });
    };

    const onFileSelect = (e) => {
        if (isBlocked) return showAlert("Unblock to send files.");
        const file = e.target.files[0];
        if (!file) return;
        if (file.type.startsWith('image/')) setShowPreview(file);
        else startUpload(file);
        e.target.value = null;
    };

    const startUpload = (file, caption = '') => {
        setShowPreview(null);
        setUploadFile(file);
        const storageRef = ref(storage, `chat/${chatId}/${Date.now()}_${file.name}`);
        const metadata = file.type.startsWith('audio/') ? { contentType: file.type } : {};
        const uploadTask = uploadBytesResumable(storageRef, file, metadata);
        uploadTaskRef.current = uploadTask;
        let startTime = Date.now();
        let prevBytes = 0;

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                const now = Date.now();
                const timeDiff = (now - startTime) / 1000;
                if (timeDiff > 0.5) {
                    const speed = (snapshot.bytesTransferred - prevBytes) / timeDiff;
                    const remainingBytes = snapshot.totalBytes - snapshot.bytesTransferred;
                    const secondsLeft = speed > 0 ? Math.ceil(remainingBytes / speed) : 0;
                    setUploadStats({ progress, speed: (speed / 1024 / 1024).toFixed(1) + ' MB/s', timeLeft: secondsLeft < 60 ? `${secondsLeft}s` : `${Math.ceil(secondsLeft / 60)}m` });
                    startTime = now; prevBytes = snapshot.bytesTransferred;
                } else { setUploadStats(prev => ({ ...prev, progress })); }
            },
            (error) => { console.error(error); setUploadFile(null); showAlert("Upload failed"); },
            async () => {
                const url = await getDownloadURL(uploadTask.snapshot.ref);
                let type = 'file';
                if (file.type.startsWith('image/')) type = 'image';
                else if (file.type.startsWith('audio/')) type = 'audio';
                await sendMessage(type, url, file.name, caption);
                setUploadFile(null);
            }
        );
    };

    const cancelUpload = () => { if (uploadTaskRef.current) { uploadTaskRef.current.cancel(); setUploadFile(null); } };

    // --- 6. AUDIO LOGIC ---
    const formatDuration = (s) => { const m = Math.floor(s / 60); const sc = s % 60; return `${m}:${sc < 10 ? '0' : ''}${sc}`; };

    const startRecording = async () => {
        if (isBlocked) return showAlert("Unblock to record audio.");
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            let mimeType = 'audio/webm';
            if (MediaRecorder.isTypeSupported('audio/mp4')) mimeType = 'audio/mp4';
            else if (MediaRecorder.isTypeSupported('audio/aac')) mimeType = 'audio/aac';

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];
            mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
            mediaRecorder.start();
            setIsRecording(true); setIsPaused(false); setRecTime(0);
            clearInterval(timerRef.current); timerRef.current = setInterval(() => setRecTime(t => t + 1), 1000);
        } catch (err) { showAlert("Microphone access denied."); }
    };

    const togglePause = () => {
        if (!mediaRecorderRef.current) return;
        if (isPaused) { mediaRecorderRef.current.resume(); setIsPaused(false); timerRef.current = setInterval(() => setRecTime(t => t + 1), 1000); }
        else { mediaRecorderRef.current.pause(); setIsPaused(true); clearInterval(timerRef.current); }
    };

    const stopAndSend = async () => {
        if (!mediaRecorderRef.current) return;
        mediaRecorderRef.current.onstop = async () => {
            const mimeType = mediaRecorderRef.current.mimeType || 'audio/webm';
            const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
            if (audioBlob.size < 100) return;
            const ext = mimeType.includes('mp4') ? 'm4a' : 'webm';
            const file = new File([audioBlob], `voice_message.${ext}`, { type: mimeType });
            startUpload(file);
            if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
        };
        mediaRecorderRef.current.stop(); setIsRecording(false); setIsPaused(false); clearInterval(timerRef.current);
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current) { mediaRecorderRef.current.onstop = null; mediaRecorderRef.current.stop(); }
        if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
        setIsRecording(false); setIsPaused(false); setRecTime(0); clearInterval(timerRef.current);
    };

    // --- 7. UTILITIES ---
    const deleteMessage = async (msgId) => {
        if (await showConfirm("Delete message?")) {
            await updateDoc(doc(db, 'chats', chatId, 'messages', msgId), { type: 'deleted', text: 'This message was deleted' });
        }
    };

    const clearChat = async () => {
        if (await showConfirm("Clear this chat?")) {
            const batch = writeBatch(db);
            messages.forEach(m => batch.delete(doc(db, 'chats', chatId, 'messages', m.id)));
            await batch.commit();
            setShowMenu(false);
        }
    };

    const getPresence = () => {
        if (!presence) return '';
        if (presence.online) return 'online';
        if (!presence.lastSeen) return '';
        const date = presence.lastSeen.toDate();
        return `last seen ${isToday(date) ? 'today' : format(date, 'dd/MM')} at ${format(date, 'HH:mm')}`;
    };

    const filteredMessages = searchQuery ? messages.filter(m => m.text?.toLowerCase().includes(searchQuery.toLowerCase())) : messages;

    return (
        <div className="flex flex-col h-full w-full bg-[var(--bg-main)] relative">

            {/* 1. HEADER */}
            <div className="h-16 min-h-[64px] bg-[var(--bg-panel)] flex items-center justify-between px-4 shrink-0 shadow-md z-20 cursor-pointer text-[var(--text-primary)]" onClick={onOpenInfo}>
                <div className="flex items-center gap-3">
                    <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="md:hidden text-[var(--text-secondary)] p-2 -ml-2 rounded-full hover:bg-[var(--bg-hover)]"><ArrowLeft /></button>
                    <img src={otherUser.avatar} className="w-10 h-10 rounded-full object-cover bg-gray-600" alt="Avatar" />
                    <div className="min-w-0 flex-1">
                        <h2 className="text-[var(--text-primary)] font-medium truncate">{otherUser.name}</h2>
                        <p className="text-xs text-[var(--text-secondary)] truncate">{getPresence()}</p>
                    </div>
                </div>

                {/* SEARCH & MENU */}
                {isSearchOpen ? (
                    <div className="flex items-center bg-[var(--bg-input)] rounded-lg px-3 py-1 animate-slide-in" onClick={e => e.stopPropagation()}>
                        <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-transparent w-full text-[var(--text-primary)] p-2 outline-none text-sm" placeholder="Search..." />
                        <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}><X size={18} className="text-[var(--text-secondary)]" /></button>
                    </div>
                ) : (
                    <div className="flex gap-4 text-[var(--text-secondary)] items-center" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setIsSearchOpen(true)}><Search size={20} /></button>
                        <div className="relative">
                            <button onClick={() => setShowMenu(!showMenu)}><MoreVertical size={20} /></button>
                            {showMenu && (
                                <div className="absolute right-0 top-10 bg-[var(--bg-panel)] w-48 py-2 rounded shadow-xl z-50 border border-[var(--border-color)] animate-fade-in">
                                    <button onClick={() => { onOpenInfo(); setShowMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-[var(--bg-hover)] text-[var(--text-primary)] text-sm">Contact info</button>
                                    <button onClick={clearChat} className="w-full text-left px-4 py-3 hover:bg-[var(--bg-hover)] text-[var(--text-primary)] text-sm">Clear chat</button>
                                    <button onClick={() => { toggleBlock(); setShowMenu(false); }} className="w-full text-left px-4 py-3 hover:bg-[var(--bg-hover)] text-red-400 text-sm">
                                        {isBlocked ? "Unblock user" : "Block user"}
                                    </button>
                                </div>
                            )}
                            {showMenu && <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)}></div>}
                        </div>
                    </div>
                )}
            </div>

            {/* 2. MESSAGES LIST */}
            <div
                className="flex-1 overflow-y-auto p-4 md:px-16 bg-contain bg-center bg-no-repeat"
                style={{
                    backgroundImage: wallpaper.startsWith('http') || wallpaper.startsWith('url') ? (wallpaper.startsWith('url') ? wallpaper : `url(${wallpaper})`) : 'none',
                    backgroundColor: wallpaper.startsWith('#') ? wallpaper : 'transparent',
                    backgroundRepeat: wallpaper === 'default' ? 'repeat' : 'no-repeat',
                    backgroundSize: wallpaper === 'default' ? 'contain' : 'cover',
                    backgroundImage: wallpaper === 'default'
                        ? `url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')`
                        : (wallpaper.includes('url') ? wallpaper : 'none')
                }}
            >
                {loadingMessages ? (
                    <div className="space-y-4">
                        {[...Array(6)].map((_, i) => (
                            <div key={i} className={cn("flex w-full", i % 2 === 0 ? "justify-start" : "justify-end")}>
                                <Skeleton className={cn("h-12 rounded-lg", i % 2 === 0 ? "w-48 bg-[var(--bg-panel)]" : "w-64 bg-[var(--green-primary)] opacity-50")} />
                            </div>
                        ))}
                    </div>
                ) : (
                    filteredMessages.map((msg, idx) => {
                        const isMe = msg.senderId === currentUser.id;
                        const showDate = idx === 0 || !isSameDay(msg.timestamp?.toDate() || new Date(), filteredMessages[idx - 1].timestamp?.toDate() || new Date());
                        return (
                            <React.Fragment key={msg.id}>
                                {showDate && (
                                    <div className="flex justify-center my-4 sticky top-2 z-10">
                                        <span className="bg-[var(--bg-panel)] text-[var(--text-secondary)] text-xs py-1.5 px-3 rounded-lg uppercase shadow-sm">
                                            {msg.timestamp ? (isToday(msg.timestamp.toDate()) ? 'Today' : format(msg.timestamp.toDate(), 'dd/MM/yyyy')) : 'Today'}
                                        </span>
                                    </div>
                                )}
                                <MessageBubble msg={msg} isMe={isMe} onDelete={() => deleteMessage(msg.id)} onViewImage={onViewImage} />
                            </React.Fragment>
                        );
                    })
                )}

                {uploadFile && <UploadBubble file={uploadFile} progress={uploadStats.progress} speed={uploadStats.speed} timeLeft={uploadStats.timeLeft} onCancel={cancelUpload} />}

                <div ref={messagesEndRef} />
            </div>

            {/* 3. INPUT AREA */}
            {isBlocked ? (
                <div className="bg-[var(--bg-panel)] p-4 text-center text-[var(--text-secondary)] text-sm border-t border-[var(--border-color)]">
                    <p className="mb-2">You blocked this contact. Tap to unblock.</p>
                    <button onClick={toggleBlock} className="bg-[var(--bg-input)] px-4 py-2 rounded text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">Unblock</button>
                </div>
            ) : (
                <div className={cn("bg-[var(--bg-panel)] px-2 py-2 shrink-0 z-30 min-h-[60px] pb-safe border-t border-[var(--border-color)]", isRecording && "h-auto")}>
                    {isRecording ? (
                        <div className="w-full animate-fade-in">
                            {/* ... Recording UI ... (Same as before) */}
                            <div className="flex md:hidden flex-col w-full gap-2 pt-2 pb-1">
                                <div className="flex items-center gap-4 px-4 py-4 bg-[var(--bg-input)] rounded-xl border border-[var(--border-color)] mx-2 shadow-sm">
                                    <span className="text-[var(--text-primary)] font-mono text-xl font-medium min-w-[50px]">{formatDuration(recTime)}</span>
                                    <div className="flex items-center gap-1 h-6 flex-1 justify-center overflow-hidden opacity-80">
                                        {[...Array(15)].map((_, i) => <div key={i} className={cn("w-1.5 bg-[var(--text-secondary)] rounded-full", !isPaused && "animate-pulse")} style={{ height: `${20 + Math.random() * 80}%`, animationDuration: `${0.5 + Math.random()}s` }} />)}
                                    </div>
                                    <div className={cn("w-5 h-5 border-2 border-t-red-500 border-r-transparent border-b-transparent border-l-transparent rounded-full", !isPaused && "animate-spin")}></div>
                                </div>
                                <div className="flex items-center justify-between px-4 mt-2">
                                    <button onClick={cancelRecording} className="p-3 text-[var(--text-secondary)] hover:text-red-500 transition-colors"><Trash2 size={28} /></button>
                                    <button onClick={togglePause} className="p-3 text-red-500 hover:bg-[var(--bg-hover)] rounded-full transition-colors">{isPaused ? <Mic size={28} /> : <Pause size={28} />}</button>
                                    <button onClick={stopAndSend} className="p-4 bg-[#00a884] text-white rounded-full shadow-lg"><Send size={24} className="ml-1" /></button>
                                </div>
                            </div>
                            {/* Desktop Recording */}
                            <div className="hidden md:flex items-center gap-4 w-full px-4 py-2">
                                <button onClick={cancelRecording} className="text-[var(--text-secondary)] hover:text-red-500 p-2"><Trash2 size={24} /></button>
                                <div className="flex items-center gap-3 bg-[var(--bg-input)] px-4 py-2 rounded-full border border-[var(--border-color)] shadow-sm">
                                    <div className={cn("w-3 h-3 bg-red-500 rounded-full", !isPaused && "animate-pulse")} />
                                    <span className="font-mono text-[var(--text-primary)] text-lg">{formatDuration(recTime)}</span>
                                </div>
                                <div className="flex-1 h-10 flex items-center gap-1 overflow-hidden px-4">{[...Array(40)].map((_, i) => <div key={i} className={cn("w-1 bg-[var(--text-secondary)] rounded-full", !isPaused && "animate-pulse")} style={{ height: `${20 + Math.random() * 80}%`, animationDuration: '0.6s' }} />)}</div>
                                <button onClick={togglePause} className="p-3 rounded-full hover:bg-[var(--bg-hover)] text-red-500 transition-colors">{isPaused ? <Mic size={24} /> : <Pause size={24} />}</button>
                                <button onClick={stopAndSend} className="bg-[#00a884] text-white p-3 rounded-lg hover:bg-[#008f70] shadow-md"><Send size={22} /></button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center w-full gap-2">
                            <button onClick={() => setShowEmoji(!showEmoji)} className="text-[var(--text-secondary)] p-2 hover:bg-[var(--bg-hover)] rounded-full transition"><Smile size={24} /></button>
                            <button onClick={() => fileInputRef.current.click()} className="text-[var(--text-secondary)] p-2 hover:bg-[var(--bg-hover)] rounded-full transition"><Paperclip size={24} /></button>
                            <input type="file" ref={fileInputRef} onChange={onFileSelect} className="hidden" />
                            <div className="flex-1 bg-[var(--bg-input)] rounded-lg px-4 py-2 mx-2 border border-transparent focus-within:border-[#00a884]">
                                <input value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage('text', inputText)} placeholder="Type a message" className="bg-transparent w-full text-[var(--text-primary)] outline-none text-base placeholder-[var(--text-secondary)]" />
                            </div>
                            {inputText || isUploading ? (
                                <button onClick={() => sendMessage('text', inputText)} className="p-3 bg-[#00a884] rounded-full text-white hover:bg-[#008f70] transition shadow-md"><Send size={20} /></button>
                            ) : (
                                <button onClick={startRecording} className="p-3 bg-[var(--bg-hover)] rounded-full text-[var(--text-secondary)] hover:text-white transition shadow-md"><Mic size={20} /></button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {showEmoji && <div className="absolute bottom-16 left-0 w-full z-50"><EmojiPicker width="100%" theme={theme === 'dark' ? 'dark' : 'light'} onEmojiClick={e => setInputText(prev => prev + e.emoji)} /></div>}

            {/* --- CONTACT INFO MODAL (Now integrated here or via rightDrawer in App.jsx) --- */}
            {/* Since App.jsx handles the rightDrawer for ContactInfo, we just rely on onOpenInfo passed prop */}

            {showPreview && <ImagePreview file={showPreview} onClose={() => setShowPreview(null)} onSend={startUpload} />}
        </div>
    );
}