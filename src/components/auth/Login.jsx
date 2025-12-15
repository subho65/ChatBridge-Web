import React, { useState } from 'react';
import { Phone, Lock, ArrowRight, Loader2, UserPlus } from 'lucide-react';
import { useUI } from '../../context/UIContext'; // Import Hook

export default function LoginScreen({ onNext, onSwitchToRegister }) {
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const { showAlert } = useUI(); // Get custom alert

    const handlePhoneChange = (e) => {
        const val = e.target.value.replace(/\D/g, '');
        if (val.length <= 10) setPhone(val);
    };

    const handleSubmit = async () => {
        // REPLACED ALERT
        if (phone.length < 10) return showAlert("Please enter a valid 10-digit phone number");

        // Strict Regex Check (Indian Mobile)
        const indianMobileRegex = /^[6-9]\d{9}$/;
        if (!indianMobileRegex.test(phone)) {
            // REPLACED ALERT
            return showAlert("Invalid Mobile Number! It must start with 6, 7, 8, or 9.");
        }

        setLoading(true);
        await onNext(phone);
        setLoading(false);
    };

    return (
        <div className="min-h-full h-full w-full bg-[#111b21] flex flex-col items-center justify-center p-4">
            <div className="flex items-center gap-3 mb-8 text-white font-medium text-lg uppercase tracking-widest animate-fade-in">
                <div className="w-10 h-10 bg-[#00a884] rounded-lg flex items-center justify-center shadow-lg">
                    <Lock className="text-white" fill="white" size={20} />
                </div>
                ChatBridge
            </div>

            <div className="bg-[#202c33] p-8 rounded-xl w-full max-w-md border-t-4 border-[#00a884] space-y-6 shadow-2xl animate-slide-in">
                <div className="text-center sm:text-left">
                    <h2 className="text-2xl text-[#e9edef] font-light">Welcome Back</h2>
                    <p className="text-[#8696a0] text-sm mt-1">Sign in to continue messaging</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-[#00a884] text-xs font-bold mb-1 block uppercase">Phone Number</label>
                        <div className="flex items-center bg-[#111b21] rounded-lg border border-[#2a3942] p-3 focus-within:border-[#00a884] transition-colors">
                            <Phone className="text-[#8696a0] mr-3" size={20} />
                            <input
                                value={phone}
                                onChange={handlePhoneChange}
                                type="tel"
                                placeholder="e.g. 9876543210"
                                className="bg-transparent w-full text-white outline-none placeholder-[#8696a0]/50"
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                            />
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={loading || phone.length < 10}
                    className="w-full bg-[#00a884] hover:bg-[#008f70] text-[#111b21] font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="animate-spin" /> : <>LOGIN <ArrowRight size={18} /></>}
                </button>

                <div className="flex items-center gap-3 my-4">
                    <div className="h-[1px] bg-[#2a3942] flex-1"></div>
                    <span className="text-[#8696a0] text-xs uppercase">OR</span>
                    <div className="h-[1px] bg-[#2a3942] flex-1"></div>
                </div>

                <button
                    onClick={onSwitchToRegister}
                    className="w-full bg-[#2a3942] hover:bg-[#37404a] text-[#00a884] font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors border border-[#00a884]/20"
                >
                    <UserPlus size={18} /> CREATE AN ACCOUNT
                </button>
            </div>
        </div>
    );
}