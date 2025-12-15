import React, { useState, useRef } from 'react';
import { Smile, Paperclip, Mic, Send, X, StopCircle } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import { useUI } from '../../context/UIContext'; // 1. Import UI Context

export default function ChatInput({ chatId, currentUser, onSend }) {
    const [text, setText] = useState('');
    const [showEmoji, setShowEmoji] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    // 2. Get Custom Alert
    const { showAlert } = useUI();

    // Audio Hook
    const { isRecording, recordingTime, startRecording, stopRecording } = useAudioRecorder();

    // 1. Send Text
    const handleSendText = () => {
        if (!text.trim()) return;
        onSend(text, 'text');
        setText('');
        setShowEmoji(false);
    };

    // 2. Handle Emoji Click
    const handleEmojiClick = (emojiData) => {
        setText((prev) => prev + emojiData.emoji);
    };

    // 3. Handle File Upload
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            // Create Storage Ref
            const storageRef = ref(storage, `chat/${chatId}/${Date.now()}_${file.name}`);
            // Upload
            await uploadBytesResumable(storageRef, file);
            // Get URL
            const url = await getDownloadURL(storageRef);

            // Determine Type
            const type = file.type.startsWith('image/') ? 'image' : 'file';

            // Send
            onSend(url, type);
        } catch (err) {
            console.error(err);
            showAlert("Upload failed. Please try again."); // 3. Use Custom Alert
        } finally {
            setIsUploading(false);
        }
    };

    // 4. Handle Audio Stop & Send
    const handleStopRecording = async () => {
        const audioBlob = await stopRecording();
        if (audioBlob) {
            setIsUploading(true);
            try {
                const storageRef = ref(storage, `voice/${chatId}/${Date.now()}.webm`);
                await uploadBytesResumable(storageRef, audioBlob);
                const url = await getDownloadURL(storageRef);
                onSend(url, 'audio');
            } catch (error) {
                console.error("Audio upload failed", error);
                showAlert("Audio upload failed."); // Added alert here too
            } finally {
                setIsUploading(false);
            }
        }
    };

    return (
        <div className="bg-[#202c33] px-4 py-2 flex flex-col z-20 relative">
            {/* Emoji Picker Popup */}
            {showEmoji && (
                <div className="absolute bottom-20 left-4 shadow-2xl rounded-xl overflow-hidden">
                    <EmojiPicker theme="dark" onEmojiClick={handleEmojiClick} />
                </div>
            )}

            {/* Input Row */}
            <div className="flex items-end gap-2">
                {isRecording ? (
                    // Recording UI
                    <div className="flex-1 flex items-center gap-4 text-red-500 animate-pulse p-3 bg-[#2a3942] rounded-lg">
                        <Mic />
                        <span className="font-mono text-white">
                            {new Date(recordingTime * 1000).toISOString().substr(14, 5)}
                        </span>
                        <span className="text-[#8696a0] text-sm uppercase font-bold">Recording...</span>
                    </div>
                ) : (
                    // Standard UI
                    <>
                        <button onClick={() => setShowEmoji(!showEmoji)} className="p-3 text-[#8696a0] hover:text-white">
                            <Smile />
                        </button>

                        <button onClick={() => fileInputRef.current.click()} className="p-3 text-[#8696a0] hover:text-white">
                            <Paperclip />
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            onChange={handleFileUpload}
                        />

                        <div className="flex-1 bg-[#2a3942] rounded-lg px-4 py-2">
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendText(); } }}
                                placeholder={isUploading ? "Uploading..." : "Type a message"}
                                className="bg-transparent w-full text-[#d1d7db] outline-none resize-none h-6 max-h-24 scrollbar-hide"
                                rows={1}
                                disabled={isUploading}
                            />
                        </div>
                    </>
                )}

                {/* Send / Mic Button */}
                {text || isRecording || isUploading ? (
                    <button
                        onClick={isRecording ? handleStopRecording : handleSendText}
                        disabled={isUploading}
                        className={`p-3 rounded-full text-white shadow-md transition-all ${isRecording ? 'bg-red-500' : 'bg-[#00a884] hover:bg-[#008f70]'}`}
                    >
                        {isRecording ? <StopCircle /> : <Send />}
                    </button>
                ) : (
                    <button onClick={startRecording} className="p-3 bg-[#2a3942] rounded-full text-[#8696a0] hover:text-white">
                        <Mic />
                    </button>
                )}
            </div>
        </div>
    );
}