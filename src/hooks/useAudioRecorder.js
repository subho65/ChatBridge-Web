import { useState, useRef, useCallback } from "react";

export const useAudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);

    // 1. Determine supported MIME type
    const getMimeType = () => {
        const types = [
            "audio/webm;codecs=opus",
            "audio/mp4",
            "audio/aac",
            "audio/webm"
        ];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) return type;
        }
        return ""; // Fallback
    };

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mimeType = getMimeType();

            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: mimeType || undefined
            });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.start(1000); // Collect chunks every second
            setIsRecording(true);

            // Timer without memory leak risk
            const startTime = Date.now();
            timerRef.current = setInterval(() => {
                setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);

        } catch (error) {
            console.error("Error accessing microphone:", error);
            alert("Microphone access denied.");
        }
    }, []);

    const stopRecording = useCallback(() => {
        return new Promise((resolve) => {
            if (!mediaRecorderRef.current) return resolve(null);

            const recorder = mediaRecorderRef.current;

            recorder.onstop = () => {
                const mimeType = recorder.mimeType || "audio/webm";
                const blob = new Blob(chunksRef.current, { type: mimeType });

                // Cleanup tracks
                recorder.stream.getTracks().forEach(track => track.stop());

                // Cleanup timer
                clearInterval(timerRef.current);
                setRecordingTime(0);
                setIsRecording(false);

                resolve(blob);
            };

            recorder.stop();
        });
    }, []);

    return { isRecording, recordingTime, startRecording, stopRecording };
};