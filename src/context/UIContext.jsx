import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, Check, AlertCircle, Info } from 'lucide-react';

const UIContext = createContext();

export const UIProvider = ({ children }) => {
    const [modal, setModal] = useState(null); // { type: 'alert' | 'confirm', message: '', onConfirm: fn }
    const [toast, setToast] = useState(null); // { message: '', type: 'success' | 'error' }

    // --- Toast (Auto Dismiss) ---
    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    // --- Alert (Promise based) ---
    const showAlert = useCallback((message) => {
        return new Promise((resolve) => {
            setModal({
                type: 'alert',
                message,
                onClose: () => {
                    setModal(null);
                    resolve(true);
                }
            });
        });
    }, []);

    // --- Confirm (Promise based - returns true/false) ---
    const showConfirm = useCallback((message) => {
        return new Promise((resolve) => {
            setModal({
                type: 'confirm',
                message,
                onConfirm: () => {
                    setModal(null);
                    resolve(true);
                },
                onCancel: () => {
                    setModal(null);
                    resolve(false);
                }
            });
        });
    }, []);

    return (
        <UIContext.Provider value={{ showToast, showAlert, showConfirm }}>
            {children}

            {/* TOAST NOTIFICATION */}
            {toast && (
                <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-fade-in-up">
                    <div className="bg-[#3b4a54] text-[#e9edef] px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 min-w-[300px] border border-[#2a3942]">
                        {toast.type === 'success' ? <Check className="text-green-400" size={20} /> : <AlertCircle className="text-red-400" size={20} />}
                        <span className="text-sm font-medium">{toast.message}</span>
                    </div>
                </div>
            )}

            {/* MODAL POPUP */}
            {modal && (
                <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-[#3b4a54] w-full max-w-sm rounded-lg shadow-2xl overflow-hidden scale-100 animate-scale-in border border-[#2a3942]">
                        <div className="p-6 text-center">
                            <div className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#2a3942] text-[#00a884]">
                                {modal.type === 'confirm' ? <Info size={24} /> : <AlertCircle size={24} />}
                            </div>
                            <h3 className="text-[#e9edef] text-lg font-medium mb-2">
                                {modal.type === 'confirm' ? 'Confirmation' : 'Notice'}
                            </h3>
                            <p className="text-[#8696a0] text-sm">{modal.message}</p>
                        </div>

                        <div className="flex border-t border-[#2a3942]">
                            {modal.type === 'confirm' ? (
                                <>
                                    <button
                                        onClick={modal.onCancel}
                                        className="flex-1 py-4 text-[#8696a0] hover:bg-[#2a3942] transition text-sm font-medium border-r border-[#2a3942]"
                                    >
                                        CANCEL
                                    </button>
                                    <button
                                        onClick={modal.onConfirm}
                                        className="flex-1 py-4 text-[#00a884] hover:bg-[#2a3942] transition text-sm font-bold"
                                    >
                                        CONFIRM
                                    </button>
                                </>
                            ) : (
                                <button
                                    onClick={modal.onClose}
                                    className="flex-1 py-4 text-[#00a884] hover:bg-[#2a3942] transition text-sm font-bold"
                                >
                                    OK
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </UIContext.Provider>
    );
};

export const useUI = () => useContext(UIContext);