import React, { useState } from 'react';
import {
    ArrowLeft, User, Image as ImageIcon, Moon, Sun, LogOut,
    Camera, Edit2, Loader2, Search, Upload, X, Check
} from 'lucide-react';
import { useSettings } from '../../context/SettingsContext';
import { useUI } from '../../context/UIContext'; // 1. Import UI Context
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../lib/firebase';

export default function SettingsDrawer({ onClose, currentUser, onUpdateUser }) {
    const { theme, toggleTheme, setWallpaper } = useSettings();
    const { showAlert, showToast, showConfirm } = useUI(); // 2. Get Helpers
    const [view, setView] = useState('main'); // 'main' | 'profile' | 'wallpapers'

    // --- 1. PROFILE VIEW ---
    const ProfileView = () => {
        const [name, setName] = useState(currentUser.name);
        const [about, setAbout] = useState(currentUser.about || "Hey there! I am using ChatBridge.");
        const [loading, setLoading] = useState(false);

        const handleSave = async (field, value) => {
            if (!value.trim()) return showAlert("Field cannot be empty.");
            await updateDoc(doc(db, 'users', currentUser.id), { [field]: value });
            onUpdateUser({ ...currentUser, [field]: value });
            showToast(`${field === 'name' ? 'Name' : 'About'} updated successfully`);
        };

        const handleAvatarUpload = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            setLoading(true);
            try {
                const storageRef = ref(storage, `avatars/${currentUser.id}_${Date.now()}`);
                await uploadBytesResumable(storageRef, file);
                const url = await getDownloadURL(storageRef);
                await updateDoc(doc(db, 'users', currentUser.id), { avatar: url });
                onUpdateUser({ ...currentUser, avatar: url });
                showToast("Profile photo updated");
            } catch (err) {
                console.error(err);
                showAlert("Failed to upload image. Please try again.");
            }
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
        const [previewWall, setPreviewWall] = useState(null);

        const colors = ['#0b141a', '#ffffff', '#e5ddd5', '#ffcdd2', '#c8e6c9', '#bbdefb', '#d1c4e9', '#000000'];

        const searchUnsplash = async () => {
            if (!search.trim()) return;
            setLoading(true);
            try {
                const response = await fetch(`https://api.unsplash.com/search/photos?query=${search}&client_id=OuvFSDPmHGyh1Fy0ePOdDJDZKOJr0hqNZDs_18Z6QrQ`);
                const data = await response.json();
                setResults(data.results || []);
            } catch (err) {
                console.error(err);
                showAlert("Failed to search images. API Limit reached?");
            }
            setLoading(false);
        };

        const handleCustomUpload = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            setLoading(true);

            const objectUrl = URL.createObjectURL(file);
            setPreviewWall(`url('${objectUrl}')`);
            setLoading(false);

            try {
                const storageRef = ref(storage, `wallpapers/${currentUser.id}_${Date.now()}`);
                await uploadBytesResumable(storageRef, file);
                const url = await getDownloadURL(storageRef);
                setPreviewWall(`url('${url}')`); // Update preview with permanent URL
            } catch (err) {
                console.error(err);
                showAlert("Failed to upload custom wallpaper.");
            }
        };

        const confirmWallpaper = () => {
            if (previewWall) {
                setWallpaper(previewWall);
                setPreviewWall(null);
                showToast("Wallpaper set successfully!");
            }
        };

        return (
            <>
                <div className="p-4 animate-slide-in space-y-6">
                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase">Custom</h3>
                        <button onClick={() => document.getElementById('wall-up').click()} className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--bg-panel)] rounded-lg border border-dashed border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]">
                            <Upload size={18} /> {loading ? 'Processing...' : 'Upload Image'}
                        </button>
                        <input id="wall-up" type="file" hidden accept="image/*" onChange={handleCustomUpload} />
                    </div>

                    <div className="space-y-3">
                        <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase">Solid Colors</h3>
                        <div className="grid grid-cols-4 gap-3">
                            {colors.map(c => (
                                <div key={c} onClick={() => setPreviewWall(c)} className="aspect-square rounded-lg cursor-pointer border border-white/10 shadow-sm hover:scale-105 transition" style={{ backgroundColor: c }} />
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
                                <img key={img.id} src={img.urls.small} onClick={() => setPreviewWall(`url('${img.urls.regular}')`)} className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80 transition" />
                            ))}
                        </div>
                    </div>
                    <button
                        onClick={() => { setWallpaper('default'); showToast("Reset to default wallpaper"); }}
                        className="w-full py-2 text-red-400 border border-red-400/30 rounded"
                    >
                        Reset to Default
                    </button>
                </div>

                {/* --- PREVIEW MODAL --- */}
                {previewWall && (
                    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4 animate-fade-in">
                        <div className="bg-[var(--bg-sidebar)] w-full max-w-sm rounded-xl overflow-hidden shadow-2xl flex flex-col h-[70vh]">
                            <div className="h-14 bg-[var(--bg-panel)] flex items-center justify-center text-[var(--text-primary)] font-medium border-b border-[var(--border-color)]">
                                Wallpaper Preview
                            </div>

                            <div
                                className="flex-1 p-4 flex flex-col justify-center gap-3 relative bg-cover bg-center"
                                style={{
                                    background: previewWall.includes('url') ? previewWall : previewWall,
                                    backgroundColor: !previewWall.includes('url') ? previewWall : undefined
                                }}
                            >
                                <div className="self-start bg-[#202c33] p-2 rounded-lg rounded-tl-none shadow-md max-w-[80%]">
                                    <p className="text-[#e9edef] text-sm">This is how messages will look.</p>
                                    <span className="text-[10px] text-[#8696a0] float-right mt-1">10:00 AM</span>
                                </div>
                                <div className="self-end bg-[#005c4b] p-2 rounded-lg rounded-tr-none shadow-md max-w-[80%]">
                                    <p className="text-[#e9edef] text-sm">Looks great! 😎</p>
                                    <span className="text-[10px] text-[#e9edef]/70 float-right mt-1">10:01 AM</span>
                                </div>
                            </div>

                            <div className="p-4 bg-[var(--bg-panel)] flex gap-4 border-t border-[var(--border-color)]">
                                <button
                                    onClick={() => setPreviewWall(null)}
                                    className="flex-1 py-2 rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmWallpaper}
                                    className="flex-1 py-2 rounded-lg bg-[#00a884] text-white font-medium hover:bg-[#008f70] transition shadow-lg"
                                >
                                    Set Wallpaper
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    };

    // --- 3. MAIN MENU ---
    const MainMenu = () => (
        <div className="animate-fade-in">
            <div onClick={() => setView('profile')} className="flex items-center gap-4 p-5 cursor-pointer hover:bg-[var(--bg-hover)] border-b border-[var(--border-color)]">
                <img src={currentUser.avatar} className="w-16 h-16 rounded-full object-cover" />
                <div>
                    <p className="text-lg font-medium text-[var(--text-primary)]">{currentUser.name}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{currentUser.about}</p>
                </div>
            </div>
            <MenuItem icon={<ImageIcon />} label="Chat Wallpaper" onClick={() => setView('wallpapers')} sub="Custom, colors, or Unsplash" />
            <MenuItem icon={theme === 'dark' ? <Moon /> : <Sun />} label="Theme" onClick={toggleTheme} sub={theme === 'dark' ? 'Dark' : 'Light'} />
            <MenuItem
                icon={<LogOut className="text-red-500" />}
                label="Log out"
                onClick={async () => {
                    if (await showConfirm("Are you sure you want to log out?")) window.location.reload();
                }}
                textColor="text-red-500"
            />
        </div>
    );

    return (
        <div className="absolute inset-0 z-50 bg-[var(--bg-sidebar)] flex flex-col animate-slide-in">
            <div className="h-28 bg-[var(--bg-panel)] flex items-end px-4 pb-4 gap-4 text-[var(--text-primary)]">
                <button onClick={() => view === 'main' ? onClose() : setView('main')}><ArrowLeft /></button>
                <h2 className="text-xl font-medium capitalize">{view === 'main' ? 'Settings' : view}</h2>
            </div>

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