import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { X, Crop, Send, Type } from 'lucide-react';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) { return twMerge(clsx(inputs)); }

// Helper to create the cropped image
async function getCroppedImg(imageSrc, pixelCrop) {
    const image = await new Promise((resolve) => {
        const img = new Image();
        img.src = imageSrc;
        img.onload = () => resolve(img);
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        pixelCrop.width,
        pixelCrop.height
    );

    return new Promise((resolve) => {
        canvas.toBlob((blob) => {
            resolve(blob);
        }, 'image/jpeg');
    });
}

export default function ImagePreview({ file, onClose, onSend }) {
    const [imageSrc] = useState(URL.createObjectURL(file));
    const [caption, setCaption] = useState('');
    const [isCropping, setIsCropping] = useState(false);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

    const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleSend = async () => {
        if (isCropping) {
            // Apply crop before sending
            try {
                const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
                const croppedFile = new File([croppedBlob], file.name, { type: 'image/jpeg' });
                onSend(croppedFile, caption);
            } catch (e) {
                console.error(e);
                onSend(file, caption); // Fallback
            }
        } else {
            onSend(file, caption);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-fade-in">
            {/* Top Bar */}
            <div className="flex items-center justify-between p-4 text-white">
                <button onClick={onClose}><X size={24} /></button>
                <div className="flex gap-4">
                    <button onClick={() => setIsCropping(!isCropping)} className={cn("p-2 rounded-full", isCropping && "bg-[#00a884]")}>
                        <Crop size={24} />
                    </button>
                </div>
            </div>

            {/* Image Area */}
            <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
                {isCropping ? (
                    <div className="relative w-full h-full">
                        <Cropper
                            image={imageSrc}
                            crop={crop}
                            zoom={zoom}
                            aspect={4 / 3} // Default aspect, remove for freeform
                            onCropChange={setCrop}
                            onCropComplete={onCropComplete}
                            onZoomChange={setZoom}
                        />
                    </div>
                ) : (
                    <img src={imageSrc} className="max-w-full max-h-full object-contain" />
                )}
            </div>

            {/* Caption & Send Bar */}
            <div className="p-4 bg-black/80">
                <div className="flex items-center gap-2 bg-[#2a3942] rounded-full px-4 py-3 mb-2">
                    <Type className="text-[#8696a0]" />
                    <input
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        className="bg-transparent flex-1 text-white outline-none placeholder-[#8696a0]"
                        placeholder="Add a caption..."
                        autoFocus
                    />
                </div>
                <div className="flex justify-end">
                    <button
                        onClick={handleSend}
                        className="bg-[#00a884] p-4 rounded-full text-white shadow-lg hover:bg-[#008f70] transition"
                    >
                        <Send size={24} className="ml-1" />
                    </button>
                </div>
            </div>
        </div>
    );
}