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

    return (
        <div className={cn("flex w-full mb-1 group relative", isMe ? 'justify-end' : 'justify-start')}>
            <div className={cn(
                "max-w-[85%] sm:max-w-[65%] rounded-lg p-1.5 shadow-sm text-sm relative group-hover:shadow-md transition-all",
                isMe ? 'bg-[#005c4b] rounded-tr-none' : 'bg-[#202c33] rounded-tl-none'
            )}>

                {/* Context Menu Trigger */}
                <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity z-10 p-1">
                    <button className="bg-gradient-to-l from-black/20 to-transparent rounded-full text-[#aebac1]"><ChevronDown size={18} /></button>
                    {isMe && <div className="hidden group-hover:block absolute right-0 top-5 bg-[#233138] py-1 rounded shadow-xl z-20 w-28 border border-[#111b21]">
                        <button onClick={onDelete} className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-[#111b21] text-red-400 text-xs"><Trash2 size={13} /> Delete</button>
                    </div>}
                </div>

                {msg.type === 'deleted' ? (
                    <p className="text-[#8696a0] italic text-xs flex items-center gap-1"><StopCircle size={12} /> {msg.text}</p>
                ) : (
                    <>
                        {msg.type === 'image' && <img onClick={() => onViewImage(msg.fileUrl)} src={msg.fileUrl} className="rounded-lg mb-1 max-h-72 w-full object-cover cursor-pointer" alt="media" />}

                        {/* Custom Audio Player */}
                        {msg.type === 'audio' && (
                            <div className="flex items-center gap-3 p-2 min-w-[240px]">
                                <div className="relative">
                                    {/* Play Button Circle */}
                                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shadow-md", error ? "bg-red-800" : "bg-[#00a884]")}>
                                        <audio ref={audioRef} src={msg.fileUrl} preload="metadata" />
                                        <button onClick={toggleAudio} className="text-white flex items-center justify-center w-full h-full">
                                            {error ? <AlertCircle size={20} /> : (
                                                isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" className="ml-1" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-col justify-center gap-1.5">
                                    {/* Progress Bar */}
                                    <div className="h-1 bg-[#8696a0]/30 rounded-full w-full overflow-hidden">
                                        <div
                                            className={cn("h-full transition-all duration-100 ease-linear", error ? "bg-red-500" : "bg-[#00a884]")}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-[#8696a0]">
                                        <span>{error ? "Error" : (isPlaying ? "Playing..." : "Voice Message")}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {msg.type === 'file' && (
                            <a href={msg.fileUrl} download className="flex items-center gap-3 bg-black/20 p-3 rounded-lg mb-1 hover:bg-black/30">
                                <File size={30} className="text-[#facc15]" />
                                <div className="overflow-hidden"><p className="truncate font-medium">{msg.fileName}</p><p className="text-[10px] uppercase">DOC</p></div>
                                <Download size={20} className="ml-auto text-[#8696a0]" />
                            </a>
                        )}

                        {msg.text && (
                            <p className="text-[#e9edef] px-1 whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                        )}
                    </>
                )}

                <div className="flex justify-end items-center gap-1 mt-0.5 pl-2">
                    <span className="text-[11px] text-[#ffffff99]">{msg.timestamp ? format(msg.timestamp.toDate(), 'HH:mm') : ''}</span>
                    {isMe && msg.type !== 'deleted' && <CheckCheck size={16} className={cn(msg.read ? "text-[#53bdeb]" : "text-[#8696a0]")} />}
                </div>
            </div>
        </div>
    );
}