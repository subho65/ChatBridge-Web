import React from 'react';
import { X, FileText, Image as ImageIcon } from 'lucide-react';

export default function UploadBubble({ file, progress, speed, timeLeft, onCancel }) {
    const isImage = file.type.startsWith('image/');
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);

    return (
        <div className="flex w-full mb-1 justify-end animate-fade-in">
            {/* Matches the 'Me' message bubble style */}
            <div className="bg-[#005c4b] rounded-lg p-2 max-w-[80%] min-w-[280px] shadow-sm relative rounded-tr-none">

                {/* File Preview Icon */}
                <div className="bg-[#025144] rounded p-2 flex items-center gap-3 mb-2">
                    {isImage ? (
                        <div className="w-10 h-10 bg-[#2a3942] rounded flex items-center justify-center">
                            <ImageIcon className="text-[#aebac1]" size={20} />
                        </div>
                    ) : (
                        <div className="w-10 h-10 bg-[#2a3942] rounded flex items-center justify-center">
                            <FileText className="text-[#aebac1]" size={24} />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-[#e9edef] text-sm font-medium truncate">{file.name}</p>
                        <p className="text-[#8696a0] text-xs uppercase">{file.type.split('/')[1] || 'FILE'}</p>
                    </div>
                </div>

                {/* Progress Bar Container */}
                <div className="flex items-center gap-3 px-1 mt-3">
                    <div className="flex-1 flex flex-col gap-1.5">
                        {/* The Track */}
                        <div className="h-1.5 w-full bg-[#2a3942] rounded-full overflow-hidden">
                            {/* The Fill (WhatsApp Green) */}
                            <div
                                className="h-full bg-[#25d366] transition-all duration-200 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] text-[#e9edef] font-medium opacity-80">
                            <span>{Math.round(progress)}% • {speed || '0 KB/s'}</span>
                            <span>{timeLeft}</span>
                        </div>
                    </div>

                    {/* Cancel Button */}
                    <button onClick={onCancel} className="p-1.5 rounded-full hover:bg-black/20 transition text-[#e9edef]">
                        <X size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}