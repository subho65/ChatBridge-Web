import React, { useState } from 'react';
import { Camera, ArrowLeft, Loader2, Phone } from 'lucide-react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';

export default function RegisterScreen({ initialPhone, onRegister, onBack }) {
    const [phone, setPhone] = useState(initialPhone || '');
    const [name, setName] = useState('');
    const [about, setAbout] = useState('Hey there! I am using ChatBridge.');
    const [avatar, setAvatar] = useState(null);
    const [preview, setPreview] = useState(null);
    const [loading, setLoading] = useState(false);

    const handlePhoneChange = (e) => {
        // Only allow numbers and max 10 digits
        const val = e.target.value.replace(/\D/g, '');
        if (val.length <= 10) {
            setPhone(val);
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAvatar(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    // --- YOUR UPDATED SUBMIT LOGIC ---
    const handleSubmit = async () => {
        if (phone.length < 10) return alert("Please enter a valid 10-digit phone number");
        if (!name) return alert("Name is required");
        const indianMobileRegex = /^[6-9]\d{9}$/;
        if (!indianMobileRegex.test(phone)) {
            return alert("Invalid Mobile Number! It must start with 6, 7, 8, or 9.");
        }

        setLoading(true);

        let avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`;

        if (avatar) {
            try {
                const storageRef = ref(storage, `avatars/${phone}_${Date.now()}`);
                await uploadBytesResumable(storageRef, avatar);
                avatarUrl = await getDownloadURL(storageRef);
            } catch (err) {
                console.error(err);
            }
        }

        await onRegister({ phone, name, about, avatar: avatarUrl });
        setLoading(false);
    };
    // --------------------------------

    return (
        <div className="min-h-full h-full w-full bg-[#111b21] flex flex-col items-center justify-center p-4">
            <div className="bg-[#202c33] p-8 rounded-xl w-full max-w-md border-t-4 border-[#00a884] shadow-2xl animate-fade-in relative">
                <button onClick={onBack} className="absolute top-4 left-4 text-[#8696a0] hover:text-white transition"><ArrowLeft /></button>

                <h2 className="text-2xl text-[#e9edef] font-light text-center mb-6">Create Account</h2>

                {/* Avatar Upload */}
                <div className="flex justify-center mb-6">
                    <div className="relative group cursor-pointer" onClick={() => document.getElementById('reg-av').click()}>
                        <img
                            src={preview || `https://api.dicebear.com/7.x/avataaars/svg?seed=${name || 'new'}`}
                            className="w-24 h-24 rounded-full object-cover border-4 border-[#111b21]"
                            alt="Avatar"
                        />
                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <Camera className="text-white" />
                        </div>
                        <input id="reg-av" type="file" hidden accept="image/*" onChange={handleAvatarChange} />
                    </div>
                </div>

                <div className="space-y-4">

                    {/* Phone Input */}
                    <div>
                        <label className="text-[#00a884] text-xs font-bold mb-1 block uppercase">Phone Number</label>
                        <div className="flex items-center bg-[#111b21] rounded-lg border border-[#2a3942] p-3 focus-within:border-[#00a884] transition-colors">
                            <Phone className="text-[#8696a0] mr-3" size={20} />
                            <input
                                value={phone}
                                onChange={handlePhoneChange}
                                type="tel"
                                placeholder="e.g. 9876543210"
                                className="bg-transparent w-full text-white outline-none"
                            />
                        </div>
                    </div>

                    {/* Name Input */}
                    <div>
                        <label className="text-[#00a884] text-xs font-bold mb-1 block uppercase">Display Name</label>
                        <input
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="John Doe"
                            className="w-full bg-[#111b21] text-white p-3 rounded-lg border border-[#2a3942] focus:border-[#00a884] outline-none"
                        />
                    </div>

                    {/* About Input */}
                    <div>
                        <label className="text-[#00a884] text-xs font-bold mb-1 block uppercase">About</label>
                        <input
                            value={about}
                            onChange={e => setAbout(e.target.value)}
                            className="w-full bg-[#111b21] text-white p-3 rounded-lg border border-[#2a3942] focus:border-[#00a884] outline-none"
                        />
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={loading || phone.length < 10}
                    className="w-full bg-[#00a884] mt-6 hover:bg-[#008f70] text-[#111b21] font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition shadow-lg disabled:opacity-50"
                >
                    {loading ? <Loader2 className="animate-spin" /> : "SIGN UP"}
                </button>
            </div>
        </div>
    );
}