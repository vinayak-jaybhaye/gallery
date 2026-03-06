import { useCallback, useEffect, useRef, useState } from "react";
import { db } from "@/lib/db";
import { startUpload } from "@/api/upload";
import { streamManager } from "@/lib/uploads/streamManager";
import { useUploadStore } from "@/store/uploadStore";

type CameraDevice = {
  deviceId: string;
  label: string;
};

function getSupportedMimeType() {
  const types = [
    // Video + Audio codecs
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=h264,opus",
    "video/mp4;codecs=h264,aac",
    "video/mp4;codecs=avc1,mp4a.40.2",
    // Fallbacks without explicit audio codec
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];

  return types.find((type) =>
    MediaRecorder.isTypeSupported(type)
  );
}

export default function VideoCapture({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const bufferRef = useRef<Blob[]>([]);
  const bufferSizeRef = useRef(0);
  const partNumberRef = useRef(1);

  const mediaIdRef = useRef<string | null>(null);
  const partSizeRef = useRef<number>(0);
  const mimeTypeRef = useRef<string | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [currentCameraIndex, setCurrentCameraIndex] = useState(0);
  const [duration, setDuration] = useState(0);
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const initCamera = useCallback(async (deviceId?: string) => {
    // Check if we're in a secure context (required for getUserMedia on mobile)
    if (typeof window !== 'undefined' && window.isSecureContext === false) {
      setError("Camera requires a secure connection (HTTPS)");
      setIsLoading(false);
      return;
    }

    // Check if getUserMedia is supported
    const hasGetUserMedia = !!(
      navigator.mediaDevices?.getUserMedia ||
      (navigator as any).webkitGetUserMedia ||
      (navigator as any).mozGetUserMedia ||
      (navigator as any).msGetUserMedia
    );

    if (!hasGetUserMedia) {
      setError("Camera not supported on this browser");
      setIsLoading(false);
      return;
    }

    // Check if MediaRecorder is supported
    if (typeof MediaRecorder === 'undefined') {
      setError("Video recording not supported on this browser");
      setIsLoading(false);
      return;
    }

    const mimeType = getSupportedMimeType();
    if (!mimeType) {
      setError("No supported video recording format found");
      setIsLoading(false);
      return;
    }

    // Stop existing stream if any
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      const videoConstraints: MediaTrackConstraints = {
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30 },
      };

      // Use specific device if provided
      if (deviceId) {
        videoConstraints.deviceId = { exact: deviceId };
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: videoConstraints,
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      // Verify we have both video and audio tracks
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();

      if (videoTracks.length === 0) {
        stream.getTracks().forEach(track => track.stop());
        setError("No video track available. Please check your camera.");
        setIsLoading(false);
        return;
      }

      if (audioTracks.length === 0) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });

          audioStream.getAudioTracks().forEach(track => {
            stream.addTrack(track);
          });
        } catch (audioErr) {
          // Continue without audio instead of blocking
        }
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      mimeTypeRef.current = mimeType;

      recorderRef.current = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 8_000_000, // 8 Mbps
        audioBitsPerSecond: 128_000,   // 128 kbps audio
      });

      recorderRef.current.ondataavailable = handleChunk;

      recorderRef.current.onstop = async () => {
        // flush remaining buffered data
        if (bufferSizeRef.current > 0) {
          await createPart();
        }

        // Notify worker that recording is done
        if (mediaIdRef.current) {
          // update store
          useUploadStore.getState().setStatus(mediaIdRef.current, "uploading");
          streamManager.notifyRecordingFinished(mediaIdRef.current);
        }
      };

      // Enumerate cameras after getting permission
      if (navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices
          .filter((d) => d.kind === "videoinput")
          .map((d, idx) => ({
            deviceId: d.deviceId,
            label: d.label || `Camera ${idx + 1}`,
          }));
        setCameras(videoDevices);

        // Find current camera index
        if (deviceId) {
          const idx = videoDevices.findIndex((d) => d.deviceId === deviceId);
          if (idx !== -1) setCurrentCameraIndex(idx);
        }
      }

      setIsLoading(false);
    } catch (err) {
      console.error("Camera/mic init error:", err);

      if (err instanceof Error) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setError("Camera/microphone permission denied. Please allow access.");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setError("No camera or microphone found on this device.");
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          setError("Camera/microphone is in use by another application.");
        } else if (err.name === "OverconstrainedError") {
          setError("Camera doesn't support the requested settings.");
        } else {
          setError(`Camera error: ${err.message}`);
        }
      } else {
        setError("Failed to access camera or microphone. Please try again.");
      }

      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initCamera();

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [initCamera]);

  const switchCamera = useCallback(() => {
    if (cameras.length < 2 || isRecording) return;
    const nextIndex = (currentCameraIndex + 1) % cameras.length;
    setCurrentCameraIndex(nextIndex);
    setIsLoading(true);
    initCamera(cameras[nextIndex].deviceId);
  }, [cameras, currentCameraIndex, initCamera, isRecording]);

  async function startRecording() {
    if (!recorderRef.current || !mimeTypeRef.current) return;

    const now = new Date();
    const title = `VID_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;

    const res = await startUpload({
      type: "video",
      mimeType: mimeTypeRef.current.split(";")[0],
      title: title,
      source: "streaming",
      sizeBytes: 0
    });

    if (res.uploadType !== "multipart" || !res.partSize) {
      throw new Error("Expected multipart upload for video");
    }

    // add uploadsession to upload store
    useUploadStore.getState().addUpload({
      mediaId: res.mediaId,
      title: title,
      type: "video",
      mimeType: mimeTypeRef.current,
      sizeBytes: 0,
      expiresAt: null,
      createdAt: new Date().toISOString(),
      uploadedBytes: 0,
      status: "streaming",
      source: "streaming"
    });

    mediaIdRef.current = res.mediaId;
    partSizeRef.current = res.partSize;

    // Recover correct part number
    const lastPart = await db.parts
      .where("mediaId")
      .equals(res.mediaId)
      .last();

    partNumberRef.current = lastPart
      ? lastPart.partNumber + 1
      : 1;

    bufferRef.current = [];
    bufferSizeRef.current = 0;

    // Start upload stream
    streamManager.startUpload(res.mediaId, "streaming");

    // Start duration timer
    setDuration(0);
    durationIntervalRef.current = setInterval(() => {
      setDuration((d) => d + 1);
    }, 1000);

    recorderRef.current.start(1000);
    setIsRecording(true);
  }

  async function handleChunk(event: BlobEvent) {
    if (!event.data.size || !mediaIdRef.current) return;

    bufferRef.current.push(event.data);
    bufferSizeRef.current += event.data.size;
    useUploadStore.getState().increamentUploadSizeBytes(mediaIdRef.current!, event.data.size);

    if (bufferSizeRef.current >= partSizeRef.current) {
      await createPart();
    }
  }

  async function createPart() {
    const blob = new Blob(bufferRef.current);

    await db.parts.add({
      userId: "currentUserId",
      mediaId: mediaIdRef.current!,
      partNumber: partNumberRef.current,
      blob,
      createdAt: Date.now(),
    });

    partNumberRef.current++;
    bufferRef.current = [];
    bufferSizeRef.current = 0;
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setIsRecording(false);

    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }
  }

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
    };
  }, []);

  // Format duration as MM:SS or HH:MM:SS
  function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-white text-xl font-semibold mb-2">Video Unavailable</h3>
          <p className="text-white/70 mb-8">{error}</p>
          <button
            onClick={onClose}
            className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-full font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col z-50">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between p-4 safe-area-inset-top">
          <button
            onClick={onClose}
            disabled={isRecording}
            className="p-2 rounded-full hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Recording indicator & duration */}
          <div className="flex items-center gap-3">
            {isRecording && (
              <>
                <div className="flex items-center gap-2 bg-red-500/90 px-3 py-1.5 rounded-full">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="text-white text-sm font-medium">REC</span>
                </div>
                <span className="text-white font-mono text-lg font-medium tabular-nums">
                  {formatDuration(duration)}
                </span>
              </>
            )}
            {!isRecording && <span className="text-white font-medium">Video</span>}
          </div>

          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Camera Viewfinder */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-white/70">Starting camera...</p>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${isLoading ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
        />

        {/* Recording border pulse */}
        {isRecording && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-2 rounded-2xl border-2 border-red-500/50 animate-pulse" />
          </div>
        )}
      </div>

      {/* Bottom Controls */}
      <div className="bg-gradient-to-t from-black via-black/80 to-transparent">
        <div className="flex items-center justify-center gap-8 py-8 px-6 safe-area-inset-bottom">
          {/* Cancel / Close */}
          <button
            onClick={onClose}
            disabled={isRecording}
            className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Record Button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isLoading}
            className="relative w-20 h-20 rounded-full disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {/* Outer ring */}
            <div className={`absolute inset-0 rounded-full border-4 transition-all ${isRecording ? "border-red-500" : "border-white"} group-hover:scale-105 group-active:scale-95`} />
            {/* Inner shape */}
            <div
              className={`absolute transition-all duration-200 ${isRecording
                ? "inset-5 rounded-md bg-red-500" // Square stop button
                : "inset-2 rounded-full bg-red-500 group-hover:inset-2.5 group-active:inset-3" // Circle record button
                }`}
            />
          </button>

          {/* Switch Camera */}
          {cameras.length > 1 ? (
            <button
              onClick={switchCamera}
              disabled={isLoading || isRecording}
              className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title={`Switch to ${cameras[(currentCameraIndex + 1) % cameras.length]?.label || "next camera"}`}
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          ) : (
            <div className="w-14 h-14" /> // Spacer
          )}
        </div>

        {/* Recording status text */}
        {isRecording && (
          <div className="text-center pb-4">
            <p className="text-white/50 text-sm">Recording in progress • Tap stop to finish</p>
          </div>
        )}
      </div>
    </div>
  );
}