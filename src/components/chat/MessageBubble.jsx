import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import {
    Check, CheckCheck, File, Download, Trash2, ChevronDown,
    Play, Pause, StopCircle, AlertCircle
} from 'lucide-react';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) { return twMerge(clsx(inputs)); }

export default function MessageBubble({ msg, isMe, onDelete, onViewImage }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState(false);
    const audioRef = useRef(null);

    // Audio Logic
    const toggleAudio = () => {
        if (audioRef.current) {
            if (error) return;
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play().catch(e => {
                    console.error("Play error", e);
                    setError(true);
                });
            }
            setIsPlaying(!isPlaying);
        }
    };

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateProgress = () => {
            if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
        };
        const onEnd = () => { setIsPlaying(false); setProgress(0); };
        const onError = () => { console.error("Audio Load Error"); setError(true); };

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('ended', onEnd);
        audio.addEventListener('error', onError);

        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('ended', onEnd);
            audio.removeEventListener('error', onError);
        };
    }, [msg.fileUrl]);

    // Determine if we should show the menu
    // ONLY show if: 1. I sent it (isMe) AND 2. It is not already deleted
    const showMenu = isMe && msg.type !== 'deleted';

    return (
        <div className={cn("flex w-full mb-1 group relative animate-fade-in", isMe ? 'justify-end' : 'justify-start')}>
            <div className={cn(
                "max-w-[85%] sm:max-w-[65%] rounded-lg p-1.5 shadow-sm text-sm relative group-hover:shadow-md transition-all",
                isMe ? 'bg-[var(--bubble-out)] rounded-tr-none' : 'bg-[var(--bubble-in)] rounded-tl-none border border-[var(--border-color)] md:border-none'
            )}>

                {/* --- FIXED CONTEXT MENU --- */}
                {/* Only renders if sent by ME and NOT deleted */}
                {showMenu && (
                    <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-10 p-1">
                        <button className="bg-gradient-to-l from-black/10 to-transparent rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                            <ChevronDown size={18} />
                        </button>
                        {/* Dropdown */}
                        <div className="hidden group-hover:block absolute right-0 top-6 bg-[var(--bg-panel)] py-1 rounded shadow-xl z-20 w-32 border border-[var(--border-color)]">
                            <button
                                onClick={onDelete}
                                className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-[var(--bg-hover)] text-red-500 text-xs font-medium"
                            >
                                <Trash2 size={14} /> Delete message
                            </button>
                        </div>
                    </div>
                )}

                {/* --- MESSAGE CONTENT --- */}
                {msg.type === 'deleted' ? (
                    <p className="text-[var(--text-secondary)] italic text-xs flex items-center gap-2 px-1 py-1">
                        <StopCircle size={14} /> {msg.text}
                    </p>
                ) : (
                    <>
                        {/* Image */}
                        {msg.type === 'image' && (
                            <div className="relative overflow-hidden rounded-md mb-1 bg-black/5">
                                <img
                                    onClick={() => onViewImage(msg.fileUrl)}
                                    src={msg.fileUrl}
                                    className="w-full max-h-80 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                    alt="attachment"
                                />
                            </div>
                        )}

                        {/* Audio */}
                        {msg.type === 'audio' && (
                            <div className="flex items-center gap-3 p-2 min-w-[240px]">
                                <div className="relative">
                                    <div className={cn(
                                        "w-10 h-10 rounded-full flex items-center justify-center shadow-sm transition-colors",
                                        error ? "bg-red-500" : "bg-[var(--green-primary)]"
                                    )}>
                                        <audio ref={audioRef} src={msg.fileUrl} preload="metadata" />
                                        <button onClick={toggleAudio} className="text-white outline-none">
                                            {error ? <AlertCircle size={20} /> : (
                                                isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" className="ml-1" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-col justify-center gap-1.5">
                                    <div className="h-1 bg-[var(--text-secondary)]/20 rounded-full w-full overflow-hidden">
                                        <div
                                            className={cn("h-full transition-all duration-100 ease-linear", error ? "bg-red-400" : isMe ? "bg-white/60" : "bg-[var(--green-primary)]")}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-medium text-[var(--text-secondary)]">
                                        <span>{error ? "Format Error" : (isPlaying ? "Playing..." : "Voice Note")}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* File */}
                        {msg.type === 'file' && (
                            <a href={msg.fileUrl} download className="flex items-center gap-3 bg-black/5 p-3 rounded-lg mb-1 hover:bg-black/10 transition-colors border border-black/5">
                                <div className="p-2 bg-[var(--bg-panel)] rounded-md">
                                    <File size={24} className="text-[#facc15]" />
                                </div>
                                <div className="overflow-hidden flex-1">
                                    <p className="truncate font-medium text-[var(--text-primary)]">{msg.fileName}</p>
                                    <p className="text-[10px] uppercase text-[var(--text-secondary)]">Document</p>
                                </div>
                                <Download size={18} className="text-[var(--text-secondary)]" />
                            </a>
                        )}

                        {/* Text */}
                        {msg.text && (
                            <p className="text-[var(--text-primary)] px-1 whitespace-pre-wrap leading-relaxed text-[15px]">
                                {msg.text}
                            </p>
                        )}
                    </>
                )}

                {/* Footer: Time & Ticks */}
                <div className="flex justify-end items-center gap-1 mt-1 pl-4">
                    <span className="text-[10px] text-[var(--text-secondary)] opacity-80 uppercase font-medium tracking-tighter">
                        {msg.timestamp ? format(msg.timestamp.toDate(), 'HH:mm') : ''}
                    </span>
                    {isMe && msg.type !== 'deleted' && (
                        <div className="transition-all duration-300">
                            {msg.read ? (
                                <CheckCheck size={15} className="text-[#53bdeb]" />
                            ) : (
                                <CheckCheck size={15} className="text-[var(--text-secondary)] opacity-60" />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}