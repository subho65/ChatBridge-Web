import React, { useState } from 'react';
import { ArrowLeft, User, Image as ImageIcon, Moon, Sun, LogOut, Camera, Edit2, Loader2, Search, Upload } from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';

export default function SettingsDrawer({ onClose, currentUser, onUpdateUser }) {
    const { theme, toggleTheme, setWallpaper } = useSettings();
    const [view, setView] = useState('main'); // 'main' | 'profile' | 'wallpapers'

    // --- 1. PROFILE VIEW ---
    const ProfileView = () => {
        const [name, setName] = useState(currentUser.name);
        const [about, setAbout] = useState(currentUser.about || "Hey there! I am using ChatBridge.");
        const [loading, setLoading] = useState(false);

        const handleSave = async (field, value) => {
            if (!value.trim()) return;
            await updateDoc(doc(db, 'users', currentUser.id), { [field]: value });
            onUpdateUser({ ...currentUser, [field]: value });
            alert("Updated!");
        };

        const handleAvatarUpload = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            setLoading(true);
            const storageRef = ref(storage, `avatars/${currentUser.id}_${Date.now()}`);
            await uploadBytesResumable(storageRef, file);
            const url = await getDownloadURL(storageRef);
            await updateDoc(doc(db, 'users', currentUser.id), { avatar: url });
            onUpdateUser({ ...currentUser, avatar: url });
            setLoading(false);
        };

        return (
            <div className="p-6 flex flex-col items-center animate-slide-in">
                <div className="relative mb-8 group cursor-pointer" onClick={() => document.getElementById('av-set').click()}>
                    <img src={currentUser.avatar} className="w-40 h-40 rounded-full object-cover border-4 border-[var(--bg-panel)]" />
                    <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition">
                        <Camera className="text-white mb-1" />
                        <span className="text-[10px] text-white uppercase">Change</span>
                    </div>
                    {loading && <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full"><Loader2 className="animate-spin text-[#00a884]" /></div>}
                    <input id="av-set" type="file" hidden onChange={handleAvatarUpload} />
                </div>
                <div className="w-full space-y-6">
                    <InputGroup label="Your Name" value={name} onChange={setName} onSave={() => handleSave('name', name)} />
                    <InputGroup label="About" value={about} onChange={setAbout} onSave={() => handleSave('about', about)} />
                    <div>
                        <label className="text-[#00a884] text-sm">Phone</label>
                        <div className="py-2 text-[var(--text-secondary)] border-b border-[var(--border-color)]">{currentUser.phone}</div>
                    </div>
                </div>
            </div>
        );
    };

    // --- 2. WALLPAPER VIEW ---
    const WallpaperView = () => {
        const [search, setSearch] = useState('');
        const [results, setResults] = useState([]);
        const [loading, setLoading] = useState(false);
        const colors = ['#0b141a', '#ffffff', '#e5ddd5', '#ffcdd2', '#c8e6c9', '#bbdefb'];

        const searchUnsplash = async () => {
            if (!search.trim()) return;
            setLoading(true);
            try {
                // Note: You need a real API key for this to fetch live data
                const response = await fetch(`https://api.unsplash.com/search/photos?query=${search}&client_id=OuvFSDPmHGyh1Fy0ePOdDJDZKOJr0hqNZDs_18Z6QrQ`);
                const data = await response.json();
                setResults(data.results || []);
            } catch (err) { console.error(err); }
            setLoading(false);
        };

        const handleCustomUpload = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            setLoading(true);
            const storageRef = ref(storage, `wallpapers/${currentUser.id}_${Date.now()}`);
            await uploadBytesResumable(storageRef, file);
            const url = await getDownloadURL(storageRef);
            setWallpaper(`url('${url}')`);
            setLoading(false);
            alert("Custom wallpaper applied!");
        };

        return (
            <div className="p-4 animate-slide-in space-y-6">
                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase">Custom</h3>
                    <button onClick={() => document.getElementById('wall-up').click()} className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--bg-panel)] rounded-lg border border-dashed border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
                        <Upload size={18} /> {loading ? 'Uploading...' : 'Upload Image'}
                    </button>
                    <input id="wall-up" type="file" hidden accept="image/*" onChange={handleCustomUpload} />
                </div>

                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase">Colors</h3>
                    <div className="grid grid-cols-6 gap-2">
                        {colors.map(c => (
                            <div key={c} onClick={() => setWallpaper(c)} className="aspect-square rounded-full cursor-pointer border border-black/10" style={{ backgroundColor: c }} />
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase">Search Online</h3>
                    <div className="flex gap-2 bg-[var(--bg-panel)] p-2 rounded-lg">
                        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchUnsplash()} placeholder="Nature, Dark..." className="bg-transparent flex-1 outline-none text-sm text-[var(--text-primary)]" />
                        <button onClick={searchUnsplash}><Search size={18} className="text-[var(--text-secondary)]" /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {loading ? <Loader2 className="animate-spin mx-auto col-span-2 py-4" /> : results.map(img => (
                            <img key={img.id} src={img.urls.small} onClick={() => setWallpaper(`url('${img.urls.regular}')`)} className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80 transition" />
                        ))}
                    </div>
                </div>
                <button onClick={() => setWallpaper('default')} className="w-full py-2 text-red-400 border border-red-400/30 rounded">Reset to Default</button>
            </div>
        );
    };

    // --- 3. MAIN MENU ---
    const MainMenu = () => (
        <div className="animate-fade-in">
            <div onClick={() => setView('profile')} className="flex items-center gap-4 p-5 cursor-pointer hover:bg-[var(--bg-hover)] border-b border-[var(--border-color)]">
                <img src={currentUser.avatar} className="w-16 h-16 rounded-full object-cover" />
                <div>
                    <p className="text-lg font-medium text-[var(--text-primary)]">{currentUser.name}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{currentUser.about || "Hey there! I am using ChatBridge."}</p>
                </div>
            </div>
            <MenuItem icon={<ImageIcon />} label="Chat Wallpaper" onClick={() => setView('wallpapers')} sub="Custom, colors, or Unsplash" />
            <MenuItem icon={theme === 'dark' ? <Moon /> : <Sun />} label="Theme" onClick={toggleTheme} sub={theme === 'dark' ? 'Dark' : 'Light'} />
            <MenuItem icon={<LogOut className="text-red-500" />} label="Log out" onClick={() => window.location.reload()} textColor="text-red-500" />
        </div>
    );

    return (
        <div className="absolute inset-0 z-50 bg-[var(--bg-sidebar)] flex flex-col animate-slide-in">
            <div className="h-28 bg-[var(--bg-panel)] flex items-end px-4 pb-4 gap-4 text-[var(--text-primary)]">
                <button onClick={() => view === 'main' ? onClose() : setView('main')}><ArrowLeft /></button>
                <h2 className="text-xl font-medium capitalize">{view === 'main' ? 'Settings' : view}</h2>
            </div>

            {/* FIX: Correct conditional rendering */}
            <div className="flex-1 overflow-y-auto">
                {view === 'main' && <MainMenu />}
                {view === 'profile' && <ProfileView />}
                {view === 'wallpapers' && <WallpaperView />}
            </div>
        </div>
    );
}

const MenuItem = ({ icon, label, onClick, sub, textColor = "text-[var(--text-primary)]" }) => (
    <div onClick={onClick} className="flex items-center gap-4 p-5 cursor-pointer hover:bg-[var(--bg-hover)] transition">
        <div className="text-[var(--text-secondary)]">{icon}</div>
        <div>
            <p className={`text-base ${textColor}`}>{label}</p>
            {sub && <p className="text-sm text-[var(--text-secondary)]">{sub}</p>}
        </div>
    </div>
);

const InputGroup = ({ label, value, onChange, onSave }) => (
    <div>
        <label className="text-[#00a884] text-sm">{label}</label>
        <div className="flex items-center border-b border-[var(--border-color)] py-2">
            <input value={value} onChange={e => onChange(e.target.value)} className="bg-transparent flex-1 outline-none text-[var(--text-primary)]" />
            <button onClick={onSave}><Edit2 size={18} className="text-[var(--text-secondary)]" /></button>
        </div>
    </div>
);