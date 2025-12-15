import { useState, useRef, useCallback, useEffect } from "react";

export const useAudioRecorder = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const streamRef = useRef(null);

    // 1. Helper: Determine supported MIME type
    const getMimeType = () => {
        const types = [
            "audio/webm;codecs=opus",
            "audio/mp4", // Safari
            "audio/aac",
            "audio/webm",
            "audio/ogg"
        ];
        for (const type of types) {
            if (MediaRecorder.isTypeSupported(type)) return type;
        }
        return ""; // Let browser choose default
    };

    // 2. Start Recording
    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const mimeType = getMimeType();
            // Safari sometimes fails if options are passed empty, so we conditionally pass them
            const options = mimeType ? { mimeType } : undefined;

            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.start(1000); // Collect chunks every second
            setIsRecording(true);
            setIsPaused(false);
            setRecordingTime(0);

            // Start Timer
            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);

        } catch (error) {
            console.error("Error accessing microphone:", error);
            // You might want to handle this error in the UI layer
            throw error;
        }
    }, []);

    // 3. Stop Recording (Returns the Blob)
    const stopRecording = useCallback(() => {
        return new Promise((resolve) => {
            if (!mediaRecorderRef.current) return resolve(null);

            const recorder = mediaRecorderRef.current;

            recorder.onstop = () => {
                const mimeType = recorder.mimeType || "audio/webm";
                const blob = new Blob(chunksRef.current, { type: mimeType });

                // Cleanup tracks
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach(track => track.stop());
                }

                // Cleanup timer & state
                clearInterval(timerRef.current);
                setIsRecording(false);
                setIsPaused(false);
                setRecordingTime(0);

                // Clear refs
                mediaRecorderRef.current = null;
                streamRef.current = null;
                chunksRef.current = [];

                resolve(blob);
            };

            recorder.stop();
        });
    }, []);

    // 4. Cancel Recording (Discards data)
    const cancelRecording = useCallback(() => {
        if (mediaRecorderRef.current) {
            // Remove onstop handler so it doesn't try to process data
            mediaRecorderRef.current.onstop = null;
            mediaRecorderRef.current.stop();
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }

        clearInterval(timerRef.current);
        setIsRecording(false);
        setIsPaused(false);
        setRecordingTime(0);

        mediaRecorderRef.current = null;
        streamRef.current = null;
        chunksRef.current = [];
    }, []);

    // 5. Toggle Pause/Resume
    const togglePause = useCallback(() => {
        if (!mediaRecorderRef.current) return;

        if (isPaused) {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);
        } else {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
            clearInterval(timerRef.current);
        }
    }, [isPaused]);

    // 6. Cleanup on Unmount
    useEffect(() => {
        return () => {
            clearInterval(timerRef.current);
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    return {
        isRecording,
        isPaused,
        recordingTime,
        startRecording,
        stopRecording,
        cancelRecording,
        togglePause
    };
};